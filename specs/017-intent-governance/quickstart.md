# Quick Start: 意图治理开发指南

**Feature**: 017 - 意图治理（Intent Governance）
**Date**: 2026-01-31

## 开发环境设置

### 1. 切换到功能分支

```bash
git checkout 017-intent-governance
```

### 2. 启动开发服务器

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`

### 3. 确保后端服务运行

后端 API 需要运行在 `http://localhost:8080`

---

## 开发任务清单

### Phase 0: 基础类型定义

1. **扩展 `types.ts`**
   - 在 `AwaitFrame` 的 `schema.type` 中添加 `'INTENT_CONFIRMATION'`
   - 添加意图相关的接口定义

2. **扩展 `services/backendTypes.ts`**
   - 添加 `IntentConfirmationTurn` 接口
   - 添加 `IntentAnchor` 接口
   - 扩展 `TurnRequest` 支持 `confirmationChoice`
   - 扩展 `TurnResponse` 支持 `confirmationTurn` 和 `newSessionId`

### Phase 1: 核心功能实现

3. **创建 `components/IntentConfirmationModal.tsx`**
   - 模态对话框组件
   - 支持超时倒计时
   - 处理用户选择

4. **修改 `components/ProtocolFrames/AwaitRenderer.tsx`**
   - 添加 `'INTENT_CONFIRMATION'` 类型的渲染逻辑
   - 委托给 `IntentConfirmationModal`

5. **修改 `services/api.ts`**
   - `executeTurn` 函数支持 `confirmationChoice` 参数

6. **修改 `services/liveRuntime.ts`**
   - `processBackendResponse` 处理 `confirmationTurn`
   - 添加 `switchSession` 方法
   - 添加 `resolveIntentConfirmation` 方法

### Phase 2: 状态恢复

7. **修改 `services/liveRuntime.ts`**
   - 添加 `savePendingConfirmation` 方法
   - 添加 `restorePendingConfirmation` 方法

8. **修改 `App.tsx`**
   - 初始化时调用 `restorePendingConfirmation`

### Phase 3: UI 增强

9. **修改 `components/StatusPanel.tsx`**
   - 添加意图锚点信息展示

10. **修改 `components/InputConsole.tsx`**
    - 支持禁用状态（FR-012）

---

## 测试场景

### 手动测试步骤

1. **意图漂移检测**
   ```
   1. 发起一个任务（如"开具发票"）
   2. 输入一个不相关的请求（如"查询订单"）
   3. 验证：确认对话框正确显示
   ```

2. **继续当前任务**
   ```
   1. 在确认对话框中点击"继续当前任务"
   2. 验证：系统继续执行原任务
   ```

3. **放弃并切换**
   ```
   1. 在确认对话框中点击"放弃当前任务"
   2. 验证：系统切换到新 Session
   ```

4. **页面刷新恢复**
   ```
   1. 确认对话框显示时刷新页面
   2. 验证：对话框正确恢复
   ```

5. **超时自动继续**
   ```
   1. 确认对话框显示后等待 30 秒
   2. 验证：自动选择"继续当前任务"
   ```

---

## 配置选项

### 环境变量

在 `.env` 文件中添加：

```bash
# 意图确认超时时间（毫秒），默认 30000
VITE_CONFIRMATION_TIMEOUT=30000
```

### 类型导入

```typescript
import {
  IntentConfirmationTurn,
  IntentAnchor,
  ConfirmationChoice
} from '../services/backendTypes';
```

---

## 调试技巧

### 查看后端响应

在浏览器开发者工具的 Network 面板中：

1. 筛选 `/api/agent/sessions/` 请求
2. 查看 Response 内容中的 `confirmationTurn` 字段

### 查看 localStorage

在浏览器控制台：

```javascript
// 查看存储的待确认信息
localStorage.getItem('aegischat:pending_confirmation:{sessionId}')

// 清除存储
localStorage.removeItem('aegischat:pending_confirmation:{sessionId}')
```

---

## 常见问题

### Q: 确认对话框不显示？

检查：
1. 后端响应是否包含 `confirmationTurn` 字段
2. `AwaitRenderer` 是否正确识别 `schema.type === 'INTENT_CONFIRMATION'`

### Q: Session 切换失败？

检查：
1. 后端是否返回 `newSessionId`
2. `liveRuntime.switchSession` 是否被调用
3. Network 面板查看错误响应

### Q: 页面刷新后状态丢失？

检查：
1. `localStorage` 是否正确保存
2. `App.tsx` 初始化时是否调用恢复方法

---

## 代码审查要点

- [ ] 类型定义完整
- [ ] 错误处理完善（400/409）
- [ ] 超时机制正确实现
- [ ] Session 切换逻辑健壮
- [ ] 状态恢复功能正常
- [ ] 无内存泄漏（定时器清理）
