import React, { useState } from 'react';
import { AwaitFrame } from '../../types';
import { Icons } from '../icons';

interface Props {
  frame: AwaitFrame;
  onResolve: (val: string | Record<string, any>) => void;
  isLatest: boolean;
}

export const AwaitRenderer: React.FC<Props> = ({ frame, onResolve, isLatest }) => {
  const isResolved = frame.resolved;
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  // Form handling logic
  const handleInputChange = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const isFormValid = frame.schema?.fields?.every(f => {
    if (!f.required) return true;
    const val = formValues[f.key];
    return val !== undefined && val !== '' && val !== null;
  });

  // Render different widget types
  const renderWidget = () => {
    if (!frame.schema) return null;

    // 1. CONFIRMATION
    if (frame.schema.type === 'CONFIRMATION') {
        return (
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
        );
    }

    // 2. SELECTION (Buttons)
    if (frame.schema.type === 'SELECTION' && frame.schema.options) {
        return (
            <div className="flex flex-col gap-2">
                {frame.schema.options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onResolve(opt.value)}
                        className="w-full text-left bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-tech-500/50 p-3 rounded-lg transition-all group"
                    >
                        <div className="font-medium text-tech-400 group-hover:text-tech-300 text-sm">
                            {opt.label}
                        </div>
                        {opt.description && (
                            <div className="text-zinc-500 text-xs mt-1">
                                {opt.description}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        );
    }

    // 3. FORM
    if (frame.schema.type === 'FORM' && frame.schema.fields) {
        return (
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                <div className="space-y-4">
                    {frame.schema.fields.map(f => (
                        <div key={f.key} className="flex flex-col space-y-1.5">
                            <label className="text-xs text-zinc-400 font-medium ml-1">
                                {f.label} {f.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {f.type === 'boolean' ? (
                                <div className="flex items-center space-x-3 mt-1">
                                    <button
                                        onClick={() => handleInputChange(f.key, true)}
                                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${formValues[f.key] === true ? 'bg-tech-600 border-tech-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
                                    >
                                        是 (Yes)
                                    </button>
                                    <button
                                        onClick={() => handleInputChange(f.key, false)}
                                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${formValues[f.key] === false ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
                                    >
                                        否 (No)
                                    </button>
                                </div>
                            ) : f.options ? (
                                <select
                                    value={formValues[f.key] || ''}
                                    onChange={(e) => handleInputChange(f.key, e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:border-tech-500 focus:outline-none transition-colors w-full"
                                >
                                    <option value="" disabled>请选择...</option>
                                    {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                    value={formValues[f.key] || ''}
                                    onChange={(e) => handleInputChange(f.key, e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:border-tech-500 focus:outline-none transition-colors w-full"
                                    placeholder={f.description || `请输入${f.label}...`}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => onResolve(formValues)}
                    disabled={!isFormValid}
                    className="mt-5 w-full bg-tech-600 hover:bg-tech-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2 rounded-lg transition-colors text-xs shadow-lg shadow-tech-900/20"
                >
                    提交 (SUBMIT)
                </button>
            </div>
        );
    }

    // Default TEXT
    return (
        <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/5 px-3 py-2 rounded border border-amber-500/10">
            <Icons.Terminal className="w-4 h-4 animate-bounce" />
            <span>请在底部输入栏填写内容...</span>
        </div>
    );
  };

  return (
    <div className={`my-6 transition-all duration-500 ${
        isResolved 
        ? 'opacity-100' 
        : 'scale-[1.01] shadow-2xl shadow-amber-900/10'
    }`}>
        <div className={`rounded-xl border p-1 transition-colors duration-500 ${
            isResolved 
            ? 'border-zinc-800 bg-zinc-900/50' 
            : 'border-amber-500/30 bg-gradient-to-br from-zinc-900 to-amber-950/20'
        }`}>
            <div className="bg-zinc-900/95 rounded-lg p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                    <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-colors duration-500 ${
                        isResolved 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse'
                    }`}>
                        {isResolved ? <Icons.CheckCircle className="w-5 h-5" /> : <Icons.User className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className={`text-sm font-bold tracking-wide uppercase ${
                                 isResolved ? 'text-zinc-500' : 'text-amber-500'
                             }`}>
                                {isResolved ? '请求已处理 (RESOLVED)' : '等待输入 (AWAITING INPUT)'}
                             </h3>
                             {!isResolved && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono animate-pulse">BLOCKING</span>}
                        </div>

                        <p className={`text-sm leading-relaxed mb-4 ${
                            isResolved ? 'text-zinc-600' : 'text-zinc-200'
                        }`}>
                            {frame.message}
                        </p>

                        {!isResolved && isLatest && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {renderWidget()}
                            </div>
                        )}

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
                                
                                <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-md p-3">
                                    <span className="font-mono text-sm text-zinc-200 break-words">
                                        {typeof frame.resolvedValue === 'string' 
                                            ? (frame.resolvedValue === 'CONFIRM' ? '确认执行 (CONFIRMED)' : frame.resolvedValue)
                                            : JSON.stringify(frame.resolvedValue, null, 2)
                                        }
                                    </span>
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