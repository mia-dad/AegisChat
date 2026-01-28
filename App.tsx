import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Timeline } from './components/Timeline';
import { StatusPanel } from './components/StatusPanel';
import { InputConsole } from './components/InputConsole';
// import { mockRuntime } from './services/mockRuntime'; // DEPRECATED
import { liveRuntime } from './services/liveRuntime'; // ACTIVE
import { AnyFrame, ExecutionContext, AgentStatus, FrameType } from './types';

const App: React.FC = () => {
  const [frames, setFrames] = useState<AnyFrame[]>([]);
  const [context, setContext] = useState<ExecutionContext>({
    status: AgentStatus.IDLE,
    currentObjective: '连接初始化...',
    startTime: Date.now()
  });

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
      }
      setContext(newContext);
    });
    
    // Start Connection
    liveRuntime.initSystem();
    
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

  const handleResolveAwait = useCallback((frameId: string, value: string) => {
    // Optimistic UI update (Local immediate feedback)
    setFrames(prev => prev.map(f => 
        f.id === frameId && f.type === FrameType.AWAIT 
            ? { ...f, resolved: true, resolvedValue: value } 
            : f
    ));
    
    // Notify Live Backend
    liveRuntime.resolveAwait(frameId, value);
  }, []);

  // Handle InputConsole submission
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

  const isInputDisabled = !activeAwaitFrame && context.status !== AgentStatus.IDLE; 

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-tech-500/30">
      
      {/* 1. Top Bar / Status */}
      <StatusPanel context={context} framesCount={frames.length} />

      {/* 2. Main Timeline Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <Timeline 
            frames={frames} 
            onResolveAwait={handleResolveAwait} 
        />
      </main>

      {/* 3. Global Input Console with Stats */}
      <InputConsole 
        isDisabled={isInputDisabled} 
        onSend={handleConsoleInput}
        placeholder={activeAwaitFrame?.message ? `回复: ${activeAwaitFrame.message.slice(0, 30)}...` : (context.status === AgentStatus.IDLE ? "请输入新的任务目标..." : "Agent 正在执行中...")}
        startTime={context.startTime}
        framesCount={frames.length}
        activeSkill={context.activeSkill}
      />
    </div>
  );
};

export default App;