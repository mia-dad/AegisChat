import React from 'react';
import { OutputFrame } from '../../types';
import { Icons } from '../icons';

interface Props {
  frame: OutputFrame;
}

export const OutputRenderer: React.FC<Props> = ({ frame }) => {
  return (
    <div className="my-6 relative pl-2 group">
        {/* 左侧高亮指示条 */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-tech-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>
        
        <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-700 shadow-xl relative overflow-hidden">
            {/* 顶部标签栏 */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-tech-400">
                    <div className="p-1.5 bg-tech-500/10 rounded text-tech-400">
                      <Icons.Terminal className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold tracking-wide">执行结果 OUTPUT</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                    FORMAT: {frame.contentType}
                </span>
            </div>
            
            {/* 内容区域 */}
            <div className="prose prose-invert prose-sm max-w-none text-zinc-200">
                <div className="whitespace-pre-wrap font-sans leading-7">
                    {frame.content}
                </div>
            </div>
            
            {/* 底部操作栏 */}
            <div className="mt-5 flex gap-3 justify-end border-t border-zinc-800/50 pt-3">
                 {frame.metadata?.duration && (
                    <div className="mr-auto flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono">
                        <Icons.Clock className="w-3 h-3" />
                        耗时: {(frame.metadata.duration / 1000).toFixed(1)}s
                    </div>
                 )}
                <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition border border-zinc-700">
                    <Icons.FileText className="w-3 h-3" />
                    复制内容
                </button>
            </div>
        </div>
    </div>
  );
};