import React, { useEffect, useRef } from 'react';
import { AnyFrame, FrameType, AgentStatus } from '../types';
import { DocumentRenderer } from './ProtocolFrames/DocumentRenderer';
import { OutputRenderer } from './ProtocolFrames/OutputRenderer';
import { AwaitRenderer } from './ProtocolFrames/AwaitRenderer';
import { Icons } from './icons';

// --- Sub-Component: Thinking Bubble ---
const ThinkingBubble: React.FC<{ status: AgentStatus }> = ({ status }) => {
    const getMessage = () => {
        switch(status) {
            case AgentStatus.PLANNING: return '正在规划任务路径...';
            case AgentStatus.EXECUTING: return '正在处理请求...';
            case AgentStatus.FINALIZING: return '正在生成最终报告...';
            default: return '系统思考中...';
        }
    };

    return (
        <div className="relative pl-0 sm:pl-8 animate-in fade-in slide-in-from-bottom-2 duration-500 my-4">
             {/* Node Connector */}
             <div className="absolute left-0 top-6 w-2.5 h-2.5 -ml-[5px] rounded-full border-2 hidden sm:block z-10 bg-zinc-900 border-zinc-700"></div>
             
             <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 max-w-sm">
                <div className="flex space-x-1 h-3 items-center px-1">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-xs text-zinc-500 font-mono animate-pulse">
                    {getMessage()}
                </span>
             </div>
        </div>
    );
};

interface Props {
  frames: AnyFrame[];
  onResolveAwait: (id: string, value: string | Record<string, any>) => void;
  status: AgentStatus; // Added status prop
}

export const Timeline: React.FC<Props> = ({ frames, onResolveAwait, status }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [frames.length, status]); // Scroll when status changes (thinking bubble appears/disappears)

  const isBusy = status === AgentStatus.EXECUTING || status === AgentStatus.PLANNING || status === AgentStatus.FINALIZING;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 relative scroll-smooth">
      {/* Central Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-800/50 hidden sm:block" />

      <div className="max-w-3xl mx-auto space-y-2 pb-6">
        {frames.length === 0 && (
           <div className="text-center text-zinc-600 mt-32 flex flex-col items-center select-none animate-pulse">
              <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-4">
                <Icons.Cpu className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-500">INITIALIZING RUNTIME...</p>
           </div>
        )}

        {frames.map((frame, index) => {
            const isLatest = index === frames.length - 1;
            
            // Timestamp render
            const time = new Date(frame.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

            return (
                <div key={frame.id} className="relative pl-0 sm:pl-8 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Time Label (Desktop) */}
                    <div className="absolute left-[-4.5rem] top-4 text-[10px] font-mono text-zinc-600 hidden lg:block text-right w-12 opacity-50 group-hover:opacity-100 transition-opacity">
                        {time}
                    </div>

                    {/* Node Connector (Desktop) */}
                    <div className={`absolute left-0 top-6 w-2.5 h-2.5 -ml-[5px] rounded-full border-2 hidden sm:block z-10 transition-colors duration-300 ${
                        frame.type === FrameType.OUTPUT ? 'bg-tech-500 border-tech-900 shadow-[0_0_10px_rgba(20,184,166,0.5)]' :
                        frame.type === FrameType.AWAIT ? 'bg-amber-500 border-amber-900' :
                        'bg-zinc-900 border-zinc-700'
                    }`} />

                    {/* Frame Content */}
                    <div className="w-full">
                        {frame.type === FrameType.DOCUMENT && <DocumentRenderer frame={frame} />}
                        {frame.type === FrameType.OUTPUT && <OutputRenderer frame={frame} />}
                        {frame.type === FrameType.AWAIT && (
                            <AwaitRenderer 
                                frame={frame} 
                                onResolve={(val) => onResolveAwait(frame.id, val)} 
                                isLatest={isLatest} 
                            />
                        )}
                    </div>
                </div>
            );
        })}

        {/* Transient Thinking Bubble */}
        {isBusy && <ThinkingBubble status={status} />}

        <div ref={bottomRef} className="h-4" /> {/* Spacer */}
      </div>
    </div>
  );
};