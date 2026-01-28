import React, { useState } from 'react';
import { DocumentFrame } from '../../types';
import { Icons } from '../icons';

interface Props {
  frame: DocumentFrame;
}

export const DocumentRenderer: React.FC<Props> = ({ frame }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 根据内容类型决定图标和标签（中文）
  const getMeta = () => {
    switch (frame.contentType) {
      case 'PLAN': return { icon: Icons.Brain, label: '思考规划', color: 'text-purple-400' };
      case 'ANALYSIS': return { icon: Icons.Activity, label: '深度分析', color: 'text-sky-400' };
      case 'FACTS': return { icon: Icons.Database, label: '记忆/事实', color: 'text-teal-400' };
      case 'LOG': return { icon: Icons.Terminal, label: '系统日志', color: 'text-zinc-400' };
      default: return { icon: Icons.FileText, label: '文档', color: 'text-zinc-400' };
    }
  };

  const meta = getMeta();
  const Icon = meta.icon;

  return (
    <div className="group relative my-3">
      {/* 装饰线：连接 Timeline */}
      <div className="absolute -left-5 top-4 w-4 h-px bg-zinc-800 hidden sm:block"></div>

      <div className={`border transition-all duration-200 rounded-md overflow-hidden ${isExpanded ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700'}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5"
        >
          <div className="flex items-center gap-3">
            {/* 图标区域 */}
            <div className={`p-1 rounded ${isExpanded ? 'bg-zinc-800' : 'bg-transparent'}`}>
              <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
            </div>
            
            <div className="flex flex-col items-start gap-0.5">
              <span className={`text-[10px] font-bold tracking-wider uppercase opacity-70 ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-xs text-zinc-300 font-medium font-mono">{frame.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {frame.metadata?.confidence && (
                 <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                    <Icons.Brain className="w-3 h-3" />
                    {(frame.metadata.confidence * 100).toFixed(0)}% 置信度
                 </span>
            )}
            {isExpanded ? <Icons.ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <Icons.ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-950/30">
             <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
               {typeof frame.content === 'string' ? frame.content : JSON.stringify(frame.content, null, 2)}
             </pre>
          </div>
        )}
      </div>
    </div>
  );
};