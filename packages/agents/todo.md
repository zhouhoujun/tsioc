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
- 运行时健壮性：turn-aware 上下文窗口（当前轮整段保留、仅对历史轮开窗）、turn-aware 压缩、`repairToolPairing`/孤儿配对修复、`recoverDetail` 工具轮配对完整（缺结果整体跳过）、plan-aware continuation（decompose `accepted` 也登记为未完成计划）、falsification 排除只读探测失败、有界空响应重试（2 次）+ 递增退避、模型错误结构化分类（402→quota、401/403→auth，终止不重试）、workspace 上下文注入、越界路径可操作错误（附 root 与相对路径示例）、`list_dir` 软链接标记不跟随、`apply_patch` 语义与空白容错、`git_operations` 非 git 回退会话文件快照、`todo` 字段级部分更新与 `merge` schema 描述；child process wall-time 超时由单一权威（manual wallTimer）在 kill 前置位 `killedByLimits`，不依赖内建 `spawn({ timeout })`，超时判定确定性。
- 委派：`spawn_agent`/`coding_task`/`LightweightAgentRunner` 经 `@Inject(INJECTOR)` 惰性解析；子代理 prompt 声明 `Available tool categories`，避免弱模型误报「无工具」。
- 文件读取契约与工具输出截断：`read_file` 支持 `offset`/`limit`，`truncated` 为真时返回 `nextOffset`（下一页起始行）以便确定性翻页；`read_file` 已由字节/行预算自限，通用工具输出 spill 不再对其二次截断（`resolveToolOutputMaxChars`）。此前统一的 `maxToolResultChars`（8000）会把 `read_file` 结果再截断成头部预览，而"用 `read_file` 读取 spill 文件以获取全文"的逃生口每次又被同一上限再截断，模型因此反复分块重读、上下文爆炸并以流式请求失败告终（真实复现：单轮读取 4 个源文件触发 16 次 `read_file`、上下文约 466K tokens 后 `Model streaming request failed: terminated`；修复后每个源文件一次读取即返回全文）。
- 模型可操作失败：`ModelRequestError`/`ModelFailure` 结构化，`RetryPolicy` 区分 quota/auth；非流式请求的 abort/timeout/network 传输失败按同一退避预算重试（外部取消与 quota/auth 不重试）；致命错误 turn 在回滚后持久化一条 assistant 错误收尾消息（transcript 不悬空）；CLI 默认只输出一行可操作文案，`TSDI_AGENT_DEBUG=1` 才附堆栈。
- 流式中断恢复：非流式降级与传输错误识别扩展到 undici 级联失败（`terminated`/`other side closed`/`socket hang up`/`premature close`/连接被重置），并且只要**尚未输出答案正文或工具调用**（仅 reasoning 或空白），中途传输中断即降级为非流式重试而非终止整个 turn；已输出答案正文时不降级以避免重复输出，外部取消仍不重试。真实复现：deepseek 长 reasoning 后连接被 `terminated` 曾使 turn 直接失败；修复后自动改用非流式补全返回完整答案。

### Console UI

- browser `ConsoleRenderer` 与 CLI `TuiRenderer` 共用 presenter/renderer/交互状态；TUI、browser、VS Code webview、desktop 四端。
- 语义路由：user/final、thought、tool、command、event、question、approval、plan、file、attachment、diagnostic。
- 时间线：turn/step/event 三层；tool lifecycle 按 `toolCallId` 逐调用成行、pending 与 completion 原地归并（同一事实只出现一次）；流式 chunk 缺 `toolCallId` 时回退 `receipt.toolCallId`，保证跨 gateway 归并键稳定；总耗时优先后端 `durationMs`（RPC `run.turn_stream` 事件 chunk 透传 `receipt.durationMs`，不再按延迟到达的完成事件推算），缺失按保留的开始时间推导；折叠摘要 + detail inspector；事件仅显动作/对象/状态/摘要，raw payload/stdout/stack/diff 进 inspector。
- 审批/问答：新审批到达自动聚焦 approval 面板（让位 pending question / select / inspector 等更高优先级层），显示 `Allow <tool>?` + 命令预览 + 原因/到期与固定操作键；pending question 支持输入框自定义答案、空草稿数字选择编号、队列计数。
- 布局：默认 `viewport` 全屏窗口 + 长度折叠 + `/layout [stream|viewport]` 持久化（旧 `dynamic` 兼容为 `viewport`）；`stream` 全程 native scrollback、不按视口裁剪历史；视窗内历史滚动（滚轮/PageUp/PageDown、向上暂停跟随并提示 N 条新消息、滚到底/Esc 恢复跟随）由 `AgentConsoleTranscriptLayout` 策略收敛，平台适配层各自路由（TUI `TerminalInputController`、DOM `web-console`）。`viewport` 下启用终端鼠标跟踪（wheel/click 送达应用并由 surface 行滚动），`stream` 保持 native（原生选择/滚动）。
- 焦点基础设施：components core `FocusMonitor`/`FocusTrap`/受控 `[focused]` 指令；转录导航归 `AgentConsoleTranscriptNavigation`；`AgentConsoleSessionState` 只承载数据与平凡 setter/getter（无 `subscribe`/`listeners`/`notify`/`batch`，无布局/平台行为）。
- 输入：multiline draft、stash、external editor、Vim、keymap、suggestions、workspace mentions、slash palette；turn 运行中 Enter 默认排队（FIFO），steer 需显式 `ui.steerMode`；输入行 `N queued` 徽标常驻。
- 呈现：Markdown、CJK 宽度、80/100/120 列、主题、ARIA、键盘与鼠标；强调语法 `**`/`__`/`*`/`_` 遵守 CommonMark 词内不解析语义（如 `DEEPSEEK_API_KEY` 保持字面）；工具行本地化动作 + 主参数（`Read file: <path>`）；工具批行 >3 折叠 `· +N more`（已被逐调用成行取代）；失败/阻塞行 `r` 就地重试；@mention 以紧凑 `Files · <paths>` 展示且运行时仍携带完整上下文。
- 流式：interim 旁白与工具轮边界封行为独立行、最终回答分离；流式光标 `▍` 只属于正在输出的 assistant；状态栏 token 计量随流式 chunk 实时推进（真实 usage 优先，预估带 `estimated` 标记且不写审计）；Working elapsed 由真实时钟在数据驱动渲染中推进，不使用业务 `setInterval`。status 为 `reasoning` 时 Working 明细显示本地化「正在推理 / Reasoning」而非「正在整理结果」，避免纯 reasoning 阶段被误读为卡死。
- 终端输入序列 token 化：单次 read 可携带多个按键（按键连发、快速输入、粘贴），必须逐个消费而不是把整段当作一个按键。`components/console` 与 `components/common` 的输入处理按原子步进消费转义序列（`consumeConsoleEscapeSequence`/`consumeEscapeSequence`），不再把 ESC 剥掉后泄漏 `[A`/`[5~` 到输入框；`TerminalInputSequenceDecoder.decodeAll` 将批量序列拆成独立按键（保持 `\e\r`/`\e\n` alt-enter 为整段、尾部半截序列回 `partial` 结果）。真实复现：`tmux send-keys Up Up` 曾在输入框出现字面 `[A[A`、批量 PageUp 被丢弃；修复后批量方向键正常导航且不产生字面残留。
- components/console 渲染收敛为 TUI 单一实现：保留 `ConsoleRenderer` 作为可复用基类/节点模型，移除重复的 `ConsoleTemplateCompiler`/`ConsoleTemplateModule`（tui 侧以同名兼容别名导出），`TuiTemplateModule`/`TuiConsoleModule` 为唯一模板模块；同一 surface 同时支持 `stream`（native scrollback）与 `viewport`（alternate screen + surface 行滚动），由宿主生命周期 `shouldUseNativeScrollback`/`shouldScrollViewport`/`shouldUseAlternateScreen` 选择。
- 面板列表逐条成行：`AgentConsolePanels` 的 tasks/jobs/approvals/tools/toolRuns 列表与详情改由 `v-for` 逐条/逐行渲染（`toolItems`/`toolRunItems` 复用 `item.style` 承载选中高亮），不再用 `join('\n')` 拼成单个 `<label>`；避免 `\n` 在 TUI（`normalizeInlineWhitespace`）与 DOM（`textContent`）两端被折叠成一行。`/tools` 每项独占一行、选中项显示 `›`；保留各 `*Label` 文本 getter，新增对应 `*Lines` 逐行 getter 供模板消费。后台任务 feed（`backgroundTaskFeedLabel`：`background N · running M` 摘要 + 最多 8 条任务行）同样改为 `v-for="line in backgroundTaskFeedLines"` 逐行渲染（新增 `backgroundTaskFeedLines` 逐行 getter），修复其在两端被折叠为一行的问题。

### 宿主与门禁

- agent-cli、agent-gateway、agent-desktop、VS Code、SSH、channels、Web bundle。
- 统一门禁 `RUN_PTY=1 bash scripts/agents-gate.sh`：agents 各包、components core/common/html/console、4 项 `tsc`、Web production build、DOM/TUI 宽度矩阵、metrics regression、真实 PTY acceptance、`source-size`、生产库完整性、`git diff --check`。
- 架构契约门禁：跨平台导入边界（`agent-ui/src` 不引 `@tsdi/components/console` 或 node 库；`components/console` 不引 node 内置；`components/html` 与 `components/console` 互不引用；`agent-ui/console` 与 `agent-ui/web-console` 互不引用）；响应式热路径无 per-read 缓存/原型链查找；无 `setInterval` 驱动界面刷新；`SessionState` 无手工订阅/通知 API。
- 体量 ratchet：`scripts/check-source-size.mjs` + `scripts/source-size-baseline.json`，已入基线文件只允许下降、新文件上限 600 行；`AgentConsoleComponent.ts` 目标 < 1500 行。
- 数据安全：生产库固定 `~/.tsdi-agent/agent.db`；测试与真实 PTY 使用独立临时 HOME；门禁含生产库 SHA-256 前后不变量检查。

## 三、未完成计划

> 来源：真实 CLI/TUI 会话、跨平台（DOM/TUI）验收与源码审计暴露的差距；对照 Codex CLI（最新，ratatui）、opencode（bubbletea / OpenTUI）与 openTUI 的基础组件模型。批次可独立验收；每批次必须补真实边界回归（AppRpc 流 / DOM / PTY）后才能关闭。
>
> **当前状态（2026-10）**：P1–P6 已全部关闭并合并进上文功能点；P7（`AgentConsoleComponent` 持续拆解）进行中；A1–A3（运行时写死重构）已完成并合并进上文功能点；U1（视窗滚动与选中解耦 + 粘底跟随）、U2（视窗高度实测 + resize 响应）、U3（逐消息持久折叠/行内展开 `e`）、U5（DOM/TUI 全历史分页 pager + 查找）已关闭并合并进功能点；U4（agent-ui 文案 i18n，zh/EN + locale 快照回归）已关闭并合并进功能点。

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

#### U1 — 视窗滚动与选中解耦：行级 scroll offset + 粘底跟随（参考 openTUI `ScrollBoxRenderable` / opencode `viewport`）（已关闭 ✅）

- **问题（file:line）**：`AgentConsoleTranscriptNavigation.ts:70-101` 的 `scroll/scrollPage` 走 `movePage` 改 `selectedMessageId`，滚动即改选中；`AgentConsolePanels.ts:2713-2740` 的 `visibleMessages` 以消息条数 `resolveConsoleListWindow` 开窗；`AgentConsoleTerminalInputController.ts:141-143` 与 `web-console/web-console.ts:165-171` 滚轮均为 `±1` 条消息；`components/console/src/terminal.ts` 已有的 `scrollOffsetRows`/`maxScrollOffsetRows` 在 viewport 下被 `shouldScrollViewport()===false` 禁用。
- **目标（对齐 openTUI ScrollBox 契约）**：在 **`components/console`** 引入可复用的滚动视口模型（`scrollTop`/`scrollHeight`/`viewportHeight` + `stickyScroll`/`stickyStart:'bottom'` + 手动滚动暂停与回到底部自动恢复跟随 + `scrollChildIntoView` + 视口裁剪 + 键位），agent-ui 转录只把渲染后的内容交给它；**滚动不改变选中**，选中只用于打开 inspector/detail；滚轮/方向键（1/5 视口）/PageUp·PageDown（1/2 视口）/Home·End 映射行；向上滚动暂停跟随并显示「N 条新消息 / 跳到底部」，回到底部自动恢复。
- **分层（2026-10 用户确认）**：基础滚动能力归 **`components/console`**（TUI 由 `TuiTerminalSurface` 接入；DOM 侧由 `components/html` 或宿主适配）；**agent-ui 只负责业务**——把渲染后的消息内容喂给 ScrollBox、决定折叠语义、把 `/layout` 偏好经生命周期标志（`shouldUseNativeScrollback`/`shouldScrollViewport`/`shouldUseAlternateScreen`）交给平台；**不得在 `SessionState`/`AgentConsoleComponent` 里自行计算滚动 offset/粘底/新消息计数**。
- **涉及**：`components/console/src/scroll-box.ts`（模型）+ `terminal.ts`（surface 接入）+ `components/html`（DOM 适配）；`agent-ui/src/AgentConsoleTranscriptLayout.ts`、`AgentConsolePanels.ts`（去掉按消息条数开窗）、`AgentConsoleTerminalInputController.ts`、`web-console/web-console.ts`；消除 components/console 与 agent-ui 的 PageUp/Down 双重处理。
- **进度（已关闭 ✅）**：`ScrollBox` 模型已迁至 **`components/common`**（renderer-neutral，`components/console` 的 `TuiTerminalSurface` 接入：row scroll + `stickyStart:'bottom'` 粘底跟随 + 阅读位置稳定 + `viewportFollowing`/`acknowledgeViewportFollow`）；agent-ui 收敛为业务：视窗渲染整段转录、滚轮转交 surface、按 base 的 `isViewportFollowing` 计数新消息，并移除 `messagesViewportItems`/`syncConsoleMessageViewportView` 的视窗尺寸计算。布局映射已下沉 `components/console`（`resolveConsoleTranscriptLayoutFlags`：`stream`→native scrollback、`viewport`→alternate screen + surface row scroll；lifecycle `resolveConsoleLayout`），**应用只需设置 `messageLayout`**。DOM 适配已落地（基础组件 `DomScrollBox`，移除 `state.scrollMessages`）。
- **验收**：滚动不改 `selectedMessageId`；到底判定精确（无 1 行容差）；向上滚动显示新消息计数、回到底部恢复粘底；TUI/DOM 行为矩阵一致；新增 DOM/TUI/PTY 边界回归。

#### U2 — 视窗高度按真实 chrome 测量 + resize 响应（已关闭 ✅）

- **问题（file:line）**：`AgentConsoleTerminalInputController.ts:360-367` 的 `syncConsoleMessageDetailViewportView` 用 `floor(rows) - 6` 估算 detail 窗口，6 为魔法 chrome（composer 多行、statusline、hints、overlay 未计入）；只在 `handleTerminalInputView`（`AgentConsoleTerminalInputController.ts:196`）每次输入 chunk 调用，终端 resize 不重算；`console-ports.ts` 的 `ConsoleTerminalSurfaceAccessor` 无 resize 事件。
- **进度（已关闭 ✅）**：
  - `TuiTerminalSurface`（`components/console/src/terminal.ts`）在 `resolveViewportLayout` 顶部按**全部分支**实测 `lastAvailableRows`（region 存在时 `height − scrollRegion.startRow − (allLines.length − footerRegion.startRow)`，缺失时回退 `height`，`!height` 时为 0），新增公开 getter `viewportAvailableRows`；与主分支 `availableRows`、假 region 测试公式一致。
  - `ConsoleTerminalSurfaceLifecycleService` 实现 `subscribeToSurfaceResize`（首个订阅者绑定 `output.on('resize')`，Set 空时自动解绑；resize 时先 `surface.requestRender()` 再用微任务通知订阅者，保证读到新测量值）与 `getTerminalViewportRows`（`surface.viewportAvailableRows ?? 0`）；`cleanup()` 解绑并清空订阅。平台 `ConsoleTerminalSurfaceAccessor` 与 agent-ui `console-ports.ts` 端口各新增可选 `getTerminalViewportRows?` / `subscribeToSurfaceResize?`。
  - `syncConsoleMessageDetailViewportView` 实测优先（`getTerminalViewportRows`，无 `-6`），尺寸估算回退（`floor(rows) - 6`），保留 `[8,40]` 钳制与 `enter` 交互门；模块级 `WeakSet` 每 host 只订阅一次，resize 回调检查 `host.destroyed` 后自解绑（`AgentConsoleComponent.ts` 零改动，符合 ratchet）。
  - 回归：`layout-viewport.spec.ts` +3（实测优先、尺寸估算回退、无按键 resize 重算）；`console.spec.ts` +1（假 output `on/off` 捕获 resize 监听，触发后 `viewportAvailableRows` 按增量重测且 footer 保持钉底，无任何按键/交互）。console 96、agent-ui 1485（+3）、components 147、common 18、html 124 通过；tsc、source-size、`git diff --check` 全绿。

#### U3 — 内联折叠/展开按消息持久化（多条可同时展开）

- **问题（file:line）**：`AgentConsoleMessageTemplates.ts:130-158` 的展开条件为 `rawMode || showCriticalMarks || stream || finalAssistant || (detailOpen && selected)`，即同时只能展开一条 detail；`AgentConsolePanels.ts:2726-2728` 在 `messageDetailOpen` 时 `visibleMessages` 直接返回**全量**消息（绕过窗口）。
- **目标**：每条消息拥有独立的 inline 展开/折叠状态并持久在 `SessionState`（可多条同时展开）；detail 页与 inline 展开解耦；折叠状态在重渲染/切换会话后可保持；参考 Codex `HistoryCell` 的 cell 级折叠与 opencode 工具块展开。
- **涉及**：`AgentConsoleSessionState.ts`（`expandedMessageIds` 数据字段）、`AgentConsoleMessageTemplates.ts`、`AgentConsolePanels.ts`、`AgentConsoleMessageRenderers.ts`。
- **进度（已关闭 ✅）**：`SessionState` 新增 `expandedMessageIds: string[]` 与 `isMessageExpanded`/`setMessageExpanded`/`toggleMessageExpanded`/`toggleSelectedMessageExpanded`（不可变替换，引用相等即 cache key）；`AgentConsoleMessageTemplates.ts` 的 `bodyPreviewLines` 展开条件并入 `isMessageExpanded(messageId)` 并把 `expandedIds` 纳入 `bodyLinesCache` 比较；`AgentConsoleFocusLayers.ts` `handleMessageListKey` 新增 `case 'e'` → `toggleSelectedMessageExpanded`（不进 detail，`messageDetailOpen` 保持 false）；多消息可同时展开、再次 `e` 逐条收起。`AgentConsolePanels.ts` 的 `messageDetailOpen` 绕过窗口问题仍遗留（并入 U1/U2 视窗批次处理）；新增 2 条回归覆盖单条展开/detail 解耦与多条展开/收起。
- **验收**：多条消息可同时 inline 展开；`e` 不打开 detail；重渲染与切换会话保持；新增回归。

#### U4 — agent-ui 用户可见文案全面 i18n（已关闭 ✅）

- **问题**：`agent-ui/src` 仍有 **153 处** `(ctx|host).notify('English…')` 与 **9 处** `throw new Error('English…')` 硬编码英文（`AgentConsoleVoiceHandlers`、`AgentConsoleEditModeHandlers`、`AgentConsolePreferenceCommands`、`AgentConsoleHarnessCommands`、`AgentConsoleReviewHandlers`、`AgentConsoleExportHandlers`、`AgentConsoleCommandHandlers`、`AgentConsoleBackgroundTaskCommands`、`AgentConsoleDiagnosticsHandlers`、`AgentConsoleGitSnapshotCommands`、`AgentConsolePolicyCommands`、`AgentConsoleModelHandlers`、`AgentConsoleRuntimeCommands`、`AgentConsoleShellCommands`、`AgentConsoleGlobalKeyInputController`、`AgentConsoleSessionService`、`AgentConsoleSessionState` 等）；`AgentConsoleTerminalInputController.ts:206-207` 的取消提示仍为裸英文，`:116` 用英文标题 `'Command palette'` 做控制流。
- **目标**：全部用户可见文案走 `agent-ui.i18n.ts`（zh/EN），缺 key 不显示 key 本身；控制流用稳定 token/枚举而非展示文案（消除 `title.startsWith('Command palette')` 之类的文案耦合）；补齐命令用法/错误/诊断提示键。
- **涉及**：上述 handler 模块、`agent-ui/src/agent-ui.i18n.ts`、`AgentConsoleTerminalInputController.ts`、`AgentConsoleOverlayPresenter.ts`（overlay 标题/提示 token 化）。
- **验收**：生产代码 `grep` 无硬编码英文 `notify`/`throw`；zh-CN 下命令/提示/错误无英文残留；新增 locale 快照回归。
- **进度（已关闭 ✅）**：新增 `agent-ui.i18n.notice.{en,zh}.ts`（460 键逐一对齐）与 `agent-ui.i18n.error.ts`（14 键对齐）；统一 `formatAgentUiNotice(translator, key, params)` 渲染，缺 key 回落英文模板、绝不裸显 key，`translator` 缺失时安全回落；各 handler 的用户可见文案全部走键；palette/overlay 控制流改用稳定 `kind` token，消除 `title.startsWith('Command palette')` 文案耦合；新增 `test/i18n-locale-regression.spec.ts` 快照回归（键对齐、zh 无英文残留、formatter 回落且不裸显 key、本地化取样）。

#### U5 — DOM/TUI 视窗交互一致 + 全历史 pager（参考 Codex `Ctrl+T` 转录 overlay）（已关闭 ✅）

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
- **进度**：M1 已落地——gateway `model.catalog`（`fetchAgentModelCatalog` 拉 `/v1/models`，离线回落 bundled，返回 `id/name/effort`）＋ agent-ui `loadModelProfileOptions` 合并服务目录模型。M2 已落地——选中模型后按目录 `supportedLevels` 弹出 effort 选择（`default` + 各级别，含 `max`），随 `model.activate` 生效并持久化；gateway 接受 `reasoningEffort: 'max'`；`model.catalog` 逻辑抽到 `modelCatalog.ts` 以守 ratchet。M3 已落地——`/connect` 作为 `/provider` 别名；provider 向导在 `model.add`/写盘前先 `provider.test` 校验，失败即中止且不写 settings（含回归测试）。M5 已落地——目录式 `provider/model` 的 `model.activate` 保留既有 `profiles`/`complexityRouting`（gateway 回归测试）。M6 已落地——`model.catalog` 返回 `routingSupported: false`（服务端无路由），应用回退本地 `RoutedModelAdapter`，向导难度映射继续写 `complexityRouting`。
- **验收**：真实 provider 下 `/connect` 校验失败不写 settings、成功后可 `/model` 选到服务返回的模型与 effort；settings.json 不再被整体覆盖；无写死模型 id；zh/EN 文案；DOM/TUI 双端 + 回归。
- **参考**：`~/workspace/opencode/packages/opencode/src/cli/cmd/tui/component/dialog-model.tsx`、`dialog-provider.tsx`、`dialog-variant.tsx`、`packages/opencode/src/provider/provider.ts`（`variants`）、`packages/opencode/src/cli/cmd/providers.ts`。

### S 系列 — 安全、可观测性与生态对齐（2026-11，进行中）

> 对照 opencode 2.3（后台子代理、custom agents、worktree、ACP、Code Mode）、Claude Code 2026（sandbox runtime、hooks、subagents、OTEL、跨会话消息）与 Codex CLI 2026（workspace-write 默认、app-server、`--worktree`、execpolicy、hook trust）。批次独立验收，每批补真实边界回归（AppRpc 流 / DOM / PTY）。

#### S0 — 安全默认 + 外部内容信任边界（已完成 ✅）

- 默认 sandbox 改为 `workspace`；`full` 才关闭。effective mode 由 session override → policy chain → workspace 解析，并真正传入 `ToolExecutionCoordinator`（此前只装饰 receipt，未到 executor）。
- 新增 `TrustBoundarySection` 系统提示 + `<untrusted-tool-output>` fencing；web/http/browser/MCP/ai_cli 等外部输出在进入模型 transcript 前统一包裹，闭合标签会转义。
- 证据：agent 1054、agent-tools 582、agent-cli 133、agent-ui security 9；source-size OK；`bb6312a85` 已提交，gate 复验后推送。

#### S1 — `execute_code` 隔离（已完成 ✅）

- `AgentToolContext` / `ToolRegistry.invoke` 增加可选 `sandboxMode`，由 runtime effective mode 注入；`ExecuteCodeTool` 透传到 adapter。
- `LocalCodeExecutionAdapter` 新增 `sandboxMode` / `sandboxApplied`：
  - `off` 保留现有 worker 兼容路径；
  - `workspace` / `network-block` 的 JS/TS 改为临时脚本 + Node 子进程，经 `bwrap`/`sandbox-exec` 包装；Node 22+ 额外 `--permission --allow-fs-read/write=<workspace>` 禁止 child_process/worker 与 workspace 外 fs；
  - Python/Bash 命令同样经统一 wrapper；
  - 环境变量统一走 `buildSandboxEnv`，默认屏蔽常见 API key/token/secret；无沙箱时返回 `sandboxApplied=false` 并在 stderr 说明。
- 修复共享探测：`probeSandboxExecTool` 由 `sh -lc` 改为 `sh -c`（登录 shell 的坏 profile 曾让 bwrap 探测稳定失败）；bwrap 先挂 `--tmpfs /tmp` 再绑 workspace，避免 `/tmp` 下的 workspace 被 tmpfs 遮盖。
- 证据：agent 1054、agent-tools 586；新增 `code-execution-sandbox.spec.ts`（越界写拒绝、正常执行、secret 屏蔽、mode 透传）；`source-size` OK。

#### S2 — Hook 类型扩展 + hook trust（进行中）

- ✅ `type: 'http'`：POST/GET、headers、timeout/abort、失败不抛穿 turn；输出进入 hook transcript。
- ✅ `requireTrust`：未显式 `trusted: true` 的 command/http hook 在 `requireTrust` 模式下被过滤。
- ✅ `beforeTool` function hook 可返回 `{ action: 'deny' }`，工具被跳过并留下可诊断的工具错误结果；`input` 重写保持。
- ✅ `hooks.trusted.json`：按 stage + hook 定义（去掉 `trusted` 字段）计算 sha256；manifest 存在时自动 `requireTrust`，编辑 hooks.json 即失效；CLI `tsdi-agent hooks trust [--root]` 生成 manifest。
- ✅ `mcp`/`prompt`/`subagent` 类型：通过 `AgentHookTransportExecutor` 端口由宿主注入执行器（保持核心 browser-safe），结果支持 `action: deny` 与 transcript 输出；内置 MCP/模型/子代理执行器由后续宿主集成接入。
- 验收：五类 hook 边界测试；未 trust 被拒绝且提示可操作；hook 超时/取消不阻断 turn。

#### S3 — 沙箱升级审批（已完成 ✅）

- 识别 `EROFS`/`EACCES`/`bwrap`/sandbox/proxy 拒绝；coordinator 在失败后请求一次性 approval（force），批准后仅本次调用以 `sandboxMode: 'off'` 重试一次。
- 审批走现有 `ApprovalManager`（TUI/web/gateway 共用事件、i18n 与 audit）；拒绝时保留原始可操作错误，turn 继续。
- 证据：新增 `sandbox-escalation.spec.ts`（拒绝识别、force approval、拒绝/非沙箱失败不弹）；agent 1061 passing。

#### S4 — OTEL + 轨迹级 Eval（部分完成）

- ✅ `EvalRun.metrics`：user/assistant messages、turns、toolCalls、toolFailures、duration、prompt/completion/total tokens；从持久 transcript 收集，失败不影响任务。
- ✅ `compareEvalMetrics(baseline, current, thresholds)`：工具失败率、耗时、token 回归阈值与可诊断原因。
- ✅ `AgentTelemetry` 抽象 + `NoopAgentTelemetry`；tool 执行 span（name/tool/sessionId、ok/error/cached）经 DI 注入，OTEL 宿主可替换实现。
- ✅ `OpenTelemetryAgentTelemetry` 桥接宿主 tracer（无 `@opentelemetry/api` 硬依赖），映射 attributes/status/error/end。
- ✅ `agent.turn` span：sessionId/profile 属性、ok/error 状态（runtime 注入 telemetry）。
- ✅ CLI `tsdi-agent eval compare <baseline> <current>`：读取 metrics/report，按工具失败率、耗时、token 阈值回归并以退出码 1 失败。
- ✅ `model.complete` span（model 属性、ok/error）；非流式主路径。
- ✅ `agent.compaction` span（level/strategy、ok）；压缩历史写入时发出。
- ✅ `model.stream` span（model 属性、ok/error，finally 语义）。
- ✅ `tsdi-agent eval run --task <id> --issue <text> [--verify <cmd>] [--json]`：调用 EvalRunner 执行并持久化报告。
- 待办：无（S4b 完成）。
- 验收：fake tracer 断言层级/属性；无 OTEL 零行为变化；suite 可对比且回归失败可诊断。

#### S5 — 命名子代理（已完成 ✅）

- `SpawnAgentInput` / `NestedAgentRunRequest` / `BackgroundTaskRunRequest` 增加 `archetype`、`skills`、`permissions`（allow/deny）；schema 与 sync/background/parallel 全透传。
- `LightweightAgentRunner`：子会话 `setSessionArchetype`；按 id 从 `LocalSkillRegistry` 预载完整 skill prompt 并 `SkillSessionStore.activate`；permissions 合并进 `AgentTurnAgentConfig.permissions`。
- 内置 `explore`/`plan`/`review` 继续由 archetype 提供只读/工具门禁。
- 证据：新增 spawn 透传回归；agent-tools 587 passing；`source-size` OK。

#### S6 — ACP Server（部分完成）

- ✅ 协议核心 `AcpServer`：newline-delimited JSON-RPC；`initialize` / `session/new` / `session/prompt` / `session/cancel` / `session/load` / `session/update`；未知方法返回 -32000；transport 与 runtime 解耦。
- ✅ `tsdi-agent acp [--root] [--workspace] [--session]` stdio 适配；进程保持到 stdin 关闭。
- ✅ `session/set_mode` / `session/set_model` 映射到 session archetype / model profile。
- ✅ 客户端请求：`session/request_permission`、`fs/read_text_file`、`fs/write_text_file`（JSON-RPC 双向请求/响应、超时）。
- ✅ terminal 方法：`terminal/create`、`terminal/output`、`terminal/wait_for_exit`、`terminal/kill`、`terminal/release`。
- ✅ `AcpApprovalManager`：运行时审批映射到 `session/request_permission`（allow/reject），`tsdi-agent acp` 注入该 manager。
- 待办：fs/terminal 工具路径改走 ACP client 请求、Zed 兼容回归。
- 验收：fake transport 完整会话；Zed 兼容握手；与 TUI/gateway 共用 runtime 与审批事件。

#### S6f2 — fs/terminal ACP IO 端口（进行中）

- ✅ `AgentIoPort` + `AGENT_IO_PORT` token + `LocalAgentIoPort`；`TerminalTool` 通过端口执行命令。
- ✅ `AcpAgentIoPort`：create → wait → output → release，Abort 时 kill；`tsdi-agent acp` 注入并在 server 就绪后 attach；无客户端回退本地 shell。
- ✅ `read_file` 通过 `AgentIoPort.readTextFile` 走 ACP `fs/read_text_file`（本地仍用流式读取）。
- ✅ `write_file` 通过 `AgentIoPort.writeTextFile` 走 ACP `fs/write_text_file`（本地行为不变）。
- ✅ Zed 风格 initialize/new/prompt/update/cancel 回归；真实 Zed/PTY 复验仍待外部编辑器环境。

#### S7 — 会话级 `/worktree`（部分完成）

- ✅ `WorktreeManager`：在 `<workspace>/.tsdi-worktrees` 下创建 managed branch/worktree、porcelain 列表、force remove；真实 git 往返回归。
- ✅ CLI `tsdi-agent worktree create|list|remove`（`--workspace`、`--force`）。
- ✅ `AgentRuntime.setSessionWorkspace`：切换 session 的 workspace（worktree 隔离前置能力）。
- ✅ CLI `worktree merge <name>` + `WorktreeManager.merge`（--no-ff）。
- ✅ TUI `/worktree [create] <name> | list | merge <name> | remove <name> [--force]`：host port 调 WorktreeManager，create 后 `setSessionWorkspace` 并更新 state.workspace；冲突/失败保留 worktree 并提示。
- 待办：keep/remove 交互收尾、merge 冲突的专门恢复流程。

#### S8 — 架构拆分与启动/测试性能（进行中）

- ✅ 抽出 `harness/tool-receipt.ts`、`harness/turn-metrics.ts`、`runtime/recovery-requests.ts`、`runtime/approval-resolution.ts`；`AppRpcServer` 的 session mode 校验与 session export 序列化抽到 `app-rpc/session-mode.ts` / `session-export.ts`；`DefaultAgentRuntime` 约 3442 行，`AppRpcServer` 继续抽出 input-history 与 request helpers，降至约 3461 行。

- 按 turn-loop / model-request / tool-orchestration / verification / compaction / hooks 拆 `DefaultAgentRuntime`；按路由拆 `AppRpcServer`；同提交下调 baseline。
- 工具/技能/MCP 懒加载；TUI 首屏目标 < 2s；agent-ui 测试分片，目标 < 8min。

### D 系列 — agent-ui 对话框系统化 + 路由（待实施，先方案）

> 对照 opencode `DialogProvider/DialogSelect` 栈、Claude Code 统一选择器 shell、Codex ratatui popup：当前 console 命令对话框的问题不是单个组件，而是入口、状态、键盘、尺寸、关闭、样式各自为政。目标是用一套 Dialog Stack + Route Registry 收口。

#### 进度（2026-11）

- ✅ Web dialog region 改为 composer 上方浮层（去掉全屏 scrim/居中 modal）；footer 高度实测写入 `--agent-web-footer-height`。
- ✅ `DomOverlayAnchors` 下沉到 `components/html`，agent-ui 只提供选择器/变量名。
- ✅ 修复 dialog host 包装导致 `margin:auto` 失效的问题：text-overlay/select 卡片重新水平居中。
- ✅ 命令对话框互斥：打开 select/text/tools/sessions/approvals/jobs/tasks/toolRuns/review/outputs 会关闭其他 transient 面板。
- ✅ `/outputs`、which-key、health 改为 composer 上方浮层（不再渲染到输入区下方）。
- ✅ `/permissions` 能力报告使用专属 `Permissions` 对话框；`/help` 详情 Esc/✕ 返回分组。
- ✅ D4 选择对话框 type-to-filter：`/model`、`/theme`、`/provider`、`/settings`、`/tools`、`/mcp`、`/skills`、`/plugins`、`/apps`、`/ssh`、`/help` 分组支持键入过滤；标题显示 `· <filter>`，Backspace 逐字删除，过滤为空时数字仍为序号选择，`/` 与 `@` suggestion 菜单不受影响；零匹配时 Enter 不关闭对话框。TUI 走共享 focus layer，Web 把 textarea 按键接到同一层。
- ✅ R1 交互式路由：`/dialog` 无参数时以选择对话框打开路由目录（可按 id/标题/路径键入过滤，Enter 直接执行对应命令）；`/help dialogs` 仍为只读文本目录。
- ✅ R1 可发现性：`/help` 分组菜单新增 `Dialogs` 行（显示 route 数量）打开路由目录；Esc/✕ 返回分组列表（修复 Web 端 Esc 直接全部关闭）。
- ✅ D2 问答优先：pending question 到达时取消已打开的选择/文本对话框（select promise 以 undefined 结束），让问题独占键盘与自定义答案输入。
- ✅ D4 过滤不抖动：选择卡片宽度按未过滤的标题/选项计算（`select-list` 的 `widthTitle`/`widthOptions`），键入过滤时卡片不缩放、不重新居中。
- ✅ Web 初始焦点：细指针设备挂载后聚焦 composer（`?dialog=` 深链可直接键入过滤，无需先点击）；粗指针/触屏不聚焦，避免弹出软键盘。
- ✅ D4 palette Esc：命令面板按 Esc 一次关闭（其 parent 链是查询历史而非嵌套对话框，之前需要逐字符回退）。
- ✅ R1 路由表：`id/path/group/title/command/aliases` + `/dialog [id|path|group|alias|prefix]`、`/help dialogs` 目录、Web `?dialog=` 深链（按 route 命令派发，不写入 `/dialog` 包装行）。
- 待办：按 D1–D6/R 继续（Dialog Stack 收口 approval/question、route kind/priority/size/load 元数据、键盘/尺寸统一、逻辑懒加载、palette 分组）。

#### D1 — 对话框审计矩阵

- 逐项记录 `/help`、`/sessions`、`/model`、`/provider`、`/settings`、`/theme`、`/tools`、`/approvals`、`/outputs`、`/mcp`、`/skills`、`/plugins`、`/apps`、`/ssh`、`/worktree`、`/` 菜单、@mention、pending question。
- 字段：入口、当前 shell、标题、✕、Esc、搜索、分页、resize、TUI/Web 差异、失败点。
- 产出 `docs/dialog-matrix.md`；不改行为。

#### D2 — Dialog Stack

- 新增 `AgentConsoleDialogStack`：`open/close/closeTop/replace`、`priority`、`modal`、`owner`、`onClose`。
- 迁移 `selectMenu` / `textOverlay` / `pendingQuestion` / `pendingApprovals` / `commandOutputs`；Esc 只关闭栈顶，审批/问答优先。
- 禁止新增独立浮层布尔 flag；所有命令经 stack 打开。

#### D3 — 统一 Dialog Shell

- 抽出 `AgentConsoleDialogFrame`，`DialogComponent`、`SelectComponent`、text overlay、approval/question 共用 title/✕/body/footer/hint。
- 统一宽度策略（`fit` / `fill`）、最大高度、滚动窗口、`1-12/N` 位置提示、CJK 宽度。
- 统一关闭语义：✕ = Esc = `closeTop()`。

#### D4 — 布局与键盘

- `AgentConsoleDialogLayout`：TUI 与 Web 都锚定 composer 上方；TUI 底边对齐输入区、超高向上增长；Web 绝对定位到输入区上方，不居中。
- `AgentConsoleDialogKeyRouter`：↑↓、PgUp/PgDn、Home/End、Enter、Tab、数字、字符搜索；浏览器保持 textarea 焦点。
- resize 重算高度/窗口；不占 footer、不压缩 transcript。

#### D5 — 共享 skin

- 统一 TUI `console.scss` 与 Web `console.css` 的 dialog/select/option/hint/close 变量与语义类。
- 清理 `web/index.html` 等 inline 覆盖；hover/focus/✕ 红色行为与 tab-bar 对齐。

#### D6 — 命令迁移

- 按组迁移：导航（sessions/help/projects/threads）→ 模型（model/provider/thinking/settings）→ 工具/审批（tools/approvals/outputs/mcp）→ 扩展（skills/plugins/apps/ssh/worktree）→ 输入（`/`、@mention、history）。
- 每组独立提交 + TUI PTY / Chrome 回归。

#### R 系列 — Dialog Route Registry（与 D 系列配套）

- `AgentConsoleDialogRoute`：`id`、`path`（如 `/model`）、`group`（navigation/model/tools/session/extensions/settings）、`kind`（dialog/panel/confirm）、`priority`、`modal`、`size`、`hidden`、`disabledReason`、`load()`。
- `AGENT_CONSOLE_DIALOG_ROUTES` 作为**唯一清单**：命令定义只引用 `dialog: '<routeId>'`，不再重复描述标题/分组/加载逻辑。
- 路由职责：分类（`/help` 分组、palette 分组）、打开（`router.open(id, args)` 入栈）、懒加载（`load()` 缓存 + 预加载）、失败回退（统一错误 dialog + retry）。
- 懒加载策略：
  - Web 当前是单文件 IIFE bundle；真实按需加载需 `build-web.ts` 改 `format: 'esm'` + `splitting: true`，输出 `web/dist/chunks/*`，PWA 预缓存 shell、chunk 走 network-first。
  - 若必须保留单文件分发，则先用“逻辑懒加载”（defer 初始化/注册），但不得宣称网络按需。
  - TUI 用 `import()` 缓存模块；hover/选中 palette 项时预加载。
- 深链：Web `?dialog=model`、TUI `/dialog model`（内部路由），与命令共享同一 route id。**（已实现：Web 在 mount 时按 route 派发命令，未知 route 走 toast；TUI `/dialog` 经命令分发器执行。`?dialog=` 只接受 id/path/alias/唯一前缀。）**
- 验收：route 清单完整性；lazy load 只执行一次；chunk 失败可重试；`/help` 分组由 route 生成；TUI/Web 一致；真实 PTY + Chrome。

### 遗留观察（收尾时必须确认）

- 视窗模式 layout 持久化与 alternate-screen 退出语义需持续由真实 PTY 覆盖（归入 U5）；`/close` 退出后命令窗口提示与历史保留需一并复验。
- 早前 OpenTUI 焦点迁移轮次中「Esc 取消修复后的真实 PTY 复测」未完成，需在 U1/U5 批次内补跑。
- renderer region 局部失效（脏子树）未在真实 TUI 复测；U2 已新增 surface 级 resize/region 反馈（`outputResizeRemeasuresViewport` 回归无整屏重绘回退），真实 PTY 复测仍待补跑。
- 运行时自撰的用户可见失败收尾文案（`resolveAssistantResponseText` 的空响应/工具失败指引）仍为英文，其本地化并入 U4 统一 i18n（运行时不知道 locale，需由 UI 文案层承担）。
- ModelCatalog 远程发现尚未接入 `/model` 展示（`/doctor --check-models` 已做校验）；归入后续批次。
