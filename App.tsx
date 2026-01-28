import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Timeline } from './components/Timeline';
import { StatusPanel } from './components/StatusPanel';
import { InputConsole } from './components/InputConsole';
import { mockRuntime } from './services/mockRuntime';
import { AnyFrame, ExecutionContext, AgentStatus, FrameType } from './types';

const App: React.FC = () => {
  const [frames, setFrames] = useState<AnyFrame[]>([]);
  const [context, setContext] = useState<ExecutionContext>({
    status: AgentStatus.IDLE,
    currentObjective: '系统初始化',
    startTime: Date.now()
  });

  // 1. Subscribe to Runtime
  useEffect(() => {
    const unsubscribe = mockRuntime.subscribe((newFrame, newContext) => {
      setFrames(prev => [...prev, newFrame]);
      setContext(newContext);
    });
    
    // Auto start system on mount
    mockRuntime.initSystem();
    
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
    // Optimistic UI update
    setFrames(prev => prev.map(f => 
        f.id === frameId && f.type === FrameType.AWAIT 
            ? { ...f, resolved: true, resolvedValue: value } 
            : f
    ));
    // Notify backend
    mockRuntime.resolveAwait(frameId, value);
  }, []);

  // Handle InputConsole submission
  const handleConsoleInput = (value: string) => {
      if (activeAwaitFrame) {
          handleResolveAwait(activeAwaitFrame.id, value);
      }
  };

  const isInputDisabled = !activeAwaitFrame || activeAwaitFrame.schema?.type === 'CONFIRMATION'; // Disable text input if only confirmation needed (buttons used instead)

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

      {/* 3. Global Input Console */}
      <InputConsole 
        isDisabled={isInputDisabled} 
        onSend={handleConsoleInput}
        placeholder={activeAwaitFrame?.message ? `回复: ${activeAwaitFrame.message.slice(0, 30)}...` : undefined}
      />
    </div>
  );
};

export default App;