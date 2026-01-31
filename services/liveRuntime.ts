import { AnyFrame, FrameType, AgentStatus, ExecutionContext, DocumentFrame, OutputFrame, AwaitFrame } from '../types';
import { createSession, executeTurn, resumeSession, getSession } from './api';
import { TurnResponse, CreateSessionResponse, OutputType, OutputDto, AwaitSpec, IntentConfirmationTurn, ConfirmationChoice, IntentAnchor } from './backendTypes';

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

  // [修复]: 添加初始化状态锁，防止 React StrictMode 导致的重复初始化
  private isInitialized = false;

  // Feature 017: 意图治理状态
  private pendingConfirmation: IntentConfirmationTurn | null = null;
  private intentAnchor: IntentAnchor | null = null;
  private isIntentConfirmationActive = false; // 意图确认对话框是否显示中

  private currentContext: ExecutionContext = {
    status: AgentStatus.IDLE,
    currentObjective: '等待初始化',
    startTime: Date.now(),
  };

  constructor() {}

  subscribe(callback: (frame: AnyFrame, context: ExecutionContext) => void) {
    this.listeners.push(callback);
    // 如果已经初始化过，新订阅者可能需要获取当前上下文状态（可选）
    // cb(null, this.currentContext); 
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
    // [修复]: 如果已经初始化过，直接返回，不再发送日志
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Simulate boot delay
    await new Promise(r => setTimeout(r, 500));

    this.emit({
        id: this.genId('sys-boot'),
        timestamp: Date.now(),
        type: FrameType.DOCUMENT,
        title: '牛马AI已经全力待命', 
        contentType: 'LOG',
        content: 'Agent Runtime Service (REST Mode) initialized.\nReady to accept new objectives.',
    }, { status: AgentStatus.IDLE });

    await new Promise(r => setTimeout(r, 200));

    this.emit({
      id: 'await-objective', // Static ID for the initial goal input
      timestamp: Date.now(),
      type: FrameType.AWAIT,
      message: '您想 (Goal):',
      schema: { type: 'TEXT' }
    }, { status: AgentStatus.WAITING });
  }

  // --- 2. Action Handler ---
  async resolveAwait(frameId: string, value: string | Record<string, any>) {
    const timestamp = Date.now();

    // Feature 017: 检测意图确认选择
    // 如果当前有激活的意图确认对话框，解析用户的选择
    const intentChoice = this.parseIntentConfirmationChoice(value);
    if (intentChoice && this.isIntentConfirmationActive) {
      await this.resolveIntentConfirmation(intentChoice);
      return;
    }

    // Normalize string value for logging
    const logValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Determine if this input triggers a NEW session (Auto-Create)
    // Only applies if it's the initial boot or explicit new objective
    const shouldCreateSession = frameId === 'await-objective' || frameId === 'new-objective' || !this.sessionId;

    // Fix: Capture the state BEFORE emit updates it to EXECUTING
    const isResuming = !!this.currentAwaitSpec && this.currentContext.status === AgentStatus.WAITING;

    // 如果是新会话，添加 isSessionStart 标记，并修改标题
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
                title: '任务会话已创建',
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
                // 保存原始用户输入，用于意图偏离检测
                let originalContent: string | undefined;

                if (typeof value === 'string') {
                    originalContent = value;
                } else if (typeof value === 'object' && value !== null) {
                    // 如果是对象，尝试提取第一个字段的值作为原始输入
                    const keys = Object.keys(value);
                    if (keys.length === 1) {
                        const firstValue = value[keys[0]];
                        if (typeof firstValue === 'string') {
                            originalContent = firstValue;
                        }
                    }
                }

                console.log('[resolveAwait] isResuming: value=', value, 'originalContent=', originalContent);

                let structuredInput: Record<string, any> = {};
                if (typeof value === 'object') {
                    structuredInput = value;
                } else {
                    // Safety check if spec is null (should not happen due to isResuming check)
                    if (!this.currentAwaitSpec) throw new Error("AwaitSpec missing during resume");
                    structuredInput = this.mapInputToStructure(value, this.currentAwaitSpec);
                }

                console.log('[resolveAwait] calling resumeSession with structuredInput=', structuredInput, 'originalContent=', originalContent);

                // 发送原始输入用于后端意图偏离检测
                response = await resumeSession(this.sessionId, structuredInput, originalContent);
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

    // Feature 017: 处理 confirmationTurn（意图确认回合）
    // 优先级高于 awaitSpec，因为 confirmationTurn 是一种特殊的 Await
    if (turnRes.confirmationTurn) {
      this.handleConfirmationTurn(turnRes.confirmationTurn);
      return;
    }

    // Feature 017: 处理 intentAnchor（意图锚点信息）
    let hasIntentAnchorUpdate = false;
    if (turnRes.intentAnchor) {
      // 检查 intentAnchor 是否真的发生了变化（深度比较）
      const anchorChanged = !this.intentAnchor ||
        this.intentAnchor.intentId !== turnRes.intentAnchor.intentId ||
        this.intentAnchor.intentLabel !== turnRes.intentAnchor.intentLabel;
      if (anchorChanged) {
        this.intentAnchor = turnRes.intentAnchor;
        hasIntentAnchorUpdate = true;
      }
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

  // ============================================================================
  // Feature 017: 意图治理方法
  // ============================================================================

  /**
   * 获取确认超时时间（毫秒）
   * 从环境变量读取，默认 30000 毫秒
   */
  private getConfirmationTimeout(): number {
    // @ts-ignore - Vite env 变量
    const timeout = import.meta.env?.VITE_CONFIRMATION_TIMEOUT;
    return timeout ? parseInt(timeout, 10) : 30000;
  }

  /**
   * 保存 pendingConfirmation 到 localStorage
   */
  private savePendingConfirmation(confirmation: IntentConfirmationTurn): void {
    const storageKey = `aegischat:pending_confirmation:${this.sessionId}`;
    const data = {
      sessionId: this.sessionId,
      confirmationTurn: confirmation,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save pending confirmation:', e);
    }
  }

  /**
   * 从 localStorage 恢复 pendingConfirmation
   */
  async restorePendingConfirmation(): Promise<IntentConfirmationTurn | null> {
    if (!this.sessionId) return null;

    const storageKey = `aegischat:pending_confirmation:${this.sessionId}`;
    try {
      const data = localStorage.getItem(storageKey);
      if (!data) return null;

      const parsed = JSON.parse(data);
      // 检查是否过期（1小时）
      const MAX_AGE = 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > MAX_AGE) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return parsed.confirmationTurn;
    } catch (e) {
      console.warn('Failed to restore pending confirmation:', e);
      return null;
    }
  }

  /**
   * 清除 pendingConfirmation
   */
  private clearPendingConfirmation(): void {
    if (!this.sessionId) return;

    const storageKey = `aegischat:pending_confirmation:${this.sessionId}`;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('Failed to clear pending confirmation:', e);
    }
    this.pendingConfirmation = null;
  }

  /**
   * 切换到新 Session
   * 注意：此方法只更新内部状态，不发送任何帧
   * 实际的响应处理由调用方的 processBackendResponse 完成
   */
  private switchSession(newSessionId: string): void {
    this.sessionId = newSessionId;
    this.currentAwaitSpec = null;
    this.isIntentConfirmationActive = false;
  }

  /**
   * 处理意图确认回合
   */
  private handleConfirmationTurn(confirmation: IntentConfirmationTurn): void {
    this.pendingConfirmation = confirmation;
    this.isIntentConfirmationActive = true;
    this.savePendingConfirmation(confirmation);

    // 根据 driftCategory 确定语气
    const isDrift = confirmation.driftCategory === 'DRIFT';
    const tone = isDrift ? '警告' : '提示';
    const driftDesc = isDrift ? '明确偏移' : '模糊';

    // 发出 INTENT_CONFIRMATION 类型的 Await 帧
    this.emit({
      id: this.genId('await-intent'),
      timestamp: Date.now(),
      type: FrameType.AWAIT,
      message: `检测到意图${driftDesc}（${tone}），请确认您的选择`,
      schema: {
        type: 'INTENT_CONFIRMATION',
        confirmationTurn: confirmation,
        timeout: this.getConfirmationTimeout(),
      },
      resolved: false
    }, { status: AgentStatus.WAITING });
  }

  /**
   * 解析意图确认选择
   * @param choice - 用户的选择
   * @returns 选择值或 null（如果不是意图确认场景）
   */
  private parseIntentConfirmationChoice(value: string | Record<string, any>): ConfirmationChoice | null {
    // 如果是字符串，检查是否是 ConfirmationChoice
    if (typeof value === 'string') {
      if (value === 'CONTINUE_CURRENT' || value === 'ABANDON_CURRENT') {
        return value as ConfirmationChoice;
      }
      return null;
    }

    // 如果是对象，检查是否有 confirmationChoice 字段
    if (typeof value === 'object' && value !== null) {
      if ('confirmationChoice' in value) {
        const choice = value.confirmationChoice;
        if (choice === 'CONTINUE_CURRENT' || choice === 'ABANDON_CURRENT') {
          return choice as ConfirmationChoice;
        }
      }
    }

    return null;
  }

  /**
   * 解析意图确认选择
   * Feature 017: 处理用户对意图确认回合的选择
   */
  async resolveIntentConfirmation(choice: ConfirmationChoice): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session to resolve confirmation');
    }

    this.isIntentConfirmationActive = false;

    try {
      // 发送 confirmationChoice 到后端
      const response = await executeTurn(this.sessionId, '', choice);

      // 处理 newSessionId（用户选择 ABANDON_CURRENT）
      if (response.newSessionId) {
        this.switchSession(response.newSessionId);
        // 注意：后端已经自动执行了新意图并返回完整结果
        // processBackendResponse 会自动处理 response 中的 intentAnchor（如果有）
        this.processBackendResponse(response);
      } else {
        // 正常处理响应（CONTINUE_CURRENT 场景）
        this.processBackendResponse(response);
      }

      // 清除 pendingConfirmation
      this.clearPendingConfirmation();
    } catch (err: any) {
      this.handleError(err);
      // 恢复状态以便用户重试
      this.isIntentConfirmationActive = true;
    }
  }

  /**
   * 获取当前意图锚点信息
   */
  getIntentAnchor(): IntentAnchor | null {
    return this.intentAnchor;
  }

  /**
   * 检查意图确认对话框是否激活
   */
  isConfirmationActive(): boolean {
    return this.isIntentConfirmationActive;
  }

  /**
   * 获取待处理的确认回合
   */
  getPendingConfirmation(): IntentConfirmationTurn | null {
    return this.pendingConfirmation;
  }
}

export const liveRuntime = new LiveRuntimeService();