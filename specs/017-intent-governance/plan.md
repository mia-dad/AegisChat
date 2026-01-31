# Implementation Plan: 意图治理（Intent Governance）

**Branch**: `017-intent-governance` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-intent-governance/spec.md`

## Summary

前端适配后端意图治理 API 变更，实现以下功能：
1. 检测并处理后端返回的意图漂移确认回合（confirmationTurn）
2. 显示模态对话框供用户选择"继续当前任务"或"放弃当前任务"
3. 实现完整的 Session 切换逻辑（当用户选择放弃时）
4. 页面刷新后通过 pendingConfirmation 恢复确认状态
5. 在状态面板展示意图锚点信息

技术方案：扩展现有的 AwaitFrame 处理机制，新增 IntentConfirmationModal 组件，扩展 liveRuntime.ts 支持多 Session 切换。

## Technical Context

**Language/Version**: TypeScript 5.x, React 18
**Primary Dependencies**: React (hooks, context), Vite
**Storage**: N/A（前端状态管理）
**Testing**: Vitest + React Testing Library
**Target Platform**: Web browser (WASM via Vite dev server)
**Project Type**: single（前端单项目，通过 REST API 与后端通信）
**Performance Goals**:
  - 模态对话框渲染 < 100ms
  - API 请求响应 < 2s（SC-004）
  - Session 切换成功率 > 99%（SC-006）
**Constraints**:
  - 必须向后兼容现有 Await 处理机制
  - 确认对话框显示期间禁用其他输入（FR-012）
  - 超时时间可配置（默认 30 秒，FR-014）
**Scale/Scope**: 单页面应用，约 10 个组件文件需要修改/新增

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Agent-First but Human-in-the-Loop

| Requirement | Status | Notes |
|-------------|--------|-------|
| Visibility | ✅ PASS | 意图确认对话框清晰展示当前意图 vs 新意图 |
| Interruptibility | ✅ PASS | 用户可明确选择继续或放弃任务 |
| Replayability | ✅ PASS | pendingConfirmation 支持页面刷新后恢复 |

### Principle II: Structured Protocol Over Natural Language

| Requirement | Status | Notes |
|-------------|--------|-------|
| No raw LLM rendering | ✅ PASS | 所有 UI 来自结构化的 confirmationTurn |
| Protocol-only frames | ✅ PASS | 使用扩展的 Await 帧类型（INTENT_CONFIRMATION） |
| Structured interactions | ✅ PASS | confirmationChoice 枚举值（CONTINUE_CURRENT/ABANDON_CURRENT） |

### Principle III: State-Machine Primacy

| Requirement | Status | Notes |
|-------------|--------|-------|
| State visibility | ✅ PASS | StatusPanel 可展示 intentAnchor 信息 |
| Timeline-first | ✅ PASS | 确认回合作为特殊 Await 帧在时间线中显示 |
| Explicit state | ✅ PASS | AgentStatus.WAITING 状态用于意图确认期间 |

### Principle IV: Execution Awareness & Control

| Requirement | Status | Notes |
|-------------|--------|-------|
| Low-bandwidth signals | ✅ PASS | 意图名称、置信度作为结构化信号展示 |
| Auxiliary view | ✅ PASS | 意图锚点信息作为状态面板的辅助展示 |
| Collapsible | ✅ PASS | 确认对话框为模态，可关闭（超时后自动关闭） |

### Overall Result: ✅ PASS - No violations

All principles are satisfied. The feature enhances human-in-the-loop control without violating protocol-first constraints.

## Project Structure

### Documentation (this feature)

```text
specs/017-intent-governance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── backend-api.md   # Backend API contract (后端提供的契约)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Existing structure (no changes needed)
components/
├── ProtocolFrames/
│   ├── AwaitRenderer.tsx         # MODIFY: 扩展支持 INTENT_CONFIRMATION
│   ├── OutputRenderer.tsx        # NO CHANGE
│   └── DocumentRenderer.tsx      # NO CHANGE
├── StatusPanel.tsx               # MODIFY: 添加意图锚点信息展示
├── InputConsole.tsx              # MODIFY: 支持禁用状态（FR-012）
├── Timeline.tsx                  # MODIFY: 处理模态对话框渲染逻辑
└── IntentConfirmationModal.tsx   # NEW: 意图确认对话框组件

services/
├── api.ts                        # MODIFY: 添加 confirmationChoice 支持
├── backendTypes.ts               # MODIFY: 添加意图治理类型定义
└── liveRuntime.ts                # MODIFY: 添加 Session 切换逻辑

types.ts                          # MODIFY: 扩展 AwaitFrame schema 类型
```

**Structure Decision**: 项目采用单前端项目结构（Option 1），所有组件位于根目录。本次变更仅修改现有文件，新增 IntentConfirmationModal.tsx 组件。

## Complexity Tracking

> **No violations to justify - Constitution Check passed with no issues**

## Phase 0: Research & Technical Decisions

### Research Tasks

| Task | Status | Output |
|------|--------|--------|
| 现有 Await 帧处理机制分析 | ✅ DONE | AwaitRenderer.tsx 使用 schema.type 区分不同交互类型 |
| liveRuntime Session 管理分析 | ✅ DONE | 当前单 Session 模式，需扩展支持多 Session 切换 |
| 模态对话框最佳实践 | ✅ DONE | 使用固定定位 + 覆盖层，z-index 最高 |
| React 状态管理模式 | ✅ DONE | 使用现有 liveRuntime 事件订阅机制 |

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 意图确认帧类型 | 扩展 AwaitFrame，新增 schema.type: 'INTENT_CONFIRMATION' | 复用现有 Await 渲染机制，保持架构一致性 |
| 模态对话框实现 | 独立组件 IntentConfirmationModal | 关注点分离，便于测试和维护 |
| Session 切换策略 | liveRuntime 新增 switchSession() 方法 | 集中管理 Session 状态，避免状态分散 |
| 超时机制 | useEffect + setTimeout，可配置超时时间 | React 标准模式，易于测试 |
| 状态恢复 | localStorage 持久化 pendingConfirmation | 页面刷新后可恢复，符合 SPA 最佳实践 |

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for detailed entity definitions.

Key entities:
- **IntentConfirmationTurn**: 意图确认回合数据结构
- **IntentAnchor**: 意图锚点信息
- **ConfirmationChoice**: 确认选择枚举

### API Contracts

See [contracts/backend-api.md](./contracts/backend-api.md) for backend API specification.

Key endpoints:
- `POST /api/agent/sessions/{sessionId}/turns` - 扩展请求体支持 confirmationChoice
- `GET /api/agent/sessions/{sessionId}` - 扩展响应体支持 intentAnchor 和 pendingConfirmation

### Implementation Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| Type Definitions | `types.ts` | 扩展 AwaitFrame schema |
| Modal Component | `components/IntentConfirmationModal.tsx` | 意图确认对话框 |
| Await Renderer | `components/ProtocolFrames/AwaitRenderer.tsx` | 支持 INTENT_CONFIRMATION 类型 |
| Status Panel | `components/StatusPanel.tsx` | 展示意图锚点信息 |
| Runtime Service | `services/liveRuntime.ts` | Session 切换逻辑 |
| API Client | `services/api.ts` | confirmationChoice 请求支持 |
| Backend Types | `services/backendTypes.ts` | 类型定义扩展 |

## Phase 2: Task Breakdown

*Note: This section will be populated by `/speckit.tasks` command*

### Overview

| Phase | Tasks | Estimated Complexity |
|-------|-------|---------------------|
| P0: Foundations | 3 | Medium |
| P1: User Story 1 | 5 | High |
| P2: User Story 2 | 2 | Low |
| P3: User Story 3 | 2 | Low |

### Dependencies

- P0 must complete before any user story work
- P1 (Intent Drift Confirmation) is independent of P2/P3
- P2 (Refresh Recovery) depends on P1's data structures
- P3 (Intent Anchor Display) is independent

## Quick Start

See [quickstart.md](./quickstart.md) for development setup instructions.
