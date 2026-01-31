# Feature Specification: 意图治理（Intent Governance）

**Feature Branch**: `017-intent-governance`
**Created**: 2026-01-31
**Status**: Draft
**Input**: User description: "前端 API 变更需求规格说明书 - Feature 016 意图治理"

## Clarifications

### Session 2026-01-31

- Q: 意图确认超时后如何处理？ → A: 超时后默认选择"继续当前任务"，超时时间为动态参数（默认 30 秒）
- Q: 确认对话框的展示样式？ → A: 模态对话框（Modal Dialog），覆盖层居中显示
- Q: 未知 driftCategory 值如何处理？ → A: 保守显示，按 DRIFT 级别处理
- Q: Session 切换的实现范围？ → A: 实现完整的 Session 切换逻辑（更新 liveRuntime.ts）
- Q: AMBIGUOUS 和 DRIFT 的语气差异？ → A: DRIFT 警告语气，AMBIGUOUS 温和提示语气

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 意图漂移确认与处理 (Priority: P1)

用户在进行多轮对话时，如果话题突然从一个任务跳转到另一个无关任务（例如从"开具发票"突然切换到"查询订单"），系统会检测到这种意图漂移，并弹出一个确认对话框，让用户明确选择是继续当前任务还是放弃并切换到新任务。

**Why this priority**: 这是意图治理的核心功能，直接影响用户体验和任务完成率。没有这个功能，AI 可能会在用户无意识的情况下错误地切换任务，导致原任务中断。

**Independent Test**: 可以通过模拟多轮对话测试：先发起一个任务（如"开具发票"），然后再输入一个完全不同的请求（如"查询订单"），验证系统是否正确显示意图漂移确认对话框。

**Acceptance Scenarios**:

1. **Given** 用户正在进行"开具发票"任务, **When** 用户突然输入"查询订单", **Then** 系统显示确认对话框，展示当前意图（开具发票）和检测到的新意图（查询订单）
2. **Given** 确认对话框已显示, **When** 用户点击"继续当前任务", **Then** 系统继续执行原任务并显示确认消息
3. **Given** 确认对话框已显示, **When** 用户点击"放弃当前任务", **Then** 系统切换到新 Session 并开始处理新任务
4. **Given** 确认对话框已显示, **When** 用户 30 秒内未响应, **Then** 系统自动选择"继续当前任务"并关闭对话框

---

### User Story 2 - 页面刷新后状态恢复 (Priority: P2)

当用户在等待意图确认时刷新页面或重新连接，系统能够恢复之前的确认对话框状态，让用户继续完成选择。

**Why this priority**: 这是一个重要的用户体验保障，防止因为网络问题或误操作导致用户无法完成意图确认流程。

**Independent Test**: 可以在确认对话框显示时刷新浏览器页面，验证刷新后确认对话框是否正确恢复显示。

**Acceptance Scenarios**:

1. **Given** 意图确认对话框正在显示, **When** 用户刷新浏览器页面, **Then** 页面重新加载后确认对话框仍然显示
2. **Given** 页面刷新后对话框恢复, **When** 用户做出选择, **Then** 系统正常处理用户的选择

---

### User Story 3 - 意图锚点信息展示 (Priority: P3)

在 Session 详情页面显示当前识别的意图信息，包括意图名称、置信度和创建回合数，帮助用户了解系统对当前任务的理解。

**Why this priority**: 这是一个增值功能，提供透明度但不影响核心功能。用户可以选择性地查看当前意图状态。

**Independent Test**: 可以在任何活跃的 Session 中查看是否显示意图锚点信息。

**Acceptance Scenarios**:

1. **Given** 用户正在一个活跃的 Session 中, **When** 查看状态面板或详情区域, **Then** 显示当前锚定的意图信息（名称、置信度、回合数）
2. **Given** 意图被锁定（不会触发漂移检测）, **When** 查看意图信息, **Then** 显示锁定状态标识

---

### Edge Cases

- 当网络请求失败时，用户如何得知状态？
- 当后端返回未知的 driftCategory 值时，前端按 DRIFT 级别保守处理
- 当 confirmationChoice 和 content 同时为空时，后端返回 400 错误，前端显示错误提示
- 当用户提交了 confirmationChoice 但后端没有待确认回合时，后端返回 409 错误，前端显示错误提示
- 当意图漂移检测触发后，用户 30 秒内不响应，系统自动选择"继续当前任务"
- 当 newSessionId 返回但切换失败时，前端显示错误提示并保持在当前 Session
- 多次快速连续提交意图确认时的防重复处理？
- 模态对话框显示期间，禁用其他输入方式（如输入框、快捷键）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须能够检测并处理来自后端的意图漂移确认回合（confirmationTurn）
- **FR-002**: 当收到 confirmationTurn 时，系统必须显示一个模态对话框（Modal Dialog），包含当前意图和新意图的对比信息
- **FR-003**: 确认对话框必须提供两个操作选项："继续当前任务"（CONTINUE_CURRENT）和"放弃当前任务"（ABANDON_CURRENT）
- **FR-004**: 用户选择后，系统必须通过 confirmationChoice 字段提交选择到后端
- **FR-005**: 当用户选择 ABANDON_CURRENT 后，系统必须根据返回的 newSessionId 切换到新 Session，并显示简短提示
- **FR-006**: 系统必须在页面刷新或重连时，通过 pendingConfirmation 字段恢复未完成的意图确认状态
- **FR-007**: 系统必须处理 400 和 409 错误码，并向用户显示友好的错误提示
- **FR-008**: content 和 confirmationChoice 字段必须互斥，不能同时发送
- **FR-009**: 系统必须根据 driftCategory 调整确认对话框的语气：DRIFT 使用警告语气（"检测到意图变化"），AMBIGUOUS 使用温和提示语气（"请确认您的意图"）
- **FR-010**: 系统必须能够在 Session 详情中展示 intentAnchor 信息（可选功能）
- **FR-011**: 确认对话框必须显示以下信息：当前意图名称、新意图名称、触发漂移的用户输入原文、置信度
- **FR-012**: 确认对话框显示期间，系统必须禁用其他输入方式（输入框、快捷键等）
- **FR-013**: 当后端返回 newSessionId 时，系统必须自动切换到新 Session 并显示"已切换到新任务"提示
- **FR-014**: 确认对话框必须有超时机制，超时时间可配置（默认 30 秒），超时后自动选择"继续当前任务"
- **FR-015**: 当后端返回未知的 driftCategory 值时，系统按 DRIFT 级别处理（显示警告语气）

### Key Entities

- **意图锚点（IntentAnchor）**: 代表当前 Session 锁定的任务意图，包含意图 ID、意图名称、创建回合数、置信度和锁定状态
- **确认回合（ConfirmationTurn）**: 代表一个待处理的意图漂移确认，包含当前意图、检测到的新意图、漂移类别和可选操作
- **漂移类别（DriftCategory）**: 表示意图偏移的类型，包括 AMBIGUOUS（模糊）和 DRIFT（明确偏移）。未知值按 DRIFT 处理
- **确认选择（ConfirmationChoice）**: 用户对确认回合的响应，值为 CONTINUE_CURRENT 或 ABANDON_CURRENT

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户能够在 5 秒内理解意图漂移确认对话框的内容并做出选择
- **SC-002**: 95% 的意图漂移场景能够正确显示确认对话框，不会让用户困惑
- **SC-003**: 页面刷新后，100% 的未完成确认状态能够正确恢复
- **SC-004**: 用户选择"继续当前任务"或"放弃当前任务"后，系统在 2 秒内响应用户的选择
- **SC-005**: 错误场景（400/409）下，用户能够收到清晰的错误提示，知道如何继续操作
- **SC-006**: Session 切换成功率（ABANDON_CURRENT 后）达到 99% 以上
- **SC-007**: 确认对话框超时机制能够正常工作，30 秒后自动继续当前任务

## Assumptions

- 后端已经实现了意图漂移检测逻辑，前端只需要适配 API 变更
- 后端返回的所有新增字段都采用 NON_NULL 策略，前端按可选字段处理
- 用户熟悉基本的多轮对话交互模式
- 网络环境稳定，API 请求响应时间在可接受范围内
- 后端会正确验证 confirmationChoice 的合法性（CONTINUE_CURRENT 或 ABANDON_CURRENT）
- 后端会在 confirmationTurn 中提供所有必要的前端展示信息
- 现有的 liveRuntime.ts 需要扩展以支持 Session 切换功能

## Dependencies

- 后端 API 0.7.0 版本已部署，包含意图治理相关接口变更
- 前端现有的 Session 管理和状态管理架构需要支持新增的意图治理状态
- 前端现有的错误处理机制需要支持新增的错误码
- liveRuntime.ts 需要扩展以支持多 Session 切换

## Out of Scope

- 意图漂移的检测算法（由后端负责）
- 意图锁定功能的用户界面控制（由后端控制锁定状态，前端仅展示）
- Session 切换的动画效果或过渡 UI（如有需要可后续添加）
- 意图治理的历史记录或审计日志
- 多意图并行处理的场景
