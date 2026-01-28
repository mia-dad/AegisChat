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
    // Only emit if we have a frame or if we strictly need to update context (but subscribers usually expect a frame)
    // For pure context updates, we can pass the last known frame or a null frame if the subscriber handles it.
    // However, our UI hooks usually expect a frame to append. 
    // If frame is null, we just call listeners with the new context.
    if (frame) {
      this.listeners.forEach(cb => cb(frame, this.currentContext));
    } else if (contextUpdates) {
      // Hack: Send a "dummy" update or just call the listener with null frame if UI supports it.
      // Better: The UI Timeline appends frames. StatusPanel reads context.
      // We will create a non-visible LOG frame if we really need to push state, 
      // OR just rely on the next frame to update status.
      // For now, let's just trigger listeners with the new context and a null frame (handled in App.tsx).
      this.listeners.forEach(cb => cb({} as AnyFrame, this.currentContext)); 
    }
  }

  // --- 1. System Init ---
  async initSystem() {
    // We don't connect to WS anymore.
    // We just emit the initial "Ask for Objective" frame locally.
    
    // Simulate boot delay
    await new Promise(r => setTimeout(r, 500));

    this.emit({
        id: 'sys-boot',
        timestamp: Date.now(),
        type: FrameType.DOCUMENT,
        title: '系统就绪',
        contentType: 'LOG',
        content: 'Agent Runtime Service (REST Mode) initialized.',
    }, { status: AgentStatus.IDLE });

    await new Promise(r => setTimeout(r, 200));

    // Ask for the Goal locally
    this.emit({
      id: 'await-objective', // Special ID we recognize later
      timestamp: Date.now(),
      type: FrameType.AWAIT,
      message: '请输入您的任务目标 (Goal):',
      schema: { type: 'TEXT' }
    }, { status: AgentStatus.WAITING });
  }

  // --- 2. Action Handler ---
  async resolveAwait(frameId: string, value: string) {
    const timestamp = Date.now();

    // 2a. Handle Local Objective Setting
    if (frameId === 'await-objective') {
        // Emit user input log
        this.emit({
            id: `user-input-${timestamp}`,
            timestamp,
            type: FrameType.DOCUMENT,
            title: '设定目标',
            contentType: 'LOG',
            content: `用户目标: ${value}`
        }, { 
            status: AgentStatus.PLANNING, 
            currentObjective: value,
            startTime: Date.now()
        });

        try {
            // Call API: Create Session
            const response = await createSession(value);
            this.sessionId = response.sessionId;
            
            this.emit({
                id: `sys-session-${timestamp}`,
                timestamp: Date.now(),
                type: FrameType.DOCUMENT,
                title: '会话已创建',
                contentType: 'LOG',
                content: `Session ID: ${this.sessionId}\nState: ${response.sessionState}`,
            });

            // Handle potential immediate outputs or status from createSession
            // (Assuming CreateSessionResponse might act like TurnResponse based on user hints, or we assume IDLE)
            this.processBackendResponse(response as any); // Cast to any to handle overlapping types if they exist

        } catch (err: any) {
            this.handleError(err);
        }
        return;
    }

    // 2b. Handle Normal Interaction
    if (!this.sessionId) {
        this.emit({
            id: `err-${timestamp}`,
            timestamp,
            type: FrameType.DOCUMENT,
            title: '错误',
            contentType: 'LOG',
            content: '会话未初始化',
        });
        return;
    }

    // Emit user input log
    this.emit({
        id: `user-input-${timestamp}`,
        timestamp,
        type: FrameType.DOCUMENT,
        title: '用户回复',
        contentType: 'LOG',
        content: value
    }, { status: AgentStatus.EXECUTING });

    try {
        let response: TurnResponse;

        // If we have a pending AwaitSpec, this is a RESUME action
        if (this.currentAwaitSpec && this.currentContext.status === AgentStatus.WAITING) {
            const structuredInput = this.mapInputToStructure(value, this.currentAwaitSpec);
            response = await resumeSession(this.sessionId, structuredInput);
            this.currentAwaitSpec = null; // Clear it
        } else {
            // Otherwise, it's a new Turn execution (Interrupt or Follow-up)
            response = await executeTurn(this.sessionId, value);
        }

        this.processBackendResponse(response);

    } catch (err: any) {
        this.handleError(err);
    }
  }

  // --- 3. Response Processing (Adapter) ---
  
  private processBackendResponse(response: TurnResponse | CreateSessionResponse) {
    const timestamp = Date.now();
    
    // 1. Map Status
    // executionStatus might be undefined in CreateSessionResponse
    const backendStatus = (response as TurnResponse).executionStatus || (response as TurnResponse).sessionState; 
    let newStatus = AgentStatus.EXECUTING;
    let frameToEmit: AnyFrame | null = null;

    if (backendStatus === 'AWAITING_INPUT' || backendStatus === 'BLOCKED') {
        newStatus = AgentStatus.WAITING;
    } else if (backendStatus === 'COMPLETED' || backendStatus === 'SUCCESS') {
        newStatus = AgentStatus.IDLE;
    } else if (backendStatus === 'FAILED' || backendStatus === 'TERMINATED') {
        newStatus = AgentStatus.IDLE; // Or error state
    }

    // 2. Process Outputs (if any)
    if (response.outputs && Array.isArray(response.outputs)) {
        response.outputs.forEach((output, idx) => {
            // Delay slightly for visual pacing
            // Emit Output Frame
            const outputFrame: OutputFrame = {
                id: `out-${timestamp}-${idx}`,
                timestamp: Date.now(),
                type: FrameType.OUTPUT,
                contentType: output.type === OutputType.TEXT ? 'MARKDOWN' : 'JSON',
                content: typeof output.data === 'string' ? output.data : JSON.stringify(output.data, null, 2),
                metadata: output.metadata
            };
            this.emit(outputFrame);
        });
    }

    // 3. Process Message (as Log)
    if (response.message) {
         const docFrame: DocumentFrame = {
            id: `doc-msg-${timestamp}`,
            timestamp: Date.now(),
            type: FrameType.DOCUMENT,
            title: '系统消息',
            contentType: 'LOG',
            content: response.message
        };
        this.emit(docFrame);
    }

    // 4. Process AwaitSpec (if waiting)
    if (newStatus === AgentStatus.WAITING && response.awaitSpec) {
        this.currentAwaitSpec = response.awaitSpec;
        
        // Map Backend AwaitSpec -> Frontend AwaitFrame
        const awaitFrame: AwaitFrame = {
            id: `await-${timestamp}`,
            timestamp: Date.now(),
            type: FrameType.AWAIT,
            message: response.awaitSpec.message || '系统需要您的输入...',
            schema: {
                type: response.awaitSpec.type === 'CONFIRMATION' || response.awaitSpec.confirmation ? 'CONFIRMATION' : 'TEXT',
                // We can map 'options' here if we supported SELECTION type in UI
            },
            resolved: false
        };
        
        // Emit the Await Frame with the Status Update
        this.emit(awaitFrame, { status: newStatus });
    } else {
        // Just update status if no await frame needed
        this.emit(null, { status: newStatus });
    }
  }

  // Helper: Map simple string input to backend structured object
  private mapInputToStructure(value: string, spec: AwaitSpec): Record<string, any> {
    const result: Record<string, any> = {};

    // Strategy 1: If spec has fields, try to match the first text field
    if (spec.fields && spec.fields.length > 0) {
        const firstField = spec.fields[0];
        result[firstField.key] = value;
        return result;
    }

    // Strategy 2: If it's a confirmation
    if (spec.type === 'CONFIRMATION' || spec.confirmation) {
        if (value === 'CONFIRM') return { confirmed: true };
        if (value === 'CANCEL') return { confirmed: false };
        // Fallback for text
        return { confirmed: value.toLowerCase().startsWith('y') };
    }

    // Strategy 3: Default fallback
    // Usually Aegis agents expect 'content' or 'decision' or just the map provided.
    // We will default to "content" as a safe bet for generic text.
    result['content'] = value; 
    // Also add 'input' just in case
    result['input'] = value;
    
    return result;
  }

  private handleError(err: any) {
      console.error(err);
      this.emit({
          id: `err-${Date.now()}`,
          timestamp: Date.now(),
          type: FrameType.DOCUMENT,
          title: '请求失败',
          contentType: 'LOG',
          content: err.message || '未知网络错误'
      }, { status: AgentStatus.IDLE });
  }
}

export const liveRuntime = new LiveRuntimeService();