import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './icons';

interface Props {
  isDisabled: boolean;
  placeholder?: string;
  onSend: (value: string) => void;
  // Metrics props
  startTime?: number;
  framesCount?: number;
  activeSkill?: string;
}

export const InputConsole: React.FC<Props> = ({ 
  isDisabled, 
  placeholder, 
  onSend, 
  startTime,
  framesCount = 0,
  activeSkill 
}) => {
  const [value, setValue] = useState('');
  const [uptime, setUptime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Uptime ticker
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
        setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    // Initial calculation
    setUptime(Math.floor((Date.now() - startTime) / 1000));
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDisabled]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      return `${m}m ${s}s`;
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <form 
          onSubmit={handleSubmit}
          className={`relative flex items-center gap-2 rounded-xl border px-2 py-2 transition-all duration-300 ${
            isDisabled 
              ? 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed' 
              : 'bg-zinc-900 border-zinc-700 shadow-lg shadow-tech-900/10 focus-within:border-tech-500/50 focus-within:ring-1 focus-within:ring-tech-500/50'
          }`}
        >
            <div className={`pl-2 ${isDisabled ? 'text-zinc-600' : 'text-tech-500'}`}>
                {isDisabled ? <Icons.Activity className="w-5 h-5 animate-pulse" /> : <Icons.Terminal className="w-5 h-5" />}
            </div>

            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isDisabled}
                placeholder={isDisabled ? "系统正在执行任务..." : (placeholder || "请输入指令...")}
                className="flex-1 bg-transparent px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none disabled:cursor-not-allowed font-mono"
            />

            <button
                type="submit"
                disabled={isDisabled || !value.trim()}
                className={`p-2 rounded-lg transition-all duration-200 ${
                    isDisabled || !value.trim()
                    ? 'text-zinc-700 bg-zinc-800/50'
                    : 'bg-tech-600 text-white hover:bg-tech-500 shadow-md shadow-tech-900/30'
                }`}
            >
                <Icons.ChevronRight className="w-5 h-5" />
            </button>
        </form>
        
        {/* Status Footer / Dashboard Metrics */}
        <div className="mt-3 flex items-center justify-between px-2 select-none">
            {/* Left: Input State Hint */}
            <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-zinc-700' : 'bg-emerald-500 animate-pulse'}`}></span>
                    {isDisabled ? 'READ ONLY' : 'INPUT ENABLED'} 
                </span>
                <span className="hidden sm:inline text-[10px] text-zinc-700 font-mono">|</span>
                <span className="hidden sm:inline text-[10px] text-zinc-700 font-mono">按 Enter 发送</span>
            </div>

            {/* Right: History & Config Metrics */}
            <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-mono text-zinc-500">
                {activeSkill && (
                    <div className="flex items-center gap-1.5 text-tech-500 bg-tech-500/5 px-2 py-0.5 rounded border border-tech-500/10">
                        <Icons.Activity className="w-3 h-3" />
                        <span>{activeSkill}</span>
                    </div>
                )}
                
                <div className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors" title="本次会话时长">
                    <Icons.Clock className="w-3 h-3" />
                    <span>{formatTime(uptime)}</span>
                </div>
                
                <div className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors" title="交互历史记录数">
                    <Icons.Layers className="w-3 h-3" />
                    <span>{framesCount} FRAMES</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};