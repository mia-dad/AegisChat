import React from 'react';
import { AgentStatus, ExecutionContext } from '../types';
import { Icons } from './icons';

interface Props {
  context: ExecutionContext;
  framesCount: number;
}

export const StatusPanel: React.FC<Props> = ({ context }) => {
  const getStatusDisplay = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return { label: '待机', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
      case AgentStatus.PLANNING: return { label: '规划中', color: 'bg-purple-900/30 text-purple-300 border-purple-500/30' };
      case AgentStatus.EXECUTING: return { label: '执行中', color: 'bg-tech-900/30 text-tech-300 border-tech-500/30 animate-pulse' };
      case AgentStatus.WAITING: return { label: '等待指令', color: 'bg-amber-900/30 text-amber-300 border-amber-500/30' };
      case AgentStatus.FINALIZING: return { label: '收尾中', color: 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30' };
      default: return { label: status, color: 'bg-zinc-800' };
    }
  };

  const statusMeta = getStatusDisplay(context.status);

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-3">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-1.5 rounded border border-zinc-700 shadow-inner">
                <Icons.Cpu className="w-5 h-5 text-tech-400" />
             </div>
             <div>
                <h1 className="text-base font-bold tracking-tight text-zinc-100 leading-none">牛马<span className="text-tech-500">AI</span></h1>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Agent Runtime v3.0</span>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 rounded border border-emerald-500/20 font-bold">SECURE</span>
                </div>
             </div>
           </div>

           <div className="h-8 w-px bg-zinc-800 mx-2 hidden sm:block" />

           <div className={`px-3 py-1 rounded-full border text-xs font-bold tracking-wide flex items-center gap-2 ${statusMeta.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full bg-current ${context.status === AgentStatus.EXECUTING ? 'animate-ping' : ''}`} />
              {statusMeta.label}
           </div>
        </div>

        {/* Center/Right: Current Objective (Expanded to fill remaining space) */}
        <div className="flex-1 w-full flex items-center justify-end md:justify-center lg:justify-end">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded px-4 py-1.5 flex items-center gap-3 w-full md:w-auto md:min-w-[300px] max-w-xl shadow-inner">
                <span className="text-[10px] uppercase text-zinc-500 font-mono whitespace-nowrap">当前目标 OBJECTIVE</span>
                <span className="text-xs text-zinc-300 truncate font-mono flex-1 text-right md:text-left">{context.currentObjective}</span>
            </div>
        </div>
      </div>
    </header>
  );
};