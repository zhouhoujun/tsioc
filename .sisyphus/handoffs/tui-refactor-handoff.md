# Handoff: TUI 逻辑重构 - 7.tui

## 项目信息
- 分支: 7.tui
- Monorepo: /home/zhouyou/workspace/core/
- 用户约束: "cli 不应该有TUI交互的逻辑，这些是ui的职责，交互逻辑需要各个平台通用"

## 已完成工作

### 1. cli.spec.ts
- 删除所有 TUI 相关测试
- 移除未使用的 TUI 导入

### 2. AgentConsoleSessionState.ts (共享层)
- 添加 `processDecodedInput()` - 处理解码后的输入
- 添加 `confirmSelectMenuAndKeepOpen()` - 确认菜单但保持打开
- 添加 `openSubSelectMenu()` - 打开子菜单
- 添加 `updateDraft(draft, cursor?)` - 更新草稿并钳制光标
- 添加 `applyChunkToDraft(chunk, cursor)` - 应用输入块到草稿
- 修复 `shouldSubmitConfirmedSelectMenuValue()` - 移除 `isAgentConsoleSuggestionMenu` 检查
- 修复 `handleMenuInput()` - 使用 `acceptSelectMenu()` 替代 `confirmSelectMenuAndKeepOpen()`
- 修复 `acceptSelectMenu()` - 设置输入值并调用 submitAction，保留尾部空格

### 3. cli.ts (CLI 入口)
- 重写 `handleTerminalInputChunk` 使用 `consoleState.processDecodedInput()`
- 移除所有 TUI 状态变量: `noticeTimer`, `screenNotice`, `currentDraft`, `draftCursor`, `isSelecting`, `mouseTrackingEnabled`, `terminalCursorVisible`
- 移除所有 TUI 操作函数: `syncTerminalCursorVisibility`, `shouldRenderTerminalCursor`, `syncDraftFromConsoleState`, `setDraftDisplay`, `updateDraftState`, `applyChunkToDraft`, `setMouseTracking`, `syncMouseTracking`, `pauseReadlineForSelection`, `resumeReadlineAfterSelection`
- 简化 `routeConsoleInputChunk` - 委托给 `consoleState.processRawChunk`
- 所有调用点替换: `currentDraft` → `consoleState?.input || ''`, `updateDraftState(...)` → `consoleState?.updateDraft(...)`, `applyChunkToDraft(...)` → `consoleState?.applyChunkToDraft(...)`
- 移除未使用的导入: `shouldPlaceConsoleCursor`, `applyTerminalInputChunk`

## 测试结果
- agent-cli: 25 passing
- agent: 208 passing

## 关键修复
1. 菜单回车直接执行: `handleMenuInput` 使用 `acceptSelectMenu()` 而非 `confirmSelectMenuAndKeepOpen()`
2. 输入值设置: `acceptSelectMenu` 在调用 submitAction 前设置 `setInput(valueWithSpace, valueWithSpace.length)`
3. 光标位置: `updateDraft` 使用 `clampConsoleTextCursor` 钳制光标

## 待办
- 确认菜单行为在实际终端中正常工作
- 验证输入框光标位置在所有场景下正确
