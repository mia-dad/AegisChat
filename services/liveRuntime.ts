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

    this.emit({
        id: this.genId('sys-boot'),
        timestamp: Date.now(),
        type: FrameType.DOCUMENT,
        title: '系统就绪',
        contentType: 'LOG',
        content: 'Agent Runtime Service (REST Mode) initialized.',
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
  async resolveAwait(frameId: string, value: string) {
    const timestamp = Date.now();
    
    // Determine if this input triggers a NEW session (Auto-Create)
    // 1. It's the initial boot input ('await-objective')
    // 2. The app explicitly requests a new objective ('new-objective') e.g. from IDLE state
    // 3. We don't have a session ID yet
    const shouldCreateSession = frameId === 'await-objective' || frameId === 'new-objective' || !this.sessionId;

    // Emit User Input Log immediately
    this.emit({
        id: this.genId('user-input'),
        timestamp,
        type: FrameType.DOCUMENT,
        title: shouldCreateSession ? '设定目标' : '用户回复',
        contentType: 'LOG',
        content: shouldCreateSession ? `用户目标: ${value}` : value
    }, { 
        status: AgentStatus.EXECUTING, // Transition to executing immediately for UI feedback
        // Update objective if it's a new session
        ...(shouldCreateSession ? { 
            currentObjective: value, 
            startTime: Date.now() 
        } : {})
    });

    try {
        if (shouldCreateSession) {
            // --- SCENARIO A: NEW SESSION ---
            // "The frontend automatically creates a context session" as requested.
            
            // 1. Create Session
            const sessionRes = await createSession(value);
            this.sessionId = sessionRes.sessionId;
            this.currentAwaitSpec = null; // Clear any old specs
            
            const displayState = sessionRes.state || sessionRes.sessionState || 'CREATED';
            
            this.emit({
                id: this.genId('sys-session'),
                timestamp: Date.now(),
                type: FrameType.DOCUMENT,
                title: '会话已创建',
                contentType: 'LOG',
                content: `Session ID: ${this.sessionId}\nState: ${displayState}`,
            });

            // 2. Execute First Turn
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
            // Resume or Follow-up
            
            if (!this.sessionId) throw new Error("Session ID lost.");
            
            let response: TurnResponse;

            // Check if we are Resuming a structured form/await (Blocked State)
            if (this.currentAwaitSpec && this.currentContext.status === AgentStatus.WAITING) {
                const structuredInput = this.mapInputToStructure(value, this.currentAwaitSpec);
                response = await resumeSession(this.sessionId, structuredInput);
                this.currentAwaitSpec = null;
            } else {
                // Regular chat turn (Follow-up)
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
    // Map various backend status fields to unified logic
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

    // Output Frames
    if (response.outputs && Array.isArray(response.outputs)) {
        response.outputs.forEach((output, idx) => {
            this.emit({
                id: this.genId(`out-${idx}`),
                timestamp: Date.now(),
                type: FrameType.OUTPUT,
                contentType: output.type === OutputType.TEXT ? 'MARKDOWN' : 'JSON',
                content: typeof output.data === 'string' ? output.data : JSON.stringify(output.data, null, 2),
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
        
        this.emit({
            id: this.genId('await'),
            timestamp: Date.now(),
            type: FrameType.AWAIT,
            message: response.awaitSpec.message || '系统需要您的输入...',
            schema: {
                type: response.awaitSpec.type === 'CONFIRMATION' || response.awaitSpec.confirmation ? 'CONFIRMATION' : 'TEXT',
            },
            resolved: false
        }, { status: newStatus });
    } else {
        this.emit(null, { status: newStatus });
    }
  }

  private mapInputToStructure(value: string, spec: AwaitSpec): Record<string, any> {
    const result: Record<string, any> = {};

    if (spec.fields && spec.fields.length > 0) {
        const firstField = spec.fields[0];
        result[firstField.key] = value;
        return result;
    }

    if (spec.type === 'CONFIRMATION' || spec.confirmation) {
        if (value === 'CONFIRM') return { confirmed: true };
        if (value === 'CANCEL') return { confirmed: false };
        return { confirmed: value.toLowerCase().startsWith('y') };
    }

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