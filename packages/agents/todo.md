# Agents 当前规则、功能与未完成计划

> 本文只保留当前有效规则、已具备功能点和未完成计划。历史实施日志、提交号、阶段测试数字和已关闭批次不再保留。

## 一、必须遵守的规则

### 1. 响应式与渲染

- UI 完全由真实数据变化驱动；禁止在组件层用定时器主动刷新界面。
- 动画值必须由当前时间派生，不得为了动画额外驱动整树渲染。
- 禁止用布局层脏节点追踪或变化源缓存跳过未变面板。
- browser 与 TUI 的展示和交互改动必须落在共享 components、components/console 或 agent-ui 层，不做单平台补丁。
- stream 布局全程使用 native scrollback（含 turn 运行中的流式内容），多轮对话历史不得按视口高度裁剪；仅显式 dynamic 模式才窗口化。

### 2. 跨平台边界

- `components/common` 是 renderer-neutral 公共层，只能依赖 components 核心，不得反向引用 `components/html` 或 `components/console`。
- `components/html` 与 `components/console` 是并列平台 renderer，禁止互相引用、互相模拟或把一端兼容逻辑塞入另一端。
- `agent-ui/src` 是平台无关 UI 层，不得直接引用 `@tsdi/components/html`、`@tsdi/components/console`、`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等平台私有 API。
- `agent-ui/console` 只负责连接 agent-ui 与 `components/console`；`agent-ui/web-console` 只负责连接 agent-ui 与 `components/html`，两个适配层禁止互相引用。
- console 能力统一从 `@tsdi/agent-ui/console` 暴露，Web 能力从 `@tsdi/agent-ui/web-console` 暴露，由 CLI、browser、desktop、VS Code 等宿主选择对应适配。
- `components/console` 与 agents 库不得直接依赖 Node API；必要环境信息通过受守卫的 `globalThis` 访问。
- 不复制 Codex/opencode 品牌或配色，只参考其信息架构、稳定 identity、状态层级和交互原则。

### 3. 会话主线与时间线

- 用户请求是 turn 的视觉锚点；最终回答独立于 thought、tool、command 和 lifecycle event。
- 生命周期事件属于 `event`，不能替换、合并或升级为最终结论。
- 同一事实默认只出现一次；tool 生命周期按稳定 key 原地归并。
- 事件主线只展示动作、对象、状态和必要摘要；raw payload、stdout/stderr、stack、diff 进入 inspector。
- 事件只展示总耗时：后端 `durationMs` 优先，否则按稳定 identity 配对开始/结束时间。
- execution 轨道紧凑；running/blocked/error 保持较高权重，completed 降噪；错误根因和最终回答不能被折叠吞掉。
- 用户消息和最终回答由整个动态模板容器提供纵向 padding，禁止给正文每行重复添加上下 padding。
- 最终回答不显示 assistant `•` role label；Working 状态点只属于执行状态。
- 长回复在 native scrollback 下不得向上移动超过终端视口高度，不得重复绘制或覆盖视口外历史。

### 4. 输入、历史与候选

- 输入框 `↑/↓` 历史只按规范化 `workspace` 目录关联，与 session、project、thread 和 fresh/resume 状态无关。
- 同一 workspace 下所有会话的用户 prompt 聚合；不同 workspace 严格隔离。
- 历史只记录真实用户 prompt；排除 `/` 命令、空输入以及 assistant/tool/system 内容。
- 历史去重后按最近使用顺序保留最多 200 条。
- `↑` 从最新 prompt 向旧 prompt 浏览；`↓` 反向浏览并最终恢复按键前的原始草稿。
- suggestion menu 只在尚未浏览历史时优先消费方向键；历史浏览一旦开始，本次浏览期间 `↑/↓` 必须继续属于历史。
- pending question 激活时输入框可键入自定义答案：空草稿时数字键选择编号选项，已有草稿时数字属于答案文本，Enter 提交自定义答案或选中项。
- turn 运行中按 Enter 默认排队（保留当前 turn 不取消）；steer（打断并取消当前 turn 开新 turn）必须显式启用 `ui.steerMode`。
- 用户消息的 @mention 上下文以紧凑 `Files · <paths>` 展示，不显示原始 `[Mention Context]` 块；发给运行时的提示仍携带完整上下文。
- browser textarea、TUI escape sequence、Vim history action 必须遵守同一契约。

### 5. Workspace、Project 与跨会话协同

- `workspace` 是文件目录、权限和输入历史边界。
- workspace 可以直接作为默认 project：没有显式 `projectId` 时，以规范化 workspace 作为稳定默认 project key。
- workspace 与 project 不强制一一对应：一个 workspace 可以承载多个显式 project，一个协调流程也可以关联多个不同 project。
- project 分组不得影响 workspace 输入历史聚合。
- 显式创建、加入、fork、delegate 项目时，必须持久化 `projectId`、`primaryThreadId`、`originThreadId`、`sessionRole` 等关系。
- project/thread/delegation/background 协同必须可跨进程、跨重启恢复，不能只依赖进程内状态。

### 6. 数据库与数据安全

- 生产库默认位于 `~/.tsdi-agent/agent.db`；测试必须使用独立临时 HOME/root 和独立数据库。
- 测试、schema 同步和启动流程不得清空、覆盖或重建生产库。
- 实体字段变化必须验证旧 session/message/memory 数据在升级启动和关闭后仍完整保留。
- 禁止把删除数据库作为迁移方法。
- 发现旧库或备份时先只读报告并制定可回滚恢复方案，不得自动覆盖当前库。
- 输入历史加载失败不得静默伪装成空历史；应保留可诊断错误，同时不阻断 TUI 启动。

### 7. 测试与完成标准

- 单元测试必须覆盖真实调用边界，不能只靠手工设置 state、伪造 renderer 输出或局部纯函数证明完整交互可用。
- 输入交互至少覆盖真实 ORM、AppRpc、CLI/TUI decoder、component/state 和 PTY 按键链。
- 回归测试必须先证明在旧实现上稳定失败，再证明修复后通过。
- 涉及响应式核心时回归 components、components/console、agent-ui；涉及 browser/TUI 时同时验证两端。
- 收尾门禁包括 agents 各包、framework 核心及 components/common、components/html、components/console、相关 tsc、Web build、DOM/TUI、metrics regression、真实 PTY 和 `git diff --check`。
- 未解释数据丢失、未覆盖真实复现路径或仍存在开放复现时，不得仅凭测试数字宣布完成。

### 8. 配置、路由与本地化

- 不得把无效/占位配置（`cancel`/`q` sentinel、空 profile、嵌套重复 `profiles`）持久化到 `settings.json`；读取必须净化，且净化结果应可自愈写回。
- 路由或配置缺失/无效不得静默或抛错终止 turn；必须回退到可用配置并给出可诊断提示。
- 用户可见文案必须经 i18n，不得硬编码英文（含 plan 头部/结尾、事件句子、状态词）。
- 工具失败信息必须可操作：包含允许范围（workspace root）与修复建议；越界路径不得只报 `outside the allowed workspace root`。

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

### P1 — 模型配置自愈与路由健壮性（P1.1 / P1.2 ✅ v68；P1.3 部分）

- ✅ **P1.1 配置自愈**：`settings.json` 读入已能识别 `cancel`/`q` 占位 sentinel 并丢弃无效 profile；补齐**写回净化**（启动与 `/model` 保存时清理 sentinel 与嵌套重复 `profiles`/`complexityRouting`）并在 `/doctor` 可见报告，禁止无效 sentinel 再次持久化。
- ✅ **P1.2 路由不中断**：`RoutedModelAdapter` 遇到未知/无效 `complexityRouting`/`defaultProfile`/route profile 时回退顶层并记录 `getWarnings()` 诊断，而不是抛错终止 turn（显式 `--profile` 仍按原契约抛错）。
- **P1.3 空/中断响应健壮性**（部分）：v67 已有界重试 2 次且工具错误可恢复；待补轻度退避与「provider 连续空响应」明确提示。
- **验收**：含 `"cancel"`/嵌套 profile 的 settings 在启动、`/model`、`/doctor` 均不崩且输出净化配置；坏 profile 路由时 turn 继续并给诊断；新增 config sanitize + routing fallback 回归。

### P2 — Workspace 路径与工具失败可操作化（P2.1 ✅ v68）

- ✅ **P2.1 路径错误可操作**：`resolveWorkspacePath`/`assertWorkspacePattern` 失败信息附上允许的 workspace root 与相对路径示例，并明确禁止绝对路径与 `..`。
- **P2.2 工作区上下文注入**：系统提示/环境块显式声明 workspace root 并要求相对路径（never invent absolute paths outside it）；glob 绝对 pattern 明确拒绝并提示。
- **P2.3 失败行可操作**：失败/阻塞事件行的 `retry` 提示升级为可点击/回车就地重试的 affordance（codex/opencode 语义），不再只是文本。
- **验收**：模型使用越界/绝对路径时 turn 不终止、错误可读、可纠错继续；PTY 覆盖 bad-path → recover。

### P3 — 本地化与文案一致性（P3.1 ✅ v68）

- ✅ **P3.1 plan 头部/结尾本地化**：plan 头部（`计划 X/Y ▓ · 进行中 N · 阻塞 · 失败`）、tasks/plan 面板摘要、Working 当前步骤、`planCompleted` 结尾均走 `AgentConsoleTimelineLabels`，补齐 zh/EN 键。
- **P3.2 事件/工具/状态句子统一 i18n**：`resolveTimelineEventSentence`、`resolveEventResultPhrase`、Working/Preparing 等全部经 labels/translator，禁止英文硬编码。
- **P3.3 工具结果摘要精简**：限制长度、去重、`+N more` 一致（`N match(es)` 已修）。
- **验收**：zh-CN 下时间线/计划/状态无英文残留；新增文案快照测试。

### P4 — 时间线与计划一致性

- **P4.1 plan 投影一致性**：plan 头部计数与 todo 工具回执/plan 消息一致（消除 `plan 1/4` 对 `7 items` 的相位差）；plan 更新按稳定 key 归并。
- **P4.2 工具批行分组**：一步多工具聚合为可读摘要，超长批行可展开到 inspector；running→completed 原地归并且不重复。
- **P4.3 行距与空白统一**：transcript 消息间距与事件紧凑度统一，消除多余空行。
- **验收**：真实会话工具行按稳定 key 归并、无重复、无多余空行；新增 timeline 归并回归。

### P5 — 工具/Provider 可用性

- **P5.1 `web_search` 未配置 adapter**：除工具错误外给出 UI 提示（未配置搜索适配器及配置入口）。
- **P5.2 工具标签/摘要映射补全**：新增工具时同步本地化显示名与参数摘要（`Read file: <path>` 形式）。
- **验收**：未配置能力有明确可操作提示；新工具不出现原始工具名列表。

### P6 — 门禁补强

- **P6.1**：P1–P5 全部纳入 `RUN_PTY=1 scripts/agents-gate.sh`，新增真实边界回归（RPC 流 `toolCalls` 透传、settings 净化、routing fallback、PTY bad-path recover）。
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
- **当前状态**：P1.3（退避/空响应提示）、P2.2/P2.3、P3.2/P3.3、P4、P5、P6 仍开放。
