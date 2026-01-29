import { AnyFrame, FrameType, AgentStatus, ExecutionContext, DocumentFrame, OutputFrame, AwaitFrame } from '../types';
import { createSession, executeTurn, resumeSession } from './api';
import { TurnResponse, CreateSessionResponse, OutputType, OutputDto, AwaitSpec } from './backendTypes';

/**
 * LiveRuntimeService (HTTP REST Version)
 * Adapts the Aegis2Agent Backend API (createSession, executeTurn, resumeSession)
 * to the Super Protocol Frontend.
 */
export class LiveRuntimeService {
  private listeners: ((frame: AnyFrame, context: ExecutionContext) => void)[] = [];
  
  // Internal State
  private sessionId: string | null = null;
  private currentAwaitSpec: AwaitSpec | null = null;
  
  private currentContext: ExecutionContext = {
    status: AgentStatus.IDLE,
    currentObjective: '等待初始化',
    startTime: Date.now(),
  };

  constructor() {}

  subscribe(callback: (frame: AnyFrame, context: ExecutionContext) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(frame: AnyFrame | null, contextUpdates?: Partial<ExecutionContext>) {
    if (contextUpdates) {
      this.currentContext = { ...this.currentContext, ...contextUpdates };
    }
    if (frame) {
      this.listeners.forEach(cb => cb(frame, this.currentContext));
    } else if (contextUpdates) {
      // Force update context without frame
      this.listeners.forEach(cb => cb({} as AnyFrame, this.currentContext)); 
    }
  }

  // Generate a unique ID to prevent React from filtering out rapid updates
  private genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  // --- 1. System Init ---
  async initSystem() {
    // Simulate boot delay
    await new Promise(r => setTimeout(r, 500));

    // [问题1修复]: 这里控制初始化的日志名称，您可以改为任何您想要的名称
    this.emit({
        id: this.genId('sys-boot'),
        timestamp: Date.now(),
        type: FrameType.DOCUMENT,
        title: '系统初始化完成', 
        contentType: 'LOG',
        content: 'Agent Runtime Service (REST Mode) initialized.\nReady to accept new objectives.',
    }, { status: AgentStatus.IDLE });

    await new Promise(r => setTimeout(r, 200));

    this.emit({
      id: 'await-objective', // Static ID for the initial goal input
      timestamp: Date.now(),
      type: FrameType.AWAIT,
      message: '请输入您的任务目标 (Goal):',
      schema: { type: 'TEXT' }
    }, { status: AgentStatus.WAITING });
  }

  // --- 2. Action Handler ---
  async resolveAwait(frameId: string, value: string | Record<string, any>) {
    const timestamp = Date.now();
    
    // Normalize string value for logging
    const logValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Determine if this input triggers a NEW session (Auto-Create)
    // Only applies if it's the initial boot or explicit new objective
    const shouldCreateSession = frameId === 'await-objective' || frameId === 'new-objective' || !this.sessionId;

    // Fix: Capture the state BEFORE emit updates it to EXECUTING
    const isResuming = !!this.currentAwaitSpec && this.currentContext.status === AgentStatus.WAITING;

    // [问题2修复]: 如果是新会话，添加 isSessionStart 标记，并修改标题
    this.emit({
        id: this.genId('user-input'),
        timestamp,
        type: FrameType.DOCUMENT,
        title: shouldCreateSession ? '新任务航程' : '用户回复',
        contentType: 'LOG',
        content: shouldCreateSession ? `用户目标: ${logValue}` : logValue,
        metadata: {
            isSessionStart: shouldCreateSession // 增加标记供 UI 渲染使用
        }
    }, { 
        status: AgentStatus.EXECUTING, 
        ...(shouldCreateSession && typeof value === 'string' ? { 
            currentObjective: value, 
            startTime: Date.now() 
        } : {})
    });

    try {
        if (shouldCreateSession && typeof value === 'string') {
            // --- SCENARIO A: NEW SESSION ---
            const sessionRes = await createSession(value);
            this.sessionId = sessionRes.sessionId;
            this.currentAwaitSpec = null;
            
            const displayState = sessionRes.state || sessionRes.sessionState || 'CREATED';
            
            this.emit({
                id: this.genId('sys-session'),
                timestamp: Date.now(),
                type: FrameType.DOCUMENT,
                title: '会话已创建',
                contentType: 'LOG',
                content: `Session ID: ${this.sessionId}\nState: ${displayState}`,
            });

            this.emit({
                id: this.genId('sys-exec-start'),
                timestamp: Date.now(),
                type: FrameType.DOCUMENT,
                title: '启动任务执行',
                contentType: 'LOG',
                content: '正在将目标提交至执行引擎...',
            }, { status: AgentStatus.EXECUTING });

            const turnRes = await executeTurn(this.sessionId, value);
            this.processBackendResponse(turnRes);

        } else {
            // --- SCENARIO B: EXISTING SESSION ---
            if (!this.sessionId) throw new Error("Session ID lost.");
            
            let response: TurnResponse;

            if (isResuming) {
                // Resume with structured input if available
                let structuredInput: Record<string, any> = {};
                if (typeof value === 'object') {
                    structuredInput = value;
                } else {
                    // Safety check if spec is null (should not happen due to isResuming check)
                    if (!this.currentAwaitSpec) throw new Error("AwaitSpec missing during resume");
                    structuredInput = this.mapInputToStructure(value, this.currentAwaitSpec);
                }

                response = await resumeSession(this.sessionId, structuredInput);
                this.currentAwaitSpec = null;
            } else {
                // Regular chat turn (string only)
                if (typeof value !== 'string') throw new Error("Interactive turns require string input");
                response = await executeTurn(this.sessionId, value);
            }

            this.processBackendResponse(response);
        }

    } catch (err: any) {
        this.handleError(err);
    }
  }

  // --- 3. Response Processing ---
  private processBackendResponse(response: TurnResponse | CreateSessionResponse) {
    const turnRes = response as TurnResponse;
    const backendStatus = turnRes.executionStatus || turnRes.sessionState || (response as any).state; 

    let newStatus = AgentStatus.EXECUTING;

    if (backendStatus === 'AWAITING_INPUT' || backendStatus === 'BLOCKED') {
        newStatus = AgentStatus.WAITING;
    } else if (backendStatus === 'COMPLETED' || backendStatus === 'SUCCESS') {
        newStatus = AgentStatus.IDLE;
    } else if (backendStatus === 'FAILED' || backendStatus === 'TERMINATED') {
        newStatus = AgentStatus.IDLE;
    } else if (backendStatus === 'CREATED') {
        newStatus = AgentStatus.PLANNING;
    }

    // Output Frames - Enhanced Mapping
    if (response.outputs && Array.isArray(response.outputs)) {
        response.outputs.forEach((output, idx) => {
            // Map backend OutputType directly to frontend ContentType
            // backend: 'text' | 'file' | 'table' | 'chart'
            // frontend: 'TEXT' | 'FILE' | 'TABLE' | 'CHART' | 'JSON' | ...
            const upperType = output.type.toUpperCase();
            const validTypes = ['TEXT', 'FILE', 'TABLE', 'CHART', 'JSON', 'MARKDOWN', 'CODE'];
            const contentType = validTypes.includes(upperType) ? upperType : 'JSON';

            this.emit({
                id: this.genId(`out-${idx}`),
                timestamp: Date.now(),
                type: FrameType.OUTPUT,
                // @ts-ignore - dynamic mapping
                contentType: contentType,
                // Pass raw data for Charts/Tables, string for text if needed
                content: output.data,
                metadata: output.metadata
            });
        });
    }

    // Message/Log Frame
    if (response.message) {
         this.emit({
            id: this.genId('doc-msg'),
            timestamp: Date.now(),
            type: FrameType.DOCUMENT,
            title: '系统消息',
            contentType: 'LOG',
            content: response.message
        });
    }

    // Await Frame (Blocking)
    if (newStatus === AgentStatus.WAITING && response.awaitSpec) {
        this.currentAwaitSpec = response.awaitSpec;
        
        // --- Fix: Normalize expectedSchema to fields ---
        let finalFields = response.awaitSpec.fields;
        
        // If fields is missing but expectedSchema exists (Legacy backend support)
        if ((!finalFields || finalFields.length === 0) && response.awaitSpec.expectedSchema) {
            finalFields = Object.entries(response.awaitSpec.expectedSchema).map(([key, schema]: [string, any]) => ({
                key: key,
                label: key, // Use the key (e.g., 'period') as label if no separate label exists
                type: schema.options ? 'select' : (schema.type === 'boolean' ? 'boolean' : (schema.type === 'integer' || schema.type === 'number' ? 'number' : 'text')),
                options: schema.options,
                required: schema.required,
                description: schema.description // IMPORTANT: Pass the description for UI rendering
            }));
        }

        // Map backend spec fields to frontend schema
        const schemaType = response.awaitSpec.type === 'CONFIRMATION' || response.awaitSpec.confirmation 
            ? 'CONFIRMATION' 
            : (finalFields && finalFields.length > 0) ? 'FORM' : 'TEXT';

        // Support SELECTION type if options exist but no fields (Simple selection)
        const finalSchemaType = (response.awaitSpec.options && (!finalFields || finalFields.length === 0)) ? 'SELECTION' : schemaType;

        this.emit({
            id: this.genId('await'),
            timestamp: Date.now(),
            type: FrameType.AWAIT,
            message: response.awaitSpec.message || '系统需要您的输入...',
            schema: {
                // @ts-ignore
                type: finalSchemaType,
                options: response.awaitSpec.options,
                fields: finalFields, // Use the normalized fields
            },
            resolved: false
        }, { status: newStatus });
    } else {
        this.emit(null, { status: newStatus });
    }
  }

  private mapInputToStructure(value: string, spec: AwaitSpec): Record<string, any> {
    const result: Record<string, any> = {};

    // 1. Try to map to 'fields'
    if (spec.fields && spec.fields.length > 0) {
        const firstField = spec.fields[0];
        result[firstField.key] = value;
        return result;
    }
    
    // 2. Try to map to 'expectedSchema' keys (if fields wasn't populated in local state but exists in spec)
    if (spec.expectedSchema) {
        const keys = Object.keys(spec.expectedSchema);
        if (keys.length > 0) {
             result[keys[0]] = value;
             return result;
        }
    }

    // 3. Confirmation
    if (spec.type === 'CONFIRMATION' || spec.confirmation) {
        if (value === 'CONFIRM') return { confirmed: true };
        if (value === 'CANCEL') return { confirmed: false };
        return { confirmed: value.toLowerCase().startsWith('y') };
    }

    // 4. Default Fallback
    result['content'] = value; 
    result['input'] = value;
    return result;
  }

  private handleError(err: any) {
      console.error(err);
      this.emit({
          id: this.genId('err'),
          timestamp: Date.now(),
          type: FrameType.DOCUMENT,
          title: '请求失败',
          contentType: 'LOG',
          content: err.message || '未知网络错误'
      }, { status: AgentStatus.IDLE });
  }
}

export const liveRuntime = new LiveRuntimeService();