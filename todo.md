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
## 2026-09-25 P7 批次6（P3 编辑簇，已定）
- 目标：`handleIdleEscape`(3699-3713) + `getEditableUserMessages`(3715-3721) + `extractEditableMessageText`(3723-3733) + `getEditableImageParts`(3735-3743) = 45 行 P3 编辑簇；并入既有 `AgentConsoleEditModeHandlers.ts`（96 → 147 行，P199 batch E 同域，不新建控制器）。
- 变换：`handleIdleEscape` 改为 ctx 驱动 `handleIdleEscape(ctx)` —— `this.lastEscapeAt` → `ctx.getLastEscapeAt()/ctx.setLastEscapeAt()`（ctx 接口新增 2 成员）、`this.editTargetMessageId` → `ctx.getTargetMessageId()`、`this.dismissEditMode()/this.enterEditMode()` → 同模块直调；3 个 helper 变纯函数（`getEditableUserMessages(messages)`/`extractEditableMessageText(message)`/`getEditableImageParts(message)`）。
- 组件：`handleIdleEscape` 保留同名 3 行薄包装（无测试直调，但 builder thunk 3178 + 全局键 host 需保留）；3 个 helper 方法整体删除；`editCtx()` 改引导入纯函数 + 新增 lastEscapeAt 访问器；import 90 扩展。注意原 editCtx 末成员 `setAttachmentsBefore` 无尾逗号，插新成员后必须补逗号。
- 验收（已通过）：tsc 0 错误 → edit-message + vm-vim-keymap + keymap-context EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（4603 → 4563，组件 4602 → 4562 行）→ git diff --check 干净 → lsp_diagnostics 双文件无告警。diff 已核对与原始实现逐字一致（行为不变）。
- 剩簇：which-key/thread 辅助簇、`runEditorCommand`/`openExternalEditor`（外部编辑器桥，P2 媒体/IO 类）；下一步按 roadmap 拆 P3 剩余控制器（P3 Turn/Input 已拆完，转 P2 诊断/导出/附件/语音）。
## 2026-09-25 P7 批次7（终端输入簇，已定）
- 目标：`openCommandPalette`(3828-3850) + `handleCommandPaletteInput`(3852-3864) + `handleTerminalInput`(3866-3974) + `requestTerminalExit`(3976-4007) + `closingSessionMessage`(4009-4017) + `syncConsoleMessageDetailViewport`(4019-4032) = 205 行终端输入簇。
- 模块：新建 `AgentConsoleTerminalInputController.ts`（286 行），沿用 host 接口 + view 函数 + 组件薄包装模式。
  - 组件保留同名薄包装：`openCommandPalette`（p287 spec 直调）、`handleTerminalInput`（vm-commands/ssh-shell/ui-input-regression/vm-submit/vm-vim-keymap/vm-panels/repro-runtime-mouse 直调）、`requestTerminalExit`/`closingSessionMessage`（repro-runtime-mouse 直调 + globalKeyInputHost thunk 引用）；`handleCommandPaletteInput`/`syncConsoleMessageDetailViewport`/`dispatchTerminalMouseAt` 无测试/外部引用 → 整体删除（dispatchMouse 内联进 `handleTerminalInputView`）。
  - interface：`AgentConsoleTerminalInputHost`（state 子形状 17 项 + closing/destroyed/commandPaletteQuery/sshShell/surfaceAccessor/app/translator/sessionService + 9 个组件方法，共 54 成员）；`closing`/`commandPaletteQuery` 用 get/set 访问器（view 写回组件状态）；`SSH_SHELL_DETACH_SEQUENCE` const 移入控制器。
- 验收（已通过）：tsc 0 错误 → vm-commands + ssh-shell + ui-input-regression + vm-submit + vm-vim-keymap + vm-panels + repro-runtime-mouse + p287-command-schema-form-echo + keymap-context EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（4563 → 4391，组件 4562 → 4390 行）→ git diff --check 干净 → lsp_diagnostics 双文件无告警。diff 与 controller 已核对互译一致。
- 剩簇：which-key/thread 辅助簇、`runEditorCommand`/`openExternalEditor`（外部编辑器桥，P2 媒体/IO 类）；下一步按 roadmap 转 P2 诊断/导出/附件/语音控制器。
## 2026-09-25 P2 批次8（导出/附件死代码清理，已定）
- 目标：删除组件 598-698 区域 17 个无引用纯转发薄包装（`parseExportArgs`/`looksLikeExportPath`/`tryWriteSessionExport`/`previewSessionExport`/`resolveExportTargetPath`/`resolvePathDirectory`/`resolveAttachmentTargetPath`/`describePendingAttachments`/`loadPendingAttachment`/`loadPendingImageAttachment`/`resolveImageMediaType`/`resolveDocumentMediaType`/`resolveAnyMediaType`/`readFileBytes`/`normalizeBinaryChunk`/`concatUint8Arrays`/`encodeBase64`），逻辑已在 `AgentConsoleExportHandlers.ts`（20 个导出）。
- 保留：`runExportCommand`（buildCommandContext thunk 2376 依赖）、`resolveFileAdapter`（3094/4016 依赖）、`buildTurnMessageInput`（3237 turnInputHost thunk 依赖）、`runAttachCommand`（2377 thunk 依赖）、`getExportHandlerContext`（599/650 依赖）。
- 核实：src/ 全目录 grep 仅 2 命中（SessionService:948 `this.encodeBase64` 系 SessionService 自身方法 1457，非组件包装引用；组件 669 自身）；test/ 仅 p282 spec 命中且都是 mock ctx stub 键（`runExportCommand: async (arg) => ...`），非组件方法直调 → 删除安全。
- import 清理：ExportHandlers 块只留 `runExportCommandFn`/`buildTurnMessageInput`/`runAttachCommandFn`；SessionService 行移除 `AgentSessionExportFormat`/`AgentSessionExportResult`（仅被删方法使用）。
- 验收（已通过）：tsc 0 错误 → vm-commands + ssh-shell + ui-input-regression + vm-submit + vm-vim-keymap + vm-panels + repro-runtime-mouse + p287-command-schema-form-echo + keymap-context + p282 EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（4391 → 4298，组件 4390 → 4297 行）→ git diff --check 干净 → lsp_diagnostics 无告警。
- 剩簇：P2 诊断/语音/harness 区（组件 700-1000 区域，含 `openCompactionHistory`/`openTurnDiagnostics`/`openUsage`/`openHarnessAudit`/`openHarnessProfile`/`openHarnessTree`/`openHarnessList`/`runHarnessStopCommand`/`handleVoiceCommand`/`playVoiceReply`/`decodeVoiceAudioChunk` 等薄包装 + 诊断记录格式化纯函数）；下一步按 roadmap 转 P2 诊断/语音控制器。
## 2026-09-25 P2 批次9（诊断/语音/harness 区 splice，已定）
- 目标：组件 489-963 区域 —— 5 个真实逻辑方法转薄包装 + 删除 11 个无引用格式化薄包装 + import 清理。
- 提取（真实逻辑 → view 函数，行为逐字不变）：
  - `openSummaryQualityTrend`(559-579) → `agentConsoleDiagnosticsView.openSummaryQualityTrendView(sessionService, notify, pushCommandOutput, provider?, bucketSize?, maxBuckets?)`
  - `openTurnDiagnosticsList`(711-734) → `openTurnDiagnosticsListView(sessionService, notify, select, sessionId?, currentSessionId?)`
  - `openTurnDiagnosticsTrend`(745-765) → `openTurnDiagnosticsTrendView(sessionService, notify, pushCommandOutput, sessionId?, bucketSize?, maxBuckets?)`
  - `openDelegationLineage`(780-797) → `agentConsoleHarnessCommands.openDelegationLineageView(host, sessionId?)`
  - `openDelegationList`(812-831) → `openDelegationListView(host, sessionId?)`
  - `HarnessCommandHost.sessionService` 接口新增 `getDelegationLineage`/`listDelegationEdges`（结构满足，组件传 this.sessionService 不变）；DiagnosticsView 额外导入 `formatTurnDiagnosticsTrend`。
- 删除 11 个死包装（核实：无 this. 调用、无 registry thunk、无 CommandHandlerContext 接口声明、测试无引用）：`formatUsageWindow`/`formatUsageSummary`/`formatCompactionHistoryAggregate`/`buildSummaryQualityRecordOption`/`buildTurnDiagnosticsRecordOption`/`formatDelegationEdge`/`formatTurnDiagnosticsAggregate`/`formatTurnDiagnosticsTrend`/`formatCompactionHistoryTrend`/`formatCompactionHistoryRecord`/`formatSummaryQualityTrend`。
- import 清理：Formatters 别名块只留 `fmtSummaryQualityAggregate`（第 32 行整行删）、`openSummaryQualityRecordsFn` 死别名删、DiagnosticsView 行移除 2 个已删包装、DelegationView 行整行删、HarnessCommands 行加 2 个 view 函数。保留全部 registry 绑定方法（2322-2372 区 thunk 不变）。
- 验收（已通过）：tsc 0 错误 → 10 定向 spec EXIT=0 → 全量 1404 exit 0 → 同 commit 更新基线（4298 → 4148，组件 4298 → 4147 行）→ git diff --check 干净 → lsp_diagnostics 三文件无告警。
- 剩簇：P2 语音异步状态机（startVoiceCapture/stopVoiceCapture/playVoiceReply/decodeVoiceAudioChunk 调用点 1795 等）、`runEditorCommand`/`openExternalEditor`（外部编辑器桥）；下一步按 roadmap 转 P2 语音/编辑器控制器。
