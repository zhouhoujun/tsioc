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
## 2026-09-25 差距批次（gap2/gap3/gap1 已通过，7.tui）
- 目标：修复真实 TUI 实测发现的三处差距 —— apply_patch 尺寸未受控（gap2）、settings.json 配置容器键泄漏（gap3）、未受信工作区写工具无人值守放行/失守（gap1）。
- gap2（agent-tools）：`AgentToolsFileOptions` 新增 `maxPatchBytes?`；`apply-patch.tool.ts` 应用前检查 patch 字节数，超限（默认 96KB）返回可操作错误（含 bytes/limit/按块拆分指引）。apply-patch.spec.ts 更新，485 passing。
- gap3（agent-cli）：`config.ts` profiles reduce 时剥离 `[container]` 前缀容器键，self-heal 写回净化结果；cli.spec.ts 新增 heal 回归（旧实现稳定失败 → 修复后通过）。79 passing。
- gap1（agent）：新建 `project/workspace-trust.ts`（52 行）—— `WORKSPACE_MUTATING_TOOLSETS`（filesystem_write/terminal/git/process/code_execution/ai_cli）+ `WORKSPACE_MUTATING_TOOLS`（11 个写工具）+ `isWorkspaceMutatingTool` + `resolveWorkspaceTrustApproval`；`tokens.ts` `AgentWorkspaceTrustResolver` 增 `trust?(workspace)`；`run-command.ts` `provideWorkspaceTrust()` 返回含 trust；`DefaultAgentRuntime.ts` 工具调用门禁重写 —— 未受信工作区 + mutating 工具先走 `checkApproval('workspace_trust', ..., force=true)`，批准后 `trust()` 记录并 `trustApprovedForCall` 短路同调用后续审批门禁，拒绝/超时/无审批器回退原 `not trusted` + `tsdi-agent trust` 指引。
- 新增 `test/workspace-trust.spec.ts` 6 用例（未受信阻止 / 已受信放行 / 批准执行+记录 / 拒绝阻止不记录 / 非 mutating 绕过 / 同轮二次调用跳过门禁），全量 agent 903 passing。
- 验收（已通过）：3 包 tsc --noEmit 0 错误 → agent-cli 79 + agent-tools 485 + agent 903 全量 exit 0 → 同 commit 更新基线（DefaultAgentRuntime 3579 → 3576）→ source-size OK → git diff --check 干净 → lsp_diagnostics 全部变更文件无告警。
- 待办：DeepSeek 余额 402 阻断真实 sleep-mlt 实测；充值后跑真实 turn 验证受信/未受信写工具行为并继续记录差距。
## 2026-09-25 验证门批次（verification gate，3 commits 已推送 7.tui）
- 目标：修复真实 TUI 实测暴露的三处 agent 差距 —— 验证门在无 verify-command 项目里恒失效（gap4）、未完成 plan 可用提问方式停摆（gap5）、改测试可把红灯变绿（gap6）。
- gap4（验证门失效，根因修复）：原 check (e) 只读 `verification === 'verify-command'` 条目；sleep-mlt 无 `typecheck`/`lint` script → `VerifyCommandRunner.ts:274-292` 静默跳过 → 零 verify-command 条目 → 守卫必然早退。`VerificationGate.ts` 新增 `TEST_COMMAND_PATTERN`（46 行），`falsifyBentTests` 的 `runs` 过滤放宽为 `verify-command` **或** agent 自身 test/build 运行（`inputSummary` 匹配）。守卫从此与 `autoScripts` 解耦。
- gap5（plan 停摆）：`PlanContinuation.ts` 重建 —— 未完成 plan 即便模型在提问也强制续跑（提问不算完成待办，要求模型用声明式默认值消解歧义）；有代码改动但无验证证据时同样强制续跑，turn 不能停在未验证状态。
- gap6（改测试洗绿）：新增 `gate.verify(ledger, startIndex, writeHints, editedFiles)`，验证仍红时编辑测试文件标记 `falsificationReason` 进 repair prompt（`RepairExploration.ts:76` 只透传 `falsificationReason`，模型能真正看到）。红信号取本轮**最新**红证据，故已转绿后新增合法测试不误报。
- 路由修复（Gap A）：`RoutedModelAdapter.ts` 新增 `estimateStructuralComplexity`（`countEnumeratedItems`/`countReferencedFiles`/`countBuildVerbs`），多段构建类请求可路由到强模型。
- 单测：`verification-gate.spec.ts` 新增 3 例（`falsifiesTestEditAfterAgentTestRunFailed`/`allowsTestEditAfterAgentTestRunPassed`/`ignoresNonTestCommandFailure`），`verify-command.spec.ts` 新增 `RuntimeVerificationCommandsTest` 接线测试，plan-mode +92 行，model-provider +119 行。agent 917 → 920 passing。
- 验收（已通过）：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27 passed / 0 skipped / 27 total，GATE_EXIT=0**（含真实 PTY acceptance，无 skip）→ 3 atomic commits（04bb0f018 / 973c3d134 / e34fa3da9）→ 同 commit 更新基线（DefaultAgentRuntime 3540 → 3539）→ source-size OK → git diff --check 干净。
- 关键设计约束：`DefaultAgentRuntime.ts` 必须按 hunk 拆进 commit 2/3 —— commit 2 只含 plan-continuation call sites 且只能配旧 3 参 `verify()`，commit 3 才引入第 4 参 `editedFiles`。已验证两中间态自洽（commit 2：3 参签名 + 3 参调用 + 基线 3540 = 3540 行；commit 3：4 参 + 4 参 + 基线 3539 = 3539 行）。
## 2026-09-25 覆盖差距根因（已定位，修复待用户拍板）
- 现象：真实 sleep-mlt 实测中，agent 为规避缺陷而写测试 —— 只测 `--json`，且把 `--json` 放在 `--long` 之后，缺陷分支完全未被覆盖。
- ~~根因（已用证据锁定，非模型能力问题）~~ **【2026-09-25 受控实验推翻，见下】**
  - ~~系统提示词仅由 6 个 section 组成（`agent.module.ts:131-136`）：DateTime / Identity / ProjectContext / Tools / Memory / McpServerInstructions。~~
  - ~~对这 6 个 section 全量 grep 测试类关键词（`unit test`/`write tests`/`tests for`/`reproduce`/`failing test`/`regression test`/`test coverage`）→ **零命中**，提示词里没有任何测试指导。~~（此**事实陈述仍成立**，但**因果推断错误**）
  - ~~sleep-mlt 无 `AGENTS.md`/`CLAUDE.md`/任何指令文件 → 该工作区下模型收到的测试约束为**空**。~~
  - ~~对照组：tsioc 自身 `AGENTS.md` 明写「回归测试必须先证明在旧实现上稳定失败，再证明修复后通过」→ 即框架只在自身 self-host 最佳实践。~~（事实成立，但**不能解释 v4/v5 为何失败**）
  - `WeaknessMiner` 亦无补偿：只跟踪错误签名与 shell gate 策略，不跟踪缺失回归测试。
- **受控实验（2026-09-25，第三轮真实 TUI，否证上述因果）**：同一 sleep-mlt（仍无 `AGENTS.md`）、同一 `deepseek-flash`、同一「提示词零测试指导」条件下，agent **确实写出了复现缺陷的测试**。
  - 任务：`list --limit 0` / `--limit -3` 静默打印全量数据，要求改为 usage error（精准复现命令，未给任何测试指令）。
  - 验证方式（非采信 agent 自述）：保留 agent 新测试 + `git checkout` 还原旧 `src/cli.ts` → `npm test` **54 项中 3 项 FAIL**；恢复修复后 → **54/54 pass**，`npm run build` exit 0。
  - 失败的 3 项恰为缺陷靶心：`list rejects a zero limit...` / `list rejects a negative limit...` / `list rejects non-numeric and missing limit values...`。
  - 结论：**「提示词缺测试指导」不是覆盖差距的成因**。v4/v5 的失败另有原因（最大嫌疑：任务形态/规模不同，以及 v4 本身被陈旧 `dist/` 污染 —— 两轮都需重新采样才能定性）。因此 `TestGuidanceSection` 不再按「修根因」立项，其价值降级为「提升无指令文件项目的默认下限」，属可选增强而非缺陷修复。
- 建议修复：新增第 7 个 prompt section `TestGuidanceSection`（约 40 行，远低于 600 行上限），携带 reproduce-first 规则，使无指令文件的项目也能继承。**属全局行为变更，已保留给用户拍板，未实施。**
- 真实 TUI 探针 v5（干净基线，任务未含「不要改测试」提示）：守卫**未触发且属正确** —— agent 修 `src/cli.ts`（新增 `BOOLEAN_FLAGS` 集合并在 `--long`/`-short` 分支 `continue`），`test/cli.test.ts` +61 行且**全为 `+` 断言、零删除、无 `skip`/`todo`/`only`**（加强而非削弱）。复核 `npm run build` exit 0、53/53 pass、`--json` 前置与后置均 exit 0。价值为否定证据（无误报）。
- v4 作废原因：未清 `dist/` 的陈旧 build 使 agent 从 stale 产物反推 fix 并反问，判定污染。凡真实复现前必须 `npm run clean`。
- 已知工具陷阱：长任务必须放 tmux（`nohup … &` 会被 bash 工具超时连进程组 kill，日志出现 `Terminated`）；`runTest('./test/x.spec.ts')` 单文件 glob 匹配 0 用例，须 `npm test` 全量；codegraph 配额用尽后一律 grep/read。
## 2026-09-25 第三轮真实 TUI 实测（v6，sleep-mlt `--limit` 缺陷，7.tui 干净基线）
- 缺陷：`cli.ts` `cmdList` 的 `limitRaw > 0 ? ... : undefined` 静默兜底 —— `list --limit 0` 与 `--limit -3` 均打印**全量**数据而非报错（无意义输入静默返回错答案）。
- 任务下发方式：精准复现命令 +「应改为清晰 usage error」，**不含任何测试/流程指令**（避免引导，只观察自然行为）。
- agent 产出：`parseLimit` helper + `cmdList` 接线 + usage 文案（src +26/-4），`test/cli.test.ts` +54（新增 5 例 + `seedLimitDir` helper）。自述 build clean、54/54（was 49）。
- 独立复核（不采信自述）：旧 `src/cli.ts` + 新测试 → 54 中 **3 FAIL**（恰为缺陷靶心三项）；恢复修复 → **54/54 pass**，build exit 0。**复现先于修复成立**。
- 本轮真实暴露的差距（与覆盖无关）：
  - **工具轮次耗尽导致任务未收尾**：本轮共 **72 次工具调用**（Run command 20 / Search code 14 / Read file 14 / Inspect directory 14 / Edit file 8 / Check version control 2），撞上 `maxToolRounds` 默认 **20**（`options.ts:584`，`DefaultAgentRuntime.ts:1069`）。最终以「I'm out of tool rounds」收尾，**提交未完成，工作区留下未提交改动**。
  - **轮次预算被低价值调用吃掉**：14 次 `Inspect directory` 反复列举同一目录，占 19% 调用量却无信息增量；真正编辑只有 8 次。
  - **已有引导未被采纳**：`IdentitySection.ts:73` 已明写「For non-trivial coding, refactoring, testing, or multi-file edit requests, prefer coding_task ... instead of spending many small tool rounds」—— 本轮 72 次碎片调用完全未走 `coding_task`。差距在**引导采纳**，不在引导缺失。
  - **git 用法错误**：`Check version control` 仅 2 次，其中 `git commit -A` 未先 `add` 而失败，agent 未能自行补救。
- runtime 侧恢复路径确认可用（非 runtime 缺陷）：`DefaultAgentRuntime.ts:1131-1149` 在轮次耗尽时注入「provide your best answer now」→ 给一次最终调用 → 再查 `buildPlanContinuation`，可续跑。agent 那句「out of tool rounds」是对注入文案的自述解读，非 runtime 硬失败。
- 验证门本轮**未触发且属正确**：agent 是加强测试（新增 5 例、复现缺陷）而非削弱，日志中 falsified/integrity/repair 命中数为 0。
- 待办（需用户拍板）：`TestGuidanceSection` 已降级为可选增强（非缺陷修复，理由见上）；废弃模型名 `deepseek-v4-flash`；**轮次预算/低价值调用收敛**（是否对重复 `Inspect directory` 去重、或在接近上限时提示改走 `coding_task`）为本轮新增候选差距，尚未立项。

## 2026-09-25 autoScripts 决策（已定：保持不变，不改代码）
- 结论：选 **A（保持 `['typecheck','lint']`）**，不把 `build`/`test` 加入默认。
- 依据：守卫已按 gap4 修复做到与 `autoScripts` **解耦** —— `falsifiesTestEditAfterAgentTestRunFailed` 证明 sleep-mlt（无 typecheck/lint、零 verify-command 条目）下守卫依然触发。故此前「A 会让守卫在多数项目失效」的判断**已被实现推翻**。
- 代价：`options.ts:640` 注释「long-running suites like test / build are opt-in to avoid slowing every edit round」。改默认值会让每个项目每个编辑轮次都跑 build+test，与该设计意图直接冲突，且属 AGENTS.md 明令须先征询的性能/行为取舍。
- 待办（需用户拍板，已按 v6 证据修正）：
  - `TestGuidanceSection` —— **不再是「修根因」**，已降级为可选增强（提升无指令文件项目的默认下限）。此前把它列为待办是建立在已被推翻的因果上。
  - 废弃模型名 `deepseek-v4-flash`（`options.ts:623`，4 处文件）是否清理。
  - 守卫缺 live firing 实证 —— 仅有单测 + runtime 接线证明；v4/v5/v6 **三次**真实 probe 守卫均正确未触发（agent 行为本就正确，属否定证据），仍需一次真实触发样本。
  - **轮次预算收敛**（v6 新增，尚未立项）：72 次调用撞 20 轮上限导致提交未完成；14 次重复 `Inspect directory` 吃掉 19% 预算；`IdentitySection.ts:73` 的 `coding_task` 引导已存在但未被采纳 —— 差距在采纳而非缺失。三个候选方向：(1) 对重复只读调用去重、(2) 接近上限时提示改走 `coding_task`、(3) 不动。倾向 (2)，因证据直接指向引导采纳。

## 2026-09-25 收尾全量门禁：FAIL（26/27，agent-tools 既有 flaky 测试）
- `RUN_PTY=1 bash scripts/agents-gate.sh` → **26 passed / 1 failed / 0 skipped / 27 total，GATE_EXIT=1**。唯一失败项 `agent-tools: @tsdi/agent-tools unit tests`。
- 失败用例 `step-reconciler.spec.ts:168` `StepReconcilerTest.replayConsistency`，断言 `JSON.stringify(first) === JSON.stringify(second)`，实测差异仅 `updatedAt` 1ms（`...142` vs `...141`）。
- **根因**：测试缺陷，非源码缺陷。`reconcileStepStatus` 在 `planning/step-reconciler.ts:176/223/249` 三处用 `Date.now()` 写 `updatedAt`，本身是合理的挂钟时间戳；但测试要求两次调用**逐字节相同**，而墙钟值按设计即非确定 —— 两次调用跨越毫秒边界即失败。该断言**永远无法稳定通过**。
- **与本批次改动无因果关系（已双重取证）**：
  1. 本批次 3 个 commit（04bb0f018 / 973c3d134 / e34fa3da9）改动文件全部位于 `packages/agents/agent/**` + `scripts/source-size-baseline.json`，`agent-tools` **零命中**。
  2. `step-reconciler.ts` 与其 spec 最后一次改动来自 `5526e41fa`（P227 计划执行 reconciler），早于本批次。
  3. 复跑 5 次：`run1 exit=1`，`run2..5 exit=0` → 确证为 flaky（观测失败率 1/5）。
- 修复方向（**属既有缺陷，未擅自修改，待用户拍板**）：应修测试而非源码 —— 或注入可控时钟，或断言时剔除 `updatedAt` 后再比对。改 `reconcileStepStatus` 去掉时间戳会破坏 `updatedAt` 的既有语义（属禁止的功能降级）。
- 门禁其余 26 项全绿，含真实 PTY acceptance（`pty-acceptance`）、`dom-gate` 80/100 列矩阵、`tui-gate`、`gate-regression`、`source-size`、`production-db-integrity`、`git diff --check`。
- **已修复并提交**（`de16043a0`）：`replayShape` helper 比对时剔除 `updatedAt`，仍覆盖 `outcomes` 全量 + 每个 todo 的 `status`/`content`；用例标题改为「identical decisions」以准确描述语义。生产代码零改动（`updatedAt` 语义保留，未做功能降级）。验证：12 次连跑 0 失败；变异测试确认断言未被掏空 —— 往 `outcomes.evidenceIds` 或 todo `content` 注入 `Math.random()` 均被捕获，而「均匀改源码」仍通过（因为该用例断言的是 replay 确定性，非结果正确性，后者由同套件其他用例覆盖）。

## 2026-09-25 第四轮真实 TUI 实测（v7，系统构建任务 —— streak 子命令）
- 任务（多步构建，未给任何测试/流程指令）：新增 `streak` 子命令，报告「当前连续天数」与「最长连续天数」，支持 `--json`，空 store 须给明确提示而非打印 0；并要求补测试、更新 README、**提交**。
- 基线：sleep-mlt 复位 `ba7b6c4` clean + `npm run clean`。
- 结果（独立复核，非采信自述）：**完成并提交** `cf06eba`，6 文件 +219/-3，工作树干净；`npm test` **55 pass / 0 fail**（was 49），`npm run build` exit 0。116 次工具调用，53.8K tokens，2m53s。
- **本轮质量显著高于 v6**：v6（单点 bug 修复）撞 20 轮上限、未提交；v7（多步构建任务）**未撞上限**且完整收尾。差异在任务形态与 agent 是否走计划流程（v7 用了 20 次 `Update plan`），**不是**能力上限。
- 测试有效性用**变异测试**验证（v6 的回滚法在本轮不够用，见下）：
  | 变异 | 捕获用例 |
  |---|---|
  | M1 `current := longest` | 2 个 |
  | M2' `run + 2` 取代 `run + 1` | 3 个（analysis 10/11、cli 31）|
  | M3' 去掉日期去重 | analysis 10 |
  | M4 接受非法日期 | 1 个 |
  | M5 空 store `lastDate` 改值 | 1 个 |
  → 5/5 全部被捕获，agent 的测试**真正锁住行为**。
- **方法论修正（重要）**：本轮「回滚 src、保留测试」只得到 `TS2305: Module '"../src/analysis.js"' has no exported member 'computeStreak'` —— **编译失败**，只能证明测试引用了新符号，**不能**证明行为被覆盖。凡新增导出符号的改动，回滚法天然偏弱，须以变异测试补足。
- **未解问题（如实记录，不臆断）**：同一 20 轮配置下，v6 在 72 次调用时撞上限，v7 在 **116 次调用仍未撞**。已知 `buildPlanContinuation` 会 `round = 0`（`DefaultAgentRuntime.ts:1144`），但那发生在上限文案发出**之后**，而 v7 日志中**没有任何上限文案**。故我对轮次计数器的模型不完整，机制待查。
- **对既有结论的修正**：先前基于 v6 倾向「接近上限时提示改走 `coding_task`」（方向 2）。v7 证据**削弱**该动机 —— 任务本身是构建型时，agent 会自行计划并完成，未触及上限。故 v6 的轮次耗尽**不足以**支撑运行时改动立项；应先查清上述计数器机制，再判断是否真有缺口。

## 2026-09-26 收尾全量门禁（v7 之后）
- 首次收尾门禁（`/tmp/opencode/gate/final2.log`）**24/27 FAIL**，`GATE_EXIT=3`，3 项失败：`agent-gateway`、`gate-regression`、`pty-acceptance`。
- **逐项隔离复核，均非本批次回归**：
  | 失败项 | 隔离证据 | 判定 |
  |---|---|---|
  | `agent-gateway` | 报错为 `Error: child append failed (exit null)`（子进程崩溃，非断言失败）；单独连跑 **3/3 exit=0** | 并发负载下的子进程偶发崩溃 |
  | `gate-regression` | `dom.cjk-long-history.elapsedMs +9128ms REGRESS`；但 10 项指标全部 `measured=false`（0 项 `measured=true`）；单独跑该 stage 直接 **skipped**（需 dom/tui stage 先产出指标） | 负载下采样到的**计时阈值**失真，非功能回归 |
  | `pty-acceptance` | 10 个场景中 9 个 PASS，仅 scenario 8 挂；单独连跑 3 次 = **2 PASS / 1 FAIL**，且失败单元格会**漂移**（先 `light/80`，后 `light/120`） | 既有 flaky（视口/时序敏感）|
- `pty-acceptance` scenario 8 根因：**布局契约用错**（详见下节）。此前记为「未擅自修改、待拍板」，用户已明确方向：**视窗固定只适用于非流水布局，stream/dynamic 两种布局都要支持**。
- **干净环境重跑（无并发负载）**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，`GATE_EXIT=0`**（`/tmp/opencode/gate/clean.log`）。`gate-regression` 本轮计入 27 项且非 skipped，指标表仅在失败时打印，故无输出即通过。
- 结论：3 项失败均为**环境/负载/既有 flaky**，本批次（`04bb0f018`/`973c3d134`/`e34fa3da9`/`de16043a0`）无回归；`agent-tools` 修复在全量门禁中确认生效。

## 2026-09-26 scenario 8 修复：stream 与视窗两种布局
- **产品两种布局都支持**（既有能力，非新增）：`messageLayout?: 'stream' | 'dynamic'`（`AgentConsoleSessionState.ts:403`），默认 `'stream'`（`:468`；`console-platform.spec.ts:32,41` 断言两端默认均为 stream）。`dynamic` 经 `ui.console.messageLayout` 配置可达（`AgentConsoleComponent.ts:400` → `setConsoleOptions`），且**已有单测覆盖**：`p286-c2-error-approval-stable-keys.spec.ts:97`、`console-renderer.spec.ts:716`。
- **契约**（`AgentConsoleComponent.ts:2416-2420`）：stream 全程用 native scrollback，历史不按视口裁剪；**只有显式 dynamic 才窗口化**。因此「固定视窗」这一参照系仅在 dynamic 成立。
- **缺陷**：PTY acceptance 不传布局参数，恒跑默认 `stream`；但 scenario 8 的文案存在性断言用 `screen.viewport()`（末尾 40 行固定窗口）——**把 dynamic 的契约用在了 stream 上**。stream 下回答之后的 Working 计时帧/状态栏/composer 持续落地，固定尾窗与断言赛跑，故随机误判（失败单元格在 `light/80`、`light/120` 间漂移，正因 `light` 格重绘帧更多）。
- **修复**（`run_acceptance.py`）：新增 `Screen.since(mark)` 返回自字节偏移起的去 ANSI 文本；文案存在性改判 `screen.since(turn_mark)`，即**本轮自身输出区域**，与既有 `wait_for(..., tail_from=turn_mark)` 同一惯用法。**行宽断言仍留在稳定视口**（其从未误报，且需要稳定帧计算 `display_width`），未削弱。
- **验证**：修复前 3 连跑 2 PASS/1 FAIL（失败格漂移）；修复后 **4 连跑 4 PASS / 0 FAIL**；全量门禁 **27/27 PASS，`GATE_EXIT=0`**（`/tmp/opencode/gate/final3.log`）。
- **仍存覆盖缺口（如实记录）**：PTY acceptance **没有 dynamic 布局这条轴** —— dynamic 目前只有单测覆盖，未走真实 PTY 端到端。若要补，需给 harness 增加注入 `ui.console.messageLayout` 的通道并让主题/宽度矩阵在两种布局下各跑一轮（慢约一倍）。**未擅自扩大范围**。

## 2026-09-26 会话累计 tokens + 输出错位（用户实机反馈）
用户反馈两条：**“状态栏下面是记录会话消耗的总tokens数量，现在仍然不是”**（期望会话累计，实测 sawtooth 回落）与 **“实际运行效果如下多了几个错位的点”**（样本 `there.The`、`w/ith`、`● │ T/ool`）。
用户在同一问卷里勾选了全部四项（含互相矛盾的 “错位保持现状”）；已明确按“执行前三项修复”解读并获用户 “Continue” 认可，不重复追问。

### 1. 累计 tokens：`57469dba7`
- **根因**：`setTokenUsageAbsolute()` 只写 `tokenUsage` / `turnTokenUsage`，未把**上一个 turn 的累计值**并入 `turnTokenUsageBase`。每个模型轮结束时 `turnTokenUsage` 归零，底座仍是旧值 → 状态栏在 3.5K→8.1K→917→94→56 间锯齿。
- **修复**：写入时 `turnTokenUsageBase = 本次权威累计值`，并把 `turnTokenUsage` 清零，保证“底座 + 本轮增量 = 会话累计”。
- **回归**：`vm-diagnostics.spec.ts` 新增 `sessionCumulativeUsageSurvivesNextStreamChunk()`；**修复前 Expected 630 / Received 30**，修复后通过。
- **实机**：真实 tmux 多轮只读任务，footer 单调 `23.7K → 23.8K → 24.4K → 77.6K`（旧行为锯齿）。
- agent-ui 1405 passing、tsc EXIT 0、source-size 7387、门禁 27/27。已推 `origin/7.tui`。

### 2. Latin 词边界换行：`0cf2e8aab`
- **根因**：`wrapTerminalText()` / `wrapStyledSegmentLine()` 按 display width 硬切，任何拉丁文本都在字符中间断行。
- **修复**：chunk 内存在 ASCII 空格时回退到最后一个可断空格；**CJK、长 URL/path、含 ANSI chunk 保持字符级**（切 ANSI 边界会串色）。
- console 81、components 137、common 5、html 118、agent-ui 1405 全绿，门禁 27/27。已推 `origin/7.tui`。

### 3. 带边框块内容被截断：`39039a68d`（本轮）
- **根因（先写失败测试实证，非推测）**：`walkTuiNode` 把**满宽 `width`** 传给带边框块的子节点，子节点按满宽换行；随后 `renderBlockLines` 用 `padVisible(raw, innerWidth)` **截断**到 `width - 2`。结果每行末尾 2 列被静默丢弃，可见断点提前 2 列、落在词中间且紧贴 `│` —— 正是 `● │ T/ool` 的成因。
- **实证**：新增 `wrapsBorderedBlockContentToInnerWidth()`，修复前 `Expected "abcdefghijklmnopqrstuvwxyz" / Received "abcdefghijklmnqrstuvwxyz"`（`op` 被吞），修复后通过。
- **修复**：抽出 `resolveBlockContentWidth()` 作为唯一真源，**子节点递归与边框取框共用**，子节点按实际可用宽度换行。
- **安全性**：`getInheritedStyleMap()` 只向下传 `color`/`font-weight`，**不传 padding/background**，故块自身 padding 仅由 `renderBlockLines` 施加一次，**不存在重复扣减**。`horizontal` 边框线原引用已删除的 `renderWidth`，改为 `width - 2`（`horizontal` 仅在 `hasBorder` 分支非空，而该分支下 `renderWidth === width`，等价）。
- **覆盖用户场景**：`AgentConsoleMessageRenderers.ts:478` 工具行正是 `borderLeft: 3px solid` + `background` → `hasBlockFrame` 为真 → 走修复后的路径；悬挂缩进由同层 `continuationLead: () => '  '` 负责。
- 修复后 console 82、components 137、common 5、html 118、agent-ui 1405 全绿；source-size OK；**门禁 27/27，`GATE_EXIT=0`**（含 PTY acceptance、DOM/TUI gate、`git diff --check`）。已推 `origin/7.tui`。

### 4. `there.The` 判定为**非渲染层**（未改代码）
`tokenizeMarkdownInline` 用 `input.slice(lastIndex, match.index)` 原样保留 token 间文本再 `join('')`，markdown 路径不丢空格；无 renderer 丢空格证据，判为模型/provider 侧输出，不做无证据改动。

### 仍存缺口（如实记录，未擅自扩大范围）
- PTY acceptance **没有 dynamic 布局这条轴**（见上节），dynamic 仍只有单测覆盖。
- 未在真实 PTY 复跑用户那条具体 `● │ T/ool` 长工具行；本轮证据为共用层单测 + 门禁 PTY acceptance 全绿。
- 延后调查：实际 routed model profile、Codex/OpenCode tool-round/continuation primary-source 对照（librarian 因 `ProviderModelNotFoundError: opencode/gpt-5-nano` 全部失败，改用内置搜索后仍无可靠 primary source）。
- `deepseek-v4-flash` 废弃名在 `packages/agents/agent/src/options.ts:623` 附近仍有 4 处，**清理需用户明确批准**。
- `sleep-mlt` 旧 `streak` 子命令仍有独立 staleness 缺陷（`buildReport` 已防护），v8 范围内未改。

### 5. 覆盖真实行形状 + 发现跨渲染器分歧（`24b08fdbc`）
- **补测试的必要性**：`39039a68d` 的测试用的是 `border` **简写**；而 agent-ui 消息行实际用 `border-left` **长写** + `background` + `padding`，两者走的宽度分支不同。已补真实形状用例（`ConsoleRailedRowTestComponent`）。
- **按 AGENTS.md 先证旧实现失败**：`git show 39039a68d~1:...tui.ts` 回退后两个用例**都红**，且丢字数与预测完全一致 —— 简写块丢 `op`（2 列），真实 railed 行丢 `nop`（3 列，因 `innerWidth = (width-1) - 0 - 1 - 1`）。恢复修复后 83 passing、`GATE_EXIT=0`、门禁 27/27。

- **⚠️ 新发现的分歧（未修，需用户拍板）**：`tui.ts` 的 `hasBorder` / `hasBlockFrame` **只读 `styleMap.border` 简写**；`grep` 确认 `components/console/src` **没有任何代码读 `border-left` / `borderLeft`**。而 `AgentConsoleMessageRenderers.ts:252/478/503/519/535/551/1068` 全部用长写。
  - 后果：TUI 里这些行 `hasBorder === false` → **不画 `│` 导轨、不预留 2 列**；DOM 则按真实 CSS 画边框。**跨渲染器行为不一致。**
  - 因此用户截图里的 `│` **不可能来自 TUI 消息行的导轨** → 其截图大概率是**浏览器 DOM** 侧。
  - DOM 侧 `overflow-wrap: 'anywhere'`（`AgentConsoleMessageRenderers.ts:1066`、`:1123`）会在词内断行，可直接解释 `w/ith`、`T/ool` 这类样本。
- **未擅自改动的原因**：`overflow-wrap: anywhere` → `break-word` / `word-break: keep-all` 属于**用户可见的换行行为变更**，且 `anywhere` 会影响 min-content 尺寸（可能正是“错位/抖动”来源之一）。按根 AGENTS.md「禁止以优化/重构为由改变已有用户功能；冲突须先说明并询问取舍」，**保留现状，等用户确认**。
- **已交付修复的诚实边界**：`39039a68d` 确实修掉了 TUI 侧**静默丢字符**（真实 railed 行每行丢 3 列，已证旧实现失败→修复后通过）；但**没有也无法证明**它修掉了用户截图里的 `w/ith`、`T/ool` 断词——那更像 DOM 侧 `overflow-wrap: anywhere`。

### 6. 浏览器实测**推翻** `overflow-wrap` 假设（未改 DOM 代码）
按用户「先在浏览器复现再决定」的要求，用 Chromium 实跑 agent-ui 行的等价声明（`/tmp/opencode/repro/repro.html`，40/80 cols，`Range.getClientRects()` 取视觉行）：
- `overflow-wrap: anywhere` 与 `break-word` 的**视觉行宽完全一致**（`[185, 312, 8]`），**min-content 也完全一致**（均 337px）。
- 另确认 agent-ui 消息行是 `display: block`（`grep` 无 `flex`/`grid`/`min-width`），`anywhere` 的 min-content 影响**没有可作用的 flex/grid 父级**。
- 结论：`T/ool` 的 1 字断行**不是** wrap 模式造成的，改 `anywhere → break-word` 无行为收益。属**用户可见换行变更**，按 AGENTS.md「禁止以优化为由改变已有功能」**取消该改动**，保留现状。`overflow-wrap` 保持 `anywhere`（`AgentConsoleMessageRenderers.ts:1066`、`:1123`）。

### 7. TUI 支持 `border-left` 长写导轨（跨渲染器一致性）
- `tui.ts` 新增 `resolveBorderEdges()`：`resolveBlockContentWidth` / `resolveBlockContentOffset` / `hasBlockFrame` / `renderBlockLines` 统一改用 `border.box` / `border.left`。左导轨只画左侧 `│`、不画 `┌┐└┘`，**预留 1 列**（整框仍为 2 列）；总宽仍为 `width-1`，不触碰终端最后一列。
- 新增 `paintsLeftRailForBorderLeftRow`：**先证红**（回退 `tui.ts` → `83 passing 1 failed`，`console.spec.ts:830` `startsWith('│')` 为 false，其余 83 条仍绿），**再证绿**（`84 passing`、`EXIT=0`）。

### 8. ⚠️ 导轨与 tail-visibility 的真实冲突（已获用户批准处理）
- **A/B 定位**：旧 `tui.ts` → `pty-acceptance` **PASS**；新 `tui.ts` → **FAIL** `scenario 1: question visible but not near viewport bottom`。**是本次改动引入的回归，非偶发。**
- 机理：导轨占 1 个终端列 → railed 内容窄 1 列 → 长回复多折 1 行 → 尾部问题被推离底部。问题**仍可见**（settle 正则 `是否继续？…Ask code or files` 已匹配），只是超出 `view[-6:]` 窗口。
- **无法零代价规避**：DOM 是「`border-left` + `padding-left`」＝导轨、间隙、内容；终端无法画亚字符导轨，`│` 必须独占一格。改为覆盖 padding 列虽可保住内容宽度，但会丢掉 DOM 的导轨-内容间隙，反而让两端渲染器**静默分叉**。
- 经用户拍板：**保留导轨**，把 `run_acceptance.py` 场景 1 窗口 `view[-6:]` → `view[-8:]`，并在代码内记录该数字来自导轨列成本这一跨层耦合（否则后人会「纠正」回 6 并再次弄红门禁）。
- 回归结果：console 84、components 137、common 5、html 118、agent-ui 1405 全绿；**门禁 27/27，`GATE_EXIT=0`**。

### 9. 收尾验收（本轮）
- **工作树干净**：`7.tui` 与 `origin/7.tui` 同步于 `6a878eecd`，`packages/`、`scripts/` 无未提交漂移；已清理本次浏览器复现产生的 `.playwright-mcp/` 临时快照（console log + 2 份 page yml），`git status --porcelain` 无残留。
- **全量门禁复跑**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **`GATE_EXIT=0`，`PASS (27 passed, 0 skipped, 27 total)`**。逐阶段：10 个 agent 包单测、4 个 components 包单测、4 个 `tsc --noEmit`、`build-agent-ui-web`、`dom-gate` + `dom-gate-matrix`(JSDOM 5 场景 + 80/100 列时间线矩阵)、`tui-gate`(5 场景)、`gate-regression`(指标基线)、`pty-acceptance`(真实终端)、`diff-check`、`source-size`、`production-db-integrity` —— 全部 `GATE-PASS`，日志无 `FAIL`。
- **本轮修复不改动既有功能**：`border-left` 长写此前在 TUI 完全被忽略（不画导轨、不预留列），本次仅补齐该缺口；`border` 简写行为、整框 2 列预留、终端末列不绘制规则均未变。`overflow-wrap` 保持 `anywhere` 未动（浏览器实测已证改之无收益）。

### 仍为开放项（如实保留，未擅自处理）
- 用户最初报告的 `w/ith`、`● │ T/ool` 样本**根因仍未定位**。已排除：DOM `overflow-wrap` 模式（实测 anywhe/break-word 视觉行宽与 min-content 完全一致，且消息行是 `display:block` 无 flex/grid 父级）、TUI 导轨缺失（已修但非该症状成因）。**仍有开放复现，未关闭。**
- PTY acceptance **无 dynamic 布局轴**；dynamic 仍仅单测覆盖。
- 延后调查：实际 routed model profile、Codex/OpenCode tool-round/continuation primary-source 对照（librarian 因 `ProviderModelNotFoundError: opencode/gpt-5-nano` 全失败，无可靠 primary source）。
- `deepseek-v4-flash` 废弃名在 `packages/agents/agent/src/options.ts:623` 附近仍有 4 处，**清理需用户明确批准**。
- `sleep-mlt` 旧 `streak` 子命令独立 staleness 缺陷（`buildReport` 已防护），v8 范围外未改。

## 2026-10-01 Console focus 数据驱动重构（A/B/C，提交 `b98590c2e`，已推送 `github 7.tui`）
- 背景：focus 有两个 owner —— 可变字段 `inputFocused` 与命令式 `AgentConsoleRegionFocusController`（直接驱动 DOM/TUI focus）。用户要求：focus 属组件基层库职责、agent-ui 不处理基层 focus、移除 `inputFocused`、真正数据驱动。
- **A（单一数据源）**：`AgentConsoleSessionState.inputFocused` 改为派生 getter `!this.focusLayers.blocksComposerInput()`；删除可变字段、`setInputFocused()` 及 9 处已冗余调用点（5×`finishPendingQuestion`、`handleEscape`、plan-retry、wizard、@mention）；`sync()` 不再写 `inputFocused`。按用户选定方案 A：不加 `focusDetached`，`onBlur` 一并移除。
- **B（去控制器）**：`AgentConsoleFocusController.ts` → `AgentConsoleFocusLayers.ts`（`git mv` 保留历史）。**未整体删除 494 行**：其中含 focus 层栈（`push/pop/replace/consume`）、10 个 overlay 的按键路由、光标判定，属应用域逻辑，直接删会丢功能（AGENTS.md 禁止）。以重命名 + 去掉 controller 抽象与 module provider 满足「不再有 focus controller」。
- **C（基层执行）**：删除 `AgentConsoleRegionFocus.ts`（39 行）+ module provider + `@Inject` 参数 + `attachTranscriptNavigation` + composer `@focus/@blur`；transcript 根改 `focusable [focused]="transcriptFocused"`，由 components 的 `FocusedDirective` 执行；agent-ui 只持数据。
- **C 的基层阻塞（一并修复）**：`hitTest` 原用 `slice().reverse().find()`、无优先级；transcript 根一旦 `focusable` 即注册整面板 click target，遮蔽子级 `message-detail-toggle`（3 个 `repro-mouse-click` 测试红）。修法：新增 `TerminalClickTarget.interactive?: 'pointer'|'focus'`，`tui.ts:226` 按 `hasPointerHandler ? 'pointer' : 'focus'` 打标，`hitTest` 反向扫描优先返回 `pointer`、否则回退最外层匹配（保持旧行为）。
  - 踩坑：`tui.ts:524` 逐字段重建 child click target，会静默丢掉新字段（首次修复无效，靠 instrumentation 输出 `interactive: undefined` 才定位）。**今后给 `TerminalClickTarget` 加字段，必须同步该重建处。**
- **测试泄漏（修根因，非放宽断言）**：`renderScrolledSessionWindow` 调 `setSessionsFocused(true)` 后未复位，经 suite 级 `@Before`（`Before = BeforeAll`，`packages/unit/src/metadata.ts:144`）泄漏给后续 pending-question 测试；旧实现因 `regionFocus` 反射注入为 `undefined`、该路径本就是死的才「绿」。改为在泄漏测试内复位。
- **验证**：components 146 / common 5 / html 118 / console 87 / agent-ui 1441，全 `EXIT=0`；`scripts/check-source-size.mjs` OK；`git diff --check` 干净。
- 早前全量门禁 25/25 代码阶段全 `GATE-PASS`；仅 `production-db-integrity` FAIL —— 时间线核对为用户在 `sleep-mlt` 的实时 agent 每轮写 `~/.tsdi-agent/agent.db`（DB mtime `08:32:26` 落在门禁窗口内），非测试隔离缺陷、非本次改动（已验 `node` 尊重 `HOME` 覆盖）。

### 仍为开放项（如实保留，未擅自处理）
- **第二轮对话崩溃（用户实机，未修）**：第二个 turn 抛 `Exception: NodeInjector has already been destroyed.`（`packages/ioc/src/impl/injector.ts:308`）。已定位为**已知类别**：惰性注入 getter（如 `container.ts:55 get renderer()`）在被销毁的 `NodeInjector` 上被读取；仓库已在 `container.ts:328`、`compiler-fns.ts:757/980/1106`、`component.ts:79/108/126`、`if.dir.ts:97` 有同类 `injector.destroyed` 守卫，说明存在**缺守卫路径**。用户粘贴仅含 throw 点、无调用栈；委派的 `deep` 子 agent 30 分钟无产出超时、未产生改动。**需完整调用栈或可复现步骤才能定位，勿凭 grep 猜测。** 已排除：`FocusMonitor.focusVia` 仅调 `element.focus?.()`、不触注入器，故本次新增 `[focused]` 非直接抛点；但 destroy 时序仍未排除，待栈验证。
- `Before = BeforeAll`（`packages/unit/src/metadata.ts:144`）使 `@Before` 为 suite 级、agent-ui 各 suite 共享一个 Application；曾试 `@BeforeEach` 修好 3 条焦点测试却弄红 2 条依赖跨测试残留状态的 dashboard 测试（`console-renderer.spec.ts` 断言上一测试残留的 `'design exam system'` 等），已回退。**该组测试存在顺序依赖，仍为潜在缺陷。**

### 追加：第二轮崩溃的静态定位与候选修复（`compiler-fns.ts` 缺失守卫）
- 继续静态排查（Oracle 委派不可用：本环境 `opencode/gpt-5-nano`、`gemini-3.1-pro`、`claude-opus-5` 三个 fallback 模型全部 `ProviderModelNotFoundError`，与 todo 早前记录的 librarian 失败同因）。
- **关键发现**：`binding()` 工厂共 6 个，但只有 3 个有 `if (injector.destroyed) return;` —— `bindingTemplate`(757)、`bindingComponentFactory`(982)、`bindingDirective`(1106)。另 3 个同样在回调里访问注入器却**缺守卫**：
  - `bindingProperty`(895，处理 `[prop]`，**本次新增的 `[focused]` 正走此路径**) → `effect.run(() => evaluateExpression(expr, context, injector, delimiter))`
  - `bindingInterpolationFactory`(923，处理 `{{...}}`) → `evaluateDelimiterExpression(..., injector, ...)`
  - `createModelBindingFactory`：回调只用 `el`/`context`、**不碰注入器**，确认无需守卫。
- **性质**：同节点上 `bindingDirective`（有守卫）会跳过已销毁注入器，而 `bindingProperty`（无守卫）不跳 → 在已销毁 `NodeInjector` 上绑定 `[focused]` 即 `evaluateExpression` → 编译表达式 `evaluate(context, injector)` → `injector.get/has` → `assertNotDestroyed` 抛 `NodeInjector has already been destroyed`。缺守卫的不一致正是该异常类别。
- **修复（三轮）**：第一轮补 `bindingProperty`、`bindingInterpolationFactory`；第二轮复查发现 `bindingText`（`{{...}}` 文本插值）与 `bindingEvent`（`@click` 等事件绑定）**同样缺守卫且同样把 injector 传进表达式解析**，一并补齐；第三轮延伸到结构指令的视图创建路径——`TemplateRef.createEmbeddedView`（`template.ts:84` `injector.get(Renderer)`）无守卫，`if.dir` 已在 `updateView()` 守卫但 `for.dir` 完全无守卫、`switch-case` 两处 `createView()` 亦无守卫，遂给 `for.dir.updateViewsWithTrackBy`（唯一调用 `createView` 的入口）与 `switch-case.createView` 补上同样的 `injector.destroyed` 短路。至此 6 个访问注入器的 `binding()` 工厂全部有守卫（`bindingText`/`bindingTemplate`/`bindingEvent`/`bindingProperty`/`bindingInterpolationFactory`/`bindingComponentFactory`/`bindingDirective`），`createModelBindingFactory` 回调不用注入器故无需守卫。行为保持：仅在已销毁注入器上跳过绑定，属原意。
- **验证**：components 146 / common 5 / html 118 / console 87 / agent-ui 1441，全 `EXIT=0`；全量门禁逐阶段复核全 `GATE-PASS`（agent-ui、9 个 agent 包、4 个 components 包、4× `tsc --noEmit`、`build-agent-ui-web`、`dom-gate` + matrix、`tui-gate`、`gate-regression`、`diff-check`、`source-size`、`production-db-integrity`），仅 `pty-acceptance` 按默认跳过（opt-in）。
- **回归测试（红→绿）**：新增 `packages/components/test/binding-destroyed-injector.spec.ts`，断言 `injector.destroyed` 时 `bindingProperty` 的工厂**不得**执行其 effect。证红：临时移除该守卫 → `0 passing 1 failed`（effect 仍执行并因解析已销毁注入器抛错）；证绿：恢复守卫 → components `147 passing`、`EXIT=0`。
- **诚实边界**：这是**静态锁定的真实缺失守卫缺口**，但**尚不能证明就是用户实机那条崩溃**（无堆栈，无法复现第二 turn）。需完整调用栈确认；若不匹配，则该守卫修复本身独立成立、可保留。

## 2026-10-19 状态行与上下文诊断文案接入 i18n（`569c87276`）
- **问题**：真实 TUI（zh）仍显示 `Approval required: workspace_trust (…)`（状态面板 `statusSummary`）与 `context unchanged · level light · …`（`AgentConsoleSessionState.formatContextPreparationSummary`）。
- **修复**：`AgentConsoleSessionState` 注入可选 `TranslatorService`，上下文摘要经 `formatAgentUiLabel('agent.context.*')`（en / zh-CN）拼接；`AgentConsoleStatusPanelComponent` 注入可选 translator，`agent.status.approvalRequired` 渲染待审批行。
- **回归（红→绿）**：新增 `p317-status-i18n.spec.ts` 3 条；证红（回退为英文拼接）`1 passing 2 failed`（`Expected: "上下文:unchanged" / Received: "context unchanged · level light · …"`；`Expected: "需要审批:delete_file" / Received: "Approval required: delete_file (approval)"`）→ 证绿 `3 passing`。
- **真实 TUI 验收（zh）**：`上下文 unchanged · 级别 light · 无摘要 · 6→6 条消息 · 151→151 tokens · 节省 0% · 保留 100%`、`需要审批：workspace_trust（a6bcf85b）`；`a` 放行后文件删除。
- **验证**：`agent-ui` **1534 passing**、`tsc` 0、`source-size` OK、`git diff --check` 干净。
- **说明**：上下文 `strategy` / `level` 的取值（`unchanged` / `light`）保留为协议标识，仅本地化其前缀。

## 2026-10-19 审批原因结构化并本地化（`72a41fc71`）
- **问题**：审批详情的 `Reason:` 文本（`Tool "x" requires approval.`）由 agent 层 `DefaultApprovalStrategy.reason()` 生成，纯自由文本，UI 无法本地化（真实 TUI zh 下仍显示英文）。
- **修复**：`ApprovalRequest` / `ApprovalRequestView` / `AgentApprovalRequestedEvent` 增加可选 `reasonDetail?: { code, params }`；`ApprovalStrategy` 增加可选 `reasonDetail?()`，`DefaultApprovalStrategy` 返回 `{ code: 'tool-requires-approval', params: { tool } }`；`createRequest` / `toRequestView` 透传。agent-ui 状态与两个事件桥透传，审批面板与 `/approvals` 选择器优先用 `agent.approval.reasonCode.<code>`（en/zh）渲染，缺失时回退 `reason`。
- **预算**：`ToolApprovalManager.ts` 基线 626 无余量——压缩默认规则数组（−9）并把 `reasonDetail` 合并进既有行，保持 `source-size` 通过。
- **回归（红→绿）**：`agent/test/tools.spec.ts` 新增「structured reason」；证红（回退 `createRequest` 填充）`47 passing 1 failed`（`Expected: "tool-requires-approval" / Received: undefined`）→ 证绿 `48 passing`。`agent-ui/p315` 新增结构化原因用例；证红（回退面板逻辑）`3 passing 1 failed`（`Expected substring: "需要审批:delete_file" / Received: "原因：requires approval"`）→ 证绿 `4 passing`。
- **真实 TUI 验收（zh）**：`原因：工具「workspace_trust」需要审批。` / `30 秒后过期` / `a 允许 …`；`a` 放行后文件删除。
- **验证**：`agent` **1021 passing**、`agent-ui` **1531 passing**、两包 `tsc` 0、`source-size` OK、`git diff --check` 干净。
- **仍可见英文**：事件行 `Approval required: <tool> (<id>)` 与上下文诊断行 `context unchanged · level light · …` 尚未 i18n（下一批）。

## 2026-10-19 时间线角色标签接入 i18n（`316a1fc09`）
- **问题**：`Thought · ` / `Tool · ` / `Plan · ` / `Files · ` / `Question · ` / `Approval · ` / `Error · ` / `$ ` 是 `AgentConsoleMessageRenderers.ts` 中 `AgentConsoleKindRenderer` 子类的静态字段，zh-CN 下仍显示英文（真实 TUI 可见 `Tool · 检查目录已完成`）。
- **修复**：`AgentConsoleKindRenderer` 注入可选 `TranslatorService`，`resolve()` 用 `formatAgentUiLabel(translator, 'agent.timeline.<kind>', label)`；新增 `agent.timeline.*` 目录（en / zh-CN：思考/工具/计划/文件/提问/审批/错误）。
- **自定义渲染器保护**：`defaultTimelineLabel(kind)` 返回英文默认值，仅当 `label` 等于默认值时才翻译——宿主经 `AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES` 覆盖的渲染器保留自己的标签。
- **回归（红→绿）**：新增 `p316-timeline-role-label-i18n.spec.ts` 4 条；证红（回退 `roleLabel`）`1 passing 2 failed`（`Expected: "T:agent.timeline.tool" / Received: "Tool · "`）→ 证绿 `4 passing`。期间全量暴露并修复了自定义标签被目录覆盖的回归（`p309` 动态覆盖测试由失败 → 通过）。
- **真实 TUI 验收**：`LANG=zh_CN.UTF-8` 下时间线显示 `✓ 工具 · 检查目录已完成 …`、`✓ 思考 · …`。
- **验证**：`agent-ui` **1530 passing**、`tsc` 0、`source-size` OK（为守住基线预算，`itemStyle` 等价压缩 + helper 放在未入基线的 i18n 文件）。

## 2026-10-18 `/approvals` 选择器详情接入 i18n（`4078d2abc`）
- 承接上一条：`AgentConsoleApprovalView.selectApprovalRequest` 的标题（`Pending approvals`）与详情（`Tool:` / `Reason:` / `Input:` / `Input: -` / `Timeout:` / `Expires:`）硬编码英文。
- **修复**：函数新增可选 `translate` 参数（默认英文兜底），组件用 `this.translator` 传入；i18n 目录新增 `agent.approval.pendingTitle/tool/input/inputNone/timeout/expiresAt`（en / zh-CN）。
- **回归（红→绿）**：`p315` 新增第 3 条；证红（回退文案）`2 passing 1 failed`（`Expected: "T:agent.approval.pendingTitle" / Received: "Pending approvals"`）→ 证绿 `3 passing`。
- **验证**：`agent-ui` **1526 passing**、`tsc` 0、`source-size` OK、`git diff --check` 干净。
- **仍未覆盖**：`Reason:` 之后的文本由 agent 层 `DefaultApprovalStrategy` 生成（英文），需结构化 reason 才能本地化。

## 2026-10-18 审批面板文案接入 i18n（`9686bddfb`）
- **问题**：审批面板的标题（`Approval required · Allow X?`）、按键行（`a Allow   d Deny   y Copy   ↑↓ Move   Esc Dismiss`）、计数（`approvals N · i/N`）、详情（`Reason:` / `No reason provided` / `Expires in Ns` / `Expired`）与无障碍标签全部硬编码英文，违反 AGENTS.md §9（用户可见文案必须经 i18n）。
- **修复**：`agent-ui.i18n.ts` 新增 `agent.approval.*`（en / zh-CN）；`AgentConsoleApprovalsPanelComponent` 注入可选 `TranslatorService`，上述文案统一经 `translate()` 并保留英文兜底。
- **回归（红→绿）**：新增 `agent-ui/test/p315-approval-panel-i18n.spec.ts`（2 条）；证红：回退面板文案 → `1 passing 1 failed`（`Expected: "T:agent.approval.actions" / Received: "a Allow   d Deny …"`），且旧构造签名下直接编译失败（`TS2554`）；证绿：`2 passing`。
- **真实 TUI 验收**：`LANG=zh_CN.UTF-8` 下审批提示显示 `需要审批 · 允许 workspace_trust？` / `审批 1 · 1/1` / `a 允许   d 拒绝   y 复制   ↑↓ 移动   Esc 关闭`。
- **诚实边界**：`Reason:` 之后的文本（`Tool "x" requires approval.`）由 agent 层 `DefaultApprovalStrategy` 生成，仍为英文；`/approvals` 选择器详情（`AgentConsoleApprovalView.ts`）尚未接入 translator——两者列为后续项。
- **验证**：`agent-ui` **1525 passing**、`tsc` 0、`source-size` OK、`git diff --check` 干净。

## 2026-10-18 修复 TUI 审批键（`a`/`d`）无效：决议未走 runtime 的 approval manager（`4837b5ede`）
- **现象**：真实 TUI（未信任 workspace）中 `workspace_trust` 提示可见、`approvalsFocused=true`、`inputFocused=false`，但按 `a` 既不进 composer、也不关闭提示，30s 超时后工具被 trust gate 跳过。
- **定位（真实 TUI 插桩）**：`dispatch-focus raw="a" → focusKey=approve` → `handleApprovalKey('approve')` → `resolveApproval` → `state.resolveApprovalAction` → `getPendingApprovals` 返回 **0** → `applyApprovalDecision` 抛 **`Approval is not configured`**（来自 `AppRpcServer`）。即 console 注入的 approval manager 为 null，落到了未配置的 RPC 路径。
- **根因**：`DefaultAgentRuntime` 在 DI 注入的 `ApprovalManager` 未配置时会**自建** `ToolApprovalManager`（`resolveApprovalManager`）；console 只读自己的注入字段，因此决议发往无人处理的路径。提示之所以可见，是因为事件桥（`AgentApprovalRequestedEvent`）照常渲染。
- **修复**：`AgentRuntime` 暴露 `approvalManager`（runtime 实际用于 gating 的实例），`DefaultAgentRuntime` 构造时把解析结果同时写入该字段；console 的 `resolvedApprovalManager = 注入值 ?? runtime.approvalManager`，`refreshPendingApprovals` / `applyApprovalDecision` / `getPendingApprovals` / `setAutoApprove` 统一走它（并借机把 `setAutoApprove` 收敛为一行以守住 source-size 预算）。
- **回归（红→绿）**：新增 `agent-ui/test/p314-approval-runtime-manager.spec.ts`；证红：临时改回 `this.approvalManager` → `0 passing 1 failed`（`Expected: true / Received: false`）；证绿：`1 passing`。
- **真实 TUI 验收（去插桩后）**：按 `a` → 提示消失 → `trusted-projects.json` 写入 `/tmp` → `apfix.txt` 被删除 → 回答确认。`agent-ui` **1523 passing**、`agent` **1020 passing**、两包 `tsc` 0 错误、`source-size` OK、`git diff --check` 干净。

## 2026-10-18 遗留三项收口：sandbox 能力探测 / knowledge_search 信号 / 重复工具调用实测
- **sandbox-exec 能力探测**：合并后已具备 `probeSandboxExecTool` / `detectSandboxExecTool` / `describeSandboxCapabilities`（一次 `sh -lc 'command -v <tool>'` 短探测：bwrap → unshare / sandbox-exec / windows-native），`DefaultSandboxExecutor.execute` 用它包裹命令，缺失时回退并给出可操作 reason。本机实测：无 bwrap/unshare → `{"tool":null,"reason":"No OS sandbox tool available on linux (need bwrap or unshare)."}`，能力表 filesystem-write/network/read-denied 均降级为 process 且带 reason；`agent/test/sandbox-exec.spec.ts` 覆盖。
- **knowledge_search 遵守 turn 信号**（`c89f8b197`）：新增 `KnowledgeSearchOptions.signal` 透传；`knowledge_search` 入口检查 `context.signal` 并把 signal 传给 adapter；`DefaultKnowledgeAdapter.search` 已中止时抛 `AbortError`。回归 `test/knowledge-search-signal.spec.ts` 3 passing；证红：旧实现下测试无法编译（`TS2559`，旧选项类型无 `signal`）；证绿：3 passing；`agent-tools` 全量 **570 passing**、`tsc` 0 错误。
- **browser/***：`PlaywrightBrowserAdapter.execute(request, context)` 已收到完整 `AgentToolContext`（含 `signal`），`playwright_browser` 直接透传；是否中止由宿主 adapter 决定（设计如此，无改动）；`browser_open` 仅返回外部打开请求，不产生阻塞 I/O。
- **真实长会话观测（重复工具调用是否下降）**：真实 DeepSeek 会话（隔离 `--root` + 真实 workspace，`--tools list_dir,read_file`）中，模型一次发起 **8 个完全相同的 `list_dir`**：1 个真实执行、1 个 `Repeated identical read-only call; reused the earlier result.`（去重缓存）、6 个 `Tool "list_dir" repeated 5 times with identical arguments.`（循环检测）——**重复调用在真实模型下确实被消除**（8→1 次执行）。近上限提示（`nearToolRoundLimitPrompt`，剩余 2 轮）在本次单轮场景未触发，已有确定性单测覆盖。
- **验证**：`agent-ui` 1522 / `agent` 1013 / `agent-tools` 570 / `agent-cli` 92 passing，4 个 agent 包 `tsc --noEmit` 0 错误；合并提交 `b8ddf0e29` 后工作树干净。

## 2026-10-15 真实模拟测试：sleep-mlt 系统构建 → 修复 `todo` 计划输入容忍度（`37308fb01`）

### 运行方式与 provider 现实
- 按用户要求先跑 `packages/agents/agent-cli` 的 `npm run chat -- --workspace /home/zhouyou/workspace/sleep-mlt`（默认 root）。**配置的代理 `https://rehdasu.cn` 当天持续 502/503**（`Service temporarily unavailable`），真实模型不可达。
- **Agent 对 503 的处置正确、无缺口**：`RetryPolicy.classifyModelError(503)` → `server` → 可重试，按 `maxRetries=3` + 指数退避重试后给出可操作错误 `openai-compatible returned a server error for gpt-5.5 (status 503). Usually temporary — retry, or switch model with /model. (request_id: …)`，composer 正常恢复、可继续操作。
- 为完成**真实**端到端，改用真实 DeepSeek：`--root /tmp/opencode/agent-root`（`provider=deepseek` / `model=deepseek-flash` / `https://api.deepseek.com`，**独立 DB**，遵守 AGENTS.md §8），驱动真正的 TUI + 真实工具 + 真实文件系统跑系统构建任务。

### 三个真实任务
1. headless `run --json` 新建 `workout-system/`（3 模块 + 3 测试）：功能全部成功、测试 `exit=0`；**唯一失败**是 `todo` 工具硬校验（见下）。
2. 真实 **TUI 两轮**：第 1 轮建 `habit-log/`（并更新 sleep-mlt `AGENTS.md`）、第 2 轮续写 `countFor()` → **两轮都成功；未复现 todo.md 记录的第二轮 `NodeInjector has already been destroyed` 崩溃**（DeepSeek 两轮连续对话正常，token 20.8K→43.6K）。
3. headless `run --json` 在既有 `workout-system/` 上加 `exportCsv()` + 改测试 + 跑测试：**0 失败**，模型还主动标注了一处需求歧义。

### 真实缺口（复现 → 修复 → 红绿回归）
- **现象**：模型在计划里发 `kind:"test"`，`ToolSchemaValidator` 在 `invoke` 前**整体拒绝**整批计划更新：`Tool "todo" input validation failed: $.todos[4].kind must be one of task, milestone, bug, feature, chore`，模型只能重发，白白多一轮。
- **根因**：schema 比 store 更严。`todo-store.ts` 的 `normalizeKind`/`normalizeStatus` 本就把未知值降级（kind 丢弃、status→pending），且 `TodoStatus` 本就含 `failed`，**但 schema 的 `status` enum 漏了 `failed`**（模型/计划发 `failed` 同样被硬拒）。与既有 `action` 去严格 enum（`5da6bbd54`）同类。
- **修复**：`planning/todo.tool.ts` 去掉 `kind`/`status` 的 `enum`，allowed 值移入 `description`（与 `action` 同风格）。**仅把“硬拒绝”改为“降级”，合法输入行为不变**（未删除任何功能）。
- **回归（先证红再证绿）**：`test/todo-store-v2.spec.ts` 经真实 `ToolSchemaValidator` + `TodoTool.invoke` 边界断言。修复前 **61 passing 2 failed**（`Received: ["task",…]` / `["pending",…]`）；修复后 **63 passing `EXIT=0`**。
- **门禁**：agent-tools 全量 **525 passing `EXIT=0`**、`tsc --noEmit` `EXIT=0`、`check-source-size.mjs` OK、`git diff --check` 干净。

### 诚实边界与未决项
- provider 代理当天不可用，故“真实差距”来自**真实 DeepSeek 模型驱动的真实 CLI 端到端**（不是代理；也不是 fake model）。
- 第 1 次运行用的是用户指定的默认 root，向生产库 `~/.tsdi-agent/agent.db` **追加**了一条失败会话（未清空/覆盖/重建）；自第 2 次起全部改用独立 root 与独立 DB。
- **仍未复现/未改**：todo.md 记录的第二轮 `NodeInjector has already been destroyed` 崩溃（本轮真实两轮未复现，需完整调用栈）；`deepseek-v4-flash` 废弃名清理（需用户批准）。
- 已顺带核对为**契约正常、非缺陷**：非 Git 工作区的 `git_operations diff/status` 降级为 `notAGitRepo`+session 快照（模型正确理解）；`todo` 对“新增项缺 content”的拒绝（有意的计划质量守卫，模型正常改发）。

## 2026-10-15 继续优化：委派子会话消息污染父会话导致 400 崩溃（`e92b67ea7`）

### 复现（真实 DeepSeek 驱动真实 CLI）
- 三个并行真实探针（web / content_search / git）中，web 探针在 `web_search` 不可用后，模型调用 `spawn_agent` 委派研究，紧接着下一次模型请求报 400 并**崩溃整个 run（EXIT=1）**：
  `Model request failed with 400 (deepseek/deepseek-flash): An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'. (insufficient tool messages following tool_calls message)`。
- 从该会话 DB 取证：父会话消息序列为 `assistant(tool_calls:[web_extract, spawn_agent]) → tool(web_extract) → [子会话整段 47 条 user/assistant/tool] → tool(spawn_agent) → 400`。子会话 47 条与其独立 spawn 会话**一字不差地重复**出现在父会话。

### 根因
`LightweightAgentRunner.runSingle` 把子会话整段 transcript 原样 `sessions.append(parentSessionId, msg)`。`spawn_agent` 的 `invoke()` 期间，父会话的 assistant `tool_calls` 消息**尚未等到**其 tool 结果，插入的子会话非 tool 消息打断了 OpenAI 契约要求的 `tool_calls → 逐条 tool 结果` 相邻关系 → 下一请求 400。

### 修复（保留功能，不删除）
- 该「导入父会话」是 `fa52da418` 引入、并被 `tools.spec.ts::lightweightAgentRunnerImportsMessagesToParent` 锁定的**既有功能**；按 AGENTS.md 不删功能，改为**展示保留 + 模型上下文排除**：
  - `@tsdi/agent` 新增 `IMPORTED_MESSAGE_METADATA_KEY` / `isImportedChildMessage`（`AgentMessage.ts`）。
  - `LightweightAgentRunner` 导入每条子消息时打标 `metadata.importedFromSessionId`。
  - `DefaultAgentRuntime.buildModelRequest` 组装模型请求时过滤带标记的消息（`DefaultAgentRuntime.ts`，net 0 行，守住 source-size）。

### 回归（先证红再证绿）
- `agent-tools/test/delegation-v2.spec.ts` 新增 `subAgentImportIsTaggedDisplayOnly`：导入消息必须带标记且角色序列保留；回退 runner → **红**（`Expected true / Received false`），修复后 **绿**（15 passing）。
- `agent/test/imported-messages.spec.ts`（新增）：`isImportedChildMessage` 判据 + 经真实 `DefaultAgentRuntime.buildModelRequest` 断言模型请求**排除**导入消息并保留正常/工具消息；临时去掉过滤 → **红**（泄露 `IMPORTED CHILD PROMPT`），恢复 → **绿**（2 passing）。

### 真实验证
- 同 prompt/同模型复跑并**显式要求** `spawn_agent`：`spawn_agent` 1 次 → 随后 `read_file` 1 次（即 400 发生的那一次后续请求）→ **0 错误、EXIT=0** 正常给出最终回答；父会话 DB 仍保留 2 条带 `importedFromSessionId` 标记的导入消息（功能未丢）。

### 门禁
agent 967 passing、agent-tools 526 passing、`tsc`（agent/agent-tools/agent-ui/agent-gateway）全 EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 9/9 GATE-PASS**（含 production-db-integrity）。

### 附带（未改，如实记录）
- `web_search` 在未配置搜索适配器时恒失败（历史 30 次调用）——模型会改走 `web_extract`，本轮探针证其可自愈；属配置缺失而非工具缺陷，未擅自改默认注册。

## 2026-10-15 第三轮优化：委派子代理报告解析容忍 markdown（`12ca547bd`）

### 复现（真实 DeepSeek 驱动真实 CLI/TUI）
- 并行真实探针覆盖未触及面：**错误修复**（预置失败测试）、**真实 git 仓库**（init/add/commit/diff）、**content_search + offset 读大文件**、**后台进程**、以及 **TUI 的 ask_user 与 Ctrl+C 中断**——这些**全部正确、0 失败**（含 ask_user 数字选项正确解析、Ctrl+C 中断回合并恢复 composer、1204 行文件 offset 读区间准确）。
- 但复盘中注意到：上一轮 web 探针的**委派子会话**在已宣称"任务完成"后仍被反复要求 `Continue the delegated task…`。取子会话 DB 取证，其报告写作 `## Summary: …` / `- **Summary:** …`。

### 根因
`parseDelegatedAgentReport` 用严格 `^\s*(Summary|…)\s*:` 匹配行首。模型的 markdown 报告（`## Summary:`、`- **Summary:**`、`**Next steps:**`）**一律匹配不到** → `report` 解析为 `undefined` → `LightweightAgentRunner` 认为未完成，反复发 `CONTINUE_PROMPT` 直到 `maxTurns`，**白耗 token/时间**（用户看到重复的 continue 噪声）。附带发现 multi-value 早停判定用原始大小写 `match[1]`，`"next steps"` 小写会被误判为单值而 `break`。

### 修复（`nested-agent-runner.ts`）
解析前剥离行首标题/列表/加粗装饰（`^\s*(?:[#>\-+*]+\s*)+`、`^\*+\s*`）；regex 允许标签后 `**` 与全角冒号 `：`；value 去掉首尾 `**`；multi-value 判定改用 `normalizeLabel` 后的 key（顺带修掉大小写敏感早停）。

### 回归（先证红再证绿）
`agent-tools/test/delegation-v2.spec.ts` 新增 `parsesMarkdownDecoratedReport`（`## Summary:` / `- Completed:` / `**Next steps:**`）：**旧实现返回 `undefined`（红）**，修复后正确解析（绿，16 passing）。

### 真实验证
强制 `spawn_agent` 复跑：子会话报告为 `- **Summary:** …`（正是旧实现会漏的形态），修复后子会话 **1 轮完成**（2 条消息、**0 次 continue-prompt**）；旧实现此处会循环到 maxTurns。

### 门禁
agent-tools 527 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第四轮优化：llm_task 的 model/temperature/maxTokens 静默丢弃（`8613e12a7`）

### 真实探针结果（全部 0 失败，如实记录）
并行真实探针覆盖更多未触及面：**超大输出**（50000 行，模型改用 `seq>…; wc; tail`）、**后台进程**（`process.*` 未注册，模型改用 shell `&`+`ps` 自愈）、**memory.put/list**、**`llm_task`**、**`apply_patch`**、**`process.start/poll/kill`**（未注册，模型自愈）、**compaction**（4 轮内含 1204 行文件读取，触发 10+ 次 pruning，transcript 完整性核对 **0 处 tool_calls 孤立**，turn4 跨压缩回顾准确）、**`parallel_spawn`**（2 并行任务成功且后续继续）。以上均无工具/运行时缺陷。

### 缺口（代码审计 + 真实复现）
`llm_task` 工具 `inputSchema` 文档化并读取 `model` / `temperature` / `maxTokens`，`DelegatingLlmTaskAdapter` 也把它们放入 `NestedAgentRunRequest`；但 `LightweightAgentRunner.runSingle` 只透传 `reasoning`，**其余三个被静默丢弃**（`NestedAgentRunRequest` 里字段存在却从未使用）。调用方以为生效，实际用默认模型/温度/上限。

### 修复（全部可选字段 + `??` 回退，未设置时行为逐字节不变）
- `AgentTurnAgentConfig` 新增 `temperature`/`maxTokens`/`model`；runner 透传（含 `profile`/`reasoning`）。
- `DefaultAgentRuntime.buildModelRequest` 将 `turnContext.agent` 的三个覆盖写入 `ModelRequest`（压缩为 net 0 行，守住 source-size）。
- `ModelRequest` 新增 `maxTokens`/`model`；OpenAI 兼容与 Anthropic 适配器改用 `request.X ?? 原默认`。
- 顺带修正响应 `metadata.model`：原先恒为 `resolveModel()`（配置模型），改为**请求实际使用的模型**，便于验证与诊断。

### 回归（先证红再证绿）
- `agent-tools delegation-v2.spec.ts`：runner 必须把覆盖传入 `runTurn` 的 agent 配置（回退 → `Received undefined` 红，恢复 → 绿，17 passing）。
- `agent turn-model-overrides.spec.ts`（新增）：`buildModelRequest` 必须应用 `turnContext.agent` 覆盖（去掉三行 `if` → 红，恢复 → 绿）。

### 真实验证
`llm_task` 传 `model='deepseek-v4-pro'`、`maxTokens=200`：子会话响应 metadata `model` = `deepseek-v4-pro`（与 API 回显一致，此前恒为配置的 `deepseek-flash`），`maxTokens` 生效（`finishReason: length` 及 token 计数）。

### 门禁
agent 968 passing、agent-tools 528 passing、`tsc`（agent/agent-tools/agent-ui/agent-gateway）全 EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 9/9 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第五轮：rehdasu 线上复核 + web_extract 空提取修复（`e976c7a26`）

### rehdasu.cn 复核（用户指出其可用 → 已核实）
- **配置确实被读取**：`tsdi-agent doctor` 输出 `Model: openai-compatible / gpt-5.5`、`Base URL: https://rehdasu.cn`、`API key: configured`；chat 头部也显示 `gpt-5.5 · <workspace>`。故非配置读取问题。
- **端点可用**：`/v1/models` 200（列出 16 个模型）；`/v1/chat/completions` 对 `gpt-6-astra`/`gpt-6.1-sol`/`gpt-6-luna`/`gpt-5.6-luna` 均返回正常。
- **唯一不可用的是当前配置的模型**：`gpt-5.5`（base）与 `gpt-5.6`（strong）持续 502/503 `Service temporarily unavailable`（其它模型可用）。故首轮"provider 不可用"实为**该模型上游不可用**，端点本身正常。
- **真实端到端已在 rehdasu 跑通**：以 `gpt-6.1-sol` 构建 `prime-system/`（测试 `primes tests passed`、更新 AGENTS.md，`turn.completed`）与强制 `spawn_agent` 委派（子会话 1 轮完成、0 次 continue）均成功。延迟偏高（trivial 调用 13–35s），属代理负载。
- **诚实提示**：`gpt-5.5`/`gpt-5.6` 不可用时 `run` 会按 `RetryPolicy` 重试后报可诊断错误（实测 ~194s，含长 Retry-After 退避），非悬挂。

### 全量门禁（含 PTY）
`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 GATE-PASS，`FULLGATE_EXIT=0`**（10 agent 包 + 4 components 包单测、4× tsc、agent-ui Web 构建、DOM/TUI gate + matrix、gate-regression、真实 PTY acceptance、diff-check、source-size、production-db-integrity）。上一轮对 `ModelRequest`/适配器/运行时的改动**无回归**。

### 缺口：`web_extract` 空提取伪装成功（真实 web 探针观察到）
2xx 抓取 JS 渲染页时 `extractText` 得空串，工具仍返回 `content: ''` 的"成功"，模型无法区分"页面确实为空"与"未能静态提取"，反复换 URL 重试浪费多轮。

**修复**：空提取时附 `empty: true` + 可操作 `warning`（JS 渲染/阻碍静态提取，建议换 URL、raw/text 端点或浏览器工具）；content/title/url 与成功判定不变（纯附加字段）。
**回归（红→绿）**：`indexed-web-search.spec.ts` 新增 `flagsEmptyExtraction`（旧实现 `result.empty === undefined` 红）与 `doesNotFlagNonEmptyExtraction`。

### 门禁
agent-tools 530 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第六轮：MCP 端到端 + mcp.call_tool 可操作拒绝信息（`ebabdd9ed`）

### 真实验证（本地 stdio MCP server）
- 先跑通 S1–S4 真实探针：`execute_code`/`http_fetch` 在默认 preset 下未注册（模型改用 `terminal`/`calculator` 并正确指出 `calculator` 浮点对大整数不精确）；`knowledge_store`/`knowledge_search` 正常；`sessions_*` 未注册（模型 `tool_inspect` 猜名失败属正常）。
- **MCP 端到端**：写了一个最小 stdio MCP server（换行分隔 JSON-RPC 2.0，实现 `initialize`/`tools/list`/`tools/call`），经 `settings.json` 的 `mcp.servers` 注入。握手与 `tools/list`/`tools/call` 均正常。

### 观察
配置一个**未声明 `tools`/`allowedTools`** 的 MCP server（这正是 `mcp add` 写出的形态）：模型经 `tool_search`/`tool_inspect` 看到 `mcp.demo.echo` 提示（`activated=false`、`discovery.via=mcp.call_tool`），调用 `mcp.call_tool` 被拒 `MCP tool 'demo.echo' is not declared or allowlisted.`，但**未说明如何启用**，模型反复尝试直至回合超时。

### 判定（如实记录）
- 动态 MCP 的**发现/提示**与 `mcp.call_tool` 的 **allowlist 门禁**均为**既定设计**，分别由 `tool search and inspect expose dynamic MCP discovery hints` 与 `mcp.call_tool rejects dynamic server tools unless explicitly allowlisted` 锁定；**未擅自改动**。
- 真实缺陷是**拒绝信息不可操作**（对齐 AGENTS.md §9）。

### 修复
`mcp.call_tool` 拒绝信息改为可操作：明确指出在 `settings.json` 的 `mcp.servers` 中把工具声明到该 server 的 `tools`，或把工具名加入 `allowedTools`，即可启用。
**回归（红→绿）**：`mcp.spec.ts` 既有拒绝测试新增断言（旧信息不含 `allowedTools` → 红，修复后绿，12 passing）。

### 门禁
agent-tools 530 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第七轮：`mcp add` 修复（--command 拆分 + --allow）（`550848ad8`）

### 真实端到端复现的两个 MCP 配置缺陷
1. **`--command` 参数被并进可执行名**：`mcp add demo --command "node /tmp/demo-mcp.js"` 把整串存进 `command`，而 `StdioMcpClient` 用 `spawn(command, args)`（无 shell）→ `spawn("node /tmp/demo-mcp.js", [])` → **ENOENT**，server 完全不可用；CLI 还打印 `Transport: stdio (node /tmp/demo-mcp.js)` 像正常。真实探针报 `mcp.call_tool failed: spawn node /tmp/opencode/demo-mcp.js ENOENT`。
2. **CLI 无法设置 `allowedTools`**：承接上一轮发现——CLI 加进来的动态 MCP 工具经 `mcp.call_tool` 恒被拒（`not declared or allowlisted`），默认不可用。

### 修复（`packages/agents/agent-cli`）
- 新增 `splitCommandLine()`（支持单/双引号），把 `--command` 拆成 `command` + `args` 写入 `settings.json`；`--url`/`--command` 互斥与缺省校验改用拆分结果。
- 新增 `mcp add --allow <tool>`（可重复）→ 写 `allowedTools`；重复 add 未给 `--allow` 时**保留**旧 allowlist；`mcp list`（文本与 `--json`）展示 allowed。
- `src/cli.ts` 合并两行 option 以守住 source-size ratchet（净 0 行）。

### 回归（先证红再证绿）`test/cli.spec.ts`
- `mcp add --command tokenizes the executable and its args`：旧实现 `command="node server.js --flag"`（红）→ 修复后 `command="node"`、`args=["server.js","--flag"]`，引号内空格保留。
- `mcp add --allow records allowedTools and preserves them on update`：旧实现 `allowedTools === undefined`（红）→ 修复后写入、更新时保留、显式 `--allow` 覆盖并去重。

### 真实端到端验证
`mcp add demo --command "node /tmp/opencode/demo-mcp.js" --allow echo`（本地 stdio MCP server）后，Agent 调用 `mcp.call_tool`（serverId=demo, name=echo）**成功返回 `echo: hello-from-mcp`**（修复前分别为 ENOENT 与 not declared or allowlisted）。

### 门禁
agent-cli 90 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第八轮：project_intel 描述对齐真实行为（`0242f31a4`）

### 真实验证
并行真实探针覆盖其余工具族：`project_intel`、`import_config`、`checkpoint`、`race` —— `import_config`/`checkpoint`/`race` 均正常（`import_config` detected=0 因工作区无 Cursor/Claude 配置，模型正确说明并提供 `homeDir` 用法），无工具失败。

### 缺口（真实运行观察到）
`project_intel`：模型按系统提示把它当作「项目/工作区分析」工具调用了 **3 次**，每次只拿到把自身 `task` 原样回显的 `highlights`（`notes` 空、无任何文件分析），随后判定其 "misconfigured" 并改为手工分析，浪费多轮。工具实为**纯格式化器**（把调用方传入的 `task`/`todos`/`notes` 组织成 summary/risks/handoff），但描述 `Summarize task context, risks, and handoff notes for the current project.` 读起来像会分析。

### 修复
描述改为如实说明：只格式化传入的 `task`/`todos`/`notes`，**不检查工作区、不读文件**；需先用文件/搜索工具收集上下文再传入。
**回归（红→绿）**：`tools.spec.ts` 既有 project intel 测试新增描述断言（旧描述 → 红，修复后绿，250 passing）。

### 附带（未改，如实记录）
系统提示 `IdentitySection`/`ToolsSection` 仍把 `project_intel` 描述为可用于「project/workspace analysis」；与工具实际（格式化器）存在措辞张力。本轮只改了模型直接可见的工具描述（更贴近调用点、零全局行为风险），**未改系统提示**——若要让提示也一致，属可跟进项。

### 门禁
agent-tools 530 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第九轮：系统提示的项目智能指引对齐（`3bd47784d`）

承接第八轮遗留：第八轮只改了工具描述，系统提示仍把 `project_intel` 描述为可用于「project/workspace analysis」。

### 修复
`IdentitySection` 与 `ToolsSection` 中两处指引的「project/workspace analysis」改为「a structured summary of the context you/they provide」，保留「不要为纯问答调用 `project_intel`」的原意，使指引与工具真实行为（纯格式化器，不检查工作区）一致。

### 回归（红→绿）
`prompt-cache.spec.ts` 新增 `projectIntelGuidanceMatchesFormatter`：渲染含 `project_intel` 的提示后，断言**不再含** `project/workspace analysis` / `workspace/project analysis`，且**含** `structured summary of the context`（旧提示 → 红，修复后绿，7 passing）。

### 门禁
agent 969 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第十轮：MCP HTTP + 剩余工具族验证，发现 `rpc-stdio` session.create 缺陷（**未修，开放项**）

### 本轮验证（均通过）
- **MCP Streamable HTTP 端到端**（此前唯一未覆盖的 MCP 传输）：自建最小 HTTP MCP server，经 `mcp add --url ... --allow echo` 配置 → Agent 调用 `mcp.call_tool` 返回 `http-echo: hello-http-mcp`。
- **schedule/cron、escalate、200000 行超大输出、import_config**：模型均正确处理（`schedule` 的 "not found" 是 `cancel` 后又 `get` 已移除任务，属预期）。
- **安全护栏**：未读先写、越界写 `../`、读符号链接——均被拒绝且信息可操作。
- **代码审计**：`alignSliceStartToToolRound`、`edit-match.ts`/`edit_file`、`simple-diff.ts`（`unifiedLineDiff`：LCS 有序、hunk 不重叠、行号正确）——均正确。

### ⚠️ 开放缺陷（已复现，**未修**，需完整调用栈/更多时间）
**`tsdi-agent rpc-stdio` 的 `session.create` 恒失败**，而 `session.messages`（读已存在会话）正常。

- **复现**：
  ```bash
  printf '{"jsonrpc":"2.0","id":1,"method":"session.create","params":{"sessionId":"x"}}\n' \
    | node packages/agents/agent-cli/bin/tsdi-agent.js rpc-stdio --provider echo --model echo [--root <任意>]
  ```
  返回 `{"error":{"code":-32603,"message":"DataSource \"undefined\" not found. Available: none", ...}}`。
- **栈**：`TypeormAdapter.getConnection` ← `getRepository` ← `TypeOrmSessionStore.get` ← `AppRpcServer.setSessionWorkspace (app-rpc/AppRpcServer.ts:3357)` ← `AppRpcServer.createSession (573)`。
- **确定性**：默认 root（`~/.tsdi-agent`，含真实 agent.db）与全新 root 均失败；`app.ping` 后再等 4s 再 create 仍失败（非启动竞态）。同一 root 下 `session.messages` 对**已存在**会话正常返回 → 非「ORM 完全未 bootstrap」，而是 create 路径特有的 store/adapter 不匹配。
- **为何未被现有测试覆盖**：gateway 的 stdio `session.create` 测试（`agent-gateway/test/gateway-server.spec.ts`「streams json-rpc responses over jsonl stdio transport」）**手工构造 `AppRpcServer` 并注入 ORM store**，未走 CLI 的 `runAgentRpcApplication`（`AgentAppServerModule` 为根 + `provideAgentOrmStorage` 作为根 provider）这条 DI 路径。cli.spec 的 rpc-stdio 测试只覆盖 `app.ping`。
- **已尝试且无效（均已回退、未提交）**：
  1. `Application.run(AgentModule, { deps: [ServerCommonModule, AgentAppServerModule] })`（镜像 chat）——仍报同错。
  2. `Application.run({ module: { imports: [AgentAppServerModule, ServerCommonModule], providers: [...provideAgentOrmStorage, ...] } })`（镜像 `runAgentTUI` 的模块字面量写法）——仍报同错。
  3. 改用 `imports: [..., AgentOrmModule.withStorageRoot(root)]` 导入 ORM 模块而非 provide——仍报同错。
- **新增线索（供下次定位）**：`session.messages`/`getSessionMessages` 与 `createSession`/`setSessionWorkspace` **用的是同一个 `this.sessions.get(...)`**，但对**已存在**会话前者正常、`session.create` 恒失败——说明并非「store 未连接」那么简单，需在 `AppRpcServer` 以最小复现逐步二分（可能是 `ensureSessionAccess`/`SessionOwnerStore` 路径或首次写库触发）。既有 gateway stdio 测试手工注入 store，未覆盖 CLI DI 路径；修复后应新增「走 `runAgentRpcApplication` 的 session.create」回归测试。

### ✅ 根因已定位（`TypeormAdapter` 在 boot 后被 `@Dispose` 清空，应用仍继续用同一死实例）
在 `TypeormAdapter` 临时插桩（已回退、未提交），`tsdi-agent rpc-stdio` 一次运行的时间线：
```
[TA-DIAG] ctor id=wcvnb
[TA-DIAG] startup id=wcvnb connections=1
[TA-DIAG] sources.set t=…498 id=wcvnb name=default size=1     ← @Startup 正确连上 default
[TA-DIAG] onDispose t=…998 id=wcvnb sources=1                ← boot 后 ~500ms 适配器被 @Dispose
[TA-DIAG] getConnection FAIL t=…016 id=wcvnb req=undefined optName=undefined sources=[]
```
- `@Dispose() onDispose()` 会 `sources.clear() + injector=null + options=null`；**其所属 injector 在 boot 后约 0.5s 被销毁**，但 `AppRpcServer` 仍持有该适配器。
- 因此 **boot 后 ~0.5s 起的任何 DB 访问都会 `DataSource "undefined" not found. Available: none`**；`session.create` 是首个写库调用故必然踩中；而 `session.messages` 对已存在会话在 0.5s 窗口内跑（同进程毫秒级管道）时**偶发成功**——解释了此前「读正常、create 恒挂」的假象。
- **性质**：injector 生命周期 / 领域归属问题——ORM 适配器与其消费者（`AgentModule` 内的 `TypeOrmSessionStore`）不在同一生命周期 injector 中，属于**架构层**（正是「按微服务形式各自管理自己的领域模型」应解决的点）。
- **修复方向（下一轮）**：让拥有领域模型的模块（`AgentModule`）**自己拥有 ORM 连接**（把 `provideAgentOrmStorage` 落到 `AgentModule` 的 provider/injector，而非 app 根），使连接随 `AgentModule` 存活、随 app 关闭；或定位「为什么该 injector 在 boot 后 0.5s 被 dispose」并从根上避免。修复后补「走 CLI `runAgentRpcApplication` 的 `session.create`」回归测试（旧实现稳定红）。
- **诚实边界**：已确认**只有一个** `TypeormAdapter` 实例（ctor 仅一次），且 `@Startup` 成功连上 `default`；问题是它随后被 `@Dispose`（sources 清空）。**尚未定位「哪个 injector 在 boot 后 ~0.5s 被销毁、为何 AppRpcServer 仍持有它」**——这才是修复的真正入口，需继续追 `Application.run(AgentAppServerModule, {deps, providers})` 的 injector 层级与生命周期。诊断插桩已全部回退，**未提交任何投机改动**。

### 门禁
本轮无源码改动；上一轮修复后全量门禁 **27/27 GATE-PASS**（含真实 PTY）仍有效。

### ✅ 机制进一步精确（第十一轮插桩，已回退）
`[RPC-DIAG]` 插桩（**已全部回退、未提交**）确认真正触发点是**收尾逻辑**，而非 ORM 本身：
```
[RPC-DIAG] after-stdio-start t=…068 dataL=1 endL=1 flowing=true ended=false
[RPC-DIAG] stdin event=end readableEnded=true t=…075      ← boot 后仅 ~7ms process.stdin 就 'end'
[RPC-DIAG] readableEnd t=…076
[RPC-DIAG] closing t=…076                                  ← 立即进入 finally { await ctx.close() }
```
- `runAgentRpcStdio` 在 `stdio.start()` 后 `await waitForReadableEnd(input)`；**`process.stdin` 在 boot 后约 7–60ms 就触发 `end`** → `ctx.close()` 立刻执行 → 整个 context（含单例 `TypeormAdapter`）被 `@Dispose` 销毁；但 `StdioAppRpcServer` 仍继续从 stdin 读并发响应 → 之后任何 DB 访问报 `DataSource "undefined"`。这正是「单例适配器已被 dispose」的**上游原因**。
- **已排除**：多实例适配器（ctor 仅 1 次、`@Startup` 成功连 `default`）、多 stdin 消费者（`listenerCount('data')===1`）、`ConsoleAgentChannel` readline（未激活；临时禁用它与 `channels:{preset:'none'}` 均无效）、显式 `process.stdin.resume()`（应用内无效）。
- **待确认**：过早 `end` 是否与环境/管道有关（隔离探针在「仅 data 监听」时也提前 end，但带显式 `resume()` 的探针正常到 EOF，结果不稳定）。**真实 UI 客户端会持续保持 stdin 直到断开**，需用**持久 stdin 的客户端**复现确认是否为产品缺陷——若是，修法为「确保 stdin 被正确持有 / 不在过早 `end` 时销毁 context」。
- **纪律**：插桩与新方案尝试**全部回退**，未提交任何未验证改动；工作树干净。

### ✅ 结论：非产品缺陷（管道假象）—— 用持久 stdin 客户端确认（第十二轮）
用一个**持久 stdin 客户端**（Node `spawn` 出 `tsdi-agent rpc-stdio`，**始终不 end 子进程 stdin**，用管道保持打开）复现：
```
child spawned pid=659
RESP id=1  err=null result={"ok":true,...}
RESP id=11 err=null result={"ok":true,...}
RESP id=2  err=null result={"sessionId":"persist-1","createdAt":…,"updatedAt":…}   ← session.create 成功
RESP id=3  err=null result={"sessionId":"persist-1","messages":[],"sections":[],"hasMore":false}
--- killing (stdin was never ended) ---
```
- **`session.create` 在持久 stdin 下正常工作**。此前 `DataSource "undefined"` 只出现在「shell 管道 + `sleep`」形态：该形态下 `process.stdin` 会提前 `end` → `waitForReadableEnd` 立即 resolve → `ctx.close()` 销毁 context。
- **判定**：`session.create` 的失败是**测试驱动/管道假象**（writer 端过早 EOF），**不是产品缺陷**；真实 UI 客户端会持续持有 stdin 直到断开，不会触发。
- **因此 `todo.md` 此前登记的「开放缺陷」撤销**（`20daf023e`/`73ed0a896`/`eb146d6ea` 三处记录以本条为准）。仍保留的**次要健壮性观察**（非缺陷，未改）：`runAgentRpcStdio` 若在 stdin 过早 `end` 时立即 `ctx.close()`，会让仍在途的请求打到已销毁的 context；真实客户端不触发，故不改。

### 门禁（本轮结束）
本轮无源码改动；全量门禁 **27/27 GATE-PASS**（含真实 PTY）仍有效。

## 2026-10-15 第十四轮：`cron_manage` 接受标准 5 字段 cron（`31654ae86`）

### 真实验证
并行真实探针覆盖未触及工具：`wait_all`、`cron_manage`、`orchestrate` —— `wait_all`/`orchestrate` 均正常（`orchestrate` 正确执行多步并汇总）。

### 缺口（真实运行观察到）
`cron_manage`：模型按**工具自身描述示例** `cron_expr: "0 9 * * *"`（5 字段）创建，却被
`NextRunCalculator.parseCronExpr` 以 `Invalid cron expression: expected 6 fields (sec min hour day month weekday)` 拒绝，模型只能改用 6 字段 `0 0 3 * * *` 重试——**工具的描述示例与其校验自相矛盾**（标准 crontab 是 5 字段）。

### 修复
- `NextRunCalculator.parseCronExpr`：5 字段输入前置 `'0'`（秒默认 0）；错误信息同时说明 5/6 两种形态；6 字段仍为规范内部形态（next-run 用归一化结果）。
- `cron_manage.cron_expr` 描述如实说明 5 字段与 6 字段两种写法。
**回归（红→绿）**：`scheduler.spec.ts` 新增 `acceptsFiveFieldCron`——旧实现 `validateCronExpr('0 9 * * *')` 抛错（红），修复后通过且 `nextCronRun` 返回有效时间（绿，22 passing）。
**真实验证**：`cron_manage` create `cron_expr='0 9 * * *'` → `created=true`（修复前被拒）。

### 门禁
agent 970 passing、agent-tools 530 passing、2× `tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 7/7 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第十五轮：系统性排查工具描述/校验一致性 + apply_patch 最近锚点提示（`a4515c1da`）

### 系统性排查（承接「工具描述/示例与实际校验不一致」这一反复出现的类别）
- 枚举全部 tool `inputSchema` 的严格 `enum` 字段（todo/cron 同类）；扫描含 `e.g.` 示例的 `description`；并**从生产库 `agent.db` 聚合所有历史 tool `{"error":...}`** 做摩擦清点。
- 历史错误 Top：`web_search` 未配置适配器 **30**、`read_file` ENOENT **25**、`git_operations` 非 Git **13**、**`apply_patch` 不匹配 16**、`stat` ENOENT 8、`todo` content 8、`list_dir` 7。
- **逐项核对当前代码**：`read_file`/`stat` 缺失路径 → `Path 'x' does not exist.`（可操作，已修）；`git_operations` 非 Git → `notAGitRepo`+session 快照（已修）；`list_dir` → **已默认 `.`**（描述写「default: workspace root」且代码一致）；`todo` content/枚举 → 已修；`web_search` 描述已含「via a configured adapter」。**未发现新的当前缺陷**（DB 错误多为修复前历史）。

### 修复：`apply_patch` 不匹配时给出最近锚点提示（最高的一类剩余摩擦，16 次）
- 原错误可操作但需重读整份文件定位。新增 `nearestAnchorHint`：hunk 不匹配时，从上下文/删除行中找出**确实存在于文件**的最近一行，给出**行号 + 上下 2 行摘录**（对齐 opencode 的 closest-match）。
- **回归（红→绿）**：`apply-patch.spec.ts` 新增 `suggestsNearestAnchor`——旧实现错误信息不含 `Nearest anchor`（红），修复后含 `line 2 is "beta"` 及摘录（绿，18 passing）。

### 门禁
agent-tools 531 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

## 2026-10-15 第十六轮：HTTP 网关缺失 `/rpc` 路由（真实端到端，`83740cf79`）

### 复现（自建 AgentGatewayModule 启真实 HTTP 网关）
写临时引导脚本 `Application.run(AgentGatewayModule, { providers: [provideAgentGateway({port}), provideAgentOrmStorage(root), provideTools, AGENT_OPTIONS] })` 起服务，curl 其路由：
- 修复前：`[GW-DIAG] routes total=25 rpcPresent=false`，OpenAPI **25 条、无 `/rpc`**；`POST /rpc` 与 `/rpc/stream` 均 `{"error":"not found"}`。
- 插桩（已回退）确认：`[GW-DIAG2] lazyRpc=true ctorRpc=false` —— `AppRpcHandler` **构造注入为 null**，但 bootstrap 之后 `ctx.get(AppRpcHandler)` **能解析** → 是**注入时机**问题。

### 根因
`GatewayBootstrap` 用 `@Optional()` 构造注入 approvals/stats/**rpc**/events/reviews/evals/shares/chatWs；**启动时这些注入全为 null**（DI 顺序性缺失，`@Optional` 静默吞掉，无任何告警）→ 网关注册的路由从应有的 33 条掉到 25 条。**`/rpc` 与 `/rpc/stream` 从未注册** → 浏览器/桌面 UI 经 HTTP 无法创建会话或跑 turn（`agent-ui/web-console` 的 `HttpAgentConsoleAppRpc` 依赖该路由）。

### 修复
`GatewayBootstrap.start()` 改为**经注入器惰性解析**这些可选 handler（`optionalHandler(ctor, injected)`：`injector.get(ctor, null)` 失败/缺失回退到构造注入值），使路由注册不依赖构造注入时序。

### 验证
- 修复后：`lazyRpc=true`，OpenAPI **33 条**，含 `POST /rpc`、`POST /rpc/stream` 及 `/api/events`、`/api/reviews`、`/api/stats`、`/api/approvals`、`/api/shares` 等。
- **真实 HTTP E2E**：`POST /rpc/stream {"session.create","sessionId":"http-e2e-1"}` → 成功返回会话；`app.ping`/`session.messages`/`GET /api/sessions` 均正常。
- 回归：`gateway-server.spec.ts` 新增 `GatewayBootstrap route registration`（惰性解析的可选 handler 路由被注册）。
- 门禁：agent-gateway 315 passing、`tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 5/5 GATE-PASS**（含 production-db-integrity）。

### 诚实边界
临时引导脚本 `tmp-gw.ts` 与所有插桩**已删除/回退**；未提交任何诊断代码。此缺陷**一直存在且被现有测试漏掉**——既有 gateway 测试都**手工构造 handler**，未走 `AgentGatewayModule` 的 DI 启动路径。

## 2026-10-15 第十七轮：`skills` 功能在 CLI 完全未接线（真实 TUI/网关端到端，`356b601c7`）

### 发现（#3：skills 远程注册表方向）
- 真实探针里 `tool_inspect('skill_list'|'read_skill'|'skills_remote')` **全部 `not found`**。
- `provideSkills(...)`（注册 `skill_list`/`read_skill`/`skills_remote`/`plugins` + skills 目录 prompt 段 + turn 拦截器 + 内置 skills）**生产零调用**——`grep` 全仓仅有定义与 `test/tools.spec.ts` 调用，命中 AGENTS.md「死机制 / 生产零调用」判据。
- CLI 读取了 `settings.skills.roots`（`resolveCliConfig` 返回 `skillRoots`，`doctor` 也检查）却**从不使用**；agent-ui 在 `AgentConsoleMentions`/`AgentConsoleExtensionCommands` 里 `invoke('skill_list')` 并 `.catch(() => undefined)` → **未注册即静默失败**。
- 且 `RemoteSkillTool`/`AgentPluginTool` 缺省无 `activation`，而 toolset `'skills'` 既不在 `LOCAL_ALWAYS_ACTIVE_TOOLSETS` 也不在 `LOCAL_DEFERRED_TOOLSETS` → `inferActivation` 返回 undefined → `tool_inspect` 报 `activated=false`、模型工具列表不列出 → **不可达**（其兄弟 `skill_list`/`read_skill` 显式 `activation = always`）。

### 修复
- CLI 三处启动路径（`runAgentApplication`/`runAgentRpcApplication`/`runAgentConsole`）加入
  `provideSkills({ root, roots: resolved.skillRoots, remoteCacheDir: resolved.tools?.skillsRemoteCacheDir })`。
- `RemoteSkillTool`、`AgentPluginTool` 补齐 `activation = { kind: 'always', scope: 'global' }`（与兄弟一致）。

### 真实验证
- 修复前：三个 skill 工具 `not found`。
- 修复后：`tool_inspect('skills_remote'|'plugins')` → **`activated=true`**。
- **真实 TUI 端到端**（DeepSeek 驱动、本地 mock registry）：模型调用 `skills_remote install`（source registry）→ `✓ Tool · skills remote completed · Installed remote skill 'demo' (registry) with 1 skill`；落盘 `skillcache/demo/hello-skill/SKILL.md` 与 `.remote-skill.json`；manifest 里的 `../evil-skill`、`nested/deep` 被**安全跳过**（无目录逃逸）。

### 门禁
agent-cli 90 / agent-tools 531 passing、2× `tsc --noEmit` EXIT 0、`source-size` OK、`git diff --check` 干净、**门禁 6/6 GATE-PASS**（含 production-db-integrity）。

### 诚实边界
`skills_remote` 是 mutating 工具（`sideEffect`），仍受审批策略约束；本轮只接通注册与可见性，未改动审批策略。临时 mock registry / 引导脚本 / tmux 会话**已清理**。
## 2026-10-17 真实 TUI 时间线展示打磨（工具对象/结果摘要）
- 背景：用真实 CLI TUI（`cd packages/agents/agent-cli && DEEPSEEK_API_KEY=… npm run chat -- --root /tmp/opencode/agent-root5 --workspace /home/zhouyou/workspace/sleep-mlt`）对照 Codex/opencode 的信息架构，逐行核对时间线展示。**本机无 opencode 源码**（只有 `opencode.exe`），对照为定性，锚定 AGENTS.md 第 5 条「动作 + 对象 + 状态 + 必要摘要」。
- **根因（真实运行 DB 证据，非推测）**：`/tmp/opencode/agent-root5/agent.db` 显示 receipt 摘要把进程管道当业务字段：
  - `terminal.inputSummary` = `command=sed -n '…' … · timeoutMs=30000`（raw `key=value` 信封）；`terminal.outputSummary` = `stdout=…\n… · exitCode=0 · timedOut=false`（多行原始负载，落进 200 列摘要后被折断成两行）。
  - `content_search` 输入显示 `test`（搜的目录）而非 query、输出显示 `content_search · 1 field(s)`；`glob_search` 输入显示 `0 matches`；`list_dir` 输入显示 `test · 0 entries`。
  - `tool_failed` 行只显示 `Search code failed · retry`，把 producer 的 `ENOTDIR: …` 原因吞掉（`describeStreamEventContent` 的 `tool_failed` 分支只回 `{label} failed`）。
- **修复（展示层，无功能降级）**：
  1. `agent/src/tools/ToolSummary.ts`：新增 `SHELL_TOOL_NAMES` / `PAYLOAD_ENVELOPE_KEYS`；`list_dir`/`glob_search`/`content_search`（新分支）**按 phase** 分别取对象（路径/pattern/query）与结果（entry/match 计数）；`terminal` 走 `summarizeShellPayload`：input = 单行命令，output = `timed out` / `exit N · <首行 stderr 或 stdout>`（**保留 exit 状态**，`LLMSessionSummarizer`/`AgentContextManager` 仍能消费）；通用 fallback 过滤信封键；`collapseSingleLine` 统一折叠换行。完整负载仍在 tool message / inspector。
  2. `agent-gateway/src/app-rpc/tool-event-content.ts`（**新模块**）：把 `describeToolInvocationEvent` / `describeToolCompletedEvent` / `summarizeToolEventDetail` 及其解析辅助从 `AppRpcServer.ts` **原样迁出**（单一职责：transport 层不再承载内容成形）。`describeToolCompletedEvent` 现在**保留对象**——完成行按 toolCallId 原地替换调用行，若不保留，命令/文件会从时间线消失；仅当输出已包含该对象（如 `read_file` 的 pathSummary）才不重复。**同提交下调 `AppRpcServer.ts` 基线 3775 → 3684**（-91 行），符合 ratchet「只降不升」。
  3. `agent-ui/src/AgentConsoleStreamHelpers.ts`：`tool_failed` / `tool_skipped` 保留 producer 原因（`resolveToolEventReason` 去掉 `<tool> failed:` 前缀、取首个非空行，行渲染器再按 200 列截断）；`tool_skipped` 从「原样透传 raw 串」改为走翻译标签。
  4. `agent-ui/src/agent-ui.i18n.ts`：新增 `agent.tool.skipped` / `skippedWithReason`（en/zh）。
  5. `agent-ui/src/AgentConsoleTimelineEventPresenter.ts`：类别表补 `stat`/`glob_search`（→read）、`content_search`（→search），避免落 `generic` 用人类化名当动词。
- **回归（先证旧实现失败，再证修复通过）**：`agent/test/tool-summary.spec.ts` 12 条（旧实现 **1 passing / 11 failed**，失败串与 DB 证据逐条对应）；`agent-ui/test/tool-label-i18n.spec.ts` 失败/跳过原因 2 条 + `p300-timeline-event-presenter.spec.ts` 类别/动词 2 条（旧实现 **4 failed**，`Received "Search code failed"`）；`agent-gateway/test/rpc-stream.spec.ts` 完成内容保留对象（旧实现 **`terminal · exit 0 · …`**，无命令）+ 新增 `tool-event-content.spec.ts` 5 条直测迁出的纯函数。
- **真实 TUI 实测（tmux 120×40，read-only 三步）**：
  - `✓ Tool · Read file completed · src/cli.ts (truncated)`
  - `✓ Tool · Search code completed · scorePaper · 0 matches`（对象从「目录/字段数」变为 query）
  - `✓ Tool · Run command completed · node -e "console.log(1+1)" · exit 0 · 2`（对象=命令，结果=有界 `exit 0 · 首行`，不再 dump 信封）
  - 失败路径：`✕ Tool · Read file failed: Path 'src/does-not-exist-xyz.ts' does not exist. · retry`（原因回到主线，旧行为只剩 `Read file failed · retry`）。
- **验证**：agent 976 / agent-ui 1518 / agent-gateway 320 / agent-tools 523，全 `EXIT=0`；`node scripts/check-source-size.mjs` OK；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，`GATE_EXIT=0`**（`/tmp/opencode/gate/batch-timeline-final3.log`，含真实 PTY acceptance）。
- **仍为开放项（如实保留）**：① 真实运行中 `Esc` 未能中断一个卡住的 reasoning 流（观察 1m32s→4m26s 仍 `Working`），独立缺陷、本轮未改。**→ 2026-10-18 追加**：排查到模型请求层「abort 后仍重试/降级」的缺陷并已修复（见文末批次，确定性证据：abort 后仍会发 3 次请求），分钟级卡顿的主因按已证证据应为工具阻塞（已修）；该次观察本身未再复现，故不宣称已被完整解释；② 该真实运行（20 轮后 `maxToolRounds`）出现 14× 重复 `Inspect directory`、7× 相同 `Read file … (truncated)`，属 **agent 行为**（重复工具调用）而非渲染层。**→ 2026-10-18 追加**：其中「读到 `[summary] …` 后重读」一类已由压缩保留载荷头部的修复针对（含实机 A/B 证据），但「重复 Inspect directory」未单独复现验证；③ `sleep-mlt` 工作区仍有历次 agent 运行留下的未提交改动（`M README.md` 等）与本批次无关。**→ 2026-10-18 处理完毕**：经用户授权先出**只读**差异报告（`/tmp/opencode/sleep-mlt-report.md`），确认为一次 agent 运行产出的完整 `import` 特性（README +38 / `src/cli.ts` +88 / `test/cli.test.ts` +148，含 13 条测试、原子写入与 id 冲突语义），与 09-25 的 run3 patch 不同源；随后（用户授权）跑 `npm test` **82/82 通过**、把 `.tsdi-agent/` 加入 `.gitignore`、以 `c1d6add feat(cli): add import command for batch-loading records from JSON` 落库（该仓库无 remote，故仅本地提交），工作区已干净；④ 本机无 opencode 源码，展示对照为定性。

## 2026-10-17 时间线「思考行」（Thought）展示修复
- 背景（同一轮真实 TUI 对照中发现）：思考行显示 `● Thought · Reasoning about implementation` —— 这是**硬编码英文常量**（修复前 `agent-ui/src/AgentConsoleTurnStreamController.ts:102`），既违反 AGENTS.md 第 9 条（用户可见文案必须经 i18n、不得硬编码英文），也让第 5 条「只展示动作/对象/状态/必要摘要」落空：行内容与 inspector detail 都是同一句套话，模型真实推理只进了 activity log；而且该行 `status` 永远停在 `running`，turn 结束后仍渲染成「正在思考」。
- **修复（展示层，无功能降级）**：
  1. `AgentConsoleTurnStreamController.ts`：`AgentConsoleTurnStreamState` 新增 `reasoningText`（整轮思考，供 settle / inspector）与 `reasoningPhase`（当前推理阶段，供运行行）；`chunk.type==='reasoning'` 由常量改为**累积真实思考增量**（`appendReasoningText`，上限 4000 字符），行内容 = 当前阶段文本（为空时回退本地化 `agent.turn.reasoning`）；`tool_call` 边界重置 `reasoningPhase` —— 下一阶段是新思考，运行行不得冻结在上一阶段首行。
  2. 新增 `settleReasoningRow`：turn 流正常结束时把该轮思考行 upsert 为 `status:'success'`（内容 = 整轮思考），复用既有 `resolveUiEventDurationFallback` 得到耗时；`runTurnStreamView` 的 **appRpc 流完成分支**与 **runtime 流分支**各调用一次。注意 TUI 走 in-process runtime，其结尾 `{type:'done'}` **不带 message**，只在 `done` 分支 settle 会漏（第一版实现即如此，被新增的真实路径用例暴露后修正）。
  3. `AgentConsoleComponent.ts` 的 `turnStreamState` 初始化补两个字段；`clearStreamingMessageState` 一并清空。
- **回归（先证旧实现失败，再证修复通过）**：`agent-ui/test/turn-stream-narration.spec.ts` 新增 4 条。`git stash` 掉两个 src 文件后在**旧实现上 3 passing / 4 failed**（`Expected "I should inspect the project layout first." / Received "Reasoning about implementation"`、`Expected "Now I will read seed.ts." / Received "Reasoning about implementation"`、`Expected substring "detail detail" / Received "Reasoning about implementation"`、`Expected "success" / Received "running"`）；修复后 **7 passing**。其中 `reasoning row shows the real thought and settles when the turn ends` 驱动**真实 TUI 路径**（无 appRpc → `runtime.runStreamingTurn`，末尾 `{type:'done'}` 无 message），专门覆盖上面第 2 点的坑。
- **真实 TUI 实测（tmux 120×40，`--root /tmp/opencode/agent-root5 --workspace /home/zhouyou/workspace/sleep-mlt`）**：
  - 修复前：`● Thought · Reasoning about implementation`（常量套话，永不结束）。
  - 修复后（运行中）：`● Thought · Terminal output for domain got summarized too (maybe output long). Use sed smaller chunks, e.g. 1-120, 121…`（当轮真实推理，随阶段刷新）。
  - 修复后（turn 结束）：`✓ Thought · The user wants me to inspect files under src/ and count TypeScript files. Constraint: use only list_dir or… (…)`（真实思考 + `✓` 已结束 + 耗时；主行是 ≤120 摘要，完整思考仍在 detail）。
- **验证**：`agent-ui` 1522 passing / `EXIT=0`；agent-ui `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/reasoning-row3.log`；第 1、2 次 gate 的失败都来自上面两个与改动无关的既有 flaky 断言/基建）。
- **顺手修掉一个既有 flaky 断言（与本次改动无关，第一次 gate 被它卡住）**：`agent-ui/test/session-lifecycle.spec.ts` 的 `terminal upsert derives duration from the running row start time` 用 `await sleep(5)` 后断言 `durationMs >= 5`，而 Node 计时器可提前约 1ms 触发（实测收到 4），gate 负载下即失败；隔离单跑 5/5 通过。修复方式是把等待窗口放到计时器分辨率之上（`sleep(20)` + 断言 `>= 10`），契约不变（时长仍由真实经过时间推导），不是放宽语义。
- **又修掉一个既有 flaky 测试基建（同样与本次改动无关，第二次 gate 被它卡住；两次 gate 失败的 stage 都不在本批次改动范围）**：`agent-tools/test/ssh-tools.spec.ts` 的 mock SSH server 用 `ssh2.utils.generateKeyPair('ed25519')` 现生成 host key，而 **ssh2 1.17.0 自身的 ed25519 keygen 会以约 0.2% 概率产出 malformed OpenSSH 容器**（实测 7/3000；抓到的坏 key 比应有容器长度少 2 字节），随后被 ssh2 自己的 parser 拒绝：`Error: Cannot parse privateKey: Malformed OpenSSH private key`（`at new Server (node_modules/ssh2/lib/server.js:249)`）。隔离顺序跑 600 次 0 失败、单 spec 串行跑 8 次全过，只有并发/负载下命中（6 并发 ×3 轮命中 1 次）。修复：`generateMockHostKey()` 用 `utils.parseKey` 校验生成的 key，被拒就重生成（最多 5 次），mock server 只需要「某把合法 host key」，不再因上游缺陷整包假失败；重试循环 3000 次 0 失败。`agent-tools` 全量 523 passing / `EXIT=0`。
- **仍为开放项（本轮新证据，未擅自改行为）**：
  1. **`Esc` 无法中断正在执行的工具**（把上一批开放项 ① 复现到确切根因）：真实 TUI 中发 `Run exactly this shell command and nothing else: sleep 90` → 工具行 `● Tool · Run command: sleep 90`，按 `Esc` 后状态栏仍 `Working (… esc to interrupt)`，直到 90s 工具自己跑完才出现 `✓ Tool · Run command completed · sleep 90 · exit 0 (90s)` 与 `✓ Cancelled · Turn cancelled`（即取消只在工具返回后才生效）。根因：`DefaultAgentRuntime.cancelTurn`（`agent/src/runtime/DefaultAgentRuntime.ts:604`）只 abort 模型信号 + 级联子会话 + 回滚补偿，**不通知正在执行的工具**；而 `ToolExecutionCoordinator.invokeWithTimeout`（`agent/src/harness/ToolExecutionCoordinator.ts:165`）与 `ToolRegistry.invoke` 都没有 signal 参数，`TerminalTool.exec`（`agent-tools/terminal/terminal.tool.ts`）只在 timeout 时杀进程组。修它需跨包把 turn abort signal 透传进 `AgentToolContext`（`agent/src/tools/AgentTool.ts`）并让 TerminalTool 观察 signal，且不得让已入基线的 `DefaultAgentRuntime.ts`（baseline 3538）增长——属独立批次，需用户确认后再动。**→ 已于 2026-10-18 修复（见文末批次，baseline 3538 → 3520）**。
  2. **上下文压缩把工具结果替换成展示摘要，诱发模型重复读取**（对应上一批开放项 ②，本轮拿到直接证据）：`AgentContextManager.buildCompactedToolContent`（`agent/src/context/AgentContextManager.ts:1454`）用 `receipt.outputSummary` 拼 `[summary] …`，而 `read_file` 的 outputSummary 是 `src/cli.ts (truncated)`（`ToolSummary.ts:41-46`），于是模型读到 `[summary] src/cli.ts (truncated)` 并自述「weird, no content」，改成分块 offset 重读，产生连续 `Read file … (truncated)` / `Inspect file …` 行。属压缩策略 / agent 行为，本轮只记录未改。**→ 2026-10-18 核查确认这是 `context-compaction-architecture.md` 明确规定（"prefer `receipt.outputSummary`"），经用户确认后以「A 有界片段」修复（见文末批次）。**
  3. `sleep-mlt` 工作区仍有历次 agent 运行留下的未提交改动（与本批次无关）；本机无 opencode 源码，展示对照仍为定性。

## 2026-10-18 `Esc` 中断正在执行的工具（turn abort signal 透传到工具）
- 背景（上一批开放项 ①，已复现到确切根因）：真实 TUI 发 `Run exactly this shell command and nothing else: sleep 90` → 工具行 `● Tool · Run command: sleep 90`，按 `Esc` 后状态栏仍 `Working (… esc to interrupt)`，直到 90s 工具跑完才出现 `✓ Tool · Run command completed · exit 0 (90s)` + `✓ Cancelled · Turn cancelled`。根因：`DefaultAgentRuntime.cancelTurn` 只 abort 模型信号、级联子会话、回滚补偿，**取消不会到达正在执行的工具**；`ToolExecutionCoordinator.invokeWithTimeout` / `ToolRegistry.invoke` 都没有 signal 参数；`TerminalTool.exec` 只在 timeout 时杀进程组。
- **修复（新增取消通道，复用既有 SIGTERM→SIGKILL 升级，不改变任何既有工具语义）**：
  1. 新增 `agent/src/runtime/TurnAbortScopes.ts`：把原先散在 runtime 内的 `sessionTurnAborts` Map + 4 个访问器（`begin/end/getSignal/isAborted`）抽成单一职责类（`begin/end/signal/isAborted/isActive/cancel`），runtime 只保留 `throwIfTurnCancelled` 作为薄委托（对外 protected 契约不变）。**baseline 3538 → 3520（净 −18 行）**，同 commit 下调 `scripts/source-size-baseline.json`。
  2. 取消通道：`AgentToolContext.signal?: AbortSignal`（可选；不观察 signal 的工具行为完全不变）→ `ToolRegistry.invoke(name, input, sessionId, principalId?, workspace?, signal?)` → `LocalToolRegistry.invoke` 把 signal 放进工具上下文 → `ToolExecutionCoordinator` 的新字段 `ToolExecutionRequest.signal`（两条 `toolRegistry.invoke` 调用点都传）→ `DefaultAgentRuntime.performToolInvocation` 传 `this.turnAbortScopes.signal(sessionId)`（与模型请求**同一个** AbortController，Esc 一次 abort 两个消费者）。
  3. 不重试被中断的工具：coordinator catch 改为 `shouldRetry = attempt <= maxRetries && !request.signal?.aborted && this.isRetryable(lastError)`。否则按 `retryPolicy` 会把用户刚按 Esc 打断的命令**再跑一遍**。
  4. `TerminalTool`：`invoke` 读 `context.signal` 传入 `exec(..., signal?)`；已 abort 时直接抛（不 spawn）；运行中 abort 时走与 timeout 完全相同的进程组 `SIGTERM` →（3s）`SIGKILL` →（1s）强制收敛，并 reject `Command cancelled by the user.`；`clearTimers` 同时 `removeEventListener` 摘掉 abort 监听，且 abort 与 timeout 互相抑制（`settled || cancelled || timedOut` 守卫）。
- **回归（先证旧实现失败，再证修复通过）**：
  - `agent-tools/test/terminal-cancel.spec.ts`（新建，4 条，真实 spawn `sleep 60` / `trap '' TERM` 长命令）：`git stash` 掉 `terminal.tool.ts` 后**旧实现 1 passing / 3 failed**（两条 15s 超时 `Expected: "Command cancelled by the user." / Received: "terminal tool ignored the abort signal and kept running"`，一条 `Received: undefined`）；修复后 **4 passing**（263ms / 3.26s / 8ms / 12ms）。
  - `agent/test/turn-cancel.spec.ts` 新增 2 条（真实 `runTurn` → coordinator → registry → 工具）：`cancelTurn aborts the tool that is currently running and ends the turn promptly`（断言工具收到**非空** signal、按 Esc 后 `signal.aborted === true`、turn 立即 `AgentTurnCancelledError`、无 `AgentTurnCompletedEvent`/`AgentErrorEvent`、`registry.completed === 0`）与 `cancelTurn does not retry a tool that the user just interrupted`（`invokes === 1`）。`git stash` 掉 runtime 后**旧实现 18 passing / 2 failed**（`Received: undefined`——signal 根本没到工具；`waitFor timed out`——turn 永不收敛）；修复后 **20 passing**。
  - `agent/test/tools.spec.ts` 新增 1 条：`LocalToolRegistry.invoke(..., signal)` 把**同一个** signal 放进工具上下文（`toBe(controller.signal)`）。
- **真实 TUI 实测（tmux 120×40，`--root /tmp/opencode/agent-root5 --workspace /home/zhouyou/workspace/sleep-mlt`，该工作区已 trust）**：
  - 运行中：`● Tool · Run command: sleep 90` + `• Working (… esc to interrupt) … 1 background terminal(s) running · /ps to view · /ps stop to close`。
  - 按 `Esc` 后 **~0.5s** 内：`✓ Cancelled · Turn cancelled`；工具行 `✕ Tool · Run command failed: Command cancelled by the user. · retry`（旧行为是等满 90s 才 `✓ Tool · Run command completed · sleep 90 · exit 0 (90s)`）。
  - 进程核验：`ps -eo pid,etimes,args` 无残留 `sleep 90` / `sh -c sleep`（整棵进程组被杀）。
  - 对照观察：首次用全新 `--root agent-root6` 时工作区未 trust，`Esc` 取消的是**工作区信任审批**，工具行显示 `✕ Tool · Run command skipped: Workspace … is not trusted…`——审批取消路径同样即时生效（非本轮改动，仅记录）。
- **设计取舍（记录，未擅自扩大改动）**：被中断的工具仍按 `status:'error'` + 原因 `Command cancelled by the user.` 上报（复用既有 failed 路径），未新增 `cancelled` 工具状态——新增状态要连动 gateway 事件映射 + UI 渲染 + i18n key，属独立批次；此处 `✕ Tool · Run command failed: Command cancelled by the user.` 紧跟下方 `✓ Cancelled · Turn cancelled`，语义不含糊。另：即时中断只对**主动观察 signal 的工具**（本轮为 terminal）生效；不观察 signal 的长命令（git / code_execution 等）仍会跑到自然结束——与改动前完全一致，不是回归，列为后续跟进项。
- **已知未覆盖路径（同前一条性质，非回归）**：会话显式开启 OS sandbox（`/sandbox` → `osSandbox`）时，terminal 命令走 `ToolExecutionCoordinator.invokeWithTimeout` 的 `sandboxExecutor.execute(command, [], …)` 分支（`agent/src/harness/ToolExecutionCoordinator.ts:171`），该分支不经 `ToolRegistry.invoke`，因此没有 signal（仍受自身 timeout 约束）。默认配置下 `osSandbox` 为空、命令走 registry 分支，Esc 生效（本轮实测即默认配置）。闭合它需要给 `SandboxExecutor.execute` / `sandbox-exec` 加 signal 与进程组杀灭，属独立批次。同理，`AppRpcServer` 有几处**不经 turn** 的直接 `tools.invoke(...)`（`coding_task`/`todo`/`review_diff` 等，本身不在 turn 的 abort scope 内，`cancelTurn` 对它们返回 `cancelled:false`），以及工具内部嵌套调用（`workspace-action-runner`）都没透传 signal——均与改动前一致。
- **验证**：`agent` 979 passing / `EXIT=0`；`agent-tools` 527 passing / `EXIT=0`；两包 `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK（baseline 已下调）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/esc-cancel1.log`，含 `pty-acceptance` 真实终端与 `agent-ui`/四端 components 全量）。

## 2026-10-18 上下文压缩保留真实工具载荷头部（`[summary] … (truncated)` 不再替换掉内容）
- 背景（上一批开放项 ②）：真实 TUI 里读取大文件后，老窗口/超大工具结果会被压缩成**展示标签**（`[summary] README.md` / `[summary] src/cli.ts (truncated)`），模型据此认为「内容没了」并重读文件。**核查后确认这不是缺陷，而是 `packages/agents/context-compaction-architecture.md` 明确规定的策略**（"prefer `receipt.outputSummary`"、"Older tool messages: compact when content is clearly reducible"），故按纪律先向用户说明冲突并询问取舍，用户选择「A：标签 + 有界真实内容片段」。另外实测到文档未覆盖的内部不一致：`maxToolResults` 默认 8000，**无 receipt 的 fallback 分支本就保留 8000 字符真实内容**，而有 receipt 的分支把内容全丢掉。
- **修复（A，改动只影响「发给模型的历史准备」，不动任何用户可见展示、不动压缩触发条件）**：
  1. 新增 `agent/src/context/tool-compaction.ts`（纯函数模块，58 行）：`buildCompactedToolContent(message, budget)` + `compactedToolContent(label, content, budget)` + `COMPACTED_TOOL_EXCERPT_CHARS = 2000`。错误结果仍走 `{ "error": … }`；有 receipt 摘要时以摘要为标签；载荷 **> 片段预算**时在标签后追加 `[excerpt]` + 真实内容头部（≤ min(2000, `maxToolResults`) 字符）+ `...[truncated N chars]`；载荷 ≤ 预算则保持原「仅标签」形态（中等载荷压缩力度与触发条件完全不变，无 token 回归）；并且**永不输出比原文更长的压缩结果**（否则原样保留），保证该步只会缩小历史。
  2. `AgentContextManager.ts` 改为调用该模块、移除原私有实现（§4 抽取纪律 + ratchet）：文件 **2009 → 1996**，同 commit 下调 `scripts/source-size-baseline.json`。
  3. `context-compaction-architecture.md` 同 commit 更新（Tool Output Retention Rules / Older tool messages 增补片段策略、「只会更小」不变量与动机），使文档与实现重新一致。
- **回归（先证旧实现失败，再证修复通过）**：`agent/test/context-compaction.spec.ts` 新增 4 条，`git stash` 掉实现后：
  - `pruneHistory keeps a bounded head of the real tool payload behind the compaction label`（旧实现 `Expected substring: "[excerpt]"`，failed）、`prepareHistory keeps the real tool payload head when compacting older tool output`（failed）——**旧实现 111 passing / 2 failed**；修复后 **113 passing**。
  - `tool output compaction never emits a form longer than the original payload`（尺寸不变量）、`tool payloads that fit the excerpt budget keep the label-only compacted form`（无回归守卫）——新旧行为一致，作为守卫保留。
- **真实 TUI 实测（A/B 对照，tmux 120×40，`--root /tmp/opencode/agent-root5 --workspace …/sleep-mlt`，同一 prompt 序列：先「读 README.md 但不要引用任何内容，只回 `READ_OK`」，再「不许调用工具，逐字引用 `## Goal` 下一句，没有就回 `NOT_AVAILABLE`」）**：
  - **旧实现**：工具行 `✓ Tool · Read file completed · README.md`，思考行自述 `The tool returned a summary placeholder rather than content. Hmm: "[summary] README.md"` → 探针回答 `NOT_AVAILABLE`（内容被展示标签吞掉）。
  - **新实现**：思考行自述 `I have it from the tool result in context: "Build a small but production-shaped sleep monitoring analysis toolkit."` → 逐字答出该句。
  - 成本：同场景 footer token 25.6K → 29K（含额外推理），单条被压缩的大载荷多保留 ≤2000 字符（约 500 token），且仅在载荷 > 2000 字符时生效。
- **验证**：`context-compaction.spec.ts` 113 passing；`agent` 全量包测试通过；`tsc --noEmit @tsdi/agent` 0 错误；`node scripts/check-source-size.mjs` OK（`AgentContextManager.ts` baseline 2009 → 1996）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/compaction1.log`，含 `pty-acceptance` 真实终端、`agent-ui` 与四端 components 全量）。
- **遗留（如实记录）**：片段只保留**头部**，不保留尾部；若某类载荷的关键信息在尾部（如长 diff 的结尾），仍需分块重读。不变量测试已覆盖「不会变长」，但未做超长会话下的整体 token 曲线实测（本机以真实 TUI 短会话 A/B 为准）。

## 2026-10-18 取消后不得再发模型请求（abort 是终态：重试与降级都必须停止）
- 背景（上一批开放项 ①「`Esc` 未能中断卡住的 reasoning 流」的根因排查）：`ToolExecutionCoordinator` 已有「abort 后不重试工具」的守卫，但**模型请求层没有对应守卫**。以下为确定性证据（直接驱动适配器公开 API，`fetch` 作网络边界，`AbortSignal` 预先 abort）：`OpenAICompatibleModelAdapter.complete` 可重试状态码仍重试 **3 次请求**；`.stream` 可重试状态码仍递归重试 **3 次**；`.stream` 失败后仍**降级为非流式补全**（**2 次请求**）；`AnthropicModelAdapter.complete` 仍重试 **3 次**；`RoutedModelAdapter`（TUI 实际使用的路由适配器）在取消后仍会**切到 default profile 重发一次**（`seenModels` 由 `['strong-model']` 变成 `['strong-model','default-model']`）。即用户按 Esc 后，适配器会继续按 `retryPolicy`（默认 `maxRetries 3`、`baseDelayMs 1000` 起指数退避）发起注定失败的新请求，把取消推迟到重试链结束之后。
- **修复（abort 终态：一处文档 + 7 个调用点；完全不影响未 abort 时的重试/降级行为）**：
  1. `agent/src/model/RetryPolicy.ts` 新增 `isModelRequestCancelled(request)` 并写明契约（caller-side abort 是终态：重试与 streaming→non-streaming 降级都不得再发请求）——取消语义落在本就在管「能否重试」的模块，避免在已入基线的 adapter 里堆注释；
  2. 7 个调用点改用该判断：`OpenAICompatibleModelAdapter` 非流式状态重试 / 流式状态重试 / 流式失败降级；`AnthropicModelAdapter` `complete` / `stream` 状态重试；`RoutedModelAdapter.complete` / `stream` 的 **profile 回退**（`classifyModelError(undefined, AbortError)` 会把「用户取消」判成可重试的 `timeout`，于是取消后还会换到 default profile 重跑一遍）；
  3. 两个 adapter 均为**已入基线文件**，改动为同行内联，因此**均不增长**（`OpenAICompatibleModelAdapter.ts` 1161、`AnthropicModelAdapter.ts` 657 不变；`RetryPolicy.ts` 与 `RoutedModelAdapter.ts` 未入基线，分别 113 → 123、522 行不变）。
- **回归（先证旧实现失败，再证修复通过）**：共 6 条新测试，实现 `git stash` 掉后全部为红，修复后全绿：
  - `agent/test/model-failure.spec.ts` 4 条：`git stash` 掉实现后 **9 passing / 4 failed**（`Expected: 1` vs `Received: 3` / `Received: 2`）→ 修复后 **13 passing**：`does not retry a retryable streaming status once the runtime signal is aborted`、`does not fall back to a non-streaming request once the runtime signal is aborted`、`openai-compatible does not retry a retryable non-streaming status once the runtime signal is aborted`、`anthropic does not retry a retryable status once the runtime signal is aborted`（沿用既有 `does not retry a transport failure once the runtime signal is aborted` 的 harness）。
  - `agent/test/model-provider.spec.ts` 2 条：`git stash` 掉实现后 **45 passing / 2 failed**（`seenModels` 多出 default-model 请求）→ 修复后 **47 passing**：`does not fall back to the default model once the runtime signal is aborted`、`does not fall back to the default model on a cancelled stream`。
- **验证**：`model-failure.spec.ts` 13 passing、`model-provider.spec.ts` 47 passing；`tsc --noEmit @tsdi/agent` 0 错误；`node scripts/check-source-size.mjs` OK（两个已入基线 adapter 不增长）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/abort-terminal1.log`，含 `pty-acceptance` 真实终端、`dom-gate`、`tui-gate`、`production-db-integrity`）。
- **验证边界（如实记录）**：本轮证据是适配器真实公开 API（`stream`/`complete`）的行为断言，网络边界用 `fetch` stub，与既有 model-failure specs 同手法；真实环境无法稳定复现「provider 返回可重试状态 + 用户同时按 Esc」，故未做该组合的实机 A/B。

## 2026-10-18 `ai_cli` 也遵守 turn abort signal（Esc 可中断外部 AI CLI）
- 背景（Esc 批次遗留项「不观察 signal 的工具」）：`AiCliTool.invoke` 的 context 参数被命名为 `_context`、完全不使用，`executeSubprocess` 只在 `timeoutMs`（默认 **300_000ms**）到期时 `child.kill('SIGTERM')`。即 Esc 对 `ai_cli` 完全无效，用户最长要等 5 分钟。
- **修复（只影响「被取消」这一条路径，未取消时的行为不变）**：
  1. `agent-tools/ai-cli/types.ts`：`AiCliRequest` 增可选 `signal?: AbortSignal`（并在注释里写明注入式 adapter 也应遵守）；
  2. `agent-tools/ai-cli/ai-cli.tool.ts`：`invoke` 读取 `context.signal` 放进 request，并在入口做「已取消则不启动」检查（必须放在这一层：adapter 路径不经过 `executeSubprocess`，否则被取消的轮次仍会启动一个最长 5 分钟的外部 CLI）；
  3. `executeSubprocess`：改为独立进程组（`detached`）+ `signalTree()` 组信号；abort → SIGTERM →（3s）SIGKILL →（1s）兜底 settle，**不依赖 `close`**（AI CLI 会自己起子进程并持有 stdio 管道，`close` 可能永不到来）；取消以 `Command cancelled by the user.`（与 terminal 工具同文案）reject；监听器在 settle 时移除；超时路径同样改用组信号（否则 CLI 的子进程会存活）。
- **回归（真实调用边界：PATH 注入假 `claude`，脚本记录自身 pid、`trap '' TERM` 后 `sleep 90`——故意对 SIGTERM 不合作以验证升级）**：新增 `agent-tools/test/ai-cli-cancel.spec.ts` 4 条，`git stash` 掉实现（保留新可选字段，保证测试可编译）后 **1 passing / 3 failed**：
  - `an aborted turn signal kills the spawned CLI tree instead of waiting out its timeout`：旧实现 `Received: "ai_cli ignored the abort signal and kept running"`（15.5s 守卫超时，工具仍在跑）→ 修复后 3.5s 内 settle，且假 CLI 的 pid 已退出（`process.kill(pid, 0)` 探测）；
  - `an already-cancelled turn never spawns the CLI`：旧实现照常 spawn（marker 文件被创建）→ 修复后立即 reject 且无 spawn；
  - `the runtime signal reaches an injected AI CLI adapter`：旧实现 `received.signal` 为 undefined → 修复后与 `controller.signal` 同一实例；
  - `a CLI run without an abort signal still returns its parsed output`：无回归守卫（无信号时仍解析 JSON 输出、exitCode/sessionId 正常），新旧一致。
  - 修复后该 spec 4 passing；`agent-tools` 全量 **531 passing**（原 527 + 4）。
- **验证**：`ai-cli-cancel.spec.ts` 4 passing；`agent-tools` 全量 **531 passing**（EXIT=0）；`tsc --noEmit @tsdi/agent-tools` 0 错误；`node scripts/check-source-size.mjs` OK（`ai-cli.tool.ts` 436 行，未入基线、未超 600）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/ai-cli-cancel1.log`，含 `pty-acceptance`、`dom-gate`、`tui-gate`、`production-db-integrity`）。
- **遗留（如实记录）**：`execute_code`（`CodeExecutionRequest` 无 signal，且有 local + MCP code-mode 两个 adapter 实现）、`ToolExecutionCoordinator` 的 `osSandbox` 两个分支（`sandboxExecutor.execute` / `invokeInSandbox` 均未传 `request.signal`）、`git` 工具（`spawnSync` 阻塞事件循环，期间连 Esc 按键都无法被处理）仍未覆盖；`git` 的 sync→async 属行为改动，需先与用户确认再动——**用户已确认，见 2026-10-18「git_operations 不再阻塞事件循环并支持 Esc」**。

## 2026-10-18 git_operations 不再阻塞事件循环并支持 Esc（统一三处子进程处理）
- 背景（Esc 批次遗留项中最严重的一条）：`git_operations` 用 `spawnSync('git', …, { timeout: 30000, maxBuffer: 16000 })`，而它支持 `fetch/pull/push` 等网络动作——命令执行期间**整个 Node 事件循环被阻塞**：界面不渲染、不处理按键、定时器不触发，Esc 在这段时间里完全无效。`review_diff`、`agent/src/harness/GitStepSnapshotStore` 有同类 `spawnSync`（本轮未改，见遗留）。
- **修复**（用户已确认该 sync→async 行为改动）：
  1. 新增 `agent-tools/src/child-process-runner.ts`：`runChildProcess()` 异步 spawn + 独立进程组 + SIGTERM→(3s)SIGKILL→(1s) 兜底 settle + 可选输出上限 + abort 监听（含「注册监听后复查 aborted」竞态）；返回 outcome（`exit/timeout/cancelled/overflow/error`）而不抛错，由各工具映射各自的语义；导出共享 `CANCELLED_MESSAGE`。
  2. `git/git-operations.tool.ts`：`runGit` 改为 async 并走 runner；`isGitRepo`/`execGit` 随之 async、`invoke` await；`invoke` 入口对 `context.signal.aborted` 直接抛取消（避免已取消的轮次还去跑网络动作）。错误语义保持不变：非 0 退出码照常返回、`EPERM` 容忍、其余 spawn 错误（ENOENT/ETIMEDOUT/ENOBUFS）照常抛出；超时错误 message 由 `spawnSync git ETIMEDOUT` 变为 `spawn git ETIMEDOUT`（`code` 仍为 `ETIMEDOUT`）。附带效果：超时不再只发 SIGTERM 后立即返回，而是先把进程树停掉（≤3s+1s）再抛错，不会留下仍在跑的 git。645 行 → 507 行。
  3. 消除三处重复实现：`terminal/terminal.tool.ts`（213→114 行）与 `ai-cli/ai-cli.tool.ts`（436→344 行）改用同一个 runner，映射逐条保留（terminal：timeout→124+trimmed、cancel→抛错、error→原样抛出；ai-cli：timeout→124+尾部截断、cancel→抛错、error→原 ENOENT 提示、exit→解析输出）。副作用（记为改进）：stdout/stderr 统一用 `setEncoding('utf8')`，不再在跨 chunk 的多字节字符处产生替换字符；terminal 超时改为同样升级 SIGKILL，不再可能无限期挂住。
- **回归（真实调用边界：PATH 注入假 `git`，脚本对 `rev-parse` 立即成功、对其余动作长时间 sleep，另用 `trap '' TERM` 验证升级）**：新增 `agent-tools/test/git-operations-cancel.spec.ts` 6 条；`git stash` 掉 git 工具实现后 **3 passing / 3 failed**：
  - `a git command no longer blocks the event loop`：旧实现 `Expected: > 5 / Received: 1`（循环被阻塞 3s，定时器只补跑 1 次，await 1s 实际耗时 3s）→ 修复后 ~20 tick、1s 内返回；
  - `an aborted turn stops the git command tree (SIGTERM then SIGKILL)`：旧实现命令跑满 **20.03s**、`Received: undefined`（signal 完全无效）→ 修复后 3.31s 内以 `Command cancelled by the user.` 拒绝，且假 git 的 pid 已退出（`process.kill(pid, 0)` 探测）；
  - `an already-cancelled turn never runs git`：旧实现照常执行 git（marker 文件被创建）→ 修复后立即拒绝、未 spawn；
  - 三条保真/回归守卫（新旧一致，均通过）：真实仓库 `status` 仍返回 `exitCode 0` 且 stdout 含文件名、失败的 `checkout` 仍抛 `Git checkout failed`、超过 16000 字节的输出仍以 `ENOBUFS` 失败而非静默截断。
  - 修复后该 spec 6 passing；`agent-tools` 全量 **537 passing**（原 531 + 6）——terminal/ai-cli 改用共享 runner 后，既有 terminal/ai-cli/git 用例全部保持通过。
- **验证**：`git-operations-cancel.spec.ts` 6 passing；`agent-tools` 全量 **537 passing**（EXIT=0）；`tsc --noEmit @tsdi/agent-tools` 0 错误；`node scripts/check-source-size.mjs` OK（`git-operations.tool.ts` 507、`ai-cli.tool.ts` 344、`terminal.tool.ts` 114、`child-process-runner.ts` 200，均未入基线且 < 600）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/git-async1.log`，含 `pty-acceptance` 真实终端、`dom-gate`、`tui-gate`、`production-db-integrity`）。
- **遗留（如实记录）**：`review_diff`（`agent-tools/review/review-diff.tool.ts`，多个同步 helper：`runGit`/`listUntrackedFiles`/`resolveCommitSha`/`assertGitRepo`）与 `agent/src/harness/GitStepSnapshotStore.ts` 仍在用 `spawnSync`，属同类阻塞、本轮未覆盖；`execute_code`（`CodeExecutionRequest` 无 signal，local + MCP code-mode 两个实现）、`ToolExecutionCoordinator` 的 `osSandbox` 两个分支（未传 `request.signal`）仍未覆盖。

## 2026-10-18 review_diff 不再阻塞事件循环并支持 Esc（同类 spawnSync 收尾）
- 背景：`review_diff` 同样用 `spawnSync('git', …, { timeout: 30000, maxBuffer: 64000 })`，且对每个未跟踪文件各跑一次 git；慢仓库/大 diff 期间事件循环同样被完全阻塞（界面不刷新、Esc 无效）。与 git_operations 属同一缺陷类，该 sync→async 行为改动用户已确认。
- **修复**：`runGit`/`assertGitRepo`/`listUntrackedFiles`/`resolveCommitSha` 改为 async 并走共享 runner；`invoke` await 它们，未跟踪文件的多次 git 调用由逐个同步串行改为 `Promise.all` 并发；`invoke` 入口同样做「已取消则不启动」；`resolveCommitSha` 原本 `catch { return null }`，改为 signal 已 abort 时重新抛出，避免把用户中断吞成「无 commit 可解析」。错误语义保持：非 0 退出码照常返回、`EPERM`/`ENOBUFS`（含新的输出上限 overflow）仍容忍为 exitCode 1 + 部分输出、超时抛 `ETIMEDOUT`。
- **回归（真实调用边界：PATH 注入假 `git`，`rev-parse` 立即成功、其余动作 sleep）**：新增 `agent-tools/test/review-diff-cancel.spec.ts` 3 条，`git stash` 掉实现后 **1 passing / 2 failed**：
  - `review_diff no longer blocks the event loop`：旧实现 `Expected: > 3 / Received: 1`（300ms 的等待实际耗时 1.05s，循环被阻塞）→ 修复后定时器正常触发、300ms 内返回；
  - `an aborted turn cancels review_diff`：旧实现 5.03s 后返回结果、`Received: undefined`（signal 无效）→ 修复后 307ms 内以 `Command cancelled by the user.` 拒绝；
  - `a finished review still reports files, diff and commit sha`：保真守卫（新旧一致，真实仓库仍返回文件列表、diff 内容与 commitSha）。
  - 修复后该 spec 3 passing；`agent-tools` 全量 **540 passing**（原 537 + 3）。
- **验证**：`review-diff-cancel.spec.ts` 3 passing；`agent-tools` 全量 **540 passing**（EXIT=0）；`tsc --noEmit @tsdi/agent-tools` 0 错误；`node scripts/check-source-size.mjs` OK（`review-diff.tool.ts` 284 行，未入基线且 < 600）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/review-async1.log`，含 `pty-acceptance`、`dom-gate`、`tui-gate`、`production-db-integrity`）。
- **遗留（如实记录）**：`agent/src/harness/GitStepSnapshotStore.ts` 仍用 `spawnSync`（10s 超时、32MB buffer，每个 turn step 捕获一次快照），但它的公开 API 是**同步**的（`isAvailable`/`capture`/`diff`/`revert`…）并透出到 `AgentRuntime` 接口（`captureStepSnapshot` 同步返回），改成 async 属核心 API 变更、影响 agent-ui/gateway 等调用方，需单独确认后再动。

## 2026-10-18 剩余信号缺口：execute_code 与 osSandbox 分支
- 背景（Esc 批次收尾）：`AgentToolContext.signal` 已透传到 `toolRegistry`，但仍有两处完全不观察它：
  1. `execute_code`：`CodeExecutionRequest` 没有 signal，工具也不传 `context.signal`；命令路径（bash/python…）与 JS/TS worker 路径都不响应 Esc，只能等到自己的 timeout（默认 30s）。
  2. osSandbox 分支：`ToolExecutionCoordinator.invokeWithTimeout` 里 `sandboxExecutor.execute(command, [], { policy, timeoutMs })` 未传 `request.signal`（同一函数的另一分支 `invokeInSandbox` 本来就传了）；启用 OS 级沙箱时 Esc 对沙箱命令无效。
- **修复**：
  1. `code-execution/types.ts` 增加 `CodeExecutionRequest.signal`；`execute-code.tool.ts` 入口做「已取消则不启动」检查并透传 signal；`local-code-execution.adapter.ts` 的命令路径改用共享 `runChildProcess`（超时/取消/进程组 kill 与 terminal/ai-cli/git 一致），worker 路径订阅 signal → `worker.terminate()`；取消统一 reject `Command cancelled by the user.`。超时（124 + 提示）、ENOENT（`<cmd> is not available in PATH for <line>`）、非 0 退出码（`error` 为 stderr 或 `execute_code exited with code N`）等语义逐条保留。
     注意：worker 取消必须**先结算再终止**——`worker.terminate()` 要等 worker 的 `exit` 事件才 resolve，先 terminate 会让 `exit` 处理器把结果当正常完成。
  2. `SandboxExecutor.execute` 的 options 增加 `signal`：启动前已取消则不 spawn（直接返回 `cancelled` 结果，`wallTimeMs: 0`），运行中 abort 则 `killProcess`（沿用既有 SIGKILL 升级），结果新增 `cancelled?: boolean` 与 `error: 'Command cancelled by the user.'`；`ToolExecutionCoordinator` 把 `request.signal` 传进去。
  3. 拆分（ratchet）：把 `SandboxExecutor.ts` 的类型声明（`SandboxPolicy`/`SandboxExecutionResult`/`SandboxIsolationLevel`/`SandboxResourceLimits`）抽到新文件 `agent/src/harness/sandbox-types.ts`，原文件 re-export（所有 import 方无需改动）。这样该文件 605 → 582 行，**baseline 同步下调 605→582**。
- **回归**：
  - 新增 `agent-tools/test/code-execution-cancel.spec.ts`（6 条，真实执行 bash 与 node worker），`git stash` 掉实现后 **3 passing / 3 failed**：运行中取消（旧：1.52s 后返回超时结果、`Received: undefined`；新：311ms 内 reject）、已取消则不执行（旧：照常 `touch` 出 marker；新：不 spawn 且 reject）、worker 运行中取消（旧：1.52s 后超时结果；新：304ms 内 reject）；三条守卫（bash 输出、node worker 输出、超时仍返回 124 + `Timed out after 600 ms`）新旧一致。
    期间发现并规避一个测试陷阱：只写 `await new Promise(() => {})` 不会让 worker 保持存活（事件循环无 handle 时 worker 直接 exit 0），必须另留一个 handle（测试用 `setInterval`）。
  - `agent/test/sandbox-exec.spec.ts` 新增 3 条（真实 spawn `sleep`/`touch` + 真实 coordinator）：旧实现 **31 passing / 3 failed**——coordinator 未透传 signal（`Received: undefined`）、运行中取消无效（旧：611ms 由 wall-time 限制杀掉、`cancelled` 为 undefined）、已取消仍 spawn（marker 被创建）；新实现 34 passing。
  - 全量：`agent-tools` **546 passing**（原 540 + 6）、`agent` **992 passing**（+3），均 EXIT=0；两个包 `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK；`git diff --check` 干净。
- **验证**：`code-execution-cancel.spec.ts` 6 passing、`agent` 的 `sandbox-exec.spec.ts` 34 passing；`agent-tools` 全量 **546 passing**、`agent` 全量 **992 passing**（均 EXIT=0）；两包 `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK（`SandboxExecutor.ts` 605→582 且 baseline 同步下调）；`git diff --check` 干净；`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/signal-gaps1.log`，含 `pty-acceptance`、`dom-gate`、`tui-gate`、`production-db-integrity`）。
- **遗留（如实记录）**：`agent/src/harness/GitStepSnapshotStore.ts` 仍是同步 `spawnSync`（10s 超时/32MB buffer，每个 turn step 捕获一次快照），但它的公开 API 是同步的并透出到 `AgentRuntime` 接口（`captureStepSnapshot` 同步返回），改 async 属核心 API 变更、影响 agent-ui 与 gateway 等调用方，需单独确认后再动。**（已于 2026-10-18「GitStepSnapshotStore 同步→异步」批次经用户确认后完成）**

## 2026-10-18 GitStepSnapshotStore 同步→异步（清除最后的生产 spawnSync）
- 背景：`GitStepSnapshotStore` 用 `spawnSync` 跑 git——每个 turn step 一次 `capture`（rev-parse + stash create + diff --numstat + update-ref，每条默认 10s 超时/32MB buffer）——而且它的公开 API 是同步的、并透出到 `AgentRuntime` 接口（`captureGitStepSnapshot`/`listGitStepSnapshots`/`diffGitStepSnapshot` 同步返回）。JS 里同步 API 无法不阻塞事件循环，所以每步捕获都会冻结控制台（无渲染、无 Esc、无定时器）。上批次末尾已作为「改契约」决策项报给用户，**经确认后执行**。
- 变更：
  1. **共享 runner 下移**：`agent-tools/src/child-process-runner.ts` → `agent/src/harness/child-process-runner.ts`，并在 `agent/src/index.ts` 导出；agent-tools 6 个调用方（git/terminal/ai-cli/review_diff/execute_code 工具 + local code adapter）改为从 `@tsdi/agent` 引入（同模块 import 合并），删除原文件。store 与各工具共用同一实现，无重复代码；层级不变（agent-tools 本来就依赖 agent）。
  2. **`GitStepSnapshotStore` 全异步**：`isAvailable`/`capture`/`diff`/`diffByMessage`/`revert`/`unrevert`/`clear` 及私有 helper（`runGit`/`captureDiffStats`/`filePatch`/`headCommit`/`pinRef`/`deleteRef`/`revertToSnapshot`）改 async，`runGit` 走共享 runner。语义逐条保留：超时/管道溢出/启动失败统一映射为「非 0 退出码 + 已捕获输出」（等价旧 `spawnSync` 的 `status:null → exitCode 1`），**不抛异常**；输出上限沿用 32MB（`maxOutputChars`）。
  3. **`AgentRuntime` 契约**：`captureGitStepSnapshot`/`listGitStepSnapshots`/`diffGitStepSnapshot` 返回 Promise；`DefaultAgentRuntime` 对应 override 与 `beginGitStepSnapshot`（turn 起点 pre-turn 捕获）改 async，两处调用点 `await`（确保 tree 在 turn 真正开始前被捕获）。
  4. **调用方补 await**：agent-gateway `SessionHandler` 3 处、`AppRpcServer` 3 处——此前不 await 会把 Promise 序列化成 `{}`、并让 `if (!snapshot)` 恒假（tsc 不报错，是纯语义破坏）；agent-ui `AgentConsoleSessionService` 的 list/diff 包装补 `await`，让 `?? []`/`?? null` 回退重新生效。
- 回归（先红后绿）：
  - 新增 `agent/test/git-step-snapshot-async.spec.ts`（真实 store + PATH 注入假 git，非 rev-parse 命令各 sleep 0.7s，用自身定时器的最大间隔度量阻塞）：旧同步实现下「capture keeps the event loop free」**1 failed / 2 passing**——测量窗口内 `ticks` 为 **0**（等价 2.1s 全冻结，`Received: 0`）；新实现 3 passing（`maxGap < 500ms`、`ticks > 10`），并断言 `commit`/`diffStats` 结果不变。两条守卫（git 失败→null 不抛；命令超时→null 不抛且 <3s）新旧一致。
  - `agent/test/git-step-snapshot.spec.ts` 全量改为 await（真实 git round-trip：capture/diff/revert/unrevert/list/clear/diffStats，以及 runtime 级 turn 捕获/revert/diff），作为「行为不变」证据。
  - 全量：`agent` **995 passing**（+3）、`agent-tools` **546 passing**、`agent-gateway` **320 passing**、`agent-ui` **1522 passing**，均 EXIT=0；四个包 `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK（新文件 204 行；基线文件均未增长）；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/git-store-async1.log`）。
- **说明**：快照 API 未新增 `AbortSignal`（签名未变，仍是 10s 超时 + 非 0 退出码降级）；它现在不再阻塞事件循环，Esc/渲染/定时器不受影响。若要「取消 turn 时同时中止快照 git 命令」，属 additive 后续项。
- **遗留（如实记录）**：`packages/cli` 的框架自身构建/初始化命令（`npm init`、tsc 声明生成）仍有 `execSync`，属 CLI 构建流程、不在 agent turn/工具子进程范围内；agent 侧生产代码已无 `spawnSync`/`execSync`。

## 2026-10-18 Esc 覆盖面补齐：协调器中止兜底 + http 网络请求取消
- 背景：上一批清掉「生产代码零 spawnSync」后，仍有一类工具完全不观察 turn 信号（第三方 SDK / 网络客户端 / 浏览器会话没有取消钩子），Esc 之后 turn 只能等它们自己结束。两处缺口：
  1. `ToolExecutionCoordinator` 的 `invokeWithTimeout`/`invokeInSandbox` 只有**超时**竞速，没有**中止**竞速。
  2. `http_fetch`/`http_request` 只用自己的超时 controller，不理会 `context.signal`（Esc 时最多要等默认 15s 超时）。
- 变更：
  1. 新增 `agent/src/harness/cancellation.ts` 承载共享文案 `CANCELLED_MESSAGE`；`child-process-runner.ts` 改为 re-export（agent-tools 侧 `from '@tsdi/agent'` 的引入不变）。
  2. `ToolExecutionCoordinator.raceInvocation`：一次竞速覆盖「工具完成 / 超时 / 用户中断」，中止以 `Command cancelled by the user.` 终止；结算后清理定时器与 abort 监听；信号已中止时立即终止；osSandbox 分支只加中止守卫（超时仍由 executor 负责）；重试逻辑此前已把「信号已中止」视为终止，不会重跑。
     语义：能响应信号的工具（child process / sandbox / execute_code）仍自行停止工作；**没有取消钩子的工具被放弃**（用户按 Esc 的意图），turn 立即结束。
  3. `http_fetch`/`http_request`：把 `context.signal` 接到请求 controller 上（与自身超时并存），Esc 真正中断网络请求，并把错误统一成 `Command cancelled by the user.`；超时/body 停滞（body timeout）行为不变。
- 回归（先红后绿）：
  - `agent/test/turn-cancel.spec.ts` 新增「工具忽略信号时 cancelTurn 仍立即结束 turn」：旧实现 **1 failed**（等工具自然完成，`Expected: < 1000 / Received: 2031`）；新实现 45ms 结束，且发布 `AgentToolFailedEvent`（`Command cancelled by the user.`）、`completed === 0`；该 spec 21 passing。
  - `agent-tools/test/http-body-timeout.spec.ts` 新增两条（真实 stalling HTTP server，`timeoutMs: 3000`，150ms 后 abort）：旧实现 **2 failed**（各 3.0s，`Received: "This operation was aborted"`）；新实现各 ~156ms 且文案统一；原有两条 body-timeout 守卫仍通过（4 passing）。
  - 全量：`agent` **996 passing**（+1）、`agent-tools` **548 passing**（+2）、`agent-gateway` **320**、`agent-ui` **1522**，均 EXIT=0；agent/agent-tools `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/tool-abort1.log`）。
- **遗留（如实记录）**：以下工具**自身**仍无取消钩子，靠协调器兜底（turn 立即结束，但底层请求会在后台自行结束）：`ssh_exec`（agent-ssh `client.exec(command, timeoutMs)`）、`web_search`/`web_extract`（providers 客户端）、`browser/*`（playwright 会话）、`media/*`、`audio/*`、`llm_task`（模型适配器）、`knowledge_search`、`security_scan`、`pipeline`/`spawn_agent`（子会话）。要真正停掉底层工作需在各库透传 `AbortSignal`，属后续 additive 工作。

## 2026-10-18 Esc 覆盖：ssh_exec 真正中断（agent-ssh 透传 AbortSignal）
- 背景：上一批的协调器兜底能让 turn 立即结束，但 `ssh_exec` 自身没有取消钩子——底层 SSH 通道会继续等到自己的超时（默认 60s、上限可配），属于「turn 结束但工作还在跑」。本次给它真正的取消。
- 变更：
  1. `agent-ssh/src/ssh-client.ts`：`exec(command, timeoutMs, signal?)` 增加可选信号。信号已中止 → 不发起；运行中 abort → `safeEndStream(stream)` 关闭通道并立即 reject；结算后清理超时定时器与 abort 监听；若 abort 早于服务端响应，迟到的通道也会被关闭。原有超时语义（`timedOut: true` + `exitCode: 124`）与返回值保持不变。
  2. `agent-tools/ssh/ssh.tool.ts`：`SshExecTool.invoke` 透传 `context.signal`，并把中止统一翻译成 `Command cancelled by the user.`（与其它工具同一文案）。
- 回归（先红后绿）：
  - `agent-tools/test/ssh-tools.spec.ts` 新增一条（**真实 in-process ssh2 server**，远端命令 1.2s 后自行 exit，200ms 后 abort）：旧实现 **1 failed**（等命令跑完，1.263s，`Received: undefined`）；新实现 6 passing，该用例 214ms 结束并报 `Command cancelled by the user.`。测试同时加固了清理（先关闭服务端通道再 `server.close()`），避免回归时挂死。
  - 全量：`agent-tools` **549 passing**（+1）、`agent-ssh` **9 passing**，均 EXIT=0；`agent-ssh` 与 `agent-tools` `tsc --noEmit` 0 错误；`node scripts/check-source-size.mjs` OK；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/ssh-abort1.log`）。
- **遗留（如实记录）**：`ssh_put`/`ssh_get`（SFTP 传输）与 `ssh_tunnel` 仍未接信号，仍靠协调器兜底；`web_search`/`web_extract`（适配器接口无 signal 参数，宿主实现的网络请求无法中止）、`browser/*`、`media/*`、`audio/*`、`llm_task`、`knowledge_search`、`security_scan`、`pipeline`/`spawn_agent` 同样待各库透传。

## 2026-10-18 轮次预算收敛：重复只读调用去重 + 接近上限的引导（经用户确认「两个都做」）
- 背景（实机证据）：一次真实运行 72 次工具调用撞上 `maxToolRounds: 20`（`options.ts:581`），最终以「I'm out of tool rounds」收尾、提交未完成；其中 14 次是反复列举同一目录（19% 预算、零信息增量），真正编辑只有 8 次。已按用户选择同时做「去重」与「接近上限引导」。
- 变更：
  1. **重复只读调用去重**（`agent/src/runtime/tool-repeat-cache.ts` 新模块 + `ToolExecutionCoordinator` 落地）：turn 级缓存以 `工具名 + 规范化输入（键序无关 JSON）` 为键；命中且工具 `readOnly: true` 时直接复用上次**已脱敏**的输出（返回 `redactedOutput/output/receipt(status=skipped)/attempts`），并发布 `AgentToolSkippedEvent`（理由：`Repeated identical read-only call; reused the earlier result.`），时间线可见。模型仍会收到一条 tool 结果（内容与首次完全一致），transcript 不会缺结果。
     - 失效规则：**会修改工作区的工具**（`isWorkspaceMutatingTool`：写文件/terminal/git/process/execute_code…）在调用前清空缓存，所以「改完再读」一定真正执行；`todo`/memory 之类不影响文件内容的工具不会误清缓存。
     - 缓存对象挂在 `TurnExecutionContext.readOnlyResults`，由协调器调用处惰性创建（turn 结束即丢弃）。
  2. **接近上限引导**（`agent/src/runtime/tool-round-budget.ts` 新模块）：剩余 2 轮时注入**一次**模型可见提示（`nearToolRoundLimitPrompt`），明确剩余轮数、要求停止探索/重复读取，并提示可把剩余工作交给单个 `coding_task` 后直接收尾；`MAX_TOOL_ROUNDS_PROMPT` 一并迁到该模块。两个循环（`completeTurn` + `completeStreamingTurn`）共用同一注入点。
  3. ratchet：为容纳改动，把 `canParallelize`/`isParallelSafeTool`/`describeStreamingToolCalls` 抽到 `agent/src/runtime/tool-dispatch-policy.ts`、`MAX_TOOL_ROUNDS_PROMPT` 迁出；`DefaultAgentRuntime.ts` **3520 → 3517 行**，baseline 同步下调 **3520 → 3517**。
- 回归（先红后绿）：新增 `agent/test/tool-repeat-cache.spec.ts`（4 条，真实 AgentModule 装配 + 真实协调器 + 脚本化模型）：
  - 「同一只读调用复用上次结果」：旧实现工具执行 **2 次**（`Expected: 1 / Received: 2`）；新实现 1 次，且两次调用各自都有 tool 结果（内容一致）、turn 正常收尾。
  - 「两次读之间发生写 → 缓存失效」：新旧都执行 2 次（守卫：绝不复用过期内容）。
  - 「协调器层面标记 skipped」：旧实现执行 2 次；新实现第二次 `receipt.status === 'skipped'`、输出与首次一致、发布 `AgentToolSkippedEvent`。
  - 「接近上限提示」：旧实现提示 0 条（`Expected: 1 / Received: 0`）；新实现恰好 1 条（含剩余轮数与 `coding_task` 提示），且 turn 以最终回答结束。
  - 全量：`agent` **1000 passing**（+4）、`agent-tools` **549**、`agent-gateway` **320**、`agent-ui` **1522**，均 EXIT=0；`tsc --noEmit` 0 错误；`source-size` OK；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/round-budget1.log`）。
- **说明 / 遗留**：去重只在协调器链路生效（`toolExecutionCoordinator` 未配置的旧回退路径不去重，生产由 `AgentModule` 装配协调器）；去重按 turn 生效，跨 turn 不共享（下一 turn 重新读是合理的）。真实运行时「重复 Inspect directory 是否从 14 次降到个位数、是否因此不再撞上限」仍需实机复测（本轮未跑真实模型）。

## 2026-10-18 Esc 覆盖：ssh_put / ssh_get / ssh_tunnel 接信号（SSH 家族收尾）
- 背景：上一批让 `ssh_exec` 真正可中断，但 `ssh_put`/`ssh_get`（SFTP 全量读写）与 `ssh_tunnel`（转发通道协商）仍无取消钩子，Esc 后只能靠协调器兜底、底层传输继续跑。
- 变更：
  1. `agent-ssh/src/ssh-client.ts`：新增 `withSftp<T>(signal, run)` 统一封装「只结算一次」的 SFTP 请求——abort 时 `safeEndSftp(sftp)` 关闭子系统并立即 reject（关闭子系统后挂起的请求回调**永远不会回来**，否则 Promise 会永久悬挂）；同时补上 `sftp.on('error')` → reject（实测发现：子系统返回 unsupported 时 ssh2 的 sftp 对象会发 `error`，没有监听器会直接**崩进程**，属顺手修掉的健壮性缺陷）。`sftpPut`/`sftpGet` 增加可选 `signal`，`forwardOut` 同样支持（abort 于协商期间；若 abort 早于回调，迟到的 channel 会被关闭）。原有返回结构不变。
  2. `agent-tools/ssh/ssh.tool.ts`：抽出 `withTurnSignal(context, run)`（Esc → 统一 `Command cancelled by the user.`），`ssh_exec`/`ssh_put`/`ssh_get`/`ssh_tunnel` 四处统一用它并透传 `context.signal`。
- 回归（先红后绿）：
  - `agent-tools/test/ssh-tools.spec.ts` 新增两条（**真实 in-process ssh2 server**，SFTP 子系统接受但 **OPEN 请求不应答**，让传输真实处于 in-flight；300ms 后 abort）：旧实现 **2 failed**（看门狗 2.31s 仍未结算，`Expected: false / Received: true`）；新实现 **8 passing**，两条用例各 ~310ms 结束并报 `Command cancelled by the user.`。看门狗保证回归时是「断言失败」而不是挂死套件。
  - 全量：`agent-tools` **551 passing**（+2）、`agent-ssh` **9 passing**，均 EXIT=0；`agent-ssh`/`agent-tools` `tsc --noEmit` 0 错误；`source-size` OK；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/ssh-sftp1.log`）。
- **遗留（如实记录）**：SSH 家族已全部接入信号；剩余无取消钩子的仍是宿主侧 adapter（`web_search`/`web_extract`/`browser/*`/`media/*`/`audio/*`/`llm_task`/`knowledge_search`/`security_scan`/`pipeline`·`spawn_agent`），本仓库 0 实现，需宿主实现方接 `AbortSignal`；`spawn_agent` 的子会话已由 `cancelTurn` 级联覆盖。

## 2026-10-18 Esc 覆盖收口：剩余 adapter 工具统一透传 turn 信号
- 背景：SSH 家族接完后，剩下「自身无取消钩子」的工具都是宿主 adapter（`web_search`/`web_extract`/`image_generate`/`vision_analyze`/`audio_transcribe`/`text_to_speech`/`security_scan`/`browser/*`）。本仓库对这 6 个 adapter **0 实现**，但工具侧此前**根本不传** `context.signal`，宿主即便想取消也拿不到信号。本批把契约补齐（不改任何既有返回结构）。
- 变更：
  1. 新增 `agent-tools/src/turn-signal.ts`：`withTurnSignal(context, run)` —— Esc 时统一翻译为 `Command cancelled by the user.`；`ssh.tool.ts` 改用该共享实现（删除本地副本）。
  2. adapter 契约（全部为可选、向后兼容）：
     - `WebSearchAdapter.search(query, limit?, signal?)`（`src/options.ts`）
     - `ImageGenerationOptions.signal?`、`TranscriptionOptions.signal?`、`TtsOptions.signal?`、`ScanOptions.signal?`
     - `VisionAdapter.analyze(imageUrl, question?, signal?)`
     - `PlaywrightBrowserAdapter.execute(request, context)` 本来就收到完整 `AgentToolContext`（含 signal），无需改动
  3. 七个工具改为 `invoke(input, context)` 并透传信号：`web_search`、`image_generate`、`vision_analyze`、`audio_transcribe`、`text_to_speech`、`security_scan`；**`web_extract` 是真实实现**（`globalThis.fetch`），把 `signal` 真正传进 `fetch(url, { signal })`，请求体读取也在同一信号下。
- 回归（先红后绿）：新增 `agent-tools/test/tool-turn-signal.spec.ts`（8 条）：
  - 6 条「adapter 收到的是同一个 turn 信号」+ abort 后统一报 `Command cancelled by the user.`：旧实现 **6 failed**（adapter 收到 `undefined`，看门狗 1.58s 超时）；新实现各 ~72ms 通过。
  - 1 条 `web_extract` 真实网络取消（本地 stalling HTTP server，150ms 后 abort）：旧实现 2.19s 超时未结算；新实现 213ms 结束并报同一文案。
  - 1 条守卫：正常 search adapter 结果不受影响。
  - 全量：`agent-tools` **559 passing**（551+8）、`agent-ssh` **9 passing**，均 EXIT=0；`agent`/`agent-tools`/`agent-gateway`/`agent-ui` `tsc --noEmit` 全 0 错误；`source-size` OK；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/turn-signal1.log`）。
- **结论 / 遗留**：Esc 覆盖到此收口 —— 本仓库内有真实 I/O 的工具全部接入信号；adapter 类工具已把「能取消就取消」的契约交给宿主实现（`AbortSignal` 在 options/参数上）。仍未接入的只有 `knowledge_search`（默认 in-memory adapter，本地快速，靠协调器兜底）与 `browser/*`（adapter 已拿到 context，是否中止由宿主实现决定）。真实长会话里「重复工具调用是否下降」仍属观测项。

## 2026-10-18 Esc 覆盖补漏：回合收尾的模型调用（压缩摘要 / 标题·摘要）也遵守信号
- 背景：工具与 adapter 都接完后，`runTurn` 内**回合收尾阶段**还有两处真实模型调用不接收信号，Esc 之后 `Working` 仍会等到它们返回：① 上下文压缩摘要 `SessionSummarizer.summarize`（`LLMSessionSummarizer` 会发真实 `complete`）；② 会话标题/摘要 `AgentSummaryAgent.generate`（`LLMAgentSummaryAgent` 同样发真实 `complete`，在 turn 起点前与收尾后各调用一次）。
- 变更（全部为可选参数，向后兼容）：
  1. `SessionSummarizer.summarize(messages, evidence?, signal?)`；`LLMSessionSummarizer` 把 `signal` 放进 `ModelRequest.signal`（`SimpleSessionSummarizer` 无需改动）。
  2. `AgentSummaryAgent.generate(messages, signal?)`；`LLMAgentSummaryAgent` 同样透传到 `ModelRequest.signal`（`DeterministicAgentSummaryAgent` 无需改动）。
  3. `DefaultAgentRuntime` 三处调用点改为传 `this.turnAbortScopes.signal(sessionId)`：`maybeSummarize`、`ensureSessionTitle`、`refreshSessionSummary`。实现自身的 `catch` 回退（naive/fallback 摘要）保持原样，所以 Esc 只是让等待立即结束、产出降级摘要，不会让 turn 报错。
- 回归（先红后绿）：新增 `agent/test/post-turn-signal.spec.ts`（4 条）：
  - 两条单元：`LLMSessionSummarizer` / `LLMAgentSummaryAgent` 用「只在 abort 时结算」的假模型适配器，abort 后 67ms/63ms 内结算且 `request.signal === controller.signal`；旧实现 4 条全失败（`signal: undefined`，两条单元靠看门狗 1.57s 超时）。
  - 两条装配：真实 `AgentModule` 装配下（假 summarizer / 假 summary agent 记录入参 + `session.summaryThreshold: 2`），turn 必须把 `AbortSignal` 传给它们；旧实现 `Expected: true / Received: false`。
  - 全量：`agent` **1004 passing**（+4）；`tsc --noEmit` 0 错误；`source-size` OK（`DefaultAgentRuntime.ts` 3517 未增长）；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/post-turn1.log`）。
- **遗留（如实记录）**：`knowledge_search`（默认 in-memory adapter，本地快速）与 `browser/*`（adapter 已拿到完整 context，是否中止由宿主决定）仍靠协调器兜底；真实长会话里「重复工具调用是否下降」仍是观测项。

## 2026-10-18 Esc 覆盖补漏：验证命令（typecheck/lint/test）可被中断，并迁移到共享 runner
- 背景：回合内最后一个长时间阻塞点是验证门执行的 `verify-command`（`npm run typecheck/lint/test`，默认 120s 超时）。它自己 `spawn` 子进程且不接收 turn 信号 —— Esc 之后命令继续跑、turn 继续等；同时这是仓库内最后一处手写 spawn（未复用共享 runner、只 SIGTERM 不升级）。
- 变更：
  1. `VerifyCommandRunner` 的 `DEFAULT_RUNNER` 改用共享 `runChildProcess`（进程组 kill / SIGTERM→SIGKILL 升级 / 输出捕获统一），新增 `VerifyCommandRunnerOptions.signal`，并在 `runProcess` 末尾追加可选 `signal` 参数（向后兼容，注入的测试 runner 不受影响）。
  2. 中止语义：`VerifyCommandRun` 新增 `cancelled?`；被中断的命令**不算失败**（`failed` 为 false），且中止后不再启动后续命令（包循环与显式/自动脚本循环都检查）。
  3. `recordVerifyCommandEvidence(ledger, runs, timeoutMs)` 从运行时抽到 runner 模块：跳过 `cancelled` 的 run，避免把「被 Esc 打断」记成验证失败（进而触发 repair 提示）。
  4. `DefaultAgentRuntime.runVerificationCommands` 传入 `this.turnAbortScopes.signal(sessionId)`；同时 ratchet：`DefaultAgentRuntime.ts` 3517 → **3507**，baseline 同步下调 3517 → 3507。
- 回归（先红后绿）：新增 `agent/test/verify-command-signal.spec.ts`（3 条，**真实 spawn**）：
  - 「运行中的验证命令被取消」：`node -e "setTimeout(()=>{},5000)"` + 300ms 后 abort → 新实现 326ms 结算、`cancelled: true`、`failed: false`；旧实现看门狗 2.83s 仍未结算。
  - 「取消后不再启动下一条命令」：两个显式命令，旧实现 2.81s 超时；新实现 314ms 且只有 1 条 run。
  - 「注入的 runProcess 收到 turn 信号」：旧实现收到 `undefined`；新实现收到同一个 `AbortSignal`。
  - 全量：`agent` **1007 passing**（+3）；`tsc --noEmit` 0 错误；`source-size` OK；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/verify-signal1.log`）。
- **遗留（如实记录）**：`knowledge_search`（默认 in-memory）与 `browser/*`（宿主 adapter 决定）仍靠协调器兜底；`runVerificationCommands` 的 runtime→runner 传参属单行接线，由 runner 单测 + 类型检查覆盖（未做 turn 级 E2E）。

## 2026-10-18 Esc 覆盖收口：hook 命令（beforeTurn/afterTool/…）可被中断
- 背景：生命周期 hook 命令由 `agent-cli` 的 `NodeAgentHookCommandExecutor` 自行 spawn（有自身 `timeoutMs`，但**不接收 turn 信号**），是回合内最后一处「Esc 之后仍会跑」的子进程。用户配置的 hook 可能是 `npm test` 级长命令。
- 变更：
  1. `AgentHookExecutionRequest.signal?`、`AgentHookExecutionResult.cancelled?`（可选、向后兼容）；`AgentHookManager.run(stage, context, signal?)` 把信号透传到 `runHook` → `executor.execute({ ..., signal })`。
  2. `DefaultAgentRuntime.runTurnHooks` 传 `this.turnAbortScopes.signal(sessionId)`（单行接线）。
  3. `NodeAgentHookCommandExecutor`：**已中止则完全不 spawn**（直接返回 `cancelled: true`）；运行中 abort → `child.kill()` 并立即以 `cancelled: true` + `Command cancelled by the user.` 结算；结算时移除 abort 监听。
- 回归（先红后绿）：
  - `agent/test/function-hooks.spec.ts` 新增「shell hooks receive the turn signal」：旧实现 `Expected: true / Received: false`（hook executor 收到 `undefined`）；新实现 8 passing。
  - `agent-cli/test/hook-executor-signal.spec.ts` 新增两条（**真实 spawn**）：运行中打断（300ms 后 abort）新实现 307ms 结算 `cancelled: true`，旧实现看门狗 2.8s 未结算；已中止时不再启动（marker 文件不被创建），旧实现 `cancelled` 为 undefined。
  - 全量：`agent` **1008 passing**（+1）、`agent-cli` **90 passing**（+2），均 EXIT=0；`agent`/`agent-cli` `tsc --noEmit` 0 错误；`source-size` OK（runtime 仍 3507）；`git diff --check` 干净。
- **验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` → **27/27 PASS，GATE_EXIT=0**（`/tmp/opencode/gate/hook-signal1.log`）。
- **遗留（最终）**：`sandbox-exec` 的能力探测（bwrap/sandbox-exec 一次性短探测）、`knowledge_search`（in-memory）、`browser/*`（宿主 adapter 决定）三项为已知且低风险；「真实长会话里重复工具调用是否下降」仍属观测项。
