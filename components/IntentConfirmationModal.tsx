import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { IntentConfirmationTurn, ConfirmationChoice, DriftCategory } from '../services/backendTypes';

interface Props {
  isOpen: boolean;
  confirmationTurn: IntentConfirmationTurn | null;
  timeout: number; // 毫秒
  onResolve: (choice: ConfirmationChoice) => void;
}

export const IntentConfirmationModal: React.FC<Props> = ({
  isOpen,
  confirmationTurn,
  timeout,
  onResolve
}) => {
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 100) {
          clearInterval(interval);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen]);

  // 超时后自动选择"继续当前任务"
  useEffect(() => {
    if (timeRemaining === 0 && isOpen && !isSubmitting) {
      handleSubmit('CONTINUE_CURRENT');
    }
  }, [timeRemaining, isOpen, isSubmitting]);

  // 获取语气配置
  const getToneConfig = useCallback(() => {
    const driftCategory = confirmationTurn?.driftCategory;
    if (driftCategory === 'AMBIGUOUS') {
      return {
        title: '意图模糊提示',
        description: '系统检测到您的请求可能与当前任务不完全一致，请确认您的选择。',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        confirmButtonClass: 'bg-amber-600 hover:bg-amber-500',
        tone: 'AMBIGUOUS'
      };
    }
    // DRIFT 或未知类型
    return {
      title: '意图偏移警告',
      description: '系统检测到明显的意图偏移，您正在切换到完全不相关的任务。',
      iconColor: 'text-red-500',
      iconBg: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      confirmButtonClass: 'bg-zinc-700 hover:bg-zinc-600',
      tone: 'DRIFT'
    };
  }, [confirmationTurn?.driftCategory]);

  const toneConfig = getToneConfig();

  const handleSubmit = useCallback((choice: ConfirmationChoice) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onResolve(choice);
  }, [isSubmitting, onResolve]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const ConfidenceBar: React.FC<{ confidence: number; label: string }> = ({ confidence, label }) => {
    const percentage = Math.round(confidence * 100);
    const getColor = () => {
      if (percentage >= 80) return 'bg-emerald-500';
      if (percentage >= 60) return 'bg-amber-500';
      return 'bg-red-500';
    };

    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400 w-16">{label}</span>
        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-zinc-400 w-10 text-right">{percentage}%</span>
      </div>
    );
  };

  if (!isOpen || !confirmationTurn) {
    return null;
  }

  const { currentIntent, detectedIntent, options } = confirmationTurn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景覆盖层 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* 模态框容器 */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200">
        {/* 顶部栏 */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${toneConfig.borderColor}`}>
          <div className={`p-2 rounded-lg ${toneConfig.iconBg}`}>
            <Icons.Alert className={`w-5 h-5 ${toneConfig.iconColor}`} />
          </div>
          <div className="flex-1">
            <h2 className={`text-sm font-bold ${toneConfig.iconColor}`}>
              {toneConfig.title}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {toneConfig.description}
            </p>
          </div>
          {/* 倒计时 */}
          <div className={`text-xs font-mono font-bold px-2 py-1 rounded ${
            timeRemaining < 10000 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-zinc-800 text-zinc-400'
          }`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* 意图对比内容 */}
        <div className="p-5 space-y-4">
          {/* 当前意图 */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-zinc-300">当前任务</span>
              {currentIntent.locked && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded">
                  已锁定
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-tech-400 mb-3">
              {currentIntent.intentLabel}
            </p>
            <ConfidenceBar confidence={currentIntent.confidence} label="置信度" />
            <div className="text-[10px] text-zinc-600 mt-2 font-mono">
              识别于第 {currentIntent.createdAtTurn} 轮 · ID: {currentIntent.intentId.slice(0, 8)}...
            </div>
          </div>

          {/* 新检测意图 */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Activity className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-zinc-300">检测到的新意图</span>
            </div>
            <p className="text-sm font-medium text-amber-400 mb-3">
              {detectedIntent.intentLabel}
            </p>
            <ConfidenceBar confidence={detectedIntent.confidence} label="置信度" />
            <div className="mt-2 bg-zinc-900 rounded p-2">
              <span className="text-[10px] text-zinc-500 block mb-1">触发输入:</span>
              <span className="text-xs text-zinc-300 italic">
                "{detectedIntent.sourceInput.slice(0, 50)}{detectedIntent.sourceInput.length > 50 ? '...' : ''}"
              </span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-5 py-4 border-t border-zinc-800 flex gap-3">
          <button
            onClick={() => handleSubmit('CONTINUE_CURRENT')}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all ${
              isSubmitting
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : toneConfig.confirmButtonClass
            }`}
          >
            {isSubmitting ? (
              <>
                <Icons.Activity className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Icons.CheckCircle className="w-4 h-4" />
                继续当前任务
              </>
            )}
          </button>
          <button
            onClick={() => handleSubmit('ABANDON_CURRENT')}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all ${
              isSubmitting
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-tech-600 hover:bg-tech-500 shadow-lg shadow-tech-900/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Icons.Activity className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Icons.Play className="w-4 h-4" />
                放弃当前，切换任务
              </>
            )}
          </button>
        </div>

        {/* 底部提示 */}
        <div className="px-5 pb-4">
          <p className="text-[10px] text-zinc-600 text-center">
            超时后将自动选择"继续当前任务"
          </p>
        </div>
      </div>
    </div>
  );
};
