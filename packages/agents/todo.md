# Agents 当前规则、功能与未完成计划

> 本文只保留当前有效规则、已具备功能点和未完成计划。历史实施日志、提交号、阶段测试数字和已关闭批次不再保留；已完成批次的功能已合并进「二、当前已具备的功能点」。

## 一、必须遵守的规则

> 全部规则已同步至根 `AGENTS.md`，以其为唯一权威来源，本文件不再重复维护（避免两处漂移）。
>
> 索引：1 响应式与渲染；2 跨平台边界（含 console/web-console 适配入口、品牌/配色约束）；3 响应式代理机制；4 代码体量与单一职责（ratchet）；5 会话主线与时间线；6 输入、历史与候选；7 Workspace、Project 与跨会话协同；8 数据库与数据安全；9 配置、路由与本地化；以及「测试方式 / 完成标准」。

## 二、当前已具备的功能点

### 会话与项目

- fresh chat 与显式 `--session` 恢复分离；session 持久化、搜索、列表、fork、delete、export、section、snapshot、share。
- workspace/project/thread 投影；无显式 `projectId` 时以规范化 workspace 生成稳定 project key；显式 project/thread/role、fork 与 delegation 关系持久化，跨进程/重启可恢复。
- 输入历史按规范化 workspace 跨 session 聚合，排除 slash 命令与空输入，去重后按最近使用保留 200 条；`↑` 向旧、`↓` 反向并恢复按键前原草稿；跨 TUI 重启持久；加载/恢复失败进 `lastError`，不阻断 TUI 启动。
- delegation、background task、goal、plan、review、verification、retry、rollback。
- project memory、session summary、compaction、diagnostics、audit、timeline history。
- `/clear` 新建持久 session，同时复用 UI `SessionState` 对象原地更新数据。

### Agent 与工具

- 多 provider/model/profile、复杂度路由（显式 `routes` → complexity → `defaultProfile` → 顶层）、模型切换与持久设置。
- 配置自愈：settings 读入与 `/model` 写回净化 sentinel（`cancel`/`q`）及嵌套重复 `profiles`/`complexityRouting`，`/doctor` 报告；路由遇未知 complexity/default/route profile 回退可用配置并累积 `getWarnings()`，不终止 turn（显式 `--profile` 保留抛错契约）。
- `tsdi-agent doctor --check-models` 只读拉取 provider `/v1/models` 校验顶层/各 profile/complexity 解析出的模型，缺失报 `model_not_available`，端点不可达降级 warn。
- 默认模型/端点集中单一来源：`DEFAULT_AGENT_PROVIDER_ID`/`DEFAULT_AGENT_MODEL_ID`/`DEFAULT_OPENAI_COMPATIBLE_*`/`DEFAULT_ANTHROPIC_*` 定义于 `model/ModelProviderOptions.ts`，`options.ts`、两个 adapter、`ModelCatalog`、`RoutedModelAdapter` 统一消费；adapter 不再内联 vendor 默认字面量，端点/密钥环境变量仍以可经 `provider.json` 覆盖的 registry 为准，显式配置优先。
- 行为阈值具名化：空响应重试、falsification 升级、turn diagnostics 上限与取用条数、loop 检测（repeat/ping-pong/no-progress）、上下文 store/window/growth 阈值统一由 `AgentLimits.ts` 具名常量提供，schema `scheduler.shutdownTimeoutMs` 同源；默认值保持不变。
- 用户可见失败结构化：缺失 API key（`auth`）、不支持的 provider（`config`，新增 `ModelErrorKind`）等模型相邻失败以 `ModelRequestError` 抛出并跨 RPC 保留 `modelFailure`；UI `presentModelFailure` 按 kind 本地化（zh/EN），缺翻译回落英文描述与 `request_id`，绝不裸显 i18n key。运行时自撰的动作性收尾文案（空响应/工具失败）本地化随 U4 处理。
- 工具集：filesystem、shell/terminal、git、search、MCP、background、todo/plan、coding_task、spawn_agent、apply_patch、web_search 等。
- 工具治理：approval、question、policy、sandbox、workspace trust（`AGENT_WORKSPACE_TRUST`，未 trust 拒绝变更类工具并提示 `tsdi-agent trust <dir>`）、敏感信息脱敏、rate limit、principal 授权、timeout/retry、audit、compensation/rollback。
- command exchange、command output history、失败重试、取消与恢复。
- attachments、图片、文件变更、diff/review inspector 与媒体等价文本。
- 运行时健壮性：turn-aware 上下文窗口（当前轮整段保留、仅对历史轮开窗）、turn-aware 压缩、`repairToolPairing`/孤儿配对修复、`recoverDetail` 工具轮配对完整（缺结果整体跳过）、plan-aware continuation（decompose `accepted` 也登记为未完成计划）、falsification 排除只读探测失败、有界空响应重试（2 次）+ 递增退避、模型错误结构化分类（402→quota、401/403→auth，终止不重试）、workspace 上下文注入、越界路径可操作错误（附 root 与相对路径示例）、`list_dir` 软链接标记不跟随、`apply_patch` 语义与空白容错、`git_operations` 非 git 回退会话文件快照、`todo` 字段级部分更新与 `merge` schema 描述。
- 委派：`spawn_agent`/`coding_task`/`LightweightAgentRunner` 经 `@Inject(INJECTOR)` 惰性解析；子代理 prompt 声明 `Available tool categories`，避免弱模型误报「无工具」。
- 模型可操作失败：`ModelRequestError`/`ModelFailure` 结构化，`RetryPolicy` 区分 quota/auth；CLI 默认只输出一行可操作文案，`TSDI_AGENT_DEBUG=1` 才附堆栈。

### Console UI

- browser `ConsoleRenderer` 与 CLI `TuiRenderer` 共用 presenter/renderer/交互状态；TUI、browser、VS Code webview、desktop 四端。
- 语义路由：user/final、thought、tool、command、event、question、approval、plan、file、attachment、diagnostic。
- 时间线：turn/step/event 三层；tool lifecycle 按 `toolCallId` 逐调用成行、pending 与 completion 原地归并（同一事实只出现一次）；总耗时优先后端 `durationMs`，缺失按保留的开始时间推导；折叠摘要 + detail inspector；事件仅显动作/对象/状态/摘要，raw payload/stdout/stack/diff 进 inspector。
- 审批/问答：新审批到达自动聚焦 approval 面板（让位 pending question / select / inspector 等更高优先级层），显示 `Allow <tool>?` + 命令预览 + 原因/到期与固定操作键；pending question 支持输入框自定义答案、空草稿数字选择编号、队列计数。
- 布局：默认 `viewport` 全屏窗口 + 长度折叠 + `/layout [stream|viewport]` 持久化（旧 `dynamic` 兼容为 `viewport`）；`stream` 全程 native scrollback、不按视口裁剪历史；视窗内历史滚动（滚轮/PageUp/PageDown、向上暂停跟随并提示 N 条新消息、滚到底/Esc 恢复跟随）由 `AgentConsoleTranscriptLayout` 策略收敛，平台适配层各自路由（TUI `TerminalInputController`、DOM `web-console`）。
- 焦点基础设施：components core `FocusMonitor`/`FocusTrap`/受控 `[focused]` 指令；转录导航归 `AgentConsoleTranscriptNavigation`；`AgentConsoleSessionState` 只承载数据与平凡 setter/getter（无 `subscribe`/`listeners`/`notify`/`batch`，无布局/平台行为）。
- 输入：multiline draft、stash、external editor、Vim、keymap、suggestions、workspace mentions、slash palette；turn 运行中 Enter 默认排队（FIFO），steer 需显式 `ui.steerMode`；输入行 `N queued` 徽标常驻。
- 呈现：Markdown、CJK 宽度、80/100/120 列、主题、ARIA、键盘与鼠标；工具行本地化动作 + 主参数（`Read file: <path>`）；工具批行 >3 折叠 `· +N more`（已被逐调用成行取代）；失败/阻塞行 `r` 就地重试；@mention 以紧凑 `Files · <paths>` 展示且运行时仍携带完整上下文。
- 流式：interim 旁白与工具轮边界封行为独立行、最终回答分离；流式光标 `▍` 只属于正在输出的 assistant；状态栏 token 计量随流式 chunk 实时推进（真实 usage 优先，预估带 `estimated` 标记且不写审计）；Working elapsed 由真实时钟在数据驱动渲染中推进，不使用业务 `setInterval`。
- components/console 渲染收敛为 TUI 单一实现：保留 `ConsoleRenderer` 作为可复用基类/节点模型，移除重复的 `ConsoleTemplateCompiler`/`ConsoleTemplateModule`（tui 侧以同名兼容别名导出），`TuiTemplateModule`/`TuiConsoleModule` 为唯一模板模块；同一 surface 同时支持 `stream`（native scrollback）与 `viewport`（alternate screen + surface 行滚动），由宿主生命周期 `shouldUseNativeScrollback`/`shouldScrollViewport`/`shouldUseAlternateScreen` 选择。

### 宿主与门禁

- agent-cli、agent-gateway、agent-desktop、VS Code、SSH、channels、Web bundle。
- 统一门禁 `RUN_PTY=1 bash scripts/agents-gate.sh`：agents 各包、components core/common/html/console、4 项 `tsc`、Web production build、DOM/TUI 宽度矩阵、metrics regression、真实 PTY acceptance、`source-size`、生产库完整性、`git diff --check`。
- 架构契约门禁：跨平台导入边界（`agent-ui/src` 不引 `@tsdi/components/console` 或 node 库；`components/console` 不引 node 内置；`components/html` 与 `components/console` 互不引用；`agent-ui/console` 与 `agent-ui/web-console` 互不引用）；响应式热路径无 per-read 缓存/原型链查找；无 `setInterval` 驱动界面刷新；`SessionState` 无手工订阅/通知 API。
- 体量 ratchet：`scripts/check-source-size.mjs` + `scripts/source-size-baseline.json`，已入基线文件只允许下降、新文件上限 600 行；`AgentConsoleComponent.ts` 目标 < 1500 行。
- 数据安全：生产库固定 `~/.tsdi-agent/agent.db`；测试与真实 PTY 使用独立临时 HOME；门禁含生产库 SHA-256 前后不变量检查。

## 三、未完成计划

> 来源：真实 CLI/TUI 会话、跨平台（DOM/TUI）验收与源码审计暴露的差距；对照 Codex CLI（最新，ratatui）、opencode（bubbletea / OpenTUI）与 openTUI 的基础组件模型。批次可独立验收；每批次必须补真实边界回归（AppRpc 流 / DOM / PTY）后才能关闭。
>
> **当前状态（2026-10）**：P1–P6 已全部关闭并合并进上文功能点；P7（`AgentConsoleComponent` 持续拆解）进行中；A1–A3（运行时写死重构）已完成并合并进上文功能点；U1–U5（agent-ui 视窗/展示/交互，基础组件参考 openTUI）待执行。

### 统一收尾流程（每个 plan 缺一不可）

1. **检查完成**：`lsp_diagnostics` 无告警；`tsc --noEmit -p packages/agents/<pkg>/tsconfig.json` 通过。回归先 **RED 后 GREEN**（先在旧实现上证明稳定失败，再证明修复通过）；targeted runner 输出为空且 EXIT=0 视为**假绿**，不采信，改用完整 `npm run test`。
2. **全量测试**：受影响包 `cd packages/<pkg> && npm run test` 全绿 EXIT=0；改到响应式核心或跨平台渲染时，同时回归 components、components/common、components/html、components/console 与 agent-ui。统一门禁按影响范围执行（如 `RUN_PTY=1 bash scripts/agents-gate.sh agent agent-tools agent-ui tsc-agent tsc-agent-ui source-size diff-check`），真实 PTY 场景必须实机复验。
3. **数据安全**：不得触碰或回滚生产库；门禁 `production-db-integrity` 阶段通过。
4. **体量纪律**：`node scripts/check-source-size.mjs` 通过；已入基线文件只降不升，缩减的文件在**同一提交内**下调 `scripts/source-size-baseline.json`。
5. **更新 todo.md**：把本 plan 从「未完成计划」移入「已具备的功能点」或标注 ✅，记录真实证据（命令、场景、观察）；不保留提交号与阶段测试数字。
6. **提交**：`git diff --check` 干净后提交，提交信息按仓库风格（`fix(...)`/`feat(...)`/`refactor(...)` + 简体中文正文），仅包含本批次相关文件。

---

### P7 — AgentConsoleComponent 持续拆解（进行中）

> 依据根 `AGENTS.md` 第 4 条 ratchet 与单一职责规则，按约定顺序 P4 命令注册表 → P3 Turn/Input 控制器 → P2 诊断/导出/附件/语音控制器 → P1 纯函数，将组合根拆到 `< 1500` 行。

- **当前进度**：`AgentConsoleComponent.ts` 4158 行（baseline 4163）；`AgentConsoleSessionState.ts` 6459 行、`AgentConsolePanels.ts` 4165 行（均已入基线，只降不升）。
- **已抽出模块**（既有）：`AgentConsolePreferenceCommands`、`AgentConsolePolicyCommands`、`AgentConsoleExtensionCommands`、`AgentConsoleStashCommands`、`AgentConsoleGitSnapshotCommands`、`AgentConsoleShellCommands`、`AgentConsolePromptMentions`、`AgentConsoleApprovalCommands`、`AgentConsoleKeymapCommands`、`AgentConsoleToolsView`、`AgentConsoleHarnessCommands`、`AgentConsoleBackgroundTaskCommands`、`AgentConsoleTodoPlanCommands`、`AgentConsoleSettingsCommands`、`AgentConsoleTurnStreamController`（流消费/instance state）、`AgentConsoleCommandRegistry`（命令注册表）。
- **不可抽取项（时序约束，务必保留在组件内）**：`refreshSessions`。抽取它会使 `test/vm-panels.spec.ts` 的 `terminal input submits combined text and return chunks` 稳定失败（该用例经 `void this.submit()` 触发 `/sessions`，依赖命令派发的同步时序）；任何命令抽取都必须回归该用例。
- **下一步（待办）**：
  1. 继续切出大块核心：`buildCommandContext`、`submit`、`handleBrowserGlobalKeyInput`、`executeGlobalKeyAction`、`handleTerminalInput`——需先切分状态对象或引入子控制器。
  2. 每完成一个模块，同提交下调 `AgentConsoleComponent.ts` 的 baseline。
  3. 目标 `AgentConsoleComponent.ts < 1500` 行；新增 console 能力一律落到既有模块或新建 `AgentConsole*Controller`，禁止再往组合根加业务逻辑、禁止往单体 `switch` 加 `case`。

---

### U 系列 — agent-ui 展示与交互优化（重点：视窗模式；基础组件参考 openTUI）

> 审计结论（视窗模式为默认布局）：当前把「转录滚动」实现成「移动消息选中」——`visibleMessages` 按**消息条数**开窗、滚轮每格只移 1 条消息、滚动即改 `selectedMessageId` 高亮；窗口高度用 `终端行 − 6` 魔法值且仅在按键时刷新；折叠受「同时只开一条 detail」限制，detail 打开时又绕过窗口返回全量。对照 Codex CLI（每个 `HistoryCell` 按终端宽度上报**视口行数**、`scroll_offset` 以**行**计、`Ctrl+T` 打开 alternate-screen 全屏转录 pager、显式预留 chrome 高度）与 opencode（bubbletea `viewport` 行滚动 + sticky-bottom + 新消息指示 + prune 补偿）、openTUI（Yoga 保留树 + `ScrollBoxRenderable`：`stickyScroll`/`stickyStart:"bottom"`、`scrollChildIntoView`、viewport culling、内置 scrollbar、方向键 1/5 视口 / PageUp/Down 1/2 视口 / Home-End、`_hasManualScroll` 回到底部自动恢复跟随），我们缺的是**独立于选中的行级滚动模型与粘底跟随**、**精确的视口高度测量**、**逐消息持久折叠**、**全量文案 i18n** 与**两端语义一致**。

#### U1 — 视窗滚动与选中解耦：行级 scroll offset + 粘底跟随（参考 openTUI `ScrollBoxRenderable` / opencode `viewport`）

- **问题（file:line）**：`AgentConsoleTranscriptNavigation.ts:70-101` 的 `scroll/scrollPage` 走 `movePage` 改 `selectedMessageId`，滚动即改选中；`AgentConsolePanels.ts:2713-2740` 的 `visibleMessages` 以消息条数 `resolveConsoleListWindow` 开窗；`AgentConsoleTerminalInputController.ts:141-143` 与 `web-console/web-console.ts:165-171` 滚轮均为 `±1` 条消息；`components/console/src/terminal.ts` 已有的 `scrollOffsetRows`/`maxScrollOffsetRows` 在 viewport 下被 `shouldScrollViewport()===false` 禁用。
- **目标（对齐 openTUI ScrollBox 契约）**：在 **`components/console`** 引入可复用的滚动视口模型（`scrollTop`/`scrollHeight`/`viewportHeight` + `stickyScroll`/`stickyStart:'bottom'` + 手动滚动暂停与回到底部自动恢复跟随 + `scrollChildIntoView` + 视口裁剪 + 键位），agent-ui 转录只把渲染后的内容交给它；**滚动不改变选中**，选中只用于打开 inspector/detail；滚轮/方向键（1/5 视口）/PageUp·PageDown（1/2 视口）/Home·End 映射行；向上滚动暂停跟随并显示「N 条新消息 / 跳到底部」，回到底部自动恢复。
- **分层（2026-10 用户确认）**：基础滚动能力归 **`components/console`**（TUI 由 `TuiTerminalSurface` 接入；DOM 侧由 `components/html` 或宿主适配）；**agent-ui 只负责业务**——把渲染后的消息内容喂给 ScrollBox、决定折叠语义、把 `/layout` 偏好经生命周期标志（`shouldUseNativeScrollback`/`shouldScrollViewport`/`shouldUseAlternateScreen`）交给平台；**不得在 `SessionState`/`AgentConsoleComponent` 里自行计算滚动 offset/粘底/新消息计数**。
- **涉及**：`components/console/src/scroll-box.ts`（模型）+ `terminal.ts`（surface 接入）+ `components/html`（DOM 适配）；`agent-ui/src/AgentConsoleTranscriptLayout.ts`、`AgentConsolePanels.ts`（去掉按消息条数开窗）、`AgentConsoleTerminalInputController.ts`、`web-console/web-console.ts`；消除 components/console 与 agent-ui 的 PageUp/Down 双重处理。
- **进度**：`ScrollBox` 模型已迁至 **`components/common`**（renderer-neutral，`components/console` 的 `TuiTerminalSurface` 接入：row scroll + `stickyStart:'bottom'` 粘底跟随 + 阅读位置稳定 + `viewportFollowing`/`acknowledgeViewportFollow`）；agent-ui 收敛为业务：视窗渲染整段转录、滚轮转交 surface、按 base 的 `isViewportFollowing` 计数新消息，并移除 `messagesViewportItems`/`syncConsoleMessageViewportView` 的视窗尺寸计算。布局映射已下沉 `components/console`（`resolveConsoleTranscriptLayoutFlags`：`stream`→native scrollback、`viewport`→alternate screen + surface row scroll；lifecycle `resolveConsoleLayout`），**应用只需设置 `messageLayout`**。DOM 适配待续。
- **验收**：滚动不改 `selectedMessageId`；到底判定精确（无 1 行容差）；向上滚动显示新消息计数、回到底部恢复粘底；TUI/DOM 行为矩阵一致；新增 DOM/TUI/PTY 边界回归。

#### U2 — 视窗高度按真实 chrome 测量 + resize 响应

- **问题（file:line）**：`AgentConsoleTerminalInputController.ts:311-320` 用 `floor(rows) - 6` 估算窗口，6 为魔法 chrome（composer 多行、statusline、hints、overlay、slash palette 未计入）；`syncConsoleMessageViewportView` 只在 `onInit`（`AgentConsoleComponent.ts:1599`）与每次输入 chunk 调用，终端 resize 不重算；`console-ports.ts` 的 `ConsoleTerminalSurfaceAccessor` 无 resize 事件。
- **目标**：视口高 = 终端行 − **实测保留区**（composer/status/hints/overlay 的实际行数，由 renderer 的 regions 反馈，参考 openTUI 的 Yoga flex `flexGrow`/`flexShrink` 与 Codex 显式 chrome 高度）；平台适配层暴露 resize 事件，resize 后无需按键即重算并保持滚动锚点（对齐 opencode `compensatePruneScrollTop` 的「阅读位置稳定」语义）。
- **涉及**：`console-ports.ts`（surface resize 能力）、`components/console/src/terminal.ts`（chrome/region 高度反馈）、`components/html` DOM 尺寸、`AgentConsoleTerminalInputController.ts`、`AgentConsoleComponent.ts`。
- **验收**：resize 不依赖按键即更新窗口；mutiline composer / overlay 出现时转录窗口相应收缩；不溢出、不留大片空白；回归含宽度矩阵与 resize 场景。

#### U3 — 内联折叠/展开按消息持久化（多条可同时展开）

- **问题（file:line）**：`AgentConsoleMessageTemplates.ts:130-158` 的展开条件为 `rawMode || showCriticalMarks || stream || finalAssistant || (detailOpen && selected)`，即同时只能展开一条 detail；`AgentConsolePanels.ts:2726-2728` 在 `messageDetailOpen` 时 `visibleMessages` 直接返回**全量**消息（绕过窗口）。
- **目标**：每条消息拥有独立的 inline 展开/折叠状态并持久在 `SessionState`（可多条同时展开）；detail 页与 inline 展开解耦；折叠状态在重渲染/切换会话后可保持；参考 Codex `HistoryCell` 的 cell 级折叠与 opencode 工具块展开。
- **涉及**：`AgentConsoleSessionState.ts`（`expandedMessageIds` 数据字段）、`AgentConsoleMessageTemplates.ts`、`AgentConsolePanels.ts`、`AgentConsoleMessageRenderers.ts`。
- **验收**：多条消息可同时 inline 展开；重渲染与切换会话保持；detail 打开不再绕过窗口；新增回归。

#### U4 — agent-ui 用户可见文案全面 i18n

- **问题**：`agent-ui/src` 仍有 **153 处** `(ctx|host).notify('English…')` 与 **9 处** `throw new Error('English…')` 硬编码英文（`AgentConsoleVoiceHandlers`、`AgentConsoleEditModeHandlers`、`AgentConsolePreferenceCommands`、`AgentConsoleHarnessCommands`、`AgentConsoleReviewHandlers`、`AgentConsoleExportHandlers`、`AgentConsoleCommandHandlers`、`AgentConsoleBackgroundTaskCommands`、`AgentConsoleDiagnosticsHandlers`、`AgentConsoleGitSnapshotCommands`、`AgentConsolePolicyCommands`、`AgentConsoleModelHandlers`、`AgentConsoleRuntimeCommands`、`AgentConsoleShellCommands`、`AgentConsoleGlobalKeyInputController`、`AgentConsoleSessionService`、`AgentConsoleSessionState` 等）；`AgentConsoleTerminalInputController.ts:206-207` 的取消提示仍为裸英文，`:116` 用英文标题 `'Command palette'` 做控制流。
- **目标**：全部用户可见文案走 `agent-ui.i18n.ts`（zh/EN），缺 key 不显示 key 本身；控制流用稳定 token/枚举而非展示文案（消除 `title.startsWith('Command palette')` 之类的文案耦合）；补齐命令用法/错误/诊断提示键。
- **涉及**：上述 handler 模块、`agent-ui/src/agent-ui.i18n.ts`、`AgentConsoleTerminalInputController.ts`、`AgentConsoleOverlayPresenter.ts`（overlay 标题/提示 token 化）。
- **验收**：生产代码 `grep` 无硬编码英文 `notify`/`throw`；zh-CN 下命令/提示/错误无英文残留；新增 locale 快照回归。

#### U5 — DOM/TUI 视窗交互一致 + 全历史 pager（参考 Codex `Ctrl+T` 转录 overlay）

- **问题**：DOM 无 alternate screen，`web-console/web-console.ts:165-171` 仅把滚轮接到 `scrollMessages(±1)`；`viewport` 退出即丢失可回看历史；无全屏转录 pager 与转录内搜索（Codex 用 alternate-screen `pager_overlay`，opencode 有 scroll-lock 与 `Jump to latest`）；鼠标拖拽选择/复制在整屏重绘下易被打断。
- **目标**：DOM 与 TUI 的滚动/折叠/跟随/新消息语义完全一致（同一 renderer-neutral 模型 + 各自适配）；提供只读**全屏转录 pager**（可搜索、跳转、退出后历史仍在），viewport 退出可回看；鼠标选择复制在重绘期间稳定（对齐 openTUI 的 selection 与 render 解耦）。
- **涉及**：`components/common` 滚动/选择模型、`components/html`、`components/console`、`web-console/web-console.ts`、`agent-ui` 新增 `AgentConsoleTranscriptPagerController`。
- **验收**：DOM/TUI 交互矩阵一致；pager 可搜索/跳转；退出 viewport 后可回看；重绘不打断选择；真实 PTY + DOM 回归。

---

### M 系列 — `/model` 与 `/connect`（参考 opencode `dialog-model.tsx` / `dialog-provider.tsx`）

> 现状问题：`/model` 只认已配置 profile，模型 id（如 `deepseek-v4-pro`）写死；添加/切换 provider 时未经校验即写 settings，且整体替换 model 丢失 `baseUrl`/凭据；没有从服务拉取模型与 effort（`default`/`low`…）让用户选择。opencode 的做法：`/model` 从 server 的 provider/model catalog 拉全量模型，支持 favorite/recent/模糊搜索，选中后再选 variant（effort）；`/connect` 先选 provider → 选认证方式 → 输入 API key → 校验 → 存储凭据 → 再进入 `/model` 选择。

- **M1 — 服务端模型目录驱动 `/model`（去写死）**：`model.list` 返回当前 provider 的**实际**模型（`ModelCatalog.fetchAgentModelCatalog` 拉 `/v1/models`，离线回落 bundled），含 `effort.supportedLevels/defaultLevel`；`/model` 面板展示「Favorites / Recent / 全部模型（按 provider 分组）」并支持模糊搜索；移除 `deepseek-v4-pro` 等写死默认，默认取目录首个或用户选择。涉及 `agent-gateway` `model.list`、`agent-ui` `AgentConsoleModelHandlers` / 新 dialog、`agent/src/model/ModelCatalog.ts`。
- **M2 — effort/variant 选择**：选中模型后，若目录给出 `supportedLevels`（如 `low/medium/high/max`）则弹出 variant 选择（`default` + 各 level），持久化 `reasoningEffort`；opencode `DialogVariant` 对应。
- **M3 — `/connect` provider 连接 + 校验**：新命令 `/connect`：列 provider（registry + `provider.json`，已连接 ✓）→ 选认证方式（API key）→ 输入 key → **先校验**（`${baseUrl}/v1/models` / `doctor --check-models` 同路径）→ 成功才存储凭据（`cliCredentialStore`）并**合并**写入 settings（不得整体替换、不得丢字段）→ 进入 `/model`。校验失败给出可操作错误且不写盘。
- **M4 — 交互与安全**：key 输入掩码；已连接 provider 标记；缺失/无效 key 在 `/model`、`/doctor` 可见；不允许未校验配置持久化（延续 A1/P1 净化）。
- **M5 — Router 兼容（必须）**：目录驱动选择必须与 `RoutedModelAdapter` 的路由配置共存——直接选模型只更新 top-level 且**保留** `profiles`/`defaultProfile`/`complexityRouting`/`routes`；`auto` 模式继续用 complexityRouting；选中的 provider/model/effort 必须能被 router 解析（未知 profile 走既有降级 + `getWarnings()`）；`model.list`/`model.activate` 展示的是 router 解析后的真实生效模型；`/connect` 新增的 provider 可被 `complexityRouting`/`routes` 引用。不得因新流程丢弃或改写成单一模型而破坏复杂度路由。
- **M6 — 服务路由探测 + 本地 router 回退**：`/connect` 与 `/model` 先探测服务端是否提供 auto/路由能力（目录元数据）；不支持时以本地 `RoutedModelAdapter` 承载，配置向导让用户设置「难度 → 模型」映射（`simple`/`moderate`/`complex` → profile，即 `complexityRouting`），不写死具体模型；`auto` 模式走本地复杂度路由，`model.activate` 的目录式 `provider/model` 名称继续可用。
- **进度**：M1 首批已落地——gateway 新增 `model.catalog`（`fetchAgentModelCatalog` 拉 `/v1/models`，离线回落 bundled，返回 `id/name/effort`；已测试）＋ agent-ui `loadModelProfileOptions` 合并服务目录模型（含 effort detail；已测试）。
- **验收**：真实 provider 下 `/connect` 校验失败不写 settings、成功后可 `/model` 选到服务返回的模型与 effort；settings.json 不再被整体覆盖；无写死模型 id；zh/EN 文案；DOM/TUI 双端 + 回归。
- **参考**：`~/workspace/opencode/packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`、`dialog-provider.tsx`、`dialog-variant.tsx`、`packages/opencode/src/provider/provider.ts`（`variants`）、`packages/opencode/src/cli/cmd/providers.ts`。

### 遗留观察（收尾时必须确认）

- 视窗模式 layout 持久化与 alternate-screen 退出语义需持续由真实 PTY 覆盖（归入 U5）；`/close` 退出后命令窗口提示与历史保留需一并复验。
- 早前 OpenTUI 焦点迁移轮次中「Esc 取消修复后的真实 PTY 复测」未完成，需在 U1/U5 批次内补跑。
- renderer region 局部失效（脏子树）未在真实 TUI 复测；若 U2 引入 resize/地区高度反馈，必须实测无全树重渲染回退。
- 运行时自撰的用户可见失败收尾文案（`resolveAssistantResponseText` 的空响应/工具失败指引）仍为英文，其本地化并入 U4 统一 i18n（运行时不知道 locale，需由 UI 文案层承担）。
- ModelCatalog 远程发现尚未接入 `/model` 展示（`/doctor --check-models` 已做校验）；归入后续批次。
