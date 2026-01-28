import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './icons';

interface Props {
  isDisabled: boolean;
  placeholder?: string;
  onSend: (value: string) => void;
  inputType?: 'TEXT' | 'CONFIRMATION';
}

export const InputConsole: React.FC<Props> = ({ isDisabled, placeholder, onSend, inputType }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
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
        
        <div className="mt-2 flex justify-between px-1">
            <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                {isDisabled ? 'READ ONLY' : 'INPUT ENABLED'} 
                <span className={`w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-zinc-700' : 'bg-emerald-500 animate-pulse'}`}></span>
            </span>
            <span className="text-[10px] text-zinc-700 font-mono">按 Enter 发送</span>
        </div>
      </div>
    </div>
  );
};