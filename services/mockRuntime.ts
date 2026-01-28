import { AnyFrame, FrameType, AgentStatus, ExecutionContext } from '../types';

/**
 * 模拟后端 Runtime 发送数据
 * 剧本：分析一个旧项目并尝试重构
 */
export class MockRuntimeService {
  private listeners: ((frame: AnyFrame, context: ExecutionContext) => void)[] = [];
  private currentContext: ExecutionContext = {
    status: AgentStatus.IDLE,
    currentObjective: '系统待机中...',
    startTime: Date.now(),
  };

  constructor() {}

  subscribe(callback: (frame: AnyFrame, context: ExecutionContext) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(frame: AnyFrame, contextUpdates?: Partial<ExecutionContext>) {
    if (contextUpdates) {
      this.currentContext = { ...this.currentContext, ...contextUpdates };
    }
    this.listeners.forEach(cb => cb(frame, this.currentContext));
  }

  // 1. 系统初始化，等待用户输入目标
  async initSystem() {
    this.emit({
      id: 'doc-boot',
      timestamp: Date.now(),
      type: FrameType.DOCUMENT,
      title: '系统启动',
      contentType: 'LOG',
      content: '牛马AI Runtime v3.0 内核加载完成。\n安全连接已建立 (TLS v1.3)。',
    }, { 
      status: AgentStatus.IDLE, 
      currentObjective: '等待任务分配',
      startTime: Date.now()
    });

    await new Promise(r => setTimeout(r, 600));

    this.emit({
      id: 'await-objective',
      timestamp: Date.now(),
      type: FrameType.AWAIT,
      message: '请描述您的任务目标 (Objective)，例如：“帮我分析这个项目的代码质量”',
      schema: { type: 'TEXT' }
    }, { status: AgentStatus.WAITING });
  }

  // 2. 处理交互
  async resolveAwait(frameId: string, value: string) {
    // 处理初始目标输入
    if (frameId === 'await-objective') {
        this.emit({
             id: 'doc-user-objective',
             timestamp: Date.now(),
             type: FrameType.DOCUMENT,
             title: '任务接收',
             contentType: 'LOG',
             content: `用户指令: ${value}`,
        }, { 
            status: AgentStatus.PLANNING, 
            currentObjective: value, // 更新上下文目标
            startTime: Date.now() // 重置计时器
        });
        
        this.runAnalysisScenario();
        return;
    }

    // 处理后续的确认/文本输入
    // 模拟思考延迟
    this.emit({
        id: `doc-log-${Date.now()}`,
        timestamp: Date.now(),
        type: FrameType.DOCUMENT,
        title: '交互响应',
        contentType: 'LOG',
        content: `接收到反馈: ${value === 'CONFIRM' ? '确认执行' : (value === 'CANCEL' ? '取消操作' : value)}`,
    }, { status: AgentStatus.EXECUTING, activeSkill: 'CodeWriter' });

    await new Promise(r => setTimeout(r, 1000));

    // 根据场景处理特定ID
    if (frameId === 'await-refactor') {
        if (value === 'CONFIRM' || value.toLowerCase().includes('yes') || value.includes('确认')) {
             this.emit({
                id: 'doc-scan-results',
                timestamp: Date.now(),
                type: FrameType.DOCUMENT,
                title: '重构执行报告',
                contentType: 'ANALYSIS',
                content: '已成功转换 15 个组件。\n遇到 2 个复杂生命周期无法自动映射，已标记为 TODO。',
                metadata: { riskLevel: 'MEDIUM' }
            });
        } else {
            this.emit({
                id: 'doc-skip',
                timestamp: Date.now(),
                type: FrameType.DOCUMENT,
                title: '跳过操作',
                contentType: 'LOG',
                content: '用户选择跳过自动重构步骤，保持原有代码结构。',
            });
        }
        
        await new Promise(r => setTimeout(r, 1000));
        this.finishScenario();
    }
  }

  // 3. 执行分析剧本
  private async runAnalysisScenario() {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(1000);

    // 规划
    this.emit({
      id: 'doc-plan',
      timestamp: Date.now(),
      type: FrameType.DOCUMENT,
      title: '生成执行计划',
      contentType: 'PLAN',
      content: JSON.stringify({
        "阶段一": "上下文理解与依赖分析",
        "阶段二": "执行代码静态扫描",
        "阶段三": "生成交互式建议",
        "策略": "保守策略 (避免破坏性变更)"
      }, null, 2),
      metadata: { confidence: 0.98 }
    }, { status: AgentStatus.EXECUTING, activeSkill: 'Planner' });

    await delay(1500);

    // 事实提取
    this.emit({
      id: 'doc-fact-1',
      timestamp: Date.now(),
      type: FrameType.DOCUMENT,
      title: '环境分析事实',
      contentType: 'FACTS',
      content: '- 检测到 React 项目\n- 发现潜在性能瓶颈: 大量未优化的 Re-render\n- 依赖项风险: 3 个高危漏洞',
    }, { activeSkill: 'CodeScanner' });

    await delay(1200);

    // 需要用户决策
    this.emit({
      id: 'await-refactor',
      timestamp: Date.now(),
      type: FrameType.AWAIT,
      message: '检测到大量过时的类组件 (Class Components)。是否启动“自动转换 Hooks”尝试？(注意：此操作不可逆，建议先备份)',
      schema: {
        type: 'CONFIRMATION', 
      }
    }, { status: AgentStatus.WAITING, activeSkill: 'RefactorEngine' });
  }

  private finishScenario() {
    this.emit({
      id: 'out-final',
      timestamp: Date.now(),
      type: FrameType.OUTPUT,
      contentType: 'MARKDOWN',
      content: `## 任务执行完成\n\n基于您的指令，系统已完成代码库的初步优化。\n\n### 交付物清单\n- [x] 代码健康度报告\n- [x] 自动重构补丁 (Patch)\n\n> 建议您在合并代码前运行 \`npm test\` 进行回归测试。`,
      metadata: { duration: 5200 }
    }, { status: AgentStatus.IDLE, currentObjective: '任务完成', activeSkill: undefined });
  }
}

export const mockRuntime = new MockRuntimeService();