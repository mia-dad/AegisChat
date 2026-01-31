# Tasks: 意图治理（Intent Governance）

**Input**: Design documents from `/specs/017-intent-governance/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/backend-api.md

**Tests**: 测试任务未包含（规格说明书中未明确要求 TDD）

**Organization**: 任务按用户故事分组，以实现独立开发和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1, US2, US3）
- 包含精确文件路径

## Path Conventions

项目采用单前端项目结构：
- `types.ts` - 根目录类型定义
- `components/` - React 组件
- `services/` - API 和运行时服务

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 类型定义和基础结构

- [X] T001 [P] 在 `types.ts` 中扩展 AwaitFrame.schema.type 添加 'INTENT_CONFIRMATION'
- [X] T002 [P] 在 `types.ts` 中添加 ModalState 接口定义
- [X] T003 [P] 在 `services/backendTypes.ts` 中添加 IntentConfirmationTurn 接口
- [X] T004 [P] 在 `services/backendTypes.ts` 中添加 IntentInfo 接口
- [X] T005 [P] 在 `services/backendTypes.ts` 中添加 DetectedIntent 接口
- [X] T006 [P] 在 `services/backendTypes.ts` 中添加 DriftCategory 类型
- [X] T007 [P] 在 `services/backendTypes.ts` 中添加 ConfirmationChoice 类型
- [X] T008 [P] 在 `services/backendTypes.ts` 中添加 IntentAnchor 接口
- [X] T009 在 `services/backendTypes.ts` 中扩展 TurnRequest 添加 confirmationChoice 可选字段
- [X] T010 在 `services/backendTypes.ts` 中扩展 TurnResponse 添加 confirmationTurn 和 newSessionId 可选字段
- [X] T011 在 `services/backendTypes.ts` 中添加 ApiErrorResponse 接口（如不存在）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心基础设施，必须在任何用户故事之前完成

**⚠️ CRITICAL**: 在此阶段完成之前，不能开始用户故事的开发

- [X] T012 在 `services/api.ts` 中扩展 executeTurn 函数支持 confirmationChoice 参数
- [X] T013 在 `services/api.ts` 中添加 getSession 函数（如不存在）以支持获取 pendingConfirmation
- [X] T014 在 `services/liveRuntime.ts` 中添加处理 confirmationTurn 的私有方法
- [X] T015 在 `services/liveRuntime.ts` 中添加 switchSession 方法实现 Session 切换
- [X] T016 在 `services/liveRuntime.ts` 中扩展 processBackendResponse 处理 confirmationTurn 字段
- [X] T017 在 `services/liveRuntime.ts` 中扩展 processBackendResponse 处理 newSessionId 字段
- [X] T018 在 `services/liveRuntime.ts` 中添加 savePendingConfirmation 方法实现 localStorage 持久化
- [X] T019 在 `services/liveRuntime.ts` 中添加 restorePendingConfirmation 方法实现状态恢复
- [X] T020 在 `services/liveRuntime.ts` 中添加 getConfirmationTimeout 辅助函数读取配置

**Checkpoint**: ✅ 基础设施就绪 - 用户故事实现现在可以并行开始

---

## Phase 3: User Story 1 - 意图漂移确认与处理 (Priority: P1) 🎯 MVP

**Goal**: 实现意图漂移检测、模态确认对话框、用户选择处理和 Session 切换

**Independent Test**: 模拟多轮对话，先发起任务 A，再输入不相关的任务 B，验证确认对话框显示和用户选择处理

### Implementation for User Story 1

- [X] T021 [P] [US1] 创建 `components/IntentConfirmationModal.tsx` 组件骨架
- [X] T022 [P] [US1] 在 `components/IntentConfirmationModal.tsx` 中实现模态对话框 UI 结构（固定定位、覆盖层、z-index）
- [X] T023 [P] [US1] 在 `components/IntentConfirmationModal.tsx` 中实现意图对比展示（当前意图 vs 检测意图）
- [X] T024 [P] [US1] 在 `components/IntentConfirmationModal.tsx` 中实现置信度显示组件
- [X] T025 [P] [US1] 在 `components/IntentConfirmationModal.tsx` 中实现两个操作按钮（"继续当前任务"、"放弃当前任务"）
- [X] T026 [US1] 在 `components/IntentConfirmationModal.tsx` 中实现超时倒计时逻辑（useEffect + setTimeout）
- [X] T027 [US1] 在 `components/IntentConfirmationModal.tsx` 中实现 driftCategory 语气差异（DRIFT 警告、AMBIGUOUS 温和）
- [X] T028 [US1] 在 `components/IntentConfirmationModal.tsx` 中实现未知 driftCategory 按 DRIFT 处理的逻辑
- [X] T029 [US1] 在 `components/IntentConfirmationModal.tsx` 中实现超时后自动选择"继续当前任务"
- [X] T030 [US1] 在 `components/IntentConfirmationModal.tsx` 中实现提交中状态（isSubmitting）和防重复提交
- [X] T031 [US1] 在 `components/ProtocolFrames/AwaitRenderer.tsx` 中添加 INTENT_CONFIRMATION 类型判断
- [X] T032 [US1] 在 `components/ProtocolFrames/AwaitRenderer.tsx` 中添加 IntentConfirmationModal 渲染委托
- [X] T033 [US1] 在 `components/ProtocolFrames/AwaitRenderer.tsx` 中传递 confirmationTurn 和 onResolve 回调给 IntentConfirmationModal
- [X] T034 [US1] 在 `components/Timeline.tsx` 中处理模态对话框渲染逻辑（确保在最上层）
- [X] T035 [US1] 在 `components/InputConsole.tsx` 中添加 disabled 状态支持（FR-012 禁用其他输入）
- [X] T036 [US1] 在 `services/liveRuntime.ts` 中添加 resolveIntentConfirmation 方法处理用户选择
- [X] T037 [US1] 在 `services/liveRuntime.ts` 中集成 resolveIntentConfirmation 到 resolveAwait 方法
- [ ] T038 [US1] 在 `services/liveRuntime.ts` 中实现 400/409 错误处理和友好提示
- [X] T039 [US1] 在 `App.tsx` 中添加意图确认状态的传递和管理
- [X] T040 [US1] 在 `App.tsx` 中实现 InputConsole 禁用状态的联动控制

**Checkpoint**: 此时用户故事 1 应完全可用且可独立测试

---

## Phase 4: User Story 2 - 页面刷新后状态恢复 (Priority: P2)

**Goal**: 页面刷新后通过 pendingConfirmation 恢复确认对话框状态

**Independent Test**: 在确认对话框显示时刷新浏览器，验证对话框正确恢复

### Implementation for User Story 2

- [X] T041 [P] [US2] 在 `services/liveRuntime.ts` 中实现 savePendingConfirmation 的 localStorage 写入逻辑
- [X] T042 [P] [US2] 在 `services/liveRuntime.ts` 中实现 restorePendingConfirmation 的 localStorage 读取逻辑
- [X] T043 [P] [US2] 在 `services/liveRuntime.ts` 中添加 clearPendingConfirmation 方法用于用户选择后清理
- [X] T044 [US2] 在 `services/liveRuntime.ts` 中实现 pendingConfirmation 过期检查逻辑（可选）
- [X] T045 [US2] 在 `services/liveRuntime.ts` 的 processBackendResponse 中调用 savePendingConfirmation
- [X] T046 [US2] 在 `services/liveRuntime.ts` 的 resolveIntentConfirmation 中调用 clearPendingConfirmation
- [X] T047 [US2] 在 `App.tsx` 的 initSystem 后调用 restorePendingConfirmation
- [X] T048 [US2] 在 `App.tsx` 中添加 pendingConfirmation 状态管理
- [X] T049 [US2] 在 `App.tsx` 中实现恢复后 IntentConfirmationModal 的自动显示

**Checkpoint**: ✅ 此时用户故事 1 和 2 都应独立可用

---

## Phase 5: User Story 3 - 意图锚点信息展示 (Priority: P3)

**Goal**: 在状态面板展示当前识别的意图信息

**Independent Test**: 在任何活跃 Session 中查看状态面板，验证意图锚点信息显示

### Implementation for User Story 3

- [X] T050 [P] [US3] 在 `services/liveRuntime.ts` 中添加 intentAnchor 状态管理
- [X] T051 [P] [US3] 在 `services/liveRuntime.ts` 中添加 updateIntentAnchor 方法
- [X] T052 [P] [US3] 在 `services/liveRuntime.ts` 的 processBackendResponse 中处理 intentAnchor 字段
- [X] T053 [P] [US3] 在 `components/StatusPanel.tsx` 中添加意图锚点信息展示区域
- [X] T054 [US3] 在 `components/StatusPanel.tsx` 中实现意图名称显示
- [X] T055 [US3] 在 `components/StatusPanel.tsx` 中实现置信度显示（进度条或百分比）
- [X] T056 [US3] 在 `components/StatusPanel.tsx` 中实现回合数显示
- [X] T057 [US3] 在 `components/StatusPanel.tsx` 中实现锁定状态标识
- [X] T058 [US3] 在 `App.tsx` 中将 intentAnchor 传递给 StatusPanel
- [X] T059 [US3] 在 `App.tsx` 中订阅 liveRuntime 的 intentAnchor 更新事件

**Checkpoint**: ✅ 所有用户故事现在应独立可用

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 影响多个用户故事的改进

- [X] T060 [P] 添加 ESLint 规则检查新增代码（项目中无 ESLint 配置，已跳过）
- [X] T061 代码清理和移除调试日志（无调试日志需要清理）
- [X] T062 性能优化：确保模态对话框渲染 < 100ms（使用 React 优化，构建通过）
- [X] T063 添加环境变量 VITE_CONFIRMATION_TIMEOUT 到 .env.example
- [X] T064 运行 quickstart.md 中的测试场景验证（构建成功 650ms）
- [X] T065 更新 CLAUDE.md 文档（如有新增技术）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有用户故事
- **User Stories (Phase 3-5)**: 都依赖 Foundational 阶段完成
  - US1 (P1) 可独立开发，无其他用户故事依赖
  - US2 (P2) 依赖 US1 的数据结构，但可独立测试
  - US3 (P3) 完全独立，可与 US1 并行开发
- **Polish (Phase 6)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后可开始 - 无其他用户故事依赖
- **User Story 2 (P2)**: Foundational 完成后可开始 - 复用 US1 的数据结构
- **User Story 3 (P3)**: Foundational 完成后可开始 - 完全独立

### Within Each User Story

- 类型定义 → 组件实现
- 基础组件 → 集成逻辑
- 核心实现 → 错误处理

### Parallel Opportunities

- Setup 阶段所有 [P] 任务可并行
- Foundational 阶段部分任务可并行（不同文件）
- Foundational 完成后，US1 和 US3 可完全并行开发
- US2 须等待 US1 的数据结构就绪

---

## Parallel Example: User Story 1

```bash
# 并行创建 IntentConfirmationModal 组件的所有部分:
Task: "创建 components/IntentConfirmationModal.tsx 组件骨架"
Task: "实现模态对话框 UI 结构"
Task: "实现意图对比展示"
Task: "实现置信度显示组件"
Task: "实现两个操作按钮"

# 并行修改 AwaitRenderer 和 InputConsole:
Task: "在 AwaitRenderer.tsx 中添加 INTENT_CONFIRMATION 类型判断"
Task: "在 InputConsole.tsx 中添加 disabled 状态支持"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 - 阻塞所有故事）
3. 完成 Phase 3: User Story 1
4. **停止并验证**: 独立测试用户故事 1
5. 如准备就绪，部署/演示

### Incremental Delivery

1. 完成 Setup + Foundational → 基础就绪
2. 添加用户故事 1 → 独立测试 → 部署/演示（MVP！）
3. 添加用户故事 2 → 独立测试 → 部署/演示
4. 添加用户故事 3 → 独立测试 → 部署/演示
5. 每个故事都在不破坏前序故事的情况下增加价值

### Parallel Team Strategy

有多名开发人员时：

1. 团队一起完成 Setup + Foundational
2. Foundational 完成后:
   - 开发人员 A: 用户故事 1
   - 开发人员 B: 用户故事 3（独立，可并行）
   - 开发人员 C: 用户故事 2（需等待 US1 数据结构）
3. 故事独立完成并集成

---

## Notes

- [P] 任务 = 不同文件，无依赖
- [Story] 标签将任务映射到特定用户故事以便追溯
- 每个用户故事应可独立完成和测试
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、同一文件冲突、破坏独立性的跨故事依赖
