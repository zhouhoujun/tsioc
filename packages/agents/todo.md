# Agents 当前规则、功能与未完成计划

> 本文只保留当前有效规则、已具备功能点和未完成计划。历史实施日志、提交号、阶段测试数字和已关闭批次不再保留。

## 一、必须遵守的规则

> 全部规则已同步至根 `AGENTS.md`，以其为唯一权威来源，本文件不再重复维护（避免两处漂移）。
>
> 索引：1 响应式与渲染；2 跨平台边界（含 console/web-console 适配入口、品牌/配色约束）；3 响应式代理机制；4 代码体量与单一职责（ratchet）；5 会话主线与时间线；6 输入、历史与候选；7 Workspace、Project 与跨会话协同；8 数据库与数据安全；9 配置、路由与本地化；以及「测试方式 / 完成标准」。

## 二、当前已具备的功能点

### 会话与项目

- fresh chat 与显式 `--session` 恢复分离。
- session 持久化、搜索、列表、fork、delete、export、section、snapshot、share。
- workspace/project/thread 投影、项目与线程列表、session 导航与筛选。
- delegation、background task、goal、plan、review、verification、retry 和 rollback。
- project memory、session summary、compaction、diagnostics、audit 与 timeline history。

### Agent 与工具

- 多 provider/model/profile、复杂度路由、模型切换与持久设置。
- filesystem、shell、git、search、MCP、background、todo/plan 等工具。
- tool approval、question、policy、sandbox、trusted workspace 与敏感信息脱敏。
- command exchange、command output history、失败重试、取消和恢复。
- attachments、图片、文件变更、diff/review inspector 与媒体等价文本。

### Console UI

- browser ConsoleRenderer 与 CLI TuiRenderer 共用 presenter、renderer 和交互状态。
- user/final、thought、tool、command、event、question、approval、plan、file、attachment、diagnostic 语义路由。
- turn/step/event 三层时间线、稳定 tool lifecycle、总耗时、折叠摘要和 detail inspector。
- Markdown、CJK 宽度、80/100/120 列布局、主题、ARIA、键盘与鼠标交互。
- multiline draft、stash、external editor、Vim、keymap、suggestions、workspace mentions 和 slash palette。
- Ctrl+C/Esc 中断、Working elapsed、queued/steer prompt、pending question 和 approval focus lifecycle。
- approval 到达自动聚焦面板（让位更高优先级层），展示 `Allow <tool>?` + 命令预览 + 原因/到期与固定操作键；pending question 支持自定义答案与队列计数。
- 长回复 native scrollback 安全窗口。
- 状态栏 token 计量随流式 chunk 实时推进：仅 final done 携带真实 usage 时按 CJK 感知分词累计 completion 预估，真实 chunk usage 优先生效、以 estimated 标记且不写入最终审计记录。
- 事件总耗时优先展示后端 `durationMs`，缺失时按保留的开始时间推导 `durationMs = now - startedAt`，终态替换 running 行不回退且重复终态保持首次推导值。

### 宿主与门禁

- agent-cli、gateway、desktop、VS Code、SSH、channels 和 Web bundle。
- DOM/TUI 共享场景 gate、宽度矩阵、metrics baseline regression 和真实 PTY acceptance。
- PTY 覆盖长回复、keymap、plan、command outputs、slash command、Working、双取消键和主题宽度矩阵。

## 三、未完成计划

> 来源：真实 CLI 会话（`npm run chat -- --workspace /home/zhouyou/workspace/sleep-mlt`）暴露的差距，对照 codex/opencode 的信息架构与恢复语义。批次可独立验收；每批次必须补真实边界回归（AppRpc 流 / PTY）后才能关闭。历史批次见文末 v 系列。
>
> **状态（2026-09-23）**：P1–P6 已全部落地并合入统一门禁；P7（`AgentConsoleComponent` 持续拆解）进行中，见下。

### P7 — AgentConsoleComponent 持续拆解（进行中）

> 依据根 `AGENTS.md` 第 4 条 ratchet 与单一职责规则，按约定顺序 P4→P3→P2→P1 将组合根拆到 `< 1500` 行。

- **当前进度**：baseline `6403 → 5615`，`AgentConsoleComponent.ts` `6402 → 5614` 行。
- **已抽出模块**：`AgentConsolePreferenceCommands`（`/hooks` `/memories` `/personality` `/debug-config`）、`AgentConsolePolicyCommands`（`/delegation` `/permissions` `/goal`）、`AgentConsoleExtensionCommands`（`/skills` `/plugins` `/apps`）、`AgentConsoleStashCommands`（`/stash`）、`AgentConsoleGitSnapshotCommands`（`/git-snapshots` list/diff/revert）、`AgentConsoleShellCommands`（`!!` 多行草稿 / `!cmd`）、`AgentConsolePromptMentions`（`enrichPromptWithMentions`）、`AgentConsoleApprovalCommands`（approval inspector 循环）、`AgentConsoleKeymapCommands`（`runKeymapCommand` + `resolveKeymapContext`）、`AgentConsoleToolsView`（`refreshTools`）；`refreshProjectContext` 归入 `AgentConsoleProjectProjection`；settings 面板（`/settings`、General、Language、Providers）归入 `AgentConsoleSettingsCommands`。新增 `test/vm-shell-commands.spec.ts`（3 用例）。
- **不可抽取项（时序约束，务必保留在组件内）**：`refreshSessions`。抽取它会使 `vm-panels.spec.ts` 的 `terminal input submits combined text and return chunks` 稳定失败——该用例经 `void this.submit()` 触发 `/sessions`，依赖命令派发的同步时序；后续任何命令抽取都必须回归该用例。
- **下一步（待办）**：
  1. 中耦合批次：`mergeTodoPlanForSessions`、`openHarnessTree/List`、`openDelegationTree`、`runBackgroundTasksCommand`。
  2. 大块核心（需先切分状态对象或引入子控制器）：`buildCommandContext`、`submit`、`handleBrowserGlobalKeyInput`、`executeGlobalKeyAction`、`handleTerminalInput`、`consumeStreamEventChunk`/`consumeStreamChunk`/`runTurnStream`。
  3. 每批次收尾流程（缺一不可）：`tsc --noEmit -p packages/agents/agent-ui/tsconfig.json` → 定向 spec → agent-ui 全量（当前 `1404 passing`）→ 在同一提交内下调 `scripts/source-size-baseline.json` 中 `AgentConsoleComponent.ts` → `git diff --check` → 提交。
  4. 目标：`AgentConsoleComponent.ts < 1500` 行。

### P1 — 模型配置自愈与路由健壮性（P1.1 / P1.2 / P1.3 ✅ v68+v70+v73）

- ✅ **P1.1 配置自愈**：`settings.json` 读入已能识别 `cancel`/`q` 占位 sentinel 并丢弃无效 profile；补齐**写回净化**（启动与 `/model` 保存时清理 sentinel 与嵌套重复 `profiles`/`complexityRouting`）并在 `/doctor` 可见报告，禁止无效 sentinel 再次持久化。
- ✅ **P1.2 路由不中断**：`RoutedModelAdapter` 遇到未知/无效 `complexityRouting`/`defaultProfile`/route profile 时回退顶层并记录 `getWarnings()` 诊断，而不是抛错终止 turn（显式 `--profile` 仍按原契约抛错）。
- ✅ **P1.3 空/中断响应健壮性**：有界重试（2 次）+ 递增退避（150ms×N）；工具错误可恢复轮；收尾文案区分 provider 空回包与工具失败并给动作指引。
- **验收**：含 `"cancel"`/嵌套 profile 的 settings 在启动、`/model`、`/doctor` 均不崩且输出净化配置；坏 profile 路由时 turn 继续并给诊断；新增 config sanitize + routing fallback 回归。

### P2 — Workspace 路径与工具失败可操作化（P2.1 / P2.2 / P2.3 ✅ v68+v69+v73）

- ✅ **P2.1 路径错误可操作**：`resolveWorkspacePath`/`assertWorkspacePattern` 失败信息附上允许的 workspace root 与相对路径示例，并明确禁止绝对路径与 `..`。
- ✅ **P2.2 工作区上下文注入**：`buildModelRequest` 注入 `Workspace root: <dir>` 系统消息，要求只用工作区相对路径、禁止绝对路径与 `..` 逃逸。
- ✅ **P2.3 失败行可操作**：选中失败/阻塞事件行按 `r` 就地重试上一轮用户请求（`retryFailedEventAction`，未运行 turn 时生效）。
- **验收**：模型使用越界/绝对路径时 turn 不终止、错误可读、可纠错继续；PTY 覆盖 bad-path → recover。

### P3 — 本地化与文案一致性（P3.1 / P3.2 / P3.3 ✅ v68+v71+v73）

- ✅ **P3.1 plan 头部/结尾本地化**：plan 头部（`计划 X/Y ▓ · 进行中 N · 阻塞 · 失败`）、tasks/plan 面板摘要、Working 当前步骤、`planCompleted` 结尾均走 `AgentConsoleTimelineLabels`，补齐 zh/EN 键。
- ✅ **P3.2 事件/工具/状态句子统一 i18n**：事件句子与状态词走 labels/translator；cancel/queue/busy 与常用命令提示（queue/stash/personality/yolo/mcp）走 `agent.notice.*`（zh/EN）。
- ✅ **P3.3 工具结果摘要精简**：工具批行 >3 折叠为 `· +N more`；`N match(es)` 复数修正；显示名映射补齐 `stat/watch_files/move_file/copy_file/delete_file/web_search/web_extract/weather/location/terminal/background_task/schedule`。
- **验收**：zh-CN 下时间线/计划/状态无英文残留；新增文案快照测试。

### P4 — 时间线与计划一致性（P4.1 复核关闭；P4.2 / P4.3 ✅ v70+v73）

- **P4.1 plan 投影一致性（复核）**：复查 `plan 1/4` 与 `7 items` 属刷新相位差（`refreshTodoPlan` 异步收敛），未发现稳定复现的计数错配，暂关闭并保留观察。
- ✅ **P4.2 工具批行分组**：一步超过 3 个工具调用折叠为 `· +N more`；running→completed 由既有稳定 key 原地归并。
- ✅ **P4.3 行距与空白统一**：真实 dump 验证 renderer 输出无多余空行（markdown compaction 与行 trim 已生效），无需改动。
- **验收**：真实会话工具行按稳定 key 归并、无重复、无多余空行；新增 timeline 归并回归。

### P5 — 工具/Provider 可用性（P5.1 / P5.2 ✅ v69+v73）

- ✅ **P5.1 `web_search` 未配置 adapter**：工具失败时 UI 显示「未配置联网搜索适配器」可操作提示，替代泛化的 `failed`。
- ✅ **P5.2 工具标签/摘要映射补全**：补齐 `stat/watch_files/move_file/copy_file/delete_file/web_search/web_extract/weather/location/terminal/background_task/schedule` 的 zh/EN 显示名与参数摘要（`Read file: <path>` 形式）。
- **验收**：未配置能力有明确可操作提示；新工具不出现原始工具名列表。

### P6 — 门禁补强（✅ v73）

- ✅ **P6.1**：v68–v73 的 settings 净化、routing fallback、`doctor --check-models`、工具批行折叠、失败行重试、缺失 adapter 提示、plan 本地化、in-process RPC `toolCalls` 透传均已有回归用例并纳入各包 `unit.ts`（统一 gate 自动覆盖）；新增 `agent-gateway/test/app-server-bridge.spec.ts`。
- **验收**：门禁全阶段通过且生产库不变。

## v62 — 会话时间线动态状态与用量收尾 ✅

- **共享生命周期时钟**：在 components core 定义抽象动画时钟，由 components/html 使用共享 `requestAnimationFrame`、components/console 使用首订阅启动/末订阅停止的共享 interval 分别实现；animated-text、animation 与 elapsed-time 指令统一订阅并在销毁时清理，agent-ui 不持有平台 timer。
- **Working 恢复**：恢复 Working 动画和实时 elapsed 展示；真实 DOM/TUI 时钟会在没有其他业务数据变化时持续推进，隐藏面板停止订阅。
- **时间线耗时**：事件优先展示后端 `durationMs`/`elapsedMs` 或起止时间计算的真实耗时；时间线最终回复按相邻用户请求与回复时间派生耗时，普通消息模式继续保持原时间戳契约。
- **流式光标**：`▍` 只属于正在流式输出的 assistant，用户输入框和时间线用户消息即使携带 streaming 上下文也不再出现竖向黑块。
- **Token 实时归并**：状态栏会在 stream、tool、turn 等任意事件携带 usage 时立即更新；兼容顶层及 metadata/message/response 嵌套 usage，部分字段不会清零已知值，无 usage 的完成事件和增量 timeline 投影不会覆盖已收到的统计。
- **功能保护规则**：根规则明确禁止以优化、重构或架构整改为由删除、关闭或降级已有功能；架构冲突必须先保留功能并询问取舍。
- **回归验证**：components 137、components/html 118、components/console 78、agent-ui 1367、agent-tools 478、agent-ssh 8 passing；agent-ui tsc 通过。最终统一门禁的 25 个代码/构建/DOM/TUI/真实 PTY/diff 阶段全部通过；生产库完整性检查在前一轮通过，最终复跑期间真实库被外部进程修改，测试未触碰或回滚用户数据。

## v53 — Workspace 输入历史、Project 协同与数据库安全 ✅

- **历史边界**：输入历史按规范化 workspace 跨 session 聚合，不依赖 project/thread；state、本地 memory 与 AppRpc 存取两端统一排除空输入和 slash 命令，按最近使用顺序去重并限制 200 条，`↑/↓` 可恢复原草稿。
- **失败诊断**：历史加载、恢复和保存失败不再空 catch；错误进入 `lastError`，同时不阻断 TUI 启动和会话操作。
- **Project 持久化**：无显式 project 时继续由规范化 workspace 产生稳定 project key；显式 project/thread/role、fork 与 delegation 关系由 session store 持久化，project 分组不参与历史筛选。
- **路径口径**：`--root` 保留用于 agent 配置；生产数据库固定为 HOME 下 `~/.tsdi-agent/agent.db`。测试和真实 PTY 验收必须覆盖临时 HOME，不得继承用户 HOME。
- **数据审计**：只读确认原库有 3 个 session、4 条 message、2 条 memory；三个 session 的 workspace 均为 `/home/zhouyou/workspace/sleep-mlt`，显式 project/thread/role 为空。未发现 `.bak`、WAL、旧库或其他可恢复来源，现有文件无法证明更早数据的删除时间或执行主体。
- **门禁污染修复**：收尾时发现 PTY acceptance 继承用户 HOME，并写入测试 session `chat5de7367c7ad3676cb2c5e4b4b40ce272`。验收现为每次运行创建并清理独立临时 HOME；修复后真实 PTY 再跑通过，生产库 SHA-256 在该次门禁前后稳定为 `7209a8b6d407608010e2d66bbcbf9d83e411743916093b012112527001166fde`。既有测试记录未自动删除，避免对用户库执行破坏性操作。
- **最终验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` 24 passed / 0 skipped；修复隔离后定向 PTY + diff-check 2 passed / 0 skipped。覆盖 agents 10 包、framework 三包、4 项 tsc、Web production build、DOM/TUI、metrics regression、真实 PTY 和 `git diff --check`。

## v54 — 默认流式布局与全门禁数据隔离 ✅

- **Logo 固定**：brand 从 transcript 内容改为独立 header，messages 成为明确的 transcript 起点；默认流式内容增长只裁剪消息窗口，不再把 logo 顶出视口。Web 端 brand 同步采用 sticky header，browser 与 TUI 保持同一布局语义。
- **输入框右边缘**：Web textarea 使用 `border-box`、`max-width: 100%` 和无阴影原生外观，消除 `width: 100%` 叠加 padding/border 导致的右侧溢出竖线。
- **门禁隔离**：统一 agents gate 在专属临时 HOME 中运行所有包测试、构建、DOM/TUI 与 PTY；结束时新增 `production-db-integrity` 阶段，对真实 HOME 数据库执行前后 SHA-256 不变量检查。HOME 相关测试不再硬编码具体用户名。
- **最终验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` 25 passed / 0 skipped，覆盖原 24 项完整门禁及生产数据库完整性检查。

## v55 — 收尾复核 ✅

- **全量验证**：在允许本地 socket、子进程和真实终端的环境中重新执行 `RUN_PTY=1 bash scripts/agents-gate.sh`，25 passed / 0 skipped / 25 total。
- **覆盖范围**：agents 各包、framework 三包、4 项 tsc、Web production build、DOM/TUI、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查全部通过。
- **当前状态**：无开放实施批次；本轮未发现需要追加修复的代码问题。

## v56 — 动画响应式契约纠偏 ✅

- **移除主动刷新**：删除 `AnimatedTextLifecycleService` 的共享 `setInterval` 及 animated-text、animation-frame、elapsed-time 的 tick 订阅链；公开服务类型保留为空兼容壳，避免破坏 consumer 导入。
- **时间派生**：字符扫光、帧动画和 Working elapsed 均在真实数据驱动的绑定渲染中由 `Date.now()` 派生，不为动画额外触发 DOM/TUI 重绘。
- **跨平台落点**：实现位于 `@tsdi/components` 通用指令与 agent-ui 共享 Working 面板；CLI 不再 bootstrap 动画 ticker，browser 与 TUI 使用同一逻辑。
- **验收契约**：真实 PTY 改为验证无数据变化时 Working 不自刷新，同时保留 Ctrl+C/Esc 双取消；宽度检查忽略 PTY 分块末尾不完整且不可见的 ANSI CSI 前缀。
- **验证**：components 137 passing；console renderer 定向 75 passing；完整门禁阶段除旧 PTY ticker 断言外 24/25 通过，更新验收后定向 PTY + diff-check + production-db-integrity 3/3 通过。

## v57 — 跨平台边界复核与全量收尾 ✅

- **边界清理**：`agents-doc` 的 UTF-8 字节截断改用标准 `TextEncoder`/`TextDecoder`，移除 `buffer` 直接导入；verify command 输出回调改用最小结构类型，不再直接引用全局 `Buffer` 类型。
- **契约复核**：确认现存 timer 均用于请求超时、远端重连、终端 escape/attach/reclaim 或异步事件调度，不承担组件主动刷新；未发现恢复订阅通知或布局脏节点缓存的回归。
- **最终验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` 25 passed / 0 skipped / 25 total，覆盖 agents 10 包、framework 三包、4 项 tsc、Web production build、DOM/TUI、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查。
- **当前状态**：无开放实施批次。

## v58 — 架构约束自动化门禁 ✅

- **跨平台导入门禁**：新增源码契约测试，持续禁止 `agent-ui/src` 直接导入 `@tsdi/components/console`、`node:` 或 Node 内置模块，确保 console 能力继续经 `@tsdi/agent-ui/console` 与宿主适配层提供。
- **响应式门禁**：自动扫描 components、components/console 与 agent-ui 共享源码，禁止重新引入 `setInterval` 驱动界面刷新；同时锁定 `AgentConsoleSessionState` 不得恢复 `subscribe`、`listeners`、`notify` 或 `batch` 手工通知 API。
- **验证**：agent-ui 1362 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 25 passed / 0 skipped / 25 total，生产数据库保持不变。
- **当前状态**：无开放实施批次。

## v59 — Console 事件机制跨平台化 ✅

- **移除 Node 依赖**：`ConsoleNode` 不再导入 Node `events.EventEmitter`，改用同步、轻量的跨平台监听表，保留多监听器、单个/整类移除和命中返回语义。
- **实现解耦**：TUI 点击目标探测改用 `hasEventListener` 公共能力，不再读取节点内部事件实现；新增监听器移除与分发语义回归测试。
- **边界门禁**：架构契约测试扩展到 `components/console/src`，持续禁止直接导入 Node 内置模块。
- **验证**：components/console 77 passing；agent-ui tsc 通过；`RUN_PTY=1 bash scripts/agents-gate.sh` 25 passed / 0 skipped / 25 total，生产数据库保持不变。
- **当前状态**：无开放实施批次。

## v60 — Console 模板解析去 Node 化 ✅

- **移除运行时 JSDOM**：`ConsoleTemplateParser` 改用包内既有 `fast-xml-parser` 依赖直接生成 `ConsoleNode`，不再通过 CommonJS `require('jsdom')` 创建文档。
- **HTML 兼容**：解析保留节点顺序、属性、文本、注释与实体；对 HTML void 元素使用引号感知的单遍规范化，兼容显式闭合标签及属性值中的 `>`，避免正则误切标签。
- **边界门禁**：`components/console/src` 除禁止 Node 内置模块导入外，进一步禁止任何 `require()`，确保 browser 与 TUI 共享无 Node loader 的模板路径。
- **验证**：components/console 77 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 25 passed / 0 skipped / 25 total，Web build、DOM/TUI、真实 PTY 与生产数据库完整性检查均通过。
- **当前状态**：无开放实施批次。

## v61 — Components 与 Agent UI 平台分层固化 ✅

- **依赖方向**：明确 components core → components/common → components/html 或 components/console；html 与 console 并列且禁止互相引用，common 不得反向依赖 renderer。
- **宿主适配**：`agent-ui/src` 保持平台无关；`agent-ui/console` 仅连接 TUI renderer，`agent-ui/web-console` 仅连接 HTML renderer，两个适配层禁止交叉引用。console 输入 chunk 同步收敛为跨平台 `Uint8Array | string`。
- **类型化环境端口**：console 的 `env/stdin/stdout` 统一经类型化 `globalThis` 宿主守卫访问，移除 `globalThis as any`，输出端口显式声明 TTY、尺寸、写入和 resize 能力。
- **规则与门禁**：根 `AGENTS.md` 和本文件写入完整分层规则；架构测试覆盖 core/common/html/console 与两个 agent-ui adapter；统一 gate 新增 components/common 独立阶段。
- **验证**：components/common 5、components/html 117、components/console 77 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total，生产数据库保持不变。
- **当前状态**：无开放实施批次。

## v62 — 最终收尾复核 ✅

- **完成检查**：复核 `todo.md` 无开放实施批次、工作树干净；components common/html/console 与 agent-ui console/web-console 依赖方向只保留规则允许的单向适配，未发现交叉引用或新增架构违规。
- **全量验证**：独立重跑 `RUN_PTY=1 bash scripts/agents-gate.sh`，26 passed / 0 skipped / 26 total；覆盖 agents 10 包、components core/common/html/console、4 项 tsc、Web production build、DOM/TUI、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查。
- **当前状态**：无开放实施批次；本轮未发现需要追加修复的代码问题。

## v63 — 会话时间线视觉收敛 ✅

- **专业层级**：参考现代 coding agent 的信息层级，将厚重的横向分隔框收敛为 `┌ / ├ / │ / └` 连续执行轨道；折叠摘要使用 `⋮`，避免与会话结束语义冲突。
- **跨平台落点**：变更仅位于 `agent-ui/src` 共享 renderer，DOM `ConsoleRenderer` 与 TUI `TuiRenderer` 共用同一渲染模型；未在 `components/html`、`components/console` 或宿主适配层增加平台 hack。
- **主题一致性**：结构行与事件轨道从 `statusLabel`、`toolsAccent`、`statusErrorValue` 主题 token 派生，失败保持加粗强调，四套主题不再被深色硬编码绑定。
- **契约保持**：保留单列状态 glyph、ARIA 文本、CJK/窄终端宽度、失败/阻塞展开、折叠窗口和 inspector 语义；新增回归断言锁定连续轨道与无 card 分隔线。
- **验证**：agent-ui 1364 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total，覆盖 framework 四包、Web production build、DOM/TUI 宽度矩阵、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查。
- **当前状态**：无开放实施批次。

## v64 — 流式实时 token 计量与时间线分步耗时兜底 ✅

- **流式 usage 预估**：OpenAI 兼容 provider 仅在最终 done chunk 携带真实 usage。运行时 `collectStreamingResponse` 现为每个 text/reasoning chunk 追加 CJK 感知的累计 completion 预估（复用 context-manager 分词启发式），事件 value 与 `AgentStreamChunkEvent.usage` 同步携带；真实 chunk usage 优先生效、`estimated` 标记区分，预估绝不写入最终 response metadata/审计记录；SSE 与 RPC 网关转发路径同时受益，状态栏 token 计量在流式中按 chunk 实时推进。
- **分步耗时兜底**：终态事件替换 running 行且回执未附带 `durationMs` 时，按保留的开始时间推导 `durationMs = now - startedAt`；重复终态保持首次推导值、显式回执时长优先，终态→running 回退仍被生命周期门拒绝；本地与远程 tool 投影维持回执时长优先语义。
- **流式回执回归**：新增 `streamingTurnYieldsEstimatedChunkUsage`，锁定「预估随 chunk 到达、真实 usage 后到优先」的回执顺序。修正异步生成器调度测试：在 runtime 链推进到适配器 await 点之后再 `releaseFollowupChunk()`，避免过早释放成为空操作而挂死（先建立挂起的 `stream.next()`，释放后再 await）。
- **时间线窗口回归**：`resolveTimelineVisibleMessages` 的窗口 limit 恢复为 `messagesVisibleItems`，stream 布局不再把 timeline 窗口放开到 `MAX_SAFE_INTEGER`——compact/steps 折叠摘要、当前步骤 + 错误仅显模式与隐藏计数恢复；流式 transcript 无界契约由 `visibleMessages` 顶层 stream 分支（`messageLayout !== 'dynamic'` 直接返回全量）独立保证。`default message stream remains unbounded` 测试显式 `setTimelineMode('off')`，消除跨用例共享组件例泄漏的 steps 模式污染。
- **验证**：agent 全包、agent-ui 1373 passing；runtime-loop 定向 60 passing（含新流式预估断言）；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total，覆盖 agents 10 包、components core/common/html/console、4 项 tsc、Web production build、DOM/TUI 宽度矩阵、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查。
- **当前状态**：无开放实施批次。

## v65 — 审批/问答确认交互与时间线耗时契约收敛 ✅

- **审批确认（参考 opencode/codex）**：新审批到达时 `requestApprovalAttention` 自动把焦点交给 approval 面板，但让位给 pending question、blocking select 菜单与详情 inspector 等更高优先级层；面板显示 `Approval required · Allow <tool>?`、命令预览（shell 类工具前缀 `$`）、原因与到期倒计时，并固定 `a Allow   d Deny   y Copy   ↑↓ Move   Esc Dismiss` 操作提示。
- **审批事件载荷**：`approval_requested` 透传 `inputSummary/command/input` 与 `timeoutMs`；组件事件路径、本地事件桥与远端 SSE 桥行为一致。
- **问答确认（用户对话）**：pending question 头部显示 `Awaiting your answer[ · N queued]`，选项提示统一为 `↑↓ move · 1-9 pick · Enter confirm · Esc dismiss`；用户可在输入框键入自定义答案，已有草稿时数字属于答案文本、空草稿时数字仍选择编号选项，Enter 提交自定义答案或选中项；不改变 composer 的既有数字选项契约。
- **时间线耗时契约修复**：恢复事件行总耗时展示（rule 30），并以行尾 muted token 呈现、禁止贴在内容起始；最终回答改用 24 小时制 `Worked for X · done HH:mm` 摘要并保留行尾耗时 token；步骤边界（P302）耗时继续保留在 meta；`formatDoneTime` 不再随 locale 漂移。
- **事件详情展开修复**：message detail 打开且选中时事件行使用完整正文，此前开关只切换文案而正文仍被截断。
- **门禁字形误报修复**：TUI gate `single status glyph per line` 仅统计行首状态标记，不再把内容截断省略号 `…` 当作第二个状态标记。
- **验证**：agent-ui 1392 passing（含新增 `p313-approval-question-ux`）；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total，覆盖 agents 10 包、components core/common/html/console、4 项 tsc、Web production build、DOM/TUI 宽度矩阵、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查。
- **当前状态**：无开放实施批次。

## v66 — 交互体验收尾：排队输入、流式历史与关联文件展示 ✅

- **新输入不再取消当前 turn**：`ui.steerMode` 改为显式 opt-in；turn 运行中按 Enter 默认进入队列，当前 turn 继续跑完、结束后按 FIFO 依次执行，不再出现"输入新问题就把上一问取消"。显式启用 steer 时仍保持 P128 的打断并重提语义。
- **流式历史不再被顶掉**：stream 布局全程使用 native scrollback（含 turn 运行中），多轮对话历史不再按视口高度裁剪；仅显式 dynamic 模式做窗口化。TUI 长回复尾部可见性与滚动安全由真实 PTY 验收覆盖。
- **关联文件紧凑展示**：用户消息的 @mention 上下文不再原样显示 `› [Mention Context]` + 原始上下文行；正文只显示干净 prompt，并在其下以 muted `Files · <paths>` 一行展示关联文件；发给运行时的提示仍携带完整上下文（编辑/回放不受影响）。
- **长回复排版收敛**：meta 与正文之间补空格分隔，去掉 role/meta 重复的 `·  ·`；最终回答的 `Worked for X · done HH:mm` 移到独立 footer 行，不再粘在正文末行；去掉重复的行尾耗时 token；sub-second（含派生 0s）不显示 worked summary，避免噪声。
- **失败行动作提示后移**：`retry`/`重试`/`审批` 从 meta 前缀改为行尾 muted token（`… failed · retry (24s)`），P289 单一状态点与 aria 动作词保持不变，读感更顺。
- **排队计数可见**：输入行 prompt 增加 `N queued` 徽标，排队输入数量常驻可见（`queuedPromptCount`）。
- **验证**：agent-ui 1395 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total，覆盖 agents 10 包、components core/common/html/console、4 项 tsc、Web production build、DOM/TUI 宽度矩阵、metrics regression、真实 PTY、`git diff --check` 与生产数据库完整性检查。
- **当前状态**：无开放实施批次。

## v67 — 真实 CLI 会话差距修复（工具行 / RPC 透传 / 错误恢复）✅

- **工具调用批行可读化**：模型一步返回多个工具调用时不再显示原始工具名逗号列表（`readfile, globsearch, content_search`），改为本地化动作 + 主参数（`Read file: AGENTS.md · Search files: exam-system/**/*.ts · Search code: scorePaper`）；主参数按 path/pattern/query/command 等优先选取并截断。
- **RPC 桥保留 toolCalls**：本地 in-process AppRpc 桥（`agent-gateway/agent-app-server.module.ts`）与 `HttpAgentConsoleAppRpc.stream` 此前丢弃流式 `toolCalls`，导致 UI 只能回退到工具名列表；现两端透传，Web/attach/本地 chat 行为一致。
- **工具错误可恢复**：模型在一次可恢复工具失败后返回空响应时，运行时注入带工具错误与"使用工作区相对路径"提示的恢复轮，而不是直接以 `required tool failed` 收尾；空响应重试改为有界两次，容忍 provider 瞬时空回包。
- **工具结果摘要**：glob_search 结果复数修正为 `1 match / 2 matches`（此前 `matchs`）。
- **验证**：agent 893 passing、agent-ui 1397 passing；真实 CLI（`npm run chat -- --workspace /home/zhouyou/workspace/sleep-mlt`）驱动构建任务观察到工具行可读化、复数正确、错误恢复生效；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total。
- **当前状态**：无开放实施批次。

## v68 — 优化批次 P1 / P2.1 / P3.1 落地 ✅

- **配置自愈（P1.1）**：新增 `healSettingsModelConfig`，在 `resolveCliConfig` 启动路径与 `/model` 写回时用 `sanitizeModelProfile` 清理 sentinel（`cancel`/`/cancel`/`q`）、无效 profile、悬空 `complexityRouting`/`defaultProfile` 与嵌套重复；`/doctor` 经 `getLastSettingsHealReport` 报告 `settings_model_repaired`。
- **路由降级（P1.2）**：`RoutedModelAdapter` 对未知 complexity/default/route profile 不再抛错，改为回退可用配置并累积 `getWarnings()` 诊断；显式 `--profile` 保持原抛错契约。
- **路径可操作（P2.1）**：`resolveWorkspacePath` 与 glob 绝对/`..` pattern 的错误信息附上 workspace root 与相对路径示例，明确禁止绝对路径与父目录逃逸。
- **plan 本地化（P3.1）**：新增 `planLabel/planActive/planBlocked/planFailed/planCompleted` 标签（zh + EN）；plan 头部、plan/tasks 面板摘要、Working 当前步骤与完成摘要不再硬编码英文。
- **验证**：agent 894 passing、agent-cli 77 passing、agent-ui 1397 passing；真实 PTY acceptance 隔离 HOME 连续两次 8/8 通过（全量门禁期间 PTY scenario 8 偶发超时，属已知负载抖动，隔离复跑稳定通过）。
- **当前状态**（v68 收尾）：P1.3（退避/空响应提示）、P2.3、P3.2/P3.3、P4、P5.2、P6 仍开放（P2.2、P5.1 由 v69 完成）。

## v69 — 优化批次 P2.2 / P5.1 落地 ✅

- **工作区上下文注入（P2.2）**：`DefaultAgentRuntime.buildModelRequest` 在存在 workspace 时注入系统消息 `Workspace root: <dir>. Use workspace-relative paths only; never use absolute paths or '..' ...`，从源头降低模型编造越界绝对路径的概率。
- **联网搜索可操作提示（P5.1）**：`web_search` 因未配置适配器失败时，UI 显示「未配置联网搜索适配器；请在设置中配置搜索适配器。」（en/zh i18n），替代泛化的 `failed`。
- **验证**：agent 894 passing、agent-ui 1398 passing（新增 missing-adapter hint 用例）。
- **当前状态**：P1.3（退避/空响应提示）、P2.3、P3.2/P3.3、P4、P5.2、P6 仍开放。

## v70 — 优化批次 P1.3 / P4.2 部分落地 ✅

- **空响应/工具失败收尾可操作（P1.3 部分）**：`resolveAssistantResponseText` 现在区分「工具失败」与「provider 空回包」，分别在收尾文案后追加动作指引（修正工具输入/路径后重试；或按 provider 瞬时问题重试/检查模型配置）。
- **工具批行折叠（P4.2 部分）**：一步超过 3 个工具调用时，仅展示前 3 个本地化动作+参数并折叠为 `· +N more`，避免超长批行。
- **验证**：agent 894 passing、agent-ui 1399 passing（新增 batch 折叠用例）。
- **当前状态**：P1.3（退避）、P2.3、P3.2/P3.3、P4.1/P4.3、P5.2、P6 仍开放。

## v71 — 优化批次 P3.2 交互提示本地化（部分）✅

- **cancel/queue/busy 提示本地化**：`agent.notice.cancelling|nothingToCancel|queuedPrompt|queuedCommand|busy`（zh + EN）；`interruptTurn`、`enqueuePrompt`、`notifyBusyState` 默认文案不再硬编码英文。
- **验证**：agent-ui 1399 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 26 passed / 0 skipped / 26 total（含真实 PTY、生产库完整性）。
- **当前状态**：P1.3（退避）、P2.3、P3.2（其余命令/用法/诊断提示）、P3.3、P4.1/P4.3、P5.2、P6 仍开放。

## v72 — 模型可用性只读校验（`doctor --check-models`）✅

- **新增只读校验**：`tsdi-agent doctor --check-models` 拉取 provider `${baseUrl}/v1/models`，对照顶层 `model`、`defaultProfile`、各 `profiles.*.model` 与 `complexityRouting` 解析出的模型，命中缺失时报 `model_not_available`（附可用模型示例）；端点不可达或 HTTP 失败降级为 warn，不崩溃。
- **动机**：真实会话中 `complexityRouting.complex → strong` 指向 provider 未提供的模型（如 `gpt-5.6`），复杂请求持续返回空响应；该检查让此类配置错误在 doctor 阶段可见、可定位。
- **验证**：agent-cli 78 passing（新增 `/models` 缺失用例）。
- **当前状态**：P1.3（退避）、P2.3、P3.2（其余命令/用法/诊断提示）、P3.3、P4.1/P4.3、P5.2、P6 仍开放。

## v73 — 优化批次 P1.3 / P2.3 / P3.2 / P3.3 / P5.2 / P6 收口 ✅

- **空响应退避（P1.3）**：空响应重试之间加入 `150ms×N` 递增退避，降低 provider 瞬时抖动直接失败的概率。
- **失败行就地重试（P2.3）**：新增 `retryFailedEventAction` 与 `isFailedEventMessage`；消息聚焦时选中失败/阻塞事件行按 `r` 重试上一轮用户请求（turn 运行中给出 busy 提示）。
- **文案本地化收口（P3.2）**：`agent.notice.*` 扩展到 queue/stash/personality/yolo/mcp 等常用命令提示（zh/EN）。
- **工具标签/摘要补全（P3.3/P5.2）**：补齐 12 个工具的中英文显示名；批行 >3 折叠 `+N more` 一致。
- **门禁补强（P6）**：in-process AppRpc chunk 映射抽为可测 `mapRunTurnStreamChunk`，新增 `agent-gateway/test/app-server-bridge.spec.ts` 锁定 `toolCalls` 透传；v68–v73 全部回归随各包 `unit.ts` 进入统一 gate。
- **P4.3 复核**：真实 dump 验证 renderer 无多余空行，无需改动；P4.1 plan 相位为刷新收敛，无稳定复现，关闭观察。
- **验证**：agent 894、agent-cli 78、agent-gateway 298、agent-ui 1400 passing；`RUN_PTY=1 bash scripts/agents-gate.sh` 25 个代码/构建/DOM/TUI/PTY 阶段全绿（`production-db-integrity` 期间用户实时会话改动生产库，非测试写入）。
- **当前状态**：无开放实施批次（P1–P6 全部关闭）。

## v74 — 真实构建任务驱动的差距修复（agent 运行时 / 工具 / 分层）✅

- **同轮上下文不丢**：`getRecentMessages` 改为 turn-aware——当前轮整段保留，只对上一轮前缀开窗；压缩按整轮配对增删并新增 `repairToolPairing` 规范化；`pruneHistory` 修复多工具调用轮的孤儿配对；压缩改为 turn-aware（当前轮视为工作集，只摘要历史轮）。消除 provider `400 No tool output found for function call` 与"谎报未修改文件、验证未执行"。
- **计划与恢复**：新增 plan-aware continuation（计划有未完成项则续跑）；`falsification` 仅在计划完成（或未触碰）时才终止回合；`todo decompose` 过度拆分修复（移除 `以及/和/、` 等泛化连接词 + `MAX_ATOMIC_FRAGMENTS=5` 护栏）；`maxToolRounds` 默认 12→20；`todo` 支持仅状态的字段级部分更新（省略字段保留原值）；`ToolSummary` 正确渲染 `decompose` 的 `N steps · accepted · proposals`。
- **能力补齐**：CLI 默认启用 `terminal`（审批策略不变，settings/`--no-default-tools` 可覆盖）；`spawn_agent`/`coding_task`/`LightweightAgentRunner` 改用 `@Inject(INJECTOR)` 惰性解析，修复联合类型元数据导致的 DI 死链（实机验证子代理可用）；`git_operations` 在非 git 工作区回退到会话文件快照 `status`/`diff`；`apply_patch` 修复上下文行被误删的语义 bug 并加入空白容错匹配；`list_dir` 空/缺省路径解析为工作区根。
- **分层与安全**：工作区解析以显式 workspace（`--workspace`）为准、不再回退进程 cwd，并新增 `AgentOptions.workspace`；落地 workspace trust 门禁（`AGENT_WORKSPACE_TRUST`，未 trust 拒绝写入/终端/git 等变更类工具，提示 `tsdi-agent trust <dir>`）；`pipeline` 归属 `@tsdi/agent-tools`（新增 `LocalPipelineAdapter`，经 `ToolRegistry` 真实执行，移除 agent-cli stub）；完成 TUI 分层抽取——`@tsdi/agent-ui/console` 独占 console 编排（远程 RPC、命令输出持久化），`agent-cli` 仅做平台适配并委托调用。
- **验证**：agent 896、agent-tools 480、agent-cli 78、agent-ui 1400 passing；`bash scripts/agents-gate.sh agent agent-tools agent-cli agent-ui tsc-agent tsc-agent-ui tsc-agent-tools` → PASS（8 passed / 0 skipped，含 tsc --noEmit 与 production-db-integrity）。真实任务：sleep-mlt 构建任务完成且 `node src/index.js` 磁盘复验通过；失败测试驱动任务修复至 `stats tests passed`；`spawn_agent` 子代理实机返回审查报告。
- **当前状态**：无开放实施批次；prompt cache 为 provider 侧 `observe_only`（自定义端点）限制，暂缓。

## v75 — 体量 ratchet 门槛与单一职责规则（防再次膨胀）✅

- **问题**：`agent-ui/src/AgentConsoleComponent.ts` 8178 行（395 方法），逻辑虽已部分抽到 `AgentConsoleCommandHandlers` 等模块，但类保留兼容包装 + 单体命令分发器 + 甚广的领域方法，且无行数/职责门槛，新功能持续往组合根里加。
- **门槛**：新增 `scripts/check-source-size.mjs` + `scripts/source-size-baseline.json`（29 个现存超额文件入基线）；已入基线文件只允许下降，新文件上限 600 行；接入统一 gate 新增 `source-size` 阶段（`ALL_STAGES`）。
- **规则**：写入根 `AGENTS.md` 第 4 条——禁止 god-object、命令走注册表、抽取保持行为/测试不变、下调体量同提交下调 baseline、约定拆解顺序 P4→P3→P2→P1、目标 `AgentConsoleComponent.ts < 1500`。
- **验证**：`bash scripts/agents-gate.sh source-size` → PASS。
- **当前状态**：拆解执行未开始（P4 命令注册表为首个批次）。
