import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Timeline } from './components/Timeline';
import { StatusPanel } from './components/StatusPanel';
import { InputConsole } from './components/InputConsole';
// import { mockRuntime } from './services/mockRuntime'; // DEPRECATED
import { liveRuntime } from './services/liveRuntime'; // ACTIVE
import { AnyFrame, ExecutionContext, AgentStatus, FrameType } from './types';
import { IntentAnchor } from './services/backendTypes';

const App: React.FC = () => {
  const [frames, setFrames] = useState<AnyFrame[]>([]);
  const [context, setContext] = useState<ExecutionContext>({
    status: AgentStatus.IDLE,
    currentObjective: '连接初始化...',
    startTime: Date.now()
  });

  // Feature 017: 意图确认状态
  const [isIntentConfirmationActive, setIsIntentConfirmationActive] = useState(false);
  // Feature 017: pendingConfirmation 用于页面刷新恢复
  const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
  // Feature 017: 意图锚点信息（User Story 3）
  const [intentAnchor, setIntentAnchor] = useState<IntentAnchor | null>(null);

  // 1. Subscribe to Live Runtime
  useEffect(() => {
    // 切换为 liveRuntime
    const unsubscribe = liveRuntime.subscribe((newFrame, newContext) => {
      // 检查 newFrame 是否是 Frame 对象（防止纯 Context 更新时的类型问题）
      if (newFrame && newFrame.id) {
        setFrames(prev => {
             // 避免重复添加 ID 相同的帧 (幂等性保护)
             if (prev.some(f => f.id === newFrame.id)) return prev;
             return [...prev, newFrame];
        });

        // Feature 017: 检测意图确认对话框激活状态
        if (newFrame.type === FrameType.AWAIT &&
            (newFrame as any).schema?.type === 'INTENT_CONFIRMATION') {
          setIsIntentConfirmationActive(true);
        }
      }

      // Feature 017: 当状态不再是 WAITING 时，关闭意图确认对话框
      if (newContext.status !== AgentStatus.WAITING && isIntentConfirmationActive) {
        setIsIntentConfirmationActive(false);
        setPendingConfirmation(null);
      }

      // Feature 017: 订阅 intentAnchor 更新（User Story 3）
      const currentAnchor = liveRuntime.getIntentAnchor();
      // 使用深度比较而不是引用比较
      const anchorChanged = !intentAnchor !== !currentAnchor ||
        (currentAnchor && intentAnchor && currentAnchor.intentId !== intentAnchor.intentId);
      if (anchorChanged) {
        setIntentAnchor(currentAnchor);
      }

      setContext(newContext);
    });

    // Start Connection
    liveRuntime.initSystem();

    // Feature 017: 页面刷新后恢复 pendingConfirmation（User Story 2）
    const restorePendingConfirmation = async () => {
      const restored = await liveRuntime.restorePendingConfirmation();
      if (restored) {
        setPendingConfirmation(restored);
        setIsIntentConfirmationActive(true);
        // 创建一个临时的 AWAIT 帧来显示确认对话框
        const tempAwaitFrame: AnyFrame = {
          id: `restored-intent-${Date.now()}`,
          timestamp: Date.now(),
          type: FrameType.AWAIT,
          message: '检测到意图偏移，请确认您的选择',
          schema: {
            type: 'INTENT_CONFIRMATION',
            confirmationTurn: restored,
            timeout: 30000,
          },
          resolved: false,
        };
        setFrames(prev => [...prev, tempAwaitFrame]);
        setContext(prev => ({ ...prev, status: AgentStatus.WAITING }));
      }
    };
    restorePendingConfirmation();

    return unsubscribe;
  }, []);

  // 2. Determine active input state based on the LATEST frame
  const activeAwaitFrame = useMemo(() => {
    const lastFrame = frames[frames.length - 1];
    if (lastFrame && lastFrame.type === FrameType.AWAIT && !lastFrame.resolved) {
        return lastFrame;
    }
    return null;
  }, [frames]);

  // Update handler to accept string OR record
  const handleResolveAwait = useCallback((frameId: string, value: string | Record<string, any>) => {
    // Optimistic UI update (Local immediate feedback)
    setFrames(prev => prev.map(f => 
        f.id === frameId && f.type === FrameType.AWAIT 
            ? { ...f, resolved: true, resolvedValue: value } 
            : f
    ));
    
    // Notify Live Backend
    liveRuntime.resolveAwait(frameId, value);
  }, []);

  // Handle InputConsole submission (always string)
  const handleConsoleInput = (value: string) => {
      // 如果当前有等待的 Await 帧，关联回复
      if (activeAwaitFrame) {
          handleResolveAwait(activeAwaitFrame.id, value);
      } else {
          // 如果没有 Await 帧，可能是用户主动发起的指令（Interrupt/New Goal）
          if (context.status === AgentStatus.IDLE) {
              liveRuntime.resolveAwait('new-objective', value);
          }
      }
  };

  // Only disable input if we are waiting for a NON-TEXT widget (like a Form)
  // If it's a generic text await or no await, console is enabled.
  // Feature 017: 当意图确认对话框激活时，禁用所有输入（FR-012）
  const isInputDisabled =
    activeAwaitFrame?.schema?.type === 'FORM' ||
    activeAwaitFrame?.schema?.type === 'SELECTION' ||
    isIntentConfirmationActive;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-tech-500/30">
      
      {/* 1. Top Bar / Status */}
      <StatusPanel context={context} framesCount={frames.length} intentAnchor={intentAnchor} />

      {/* 2. Main Timeline Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <Timeline
            frames={frames}
            // @ts-ignore
            onResolveAwait={handleResolveAwait}
            status={context.status} // Passed status to control Thinking Bubble
            isIntentConfirmationActive={isIntentConfirmationActive} // Feature 017
        />
      </main>

      {/* 3. Global Input Console with Stats */}
      <InputConsole 
        isDisabled={isInputDisabled} 
        onSend={handleConsoleInput}
        placeholder={
            activeAwaitFrame?.message 
            ? `回复: ${activeAwaitFrame.message.slice(0, 30)}...` 
            : (context.status === AgentStatus.IDLE ? "请输入新的任务目标..." : "Agent 正在执行中...")
        }
        startTime={context.startTime}
        framesCount={frames.length}
        activeSkill={context.activeSkill}
      />
    </div>
  );
};

export default App;