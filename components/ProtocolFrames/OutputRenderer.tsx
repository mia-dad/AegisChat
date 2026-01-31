import React from 'react';
import { OutputFrame } from '../../types';
import { Icons } from '../icons';
import MarkdownView from '../MarkdownView';

// --- Sub-Component: Chart Output ---
const ChartOutput: React.FC<{ data: any; metadata?: any }> = ({ data, metadata }) => {
  const categories = data.x || data.xAxis || data.categories;
  const seriesList = data.series;
  const title = data.title;

  if (!categories || !seriesList || seriesList.length === 0) return null;

  const series = seriesList[0];
  const values = series.data as number[];
  const chartType = metadata?.chartType || data.type || 'bar';

  const height = 300;
  const width = 600;
  const padding = { top: 40, right: 30, bottom: 60, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...values, 0);
  const upperLimit = maxValue > 0 ? maxValue * 1.1 : 10;

  const getY = (val: number) => padding.top + chartHeight - ((val / upperLimit) * chartHeight);
  const barWidth = Math.min(48, (chartWidth / values.length) * 0.5);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(upperLimit * t));

  return (
    <div className="w-full bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/50 my-5 shadow-sm">
      {title && (
        <div className="mb-4 pl-1 border-l-2 border-tech-500/50 pl-3">
           <h4 className="text-sm font-bold text-zinc-200 tracking-wide">{title}</h4>
        </div>
      )}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" style={{ minWidth: '100%' }}>
          {/* Grid & Y-Axis */}
          {ticks.map((tickValue, i) => {
             const yPos = getY(tickValue);
             return (
               <g key={i}>
                 <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos} stroke="#374151" strokeDasharray={i === 0 ? "" : "4 4"} strokeWidth="1" className="opacity-40" />
                 <text x={padding.left - 12} y={yPos + 4} textAnchor="end" className="fill-zinc-400 text-[10px] font-mono">{tickValue}</text>
               </g>
             );
          })}
          {/* X-Axis */}
          {categories.map((cat: string, i: number) => {
             const xPos = chartType === 'bar'
                ? padding.left + (chartWidth / categories.length) * i + (chartWidth / categories.length) / 2
                : padding.left + i * (chartWidth / (categories.length - 1));
             return (
               <text key={i} x={xPos} y={height - padding.bottom + 20} textAnchor="middle" className="fill-zinc-400 text-[10px]">{cat}</text>
             );
          })}
          {/* Data */}
          <g>
            {chartType === 'bar' ? (
              values.map((val, i) => {
                const xPos = padding.left + (chartWidth / values.length) * i + ((chartWidth / values.length) - barWidth) / 2;
                const yPos = getY(val);
                return (
                  <g key={i} className="group">
                    <rect x={xPos} y={yPos} width={barWidth} height={(padding.top + chartHeight) - yPos} className="fill-blue-600 hover:fill-blue-500 transition-colors" rx="2" />
                    <text x={xPos + barWidth/2} y={yPos - 8} textAnchor="middle" className="fill-white text-[11px] opacity-0 group-hover:opacity-100 font-bold">{val}</text>
                  </g>
                );
              })
            ) : (
               <path d={`M ${padding.left},${getY(values[0])} ${values.map((val, i) => `L ${padding.left + i * (chartWidth / (values.length - 1))},${getY(val)}`).join(' ')}`} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};

// --- Sub-Component: File Output ---
const FileOutput: React.FC<{ data: any; metadata?: any }> = ({ data, metadata }) => {
  const downloadUrl = data.downloadUrl || '#';
  const displayInfo = metadata?.displayInfo;

  const getFileIcon = (fileName: string) => {
    if (!fileName) return 'F';
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'P';
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return 'E';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'W';
    if (lower.endsWith('.pdf')) return 'PDF';
    return 'F';
  };

  return (
    <a
      href={downloadUrl}
      download={data.fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 my-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/30 rounded-lg transition-all group text-left"
    >
      <div className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-lg text-blue-400 font-bold border border-zinc-700 shadow-sm group-hover:border-blue-500/50 group-hover:text-blue-300">
        {getFileIcon(data.fileName || '')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-blue-200 transition-colors">
          {data.fileName || 'Unknown File'}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
           {displayInfo && <span className="text-xs text-zinc-500">{displayInfo}</span>}
           {data.fileSize && (
             <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 rounded">
               {(data.fileSize / 1024).toFixed(1)} KB
             </span>
           )}
        </div>
      </div>
      <div className="text-zinc-500 group-hover:text-blue-400">
         <Icons.ChevronRight className="w-5 h-5" />
      </div>
    </a>
  );
};

// --- Sub-Component: Table Output ---
const TableOutput: React.FC<{ data: any; metadata?: any }> = ({ data, metadata }) => {
  // Search Results Subtype
  if (metadata?.subtype === 'search' || !data.columns) {
    return (
      <div className="space-y-3 my-3">
        {data.rows?.map((row: any, idx: number) => (
          <div key={idx} className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors group">
            <h3 className="text-sm font-semibold text-tech-400 mb-1 truncate flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-tech-500/50"></span>
              <a href={row.url || row.link || '#'} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-tech-300">
                {row.title || row.name || '无标题'}
              </a>
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-2 mb-2 leading-relaxed pl-3.5">
                {row.description || row.snippet || row.content || ''}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono pl-3.5">
              {(row.source || row.siteName) && <span className="uppercase tracking-wider">{row.source || row.siteName}</span>}
              {row.publishedDate && <span>{row.publishedDate}</span>}
              <Icons.ChevronRight className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
            </div>
          </div>
        ))}
        {data.rowCount > data.rows?.length && (
           <div className="text-center text-[10px] text-zinc-600 italic py-2">... 共 {data.rowCount} 条结果</div>
        )}
      </div>
    );
  }

  // Standard Data Table
  if (data.rows && data.columns) {
    const isClickable = metadata?.clickable === true;
    return (
      <div className="overflow-x-auto rounded-lg border border-zinc-700 my-4 shadow-sm bg-zinc-900/30">
        <table className="w-full text-sm text-left text-zinc-300">
           <thead className="bg-zinc-800/80 text-zinc-100 uppercase text-xs tracking-wider font-semibold">
              <tr>
                {data.columns.map((col: any, i: number) => (
                  <th key={i} className="px-5 py-3 whitespace-nowrap border-b border-zinc-700">{col.header || col}</th>
                ))}
              </tr>
           </thead>
           <tbody className="divide-y divide-zinc-700/50">
              {data.rows.map((row: any, i: number) => (
                 <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    {data.columns.map((col: any, j: number) => {
                       const key = typeof col === 'object' ? col.key : col;
                       const cellVal = Array.isArray(row) ? row[j] : row[key];

                       if (j === 0 && isClickable) {
                         return (
                           <td key={j} className="px-5 py-3 whitespace-nowrap">
                             <a href={row.url || '#'} target="_blank" rel="noopener noreferrer" className="text-tech-400 hover:underline">{cellVal}</a>
                           </td>
                         );
                       }
                       return <td key={j} className="px-5 py-3 whitespace-nowrap text-zinc-400">{cellVal}</td>
                    })}
                 </tr>
              ))}
           </tbody>
        </table>
      </div>
    );
  }
  return null;
};

/**
 * 智能提取对象中的文本内容
 * 支持常见的数据结构模式
 */
const extractTextContent = (data: any): string | null => {
  if (!data || typeof data !== 'object') return null;

  // 1. 直接的 content 或 message 字段
  if (data.content && typeof data.content === 'string') {
    return data.content;
  }
  if (data.message && typeof data.message === 'string') {
    return data.message;
  }

  // 2. show_warning_message 结构 (带图标)
  if (data.show_warning_message?.message) {
    const level = data.show_warning_message.level || 'warn';
    const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    return `${icon} ${data.show_warning_message.message}`;
  }

  // 3. 遍历对象，查找有意义的字符串值
  const priorityKeys = ['text', 'result', 'output', 'description', 'title', 'summary'];
  for (const key of priorityKeys) {
    if (data[key] && typeof data[key] === 'string') {
      return data[key];
    }
  }

  // 4. 递归搜索第一个嵌套对象中的 message 或 content
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = extractTextContent(value);
      if (nested) return nested;
    }
  }

  return null;
};

interface Props {
  frame: OutputFrame;
}

export const OutputRenderer: React.FC<Props> = ({ frame }) => {
  const renderTextContent = (): React.ReactNode => {
    const content = frame.content;

    // 1. 字符串内容直接渲染
    if (typeof content === 'string') {
      return <MarkdownView content={content} />;
    }

    // 2. null 或 undefined
    if (!content) {
      return <span className="text-zinc-500 italic">无内容</span>;
    }

    // 3. 对象类型：智能提取文本
    if (typeof content === 'object') {
      const extractedText = extractTextContent(content);
      if (extractedText) {
        return <MarkdownView content={extractedText} />;
      }

      // 4. 最后回退：显示格式化的 JSON
      return (
        <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap bg-zinc-950/50 p-3 rounded border border-zinc-800">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    }

    return <span className="text-zinc-500">未知内容类型</span>;
  };

  return (
    <div className="my-6 relative pl-2 group">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-tech-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>

        <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-700 shadow-xl relative overflow-hidden">
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

            <div className="prose prose-invert prose-sm max-w-none text-zinc-200">
                {frame.contentType === 'TEXT' || frame.contentType === 'MARKDOWN' ? (
                    <div className="font-sans leading-7">
                        {renderTextContent()}
                    </div>
                ) : frame.contentType === 'CHART' ? (
                    <ChartOutput data={frame.content} metadata={frame.metadata} />
                ) : frame.contentType === 'TABLE' ? (
                    <TableOutput data={frame.content} metadata={frame.metadata} />
                ) : frame.contentType === 'FILE' ? (
                    <FileOutput data={frame.content} metadata={frame.metadata} />
                ) : (
                    <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">
                        {typeof frame.content === 'string' ? frame.content : JSON.stringify(frame.content, null, 2)}
                    </pre>
                )}
            </div>

            <div className="mt-5 flex gap-3 justify-end border-t border-zinc-800/50 pt-3">
                 {frame.metadata?.duration && (
                    <div className="mr-auto flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono">
                        <Icons.Clock className="w-3 h-3" />
                        耗时: {(frame.metadata.duration / 1000).toFixed(1)}s
                    </div>
                 )}
            </div>
        </div>
    </div>
  );
};
