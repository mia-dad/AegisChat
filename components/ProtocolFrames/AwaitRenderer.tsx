import React from 'react';
import { AwaitFrame } from '../../types';
import { Icons } from '../icons';

interface Props {
  frame: AwaitFrame;
  onResolve: (val: string) => void;
  isLatest: boolean;
}

export const AwaitRenderer: React.FC<Props> = ({ frame, onResolve, isLatest }) => {
  const isResolved = frame.resolved;

  return (
    <div className={`my-6 transition-all duration-500 ${
        isResolved 
        ? 'opacity-100' 
        : 'scale-[1.01] shadow-2xl shadow-amber-900/10'
    }`}>
        {/* 外框容器 */}
        <div className={`rounded-xl border p-1 transition-colors duration-500 ${
            isResolved 
            ? 'border-zinc-800 bg-zinc-900/50' 
            : 'border-amber-500/30 bg-gradient-to-br from-zinc-900 to-amber-950/20'
        }`}>
            <div className="bg-zinc-900/95 rounded-lg p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                    {/* 左侧头像/状态标 */}
                    <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors duration-500 ${
                        isResolved 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse'
                    }`}>
                        {isResolved ? <Icons.CheckCircle className="w-5 h-5" /> : <Icons.User className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        {/* 标题 */}
                        <div className="flex items-center justify-between mb-2">
                             <h3 className={`text-sm font-bold tracking-wide uppercase ${
                                 isResolved ? 'text-zinc-500' : 'text-amber-500'
                             }`}>
                                {isResolved ? '请求已处理 (RESOLVED)' : '等待输入 (AWAITING INPUT)'}
                             </h3>
                             {!isResolved && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono animate-pulse">BLOCKING</span>}
                        </div>

                        {/* 问题描述 */}
                        <p className={`text-sm leading-relaxed mb-4 ${
                            isResolved ? 'text-zinc-600' : 'text-zinc-200'
                        }`}>
                            {frame.message}
                        </p>

                        {/* 交互区域 */}
                        {!isResolved && isLatest && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {frame.schema?.type === 'CONFIRMATION' ? (
                                    <div className="flex flex-wrap gap-3">
                                        <button 
                                            onClick={() => onResolve('CONFIRM')}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-tech-600 hover:bg-tech-500 text-white text-xs font-bold rounded-md shadow-lg shadow-tech-900/50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <Icons.Play className="w-3.5 h-3.5 fill-current" />
                                            确认执行 (Yes)
                                        </button>
                                        <button 
                                            onClick={() => onResolve('CANCEL')}
                                            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-md transition-colors"
                                        >
                                            取消 / 跳过 (No)
                                        </button>
                                    </div>
                                ) : (
                                    /* TEXT INPUT GUIDANCE */
                                    <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/5 px-3 py-2 rounded border border-amber-500/10">
                                        <Icons.Terminal className="w-4 h-4 animate-bounce" />
                                        <span>请在底部输入栏填写内容...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 已解决状态的回显 */}
                        {isResolved && (
                            <div className="mt-4 border-t border-zinc-800/50 pt-4 animate-in fade-in duration-500">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-emerald-500/10 rounded-full">
                                            <Icons.User className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-500/80">操作员记录 (HUMAN INPUT)</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-600 font-mono">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                
                                <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-md p-3 flex items-center justify-between">
                                    <span className="font-mono text-sm text-zinc-200">
                                        {frame.resolvedValue === 'CONFIRM' ? '确认执行 (CONFIRMED)' : frame.resolvedValue || '已取消'}
                                    </span>
                                    {frame.resolvedValue === 'CONFIRM' && <Icons.CheckCircle className="w-4 h-4 text-emerald-600" />}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};