import React, { useState } from 'react';
import { DocumentFrame } from '../../types';
import { Icons } from '../icons';
import MarkdownView from '../MarkdownView';

// Reuse simple chart for document embedding
const SimpleChart: React.FC<{ data: any; type?: 'bar' | 'line' }> = ({ data, type = 'bar' }) => {
  const categories = data.x || data.xAxis;
  const seriesList = data.series;
  if (!categories || !seriesList || seriesList.length === 0) return null;

  const series = seriesList[0];
  const values = series.data as number[];
  const height = 240;
  const width = 500;
  const padding = { top: 20, right: 10, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...values, 0);
  const upperLimit = maxValue > 0 ? maxValue * 1.1 : 10;
  const getY = (val: number) => padding.top + chartHeight - ((val / upperLimit) * chartHeight);
  const barWidth = Math.min(30, (chartWidth / values.length) * 0.5);

  return (
    <div className="w-full bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 my-4">
      <h5 className="text-xs font-bold text-zinc-400 mb-2">{data.title || 'Chart'}</h5>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
         {/* X-Axis */}
         {categories.map((cat: string, i: number) => {
            const xPos = padding.left + (chartWidth / categories.length) * i + (chartWidth / categories.length) / 2;
            return <text key={i} x={xPos} y={height - 10} textAnchor="middle" className="fill-zinc-500 text-[9px]">{cat}</text>;
         })}
         {/* Bars */}
         {values.map((val, i) => {
            const xPos = padding.left + (chartWidth / values.length) * i + ((chartWidth / values.length) - barWidth) / 2;
            const yPos = getY(val);
            return (
              <rect key={i} x={xPos} y={yPos} width={barWidth} height={(padding.top + chartHeight) - yPos} className="fill-purple-500/50" rx="2" />
            );
         })}
      </svg>
    </div>
  );
};

interface Props {
  frame: DocumentFrame;
}

export const DocumentRenderer: React.FC<Props> = ({ frame }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Render Logic
  const renderContent = () => {
    // 1. If content is object with blocks (Rich Document)
    if (typeof frame.content === 'object' && frame.content !== null && 'blocks' in frame.content && Array.isArray((frame.content as any).blocks)) {
        const doc = frame.content as any;
        return (
            <div className="space-y-4">
                {doc.blocks.map((block: any, idx: number) => {
                    switch(block.type) {
                        case 'header': return <h3 key={idx} className="text-sm font-bold text-zinc-200 mt-4 border-b border-zinc-800 pb-1">{block.text}</h3>;
                        case 'paragraph': return <MarkdownView key={idx} content={block.text} className="text-xs text-zinc-400 leading-relaxed" />;
                        case 'chart': return <SimpleChart key={idx} data={block.chart} />;
                        default: return null;
                    }
                })}
            </div>
        );
    }
    
    // 2. Simple String / Log
    const textContent = typeof frame.content === 'string' ? frame.content : JSON.stringify(frame.content, null, 2);
    return (
         <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
           {textContent}
         </pre>
    );
  };

  return (
    <div className="group relative my-3">
      <div className="absolute -left-5 top-4 w-4 h-px bg-zinc-800 hidden sm:block"></div>

      <div className={`border transition-all duration-200 rounded-md overflow-hidden ${isExpanded ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700'}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5"
        >
          <div className="flex items-center gap-3">
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
             {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};