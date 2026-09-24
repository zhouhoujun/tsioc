## 2026-09-24 P7 批次3 决策（已定，不再回退）
- 目标：`handleBrowserGlobalKeyInput`(3912-4058) + `executeGlobalKeyAction`(4138-4275) = 285 行键处理 cluster（487 行含中间 P130 编辑簇；编辑簇 4059-4137 留在组件作为 host 成员）。
- host：49 个 unique this.* / this.state.* 成员（24 + 29 去重），与既有 batch host 规模（40-80）一致。
- 模块：`AgentConsoleGlobalKeyInputController.ts`（353 行），沿用 host 接口 + view 函数 + 组件薄包装模式。
  - 组件保留同名 thin async wrapper（测试经 (component as any)。全局键方法直接调用）。
  - interface 名：`AgentConsoleGlobalKeyInputHost`；view: `handleBrowserGlobalKeyInputView` / `executeGlobalKeyActionView`。
  - host 内部 `this.executeGlobalKeyAction(action)` → `executeGlobalKeyActionView(host, action)`（同模块直调）。
- 验收（已通过）：tsc 0 错误 → keymap-context.spec.ts + vm-submit + vm-panels EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（5097 → 4864，组件 5096 → 4863 行）→ git diff --check → todo.md → 2 commits。
- 若 host 实为 >35 且规约无豁免：回退 buildCommandContext（当前 172 行）。已排除（见上，49 为实测）。
## 2026-09-25 P7 批次4（turn 输入簇，已定） 
- 目标：`submitMultilineDraft`(2535-2593) + `submit`(2594-2747) = 213 行 turn 输入簇；73 个 unique this.* / this.state.* 成员（含 state 子形状 24 项）。
- 模块：`AgentConsoleTurnInputController.ts`（290 行），沿用 host 接口 + view 函数 + 组件薄包装模式。
  - 组件保留同名 async wrapper：`protected async submitMultilineDraft()`（2536）、`async submit()`（2539），各 3 行转发 `*View(this.turnInputHost())`。
  - interface：`AgentConsoleTurnInputHost`（state 子形状 + 8 个访问器字段：draftLines/multilineMode/shellMultilineMode/shellDraftLines/editTargetMessageId/lastEditSessionMessageId/editDismissedAt/activeTurnRun + sessionService/scheduler + 22 个组件方法）。
  - view：`submitMultilineDraftView` / `submitView`。host 用 `{ get/set }` 访问器包可变字段，`state/sessionService/scheduler` 直接引用；`this.` → `host.` verbatim 变换（保留原怪缩进）。
- 验收（已通过）：tsc 0 错误 → vm-submit + vm-panels + vm-shell-commands + vm-vim-keymap + keymap-context EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（4864 → 4704，组件 4863 → 4703 行）→ git diff --check 干净。
- 剩簇：P3 键处理 `handleGlobalKeyInput`(3844-3923)/`handleGlobalKeySequence`(3925+)/`handleTerminalInput`(4167+)、编辑簇、which-key/thread 辅助簇；下一步按 roadmap 拆 P3 控制器。
## 2026-09-25 P7 批次5（P3 键处理簇，已定）
- 目标：`handleGlobalKeyInput`(3684-3763) + `handleGlobalKeySequence`(3765-3788) = 104 行 P3 键簇；并入批次3 的 `AgentConsoleGlobalKeyInputController.ts`（353 → 474 行）。
- host：新增 5 成员 —— `state.whichKeyPage`/`state.setWhichKeyPage`/`state.messageDetailOpen`/`canThreadNavigate`/`canMessageNavigate`；删除 `handleGlobalKeySequence` 成员；`handleBrowserGlobalKeyInputView` 内 154/208 改同模块直调 `handleGlobalKeySequenceView(host, ...)`。
- view：`handleGlobalKeyInputView` / `handleGlobalKeySequenceView`；组件保留 `handleGlobalKeyInput` 同名 3 行薄包装（测试直调），`handleGlobalKeySequence` 组件方法整体删除 + builder thunk 删除（无测试直调）。
- 注意：view 签名只保留一次（transform 时丢弃原方法签名行），参数改为 `host: AgentConsoleGlobalKeyInputHost, raw/key: string`；builder 必须补 `canThreadNavigate`/`canMessageNavigate` thunk（否则 TS2739）。
- 验收（已通过）：tsc 0 错误 → vm-vim-keymap + keymap-context + edit-message + vm-submit + vm-panels EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（4704 → 4603，组件 4703 → 4602 行）→ git diff --check 干净 → lsp_diagnostics 双文件无告警。
- 剩簇：P3 编辑簇（组件 4059-4137 区域）、which-key/thread 辅助簇；下一步按 roadmap 拆 P3 剩余控制器。
