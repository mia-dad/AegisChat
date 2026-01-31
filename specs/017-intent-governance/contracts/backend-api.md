# Backend API Contract: 意图治理

**Feature**: 017 - 意图治理（Intent Governance）
**Backend Version**: 0.7.0
**Date**: 2026-01-31

## Overview

本文档描述后端意图治理 API 的前端契约。前端按此契约进行适配。

---

## 1. 提交 Turn - 请求体扩展

**Endpoint**: `POST /api/agent/sessions/{sessionId}/turns`

### 新增请求字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `confirmationChoice` | `string` | 否 | 用户对意图确认回合的选择 |

**合法值**:
- `CONTINUE_CURRENT` — 继续当前任务
- `ABANDON_CURRENT` — 放弃当前任务，切换到新意图

### 互斥规则

`content`（原有字段）和 `confirmationChoice` 互斥：

| 场景 | content | confirmationChoice |
|------|---------|--------------------|
| 正常用户输入 | ✅ 填写 | ❌ 不传或 null |
| 回复确认回合 | ❌ 不传或 null | ✅ 填写 |
| 两者都为空 | — | — | → 400 错误 |

### 请求示例

**正常 Turn 提交**（无变化）:
```json
{
  "content": "帮我生成本月销售报告"
}
```

**回复确认回合**（新场景）:
```json
{
  "confirmationChoice": "CONTINUE_CURRENT"
}
```

---

## 2. 提交 Turn - 响应体扩展

### 新增响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `confirmationTurn` | `object \| null` | 确认回合负载，null 表示无确认需求 |
| `newSessionId` | `string \| null` | 用户选择 ABANDON_CURRENT 后新建 Session 的 ID |

> 所有新增字段在值为 null 时不会出现在 JSON 中（后端 `@JsonInclude(NON_NULL)`）。

### confirmationTurn 对象结构

```json
{
  "type": "INTENT_CONFIRMATION",
  "currentIntent": {
    "intentId": "a1b2c3d4-e5f6-...",
    "intentLabel": "开具发票",
    "createdAtTurn": 1,
    "confidence": 0.92,
    "locked": false
  },
  "detectedIntent": {
    "intentLabel": "查询订单",
    "confidence": 0.85,
    "sourceInput": "我想查询订单"
  },
  "driftCategory": "DRIFT",
  "options": ["CONTINUE_CURRENT", "ABANDON_CURRENT"]
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 固定为 `"INTENT_CONFIRMATION"` |
| `currentIntent.intentId` | string | 意图 UUID |
| `currentIntent.intentLabel` | string | 意图名称（展示给用户） |
| `currentIntent.createdAtTurn` | number | 该意图在第几轮被识别 |
| `currentIntent.confidence` | number | 置信度 (0.0 ~ 1.0) |
| `currentIntent.locked` | boolean | 是否已锁定 |
| `detectedIntent.intentLabel` | string | 新意图名称 |
| `detectedIntent.confidence` | number | 新意图置信度 |
| `detectedIntent.sourceInput` | string | 触发该意图的用户原文 |
| `driftCategory` | string | `AMBIGUOUS` 或 `DRIFT` |
| `options` | string[] | 可选操作列表 |

### driftCategory 枚举值

| 值 | 含义 | 前端行为 |
|----|------|---------|
| `AMBIGUOUS` | 意图模糊 | 温和提示语气 |
| `DRIFT` | 明确的意图偏移 | 警告语气 |

### 响应示例

**场景 A: 正常 Turn**（无变化）
```json
{
  "sessionState": "ACTIVE",
  "turnState": "COMPLETED",
  "executionStatus": "SUCCESS",
  "outputs": [...],
  "message": "报告已生成"
}
```

**场景 B: 检测到意图漂移**
```json
{
  "sessionState": "AWAITING_INPUT",
  "turnState": "AWAITING",
  "confirmationTurn": {
    "type": "INTENT_CONFIRMATION",
    "currentIntent": {
      "intentId": "a1b2c3d4-e5f6-...",
      "intentLabel": "开具发票",
      "createdAtTurn": 1,
      "confidence": 0.92,
      "locked": false
    },
    "detectedIntent": {
      "intentLabel": "查询订单",
      "confidence": 0.85,
      "sourceInput": "我想查询订单"
    },
    "driftCategory": "DRIFT",
    "options": ["CONTINUE_CURRENT", "ABANDON_CURRENT"]
  },
  "message": "检测到意图变化，请确认是否继续当前任务。"
}
```

**场景 C: 用户选择 CONTINUE_CURRENT**
```json
{
  "sessionState": "ACTIVE",
  "turnState": "COMPLETED",
  "executionStatus": "SUCCESS",
  "message": "已继续当前任务。"
}
```

**场景 D: 用户选择 ABANDON_CURRENT**
```json
{
  "sessionState": "ACTIVE",
  "turnState": "IN_PROGRESS",
  "newSessionId": "new-session-uuid-xxxx",
  "message": "已切换到新任务，正在识别新意图..."
}
```

---

## 3. 查询 Session - 响应体扩展

**Endpoint**: `GET /api/agent/sessions/{sessionId}`

### 新增响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `intentAnchor` | `object \| null` | 当前 Session 的意图锚点 |
| `pendingConfirmation` | `object \| null` | 待处理的确认回合 |

### intentAnchor 结构

```json
{
  "intentId": "a1b2c3d4-e5f6-...",
  "intentLabel": "开具发票",
  "createdAtTurn": 1,
  "confidence": 0.92,
  "locked": false
}
```

### pendingConfirmation 结构

与 `confirmationTurn` 结构完全一致。前端不得缓存或修改，仅用于 UI 恢复。

### 响应示例

```json
{
  "sessionId": "session-xxx",
  "state": "AWAITING_INPUT",
  "turnCount": 3,
  "goal": "开具发票",
  "createdAt": "2026-01-31T10:00:00Z",
  "updatedAt": "2026-01-31T10:30:00Z",
  "intentAnchor": {
    "intentId": "a1b2c3d4-...",
    "intentLabel": "开具发票",
    "createdAtTurn": 1,
    "confidence": 0.92,
    "locked": false
  },
  "pendingConfirmation": {
    "type": "INTENT_CONFIRMATION",
    "currentIntent": { "..." },
    "detectedIntent": { "..." },
    "driftCategory": "DRIFT",
    "options": ["CONTINUE_CURRENT", "ABANDON_CURRENT"]
  }
}
```

---

## 4. 错误响应

### 新增错误场景

| HTTP 状态码 | 触发条件 | 错误信息 |
|------------|---------|---------|
| 400 | `confirmationChoice` 值不合法 | 确认选择必须为 CONTINUE_CURRENT 或 ABANDON_CURRENT |
| 400 | `content` 和 `confirmationChoice` 都为空 | Content cannot be empty when confirmationChoice is not provided |
| 409 | 提交了 `confirmationChoice` 但无待确认回合 | 当前 Session 没有待处理的确认回合 |

### 错误响应格式

```json
{
  "error": {
    "code": "INVALID_CONFIRMATION_CHOICE",
    "message": "确认选择必须为 CONTINUE_CURRENT 或 ABANDON_CURRENT"
  }
}
```

```json
{
  "error": {
    "code": "NO_PENDING_CONFIRMATION",
    "message": "当前 Session 没有待处理的确认回合"
  }
}
```

---

## 5. 向后兼容性

- **请求体**: `confirmationChoice` 为可选字段，不传不影响原有流程
- **响应体**: 新增字段采用 `NON_NULL` 策略，无确认需求时字段不出现
- **原有接口行为完全不变**，仅在意图漂移场景下出现新字段
