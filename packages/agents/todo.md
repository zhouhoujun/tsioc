# Agents 当前规则、功能与未完成计划

> 本文只保留当前有效规则、已具备功能点和未完成计划。历史实施日志、提交号、阶段测试数字和已关闭批次不再保留。

## 一、必须遵守的规则

### 1. 响应式与渲染

- UI 完全由真实数据变化驱动；禁止在组件层用定时器主动刷新界面。
- 动画值必须由当前时间派生，不得为了动画额外驱动整树渲染。
- 禁止用布局层脏节点追踪或变化源缓存跳过未变面板。
- browser 与 TUI 的展示和交互改动必须落在共享 components、components/console 或 agent-ui 层，不做单平台补丁。

### 2. 跨平台边界

- `agent-ui/src` 不得直接引用 `@tsdi/components/console`、`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等 Node 私有 API。
- console 能力统一从 `@tsdi/agent-ui/console` 暴露，由 browser、CLI、desktop、VS Code 等宿主适配。
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
- 收尾门禁包括 agents 各包、framework 三包、相关 tsc、Web build、DOM/TUI、metrics regression、真实 PTY 和 `git diff --check`。
- 未解释数据丢失、未覆盖真实复现路径或仍存在开放复现时，不得仅凭测试数字宣布完成。

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
- 长回复 native scrollback 安全窗口。

### 宿主与门禁

- agent-cli、gateway、desktop、VS Code、SSH、channels 和 Web bundle。
- DOM/TUI 共享场景 gate、宽度矩阵、metrics baseline regression 和真实 PTY acceptance。
- PTY 覆盖长回复、keymap、plan、command outputs、slash command、Working、双取消键和主题宽度矩阵。

## 三、未完成计划

当前无开放实施批次。

## v53 — Workspace 输入历史、Project 协同与数据库安全 ✅

- **历史边界**：输入历史按规范化 workspace 跨 session 聚合，不依赖 project/thread；state、本地 memory 与 AppRpc 存取两端统一排除空输入和 slash 命令，按最近使用顺序去重并限制 200 条，`↑/↓` 可恢复原草稿。
- **失败诊断**：历史加载、恢复和保存失败不再空 catch；错误进入 `lastError`，同时不阻断 TUI 启动和会话操作。
- **Project 持久化**：无显式 project 时继续由规范化 workspace 产生稳定 project key；显式 project/thread/role、fork 与 delegation 关系由 session store 持久化，project 分组不参与历史筛选。
- **路径口径**：`--root` 保留用于 agent 配置；生产数据库固定为 HOME 下 `~/.tsdi-agent/agent.db`。测试和真实 PTY 验收必须覆盖临时 HOME，不得继承用户 HOME。
- **数据审计**：只读确认原库有 3 个 session、4 条 message、2 条 memory；三个 session 的 workspace 均为 `/home/zhouyou/workspace/sleep-mlt`，显式 project/thread/role 为空。未发现 `.bak`、WAL、旧库或其他可恢复来源，现有文件无法证明更早数据的删除时间或执行主体。
- **门禁污染修复**：收尾时发现 PTY acceptance 继承用户 HOME，并写入测试 session `chat5de7367c7ad3676cb2c5e4b4b40ce272`。验收现为每次运行创建并清理独立临时 HOME；修复后真实 PTY 再跑通过，生产库 SHA-256 在该次门禁前后稳定为 `7209a8b6d407608010e2d66bbcbf9d83e411743916093b012112527001166fde`。既有测试记录未自动删除，避免对用户库执行破坏性操作。
- **最终验证**：`RUN_PTY=1 bash scripts/agents-gate.sh` 24 passed / 0 skipped；修复隔离后定向 PTY + diff-check 2 passed / 0 skipped。覆盖 agents 10 包、framework 三包、4 项 tsc、Web production build、DOM/TUI、metrics regression、真实 PTY 和 `git diff --check`。
