# Data Model: 意图治理

**Feature**: 017 - 意图治理（Intent Governance）
**Date**: 2026-01-31

## Overview

本文档定义意图治理功能涉及的前端数据模型。所有类型定义基于后端 API 契约适配而来。

## Core Types

### IntentConfirmationTurn

意图确认回合数据结构，来自后端 `TurnResponse.confirmationTurn` 字段。

```typescript
interface IntentConfirmationTurn {
  type: 'INTENT_CONFIRMATION';  // 固定值
  currentIntent: IntentInfo;
  detectedIntent: DetectedIntent;
  driftCategory: DriftCategory;
  options: ConfirmationChoice[];
}

interface IntentInfo {
  intentId: string;              // UUID
  intentLabel: string;           // 意图名称，可展示给用户
  createdAtTurn: number;         // 该意图在第几轮被识别
  confidence: number;            // 置信度 (0.0 - 1.0)
  locked: boolean;               // 是否已锁定
}

interface DetectedIntent {
  intentLabel: string;           // 新意图名称
  confidence: number;            // 新意图置信度
  sourceInput: string;           // 触发该意图的用户原文
}

type DriftCategory = 'AMBIGUOUS' | 'DRIFT';

type ConfirmationChoice = 'CONTINUE_CURRENT' | 'ABANDON_CURRENT';
```

### IntentAnchor

意图锚点信息，来自 `SessionResponse.intentAnchor` 字段。

```typescript
interface IntentAnchor {
  intentId: string;
  intentLabel: string;
  createdAtTurn: number;
  confidence: number;
  locked: boolean;
}
```

### PendingConfirmation

待处理的确认回合，结构同 `IntentConfirmationTurn`。

```typescript
type PendingConfirmation = IntentConfirmationTurn;
```

## Extended Types

### AwaitFrame Schema Extension

扩展现有 `AwaitFrame` 的 schema 类型以支持意图确认。

```typescript
// Before (types.ts)
interface AwaitFrame extends AgentFrame {
  type: FrameType.AWAIT;
  schema?: {
    type: 'CONFIRMATION' | 'TEXT' | 'SELECTION' | 'FORM';
    // ...
  };
}

// After
interface AwaitFrame extends AgentFrame {
  type: FrameType.AWAIT;
  schema?: {
    type: 'CONFIRMATION' | 'TEXT' | 'SELECTION' | 'FORM' | 'INTENT_CONFIRMATION';
    // INTENT_CONFIRMATION 专属字段
    confirmationTurn?: IntentConfirmationTurn;
    timeout?: number;  // 超时时间（毫秒），默认 30000
    // ...
  };
}
```

### BackendTypes Extension

扩展 `services/backendTypes.ts` 中的类型定义。

```typescript
// TurnRequest 扩展
interface TurnRequest {
  content?: string;              // 正常用户输入
  confirmationChoice?: ConfirmationChoice;  // 意图确认选择
}

// TurnResponse 扩展
interface TurnResponse {
  // 现有字段...
  confirmationTurn?: IntentConfirmationTurn | null;
  newSessionId?: string | null;
}

// SessionResponse 扩展（如果存在）
interface SessionResponse {
  // 现有字段...
  intentAnchor?: IntentAnchor | null;
  pendingConfirmation?: PendingConfirmation | null;
}
```

## State Model

### Local Storage Schema

用于页面刷新后恢复确认状态。

```typescript
interface StoredPendingConfirmation {
  sessionId: string;
  confirmationTurn: IntentConfirmationTurn;
  timestamp: number;  // 存储时间，用于过期检查
}

// Storage key format
const getStorageKey = (sessionId: string): string =>
  `aegischat:pending_confirmation:${sessionId}`;
```

### Component State

IntentConfirmationModal 组件状态。

```typescript
interface ModalState {
  isOpen: boolean;
  confirmationTurn: IntentConfirmationTurn | null;
  timeRemaining: number;  // 剩余时间（毫秒）
  isSubmitting: boolean;   // 提交中状态
}
```

## Data Flow

### 意图检测流程

```
后端检测到意图漂移
    ↓
TurnResponse.confirmationTurn 非空
    ↓
liveRuntime 处理响应
    ↓
发出 INTENT_CONFIRMATION 类型的 Await 帧
    ↓
AwaitRenderer 委托给 IntentConfirmationModal
    ↓
用户选择 → 提交 confirmationChoice
```

### Session 切换流程

```
用户选择 ABANDON_CURRENT
    ↓
提交 confirmationChoice: 'ABANDON_CURRENT'
    ↓
后端返回 newSessionId
    ↓
liveRuntime.switchSession(newSessionId)
    ↓
更新内部 sessionId
    ↓
发出 Session 切换事件
    ↓
UI 自动切换到新 Session
```

## Validation Rules

### ConfirmationChoice

- 只能是 `CONTINUE_CURRENT` 或 `ABANDON_CURRENT`
- 与 `content` 字段互斥

### DriftCategory

- 已知值: `AMBIGUOUS`, `DRIFT`
- 未知值按 `DRIFT` 处理（保守策略）

### Confidence

- 范围: 0.0 - 1.0
- 用于 UI 展示，无需验证

## Migration Notes

### Breaking Changes

无。所有新增字段为可选，向后兼容。

### Deprecations

无。
