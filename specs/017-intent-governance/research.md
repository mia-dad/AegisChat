# Research: 意图治理前端实现

**Feature**: 017 - 意图治理（Intent Governance）
**Date**: 2026-01-31

## Overview

本文档记录意图治理功能前端实现的技术决策和研究结论。

## Technical Decisions

### 1. 意图确认帧类型设计

**Decision**: 扩展 AwaitFrame，新增 schema.type: 'INTENT_CONFIRMATION'

**Rationale**:
- 现有 AwaitRenderer 已支持多种交互类型（CONFIRMATION, SELECTION, FORM）
- 意图确认本质上是用户对系统提议的确认，符合 Await 帧语义
- 复用现有渲染管道，减少代码重复

**Alternatives Considered**:
- 创建新的 FrameType.INTENT_CONFIRMATION: 被拒绝，会增加架构复杂度
- 使用普通 CONFIRMATION 类型: 被拒绝，无法承载意图漂移的丰富信息（当前意图 vs 新意图）

### 2. 模态对话框实现策略

**Decision**: 创建独立组件 IntentConfirmationModal

**Rationale**:
- 关注点分离：确认逻辑与 Await 渲染器分离
- 便于测试：可独立测试对话框组件
- 复用性：未来可能需要在其他位置复用

**Implementation Details**:
- 使用 fixed定位 + z-index: 9999 确保在最上层
- 背景遮罩层 (backdrop) 阻止用户点击其他区域
- 支持 ESC 键关闭（可选，取决于产品需求）

### 3. Session 切换策略

**Decision**: 在 liveRuntime 中新增 switchSession() 方法

**Rationale**:
- Session 状态管理逻辑集中在 LiveRuntimeService 中
- 切换时需要更新内部 sessionId、重置 currentAwaitSpec
- 可发出事件通知订阅者（Timeline、StatusPanel）

**Implementation Sketch**:
```typescript
async switchSession(newSessionId: string) {
  this.sessionId = newSessionId;
  this.emit({
    id: this.genId('session-switch'),
    type: FrameType.DOCUMENT,
    title: 'Session 已切换',
    contentType: 'LOG',
    content: `已切换到新 Session: ${newSessionId}`
  });
}
```

### 4. 超时机制设计

**Decision**: useEffect + setTimeout，超时时间可配置

**Rationale**:
- React 标准模式，易于理解和维护
- 可通过环境变量或配置文件设置默认超时时间
- 组件卸载时自动清理定时器

**Configuration**:
```typescript
const DEFAULT_CONFIRMATION_TIMEOUT = 30000; // 30秒
const confirmationTimeout = import.meta.env.VITE_CONFIRMATION_TIMEOUT
  ? parseInt(import.meta.env.VITE_CONFIRMATION_TIMEOUT)
  : DEFAULT_CONFIRMATION_TIMEOUT;
```

### 5. 状态恢复机制

**Decision**: localStorage 持久化 pendingConfirmation

**Rationale**:
- 页面刷新后可恢复用户未完成的选择
- 符合 SPA 单页应用的最佳实践
- localStorage API 简单可靠，无需额外依赖

**Storage Key**:
```typescript
const STORAGE_KEY = (sessionId: string) =>
  `aegischat:pending_confirmation:${sessionId}`;
```

## Code Analysis Findings

### Existing Await Frame Handling

AwaitRenderer.tsx (components/ProtocolFrames/AwaitRenderer.tsx) 当前支持：
- `CONFIRMATION`: 是/否确认按钮
- `SELECTION`: 选项列表
- `FORM`: 结构化表单
- `TEXT`: 自由文本输入

意图确认将作为第五种类型添加。

### LiveRuntime Session Management

liveRuntime.ts 当前维护：
- `sessionId: string | null` - 当前活动 Session
- `currentAwaitSpec: AwaitSpec | null` - 当前待处理请求
- `listeners[]` - 事件订阅者

需要新增：
- Session 切换逻辑
- confirmationChoice 提交支持

## Dependencies

### External Dependencies (No new additions)

- React 18 (already used)
- TypeScript 5.x (already used)
- Vite (already used)

### Internal Dependencies

- `types.ts`: AwaitFrame 类型定义
- `services/api.ts`: HTTP 客户端
- `services/backendTypes.ts`: 后端类型定义
- `components/ProtocolFrames/AwaitRenderer.tsx`: 基础 Await 渲染器

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| 后端 API 不兼容 | HIGH | 先确认后端版本，做好降级处理 |
| Session 切换失败 | MEDIUM | 错误提示 + 保持在当前 Session |
| 超时与用户操作冲突 | LOW | 超时后清除定时器，用户操作无效 |

## Open Questions

None - all technical decisions resolved.
