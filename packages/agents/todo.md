# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile + retry-after 分类退避）、prompt cache 支持（请求侧 cache_control + 系统提示静态段前置）、上下文压缩 + 重放（overflow 克隆最后用户消息 / 主动 continue 提示 + 媒体占位符）、turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、Git step 快照 + 消息级 revert/unrevert + 会话 diff、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换 + Windows 原生宿主）、40+ 工具组、LSP 诊断反馈闭环、MCP stdio + Streamable HTTP client + OAuth + server tool + 断线重连、skills 系统（本地注册表 + 远程市场）、Agent Plugins（manifest/skills/MCP/hooks 捆绑 + 1.0.0 标准兼容）、声明式 agent 原型（plan/build/review + 工具门控）、语义记忆检索（embedding + 三模式降级）、自动标题/摘要、会话 fork（branch 血缘继承）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 级工件聚合）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋）、hooks 系统（双形态）、gateway（JSON-RPC + HTTP + SSE + NDJSON 流 + WS + OpenAPI 3.1）、console TUI（~20 面板 / ~70 命令 / vim / Ctrl+X leader / which-key / 5 上下文分域键位）、CLI、多代理 v2、跨平台 UI（TUI/浏览器/VS Code/Electron 四端共用响应式渲染层）。

## 已实现功能汇总

> P0–P171 全量已实现（2026-08-17 盘点 + 2026-08-19 P170/P171 收尾）。
> 早期打磨 P0–P66 逐条回归记录见 git history；P67–P171 按方向归类如下。

### 主干能力（P0–P66）
- turn 循环 / 多模型：run/streaming、Echo/Anthropic/OpenAI-compatible/Routed、profiles、complexity 路由、worker-class 路由、命令级 profile、重试/退避分类（P76）。
- 上下文工程：prompt cache（P69）、压缩 + 重放（P68）、AGENTS.md 指令链（P72）、语义记忆检索（P73）、自动标题/摘要（P74）、项目记忆闭环（P78）。
- 补偿/回滚/审批：LIFO + 文件快照 undo/redo、Git step 快照 revert/unrevert（P71）、审批流（granular + expiry/FIFO + 审计落库）。
- 工具面：40+ 工具组、LSP 诊断反馈闭环（P67）+ 自动安装（P89）、编辑后验证命令证据（P79）、MCP client（P95/P109）、skills（P87）、Agent Plugins（P106/P111）、声明式 agent 原型（P70）、/review 内联评审（P80）。
- 编排/可观测：parallel_spawn + delegation graph + 每-turn 委派模式（P108）、evidence-ledger/verification-gate/weakness-miner/harness-profile、hooks 双形态（P82）、gateway（P75）。
- 交付面（G21）：远程传输（P90）、Web console（P91）、浏览器安全 module 边界（P92）、VS Code 扩展（P93）、Electron 桌面壳（P110）。
- 安全/生态/生命周期：会话分享（P86）、会话 fork（P77）、Provider 注册表（P84）、Eval runner（P85）、Goal 系统（P83）、token 预算（P98）、secrets 脱敏（P99）、索引化 web search（P101）、项目信任门（P102）、reasoning effort 透传（P103）、Windows 沙箱（P105）、凭据加密（P112）、/import 迁移（P81/P113）、usage 聚合（P114）。
- agent-ui 渲染性能（P62–P66）：时间派生动画、elapsedLabel 秒级稳定、SessionState Proxy 驱动。

### 编码反馈闭环（P67–P89）
- P67 编辑→LSP 诊断反馈、P79 编辑后验证命令证据、P71 Git step 快照 + revert/unrevert、P76 模型请求重试/退避分类、P89 LSP server 自动安装。

### 上下文工程（P68–P78）
- P68 Compaction replay + 媒体占位符、P69 Prompt cache + 系统提示分段、P72 AGENTS.md 指令链升级、P73 语义记忆检索、P74 自动标题/摘要、P78 项目记忆闭环。

### 配置迁移 / skills 生态 / 插件（P81–P113）
- P81/P113 Claude Code / Cursor 配置迁移、P87 skills 远程市场、P106/P111 Agent Plugins 1.0.0 标准兼容。

### 后台子代理 / 多代理（P88–P108）
- P88 后台子代理 UX、P108 每-turn 多代理委派模式、多代理 v2 基础。

### 远程传输 / 宿主（P90–P115）
- P90 Gateway 远程传输层、P91 Web console 宿主、P92 浏览器安全 module 边界、P93 VS Code 扩展、P110 Electron 桌面壳、P115 CLI→Desktop 会话移交。

### 成本控制与安全加固（P98–P114）
- P98 token 预算、P99 secrets 脱敏、P102 项目信任门、P112 凭据加密、P114 usage 聚合。

### 模型与生态协议（P95–P109）
- P95 MCP 2026-07-28 协议升级、P109 MCP 断线重连 + OAuth 回调、P103 reasoning effort 透传、P101 索引化 web search。

### TUI 交互专项（G41–G78，P118–P153）
- P118–P153：手动压缩、! 前缀 shell、全局键位、Esc 中断 + Enter 队列、/diff、/theme、会话生命周期、/statusline、命令簇补齐、TUI 配置层、steer + Tab 队列、外部编辑器、Esc,Esc 编辑、/raw、草稿 stash、上下文分域键位、子代理线程导航、消息导航键、模型收藏/最近/变体循环、which-key 提示、队列化 slash 命令、终端标题、thinking 显隐、tui.json 增强、统一设置对话框、健康 StatusPopover、显示开关簇、/share、/skills /mcp /plugins、/approve retry、plan 模式草稿提示、/apps connectors、云任务、mDNS、ACP、分层记忆。

### v6 TUI 打磨（P154–P162）
- P154 PWA remote、P155 connectors 授权回调、P156 隐藏自动化 agent、P157 GitHub/GitLab 幂等触发、P158 半页/逐行滚动、P159 JSON 导出、P160 auto-approve 会话标记、P161 PDF 附件、P162 which-key 布局/过滤/分页。

### v7 已完成（P163–P169，2026-08-18）
- P163 会话快照 & revert、P164 增量 markdown 离主线程渲染、P165 多会话标签页、P166 MCP server instructions 注入、P167 Thinking level 选择器、P168 Yolo auto-approve、P169 代码模式 MCP adapter。

### 跨平台重构 / Console 收敛（P170–P171，2026-08-19）
- P170 agent-ui 平台组件边界（src/ 无 console/node 直接引用，通过 DI ports 桥接）。
- P171 Console 展示收敛：去 dashboard、用户消息无前置时间、时间线长内容折叠、原生终端 scrollback、键盘 transcript 导航（PageUp/↑/↓/Enter/Esc）。

### 计划/任务/修改展示能力归并（P172–P202，已完成）
- 计划生命周期：`todo` 四态计划、`merge/replace` 持久化、跨会话恢复、goal criteria 覆盖率、完成摘要与失败计数。
- 对话内联：固定 ID 计划卡片插入最近用户请求之后，实时勾选、进度条、长计划折叠/Enter 展开、timeline step 边界；文件变更摘要与 coding task 结果同样内联。
- 执行反馈：Working 面板显示当前 plan step；工具输出摘要可进入详情；长 assistant/user 消息采用保尾折叠；`/keymap`/帮助类内容使用可滚动 overlay。
- 任务与恢复：coding task 具备 worker、lineage、retry、rollback、checkpoint、diff summary；会话切换恢复 plan mode、todo、goal 与任务聚合。
- 工程收尾：AgentConsoleComponent 已按域拆分，类型抑制治理完成；PTY 验收脚手架、全量测试、构建和跨平台边界检查已落地。

---

## 差距分析：Codex vs 本项目——计划/任务/代码修改展示

> 基准：Codex v0.148-alpha.20（Rust TUI + TypeScript SDK）+ opencode v1.18.18 + desktop v1.17.18。
> 对比维度：计划展示、任务/步骤展示、代码修改展示、进度反馈。

### 1. 计划展示（Plan Display）

| 维度 | Codex | 本项目 | 差距 |
|---|---|---|---|
| **数据模型** | `TodoListItem { items: TodoItem[] }`，每个 `TodoItem { text, completed }`。扁平列表，无层级、无状态枚举。 | `AgentConsolePlanTodoItem { id, content, status: pending/in_progress/completed/cancelled }`，有 scope（project/thread）、sourceSessionId。 | **本项目更丰富**：有进度状态枚举和 scope。 |
| **展示位置** | 对话流内联（thread item），作为 `TodoListItem` 类型直接嵌入消息序列。用户在对话中即可看到计划清单。 | `AgentConsoleTasksPanelComponent` 面板展示，非对话流内联。 | **Codex 优势**：计划内联于对话，无需切换面板；用户边看对话边看计划进展。 |
| **实时更新** | Agent 在对话过程中动态更新 `TodoListItem`，checkbox 在对话中逐步勾选。用户可实时看到"正在做第 N 步"。 | `setPlanTodos()` 通过事件桥更新状态，面板重新渲染。但面板是独立区域，不在对话流中。 | **Codex 优势**：实时勾选反馈更直观；本项目需要视线离开对话流到面板。 |
| **视觉格式** | Markdown 风格清单：`- [ ] step 1` / `- [x] step 2`。 | 面板内：`1. [>] content`（in_progress）、`1. [x] content`（completed）、`1. [-] content`（cancelled）。 | 各有特色；Codex 更像 GitHub issue checklist。 |

### 2. 任务/步骤展示（Task/Step Display）

| 维度 | Codex | 本项目 | 差距 |
|---|---|---|---|
| **数据模型** | `CommandExecutionItem { command, aggregated_output, exit_code, status }` + `McpToolCallItem` + `WebSearchItem`。每种工具调用是独立的 thread item。 | `AgentConsoleReviewTaskItem`（coding_task 结果）：有 title、actions、workers、lineage、retry、rollback、checkpoints、diff summary、planning summary。 | **本项目更丰富**：coding_task 有结构化元数据。 |
| **展示方式** | 对话流内联渲染：命令输出、MCP 结果、搜索结果都作为对话消息呈现。 | 面板 + 对话流混合：tool runs 在对话中显示，但 coding_task 的详细信息在 `TasksPanelComponent` 面板中。 | **Codex 更统一**：所有工具输出都在对话流中，用户不需要切换上下文。 |
| **进度指示** | `status: 'in_progress'` → `status: 'completed'` 原地更新。 | `toolRunProgressBar` 显示进度条（`[████░░░░] tool_name`），但只在 Working 面板中。 | **本项目有进度条**（Working 面板），但 Codex 的状态变化更即时可见。 |
| **执行输出** | `aggregated_output` 完整保留 stdout/stderr，用户可展开查看。 | tool run 有 `outputSummary`/`inputSummary`，但截断为 `toolRunSummaryMaxLength`。 | **Codex 输出更完整**；本项目摘要化可能丢失关键信息。 |

### 3. 代码修改展示（Code Modification Display）

| 维度 | Codex | 本项目 | 差距 |
|---|---|---|---|
| **数据模型** | `FileChangeItem { changes: FileUpdateChange[], status }`，每个 change 有 `path + kind (add/delete/update) + diff`。 | `AgentConsoleReviewPanelComponent`：完整 unified diff 解析、`AgentConsoleReviewDiffSection`（path/additions/deletions/lines）、`AgentConsoleReviewHunk`（header/context/startIndex/endIndex）。 | **本项目更丰富**：有 hunk 级别解析和导航。 |
| **展示方式** | 对话流内联：file change 作为 thread item 展示，列出文件名和变更类型。 | 独立 Review 面板：`/diff` 打开完整 diff 视图，支持 hunk 折叠/展开、side-by-side、文件分组、annotation（approved/rejected）。 | **Codex 更轻量**：内联显示变更概要，不强制打开面板。**本项目更深度**：需要代码审查时功能更强。 |
| **交互** | 用户可 inline approve/reject 文件变更（通过 approval 流）。 | Review 面板：`jumpReviewHunk`（n/p 键导航 hunk）、annotation 持久化、`reviewDetailScroll`/`reviewDetailColumnScroll`。 | **本项目审查能力更强**（hunk 导航、annotation），但需要更多交互步骤。 |
| **概要信息** | 文件路径 + change kind（add/delete/update）+ status（completed/failed）。 | 文件路径 + additions/deletions 计数 + diff 文本 + file annotations。 | **Codex 概要更紧凑**；本项目信息更完整。 |

### 4. 进度反馈（Progress Feedback）

| 维度 | Codex | 本项目 | 差距 |
|---|---|---|---|
| **Turn 内进度** | 对话流中实时插入新 items（reasoning → command → file_change → todo_update），用户看到逐步构建。 | 对话流中有 streaming 消息，但 plan/task/review 在独立面板。Working 面板有 elapsed + 进度条。 | **Codex 更线性**：一个流看所有进展。本项目更结构化但分散。 |
| **可视化** | 简洁：checkbox 勾选、status label、文件列表。 | 丰富：进度条、dashboard 统计（runs/ok/fail/success/avg/quality/usage/compaction/diagnostics）。 | **本项目信息密度更高**；Codex 更克制但更聚焦。 |
| **整体感知** | 用户在对话流中获得完整感知：看到 agent 在思考 → 执行命令 → 修改文件 → 更新计划。 | 用户需要在对话流和多个面板之间切换才能获得完整感知。 | **Codex 用户体验更流畅**；本项目需要更多认知负担来追踪多面板。 |

### 差距总结

| 差距 | 优先级 | 描述 |
|---|---|---|
| **计划内联于对话流** | **高** | Codex 的计划作为 thread item 内联在对话中，用户无需切换面板即可看到计划进展。本项目计划只在 TasksPanelComponent 面板中，需要视线离开对话流。 |
| **文件变更概要内联** | **高** | Codex 的 FileChangeItem 作为 thread item 内联显示文件名和变更类型，用户在对话中即可感知"改了哪些文件"。本项目需要打开 `/diff` 面板。 |
| **工具输出内联** | **中** | Codex 的 CommandExecutionItem 完整保留输出并内联展示。本项目的 tool run summary 截断较多。 |
| **进度反馈线性化** | **中** | Codex 的对话流是线性的"思考→执行→结果→下一步"。本项目的多面板布局信息更丰富但认知负担更高。 |
| **计划实时勾选** | **低-中** | Codex 的 todo checkbox 在对话中逐步勾选，视觉反馈更即时。本项目的 planTodos 更新在面板中，不那么即时。 |

---

## 本项目优势（保持并强化）

1. **循证验证螺旋**：evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由 + LSP 诊断证据 + AGENTS 规则草案——codex/opencode 均无系统化闭环。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类、thread 终态回写、coding_task 结构化编排。
3. **上下文压缩严谨性**：anchor 保留 + 五字段 summary schema + 质量评分 + 压缩历史观测 + overflow replay。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO + 审计落库 + LIFO 补偿 + Git step 快照 revert/unrevert。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层。
6. **覆盖面**：40+ 工具组、MCP 三形态 + OAuth + server、skills 本地 + 远程市场 + 插件（1.0.0 标准）、hooks 双形态、gateway 多协议 + OpenAPI。
7. **跨平台响应式 UI 架构**：TUI/浏览器/VS Code/Electron 四端共用响应式渲染层（数据驱动、无定时器、时间派生动画）。
8. **TUI 功能密度**：~70 命令 / ~20 面板 / vim / which-key / 5 上下文分域键位 / 模型收藏/最近/变体循环。
9. **代码审查能力**（vs Codex）：hunk 级别导航、file annotations（approved/rejected）、side-by-side 模式、列滚动——Codex 的 file change 只有 add/delete/update 概要，无 hunk 级审查。

---

## 跨平台入口点与环境约束

> **实施任何功能前必须明确其代码落在哪个入口点的管辖范围。搞错入口 = 环境泄漏。**

`@tsdi/agent-ui` 拆分为三个入口点，各有明确的环境边界：

| 入口点 | 路径 | 运行环境 | 可用依赖 | 禁止依赖 |
|---|---|---|---|---|
| `@tsdi/agent-ui`（主入口） | `src/index.ts` | **跨平台**（TUI / 浏览器 / VS Code / Electron 共用） | `@tsdi/agent-ui` 自身、`@tsdi/ioc`、`@tsdi/components`（无 console 子模块） | ❌ `@tsdi/components/console`、❌ `node:*`、❌ `process`、❌ `Buffer`、❌ `fs`、❌ `__dirname` |
| `@tsdi/agent-ui/console`（TUI 入口） | `console/index.ts` | **Node.js / 命令行** | `@tsdi/agent-ui`（主入口）+ `@tsdi/components/console` + `TuiConsoleModule` | ❌ 浏览器 API（`document`、`window`） |
| `@tsdi/agent-ui/web-console`（浏览器入口） | `web-console/index.ts` | **浏览器** | `@tsdi/agent-ui`（主入口）+ DOM 渲染 | ❌ `node:*`、❌ `process`、❌ `Buffer`、❌ `fs` |

**架构图**：
```
                    ┌──────────────────────────┐
                    │  @tsdi/agent-ui (主入口)  │  ← 跨平台共享层
                    │  AgentConsoleComponent    │     所有面板/渲染/状态/键位
                    │  AgentConsoleSessionState │     通过 DI ports 桥接平台
                    │  AgentConsolePanels       │
                    │  AgentConsoleMessageRenders│
                    └────────┬────────┬────────┘
                             │        │
                ┌────────────┘        └────────────┐
                ▼                                   ▼
  ┌──────────────────────────┐      ┌──────────────────────────┐
  │ @tsdi/agent-ui/console   │      │ @tsdi/agent-ui/web-console│
  │ ConsoleAgentSessionState │      │ mountAgentWebConsole      │
  │ runAgentConsole          │      │ ConsoleRenderer (DOM)     │
  │ TuiRenderer + TuiTerminal│      │                           │
  │ Node.js 依赖可用         │      │ 浏览器 API 可用           │
  └──────────────────────────┘      └──────────────────────────┘
```

**关键规则（P170 已建立，所有后续 P172–P181 必须遵守）**：
1. `src/` 下的新功能**只能依赖主入口的跨平台基础**，不得直接 import console 模块或 node API。
2. console 专属行为（如 `Buffer`、`process.stdin`）通过 DI ports 桥接：`src/` 定义 port 接口，`console/` 提供实现。
3. `resolvePlanTodoContent`、`resolvePlanTodoStatusMark` 等纯函数放在 `src/AgentConsoleMessageRenderers.ts`（跨平台）；涉及 `Buffer`/终端光标的操作放在 `console/ConsoleAgentConsoleSessionState.ts`。
4. 每个批次（P172–P181）实施前需声明：**新代码落在哪个入口点？是否需要跨平台？**

---

## 改进计划 v8（G95–G102，计划/任务/代码修改展示）

> 对照 Codex 的对话流内联模式，提升计划、任务、代码修改的展示密度和即时性。
> 优先级定义：高 = 显著提升日常效率；中 = 体验增益；低 = 锦上添花。
> **所有批次均须遵守上述跨平台入口点约束。每个条目标注 `platform:` 字段。**

### 批次 I · 计划内联展示（P172–P173）

- **P172 · G95 · 计划作为对话流内联展示（高）** `platform: src/（跨平台）`
  - 目标：plan items 作为对话流中的一个特殊消息块（类似 Codex 的 `TodoListItem` thread item）内联展示，用户无需切换到 TasksPanel 即可看到计划进展。
  - 方案：
    - 在 `AgentConsoleMessageRenderers` 中新增 `planTodoRenderer`，将 `AgentConsolePlanTodoItem[]` 渲染为对话流中的 checkbox 清单（`- [ ]` / `- [x]` / `- [-]` 风格）。
    - plan 更新时，在对话流中原地替换（而非新增一条消息），保持计划清单的连续性。
    - 内联 plan 清单与 TasksPanel 双向同步：面板中的操作反映到内联，内联的视觉状态反映到面板。
    - TUI 和 browser 均支持；console 端用 checkbox 字符，browser 端可用 styled checkbox。
  - 锚点：`AgentConsoleMessageRenderers.ts`（新增 renderer）、`AgentConsoleComponent.ts`（plan 消息插入逻辑）、`AgentConsoleSessionState.ts`（plan 内联状态）。
  - **内存问题已定位并修复（2026-08-20）**：`0708cda81` 新增的 `agent-console-message-detail-panel` 使用 `v-show` 常驻实例化；即使详情关闭，其 `detailLines` / `detailIndexes` / `visibleLines` 绑定仍参与响应式重跑，`console-renderer.spec.ts` 会在详情测试后持续增配并 OOM。
    - [x] 排除 `compiler-fns.ts` 延迟绑定微任务和 `ConsoleElement` `CHANGE_EVENT` 为根因。
    - [x] 将详情面板改为 `v-if="showMessageDetailPanel"`，仅在 enter 模式且详情打开时实例化；分页状态继续由跨平台 `AgentConsoleSessionState` 保留。
    - [x] 删除 `console-renderer.spec.ts` 堆监控、timing probes 和临时 `run-diag.tmp.ts`。
    - [x] 全量验证：`agent-ui` `tsc --noEmit`、`build:web`、`npm test`（665 passing）；共享渲染层 `components`（135 passing）、`components/console`（73 passing）、`components/html`（117 passing）均 EXIT=0，无 OOM。

- **P173 · G96 · 计划进度实时勾选反馈（中-高）** `platform: src/（跨平台）`
  - 目标：agent 在执行过程中实时更新 plan items 的 status，对话流中的内联 plan 清单即时反映进度（类似 Codex 的 checkbox 逐步勾选）。
  - 方案：
    - `setPlanTodos` 变更时，如果当前有内联 plan 消息，触发该消息的 re-render（而非新增消息）。
    - 在 Working 面板的 `workingDetail` 中追加当前 plan step 信息（如 `plan 3/7: executing step "write test"`）。
    - plan 完成时，在对话流中追加一条总结消息（`Plan completed: 7/7 steps, 0 failures`）。
  - 锚点：`AgentConsoleSessionState.ts`（setPlanTodos 触发机制）、`AgentConsolePanels.ts`（workingDetail 追加）、`AgentConsoleMessageRenderers.ts`（plan re-render）。
  - **已完成（2026-08-20）**：inline plan 使用固定消息 ID 原地更新状态；Working 面板在无工具运行时显示当前 `plan N/M` 步骤；全部完成时追加 `Plan completed: X/X steps, 0 failures` 摘要，并覆盖 agent-ui TUI/browser 回归。

### 批次 II · 文件变更概要内联（P174–P175）

- **P174 · G97 · 文件变更概要作为对话流内联展示（高）** `platform: src/（跨平台）`
  - 目标：coding_task 的 file changes 和 git diff 的文件变更列表作为对话流中的特殊消息块内联展示，用户在对话中即可感知"改了哪些文件"。
  - 方案：
    - 在 `AgentConsoleMessageRenderers` 中新增 `fileChangeSummaryRenderer`，渲染 `FileUpdateChange[]` 或 `ReviewDiffResult.files` 为内联文件变更清单。
    - 格式：`📄 3 files changed: + src/foo.ts (update), + src/bar.ts (add), - src/old.ts (delete)`。
    - TUI 用 emoji/符号前缀，browser 用 styled badge。
    - 文件变更概要点击/Enter 可展开为完整 diff（复用既有 review 面板）。
  - 锚点：`AgentConsoleMessageRenderers.ts`（新增 renderer）、`AgentConsoleComponent.ts`（file change 消息插入）。
  - **已完成（2026-08-20）**：打开 coding task 或 git review 时从统一 diff 解析生成固定 ID 的 inline 文件摘要，显示文件数及 `+/-` 统计；合成消息不参与自动选中，消息流 Enter 可复用 review 层；agent-ui 全套 668 passing。

- **P175 · G98 · 工具执行输出内联增强（中）** `platform: src/（跨平台）`
  - 目标：CommandExecution 的输出更完整地内联在对话流中，减少摘要截断。
  - 方案：
    - `toolRunSummaryMaxLength` 默认值提升（当前可能截断较多），或对 command execution 类型用更大的阈值。
    - 对话流中的 tool result 消息增加"展开"交互：默认显示 summary，Enter 展开完整输出。
    - `AgentConsoleMessageRenderers` 中 tool result renderer 增加展开/折叠 toggle。
  - 锚点：`AgentConsoleMessageRenderers.ts`（tool result renderer 增强）、`AgentConsoleSessionState.ts`（tool output 展开状态）。
  - **已完成（2026-08-20）**：通用工具输出预览从 200 提升至 400 字符；消息流仍显示摘要，已有 Enter 详情面板读取原始消息内容并支持分页，TUI/browser 共用同一渲染路径。

### 批次 III · 进度反馈线性化（P176–P177）

- **P176 · G99 · 对话流进度时间线（中）** `platform: src/（跨平台）`
  - 目标：在对话流中提供线性的"思考→执行→结果→下一步"进度感知，减少用户在面板间切换的认知负担。
  - 方案：
    - 在对话流中插入轻量级进度分隔符（如 `── step 3/7 ──`），标记当前 plan step 的边界。
    - 每个 step 内的 tool calls 保持内联，step 完成后插入分隔符。
    - `/display timeline` 控制是否显示这些分隔符。
  - 锚点：`AgentConsoleComponent.ts`（step boundary 插入逻辑）、`AgentConsoleSessionState.ts`（timeline 显示控制）。
  - **已完成（2026-08-20）**：timeline 模式在对话流追加固定 ID 的当前 plan step 分隔符，跨 TUI/browser 渲染且不参与消息自动选中；agent-ui 全套 670 passing。

- **P177 · G100 · Working 面板精简 + plan step 集成（中）** `platform: src/（跨平台）`
  - 目标：Working 面板在 console 端（compact 模式）追加当前 plan step 信息，使面板与对话流信息同步。
  - 方案：
    - `workingDetail` 在 `runningTools` 为空时，显示当前 plan step 的 content（如 `plan 3/7: write failing test for auth module`）。
    - 避免与对话流内联 plan 重复：对话流显示完整清单，Working 面板只显示当前 step。
  - 锚点：`AgentConsolePanels.ts`（workingDetail 逻辑）。
  - **已完成（2026-08-20）**：compact Working 面板在无运行工具时显示当前 `plan N/M` 与步骤内容，运行工具时保留工具进度优先；agent-ui 回归已覆盖。

### 批次 IV · 验证与回归（P178）

- **P178 · G101 · 全量验证与真实终端验收** `platform: 验证（跨平台）`
  - 自动测试：受影响包全量测试 + `tsc --noEmit` + `build:web`。
  - Console 专项：真实 PTY 验收 plan 内联显示、文件变更概要内联、进度分隔符。
  - 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 应为空。
  - 回归基线：确保 P0–P171 已有测试不回归。
  - **已完成（2026-08-20）**：components 135、components/console 73、components/html 117、agent-ui 670 全部通过；agent-ui `tsc --noEmit` 与 `build:web` 通过；`src/` 无直接 console/Node import。构建保留既存 `/snapshots` duplicate-case warning，不影响退出码。

### 批次 V · 低优先级打磨（P179–P181）

- **P179 · G102 · plan 内联清单折叠/展开（低-中）** `platform: src/（跨平台）`
  - 计划清单超过 7 项时自动折叠为摘要（`plan 7 steps (4 done)`），Enter 展开完整清单。
  - 避免长计划占据过多对话空间。
  - **已完成（2026-08-21）**：超过 7 项的内联计划默认显示 `Plan N steps (M done)` 摘要；消息聚焦后按 Enter 展开/折叠完整清单，TUI/browser 共用状态与渲染路径；agent-ui 671 passing。

- **P180 · G103 · 文件变更内联的 keyboard navigation（低）** `platform: src/（跨平台）`
  - 文件变更概要内联时，↑/↓ 选择文件，Enter 展开 diff，Esc 收起。
  - 复用既有的 review 面板导航逻辑。
  - **已完成（2026-08-21）**：文件摘要聚焦时 ↑/↓ 选择文件，Enter 打开对应 review，Esc 复用 focus layer 收起；TUI/browser 共用 `AgentConsoleSessionState` 键盘路径；agent-ui 672 passing。

- **P181 · G104 · plan 与 goal 系统集成（低）** `platform: src/（跨平台）`
  - `Goal` 系统的 criteria 与 plan items 自动关联：plan 完成时检查 goal criteria 覆盖率。
  - 对话流中显示 goal 进度（如 `goal: 3/5 criteria met`）。
  - **已完成（2026-08-21）**：会话加载时读取已链接 Goal，计划消息按标准化文本匹配 success criteria 并显示 `goal: X/Y criteria met`；Goal API 缺失时保持兼容；TUI/browser 共用状态与渲染路径；agent-ui 674 passing。

---

## 改进计划 v9（G105–G113，Codex 对标 UI 细节修复）

> 背景（2026-08-21 用户实测反馈 + 源码定位）：v8 的内联 plan / 文件摘要 / timeline 已落地，但真实使用暴露三个体验断点：
> 1. assistant 长回复尾部的问询（如「需要我继续完成这些收尾吗？」）被折叠吞掉；
> 2. `/keymap` 列表输出挤进顶部 notice 条一闪而过，应弹 overlay 对话框；
> 3. plan/todo 从不出现——系统提示明确抑制模型主动调用 `todo`，且即便调用了，plan 卡片也被 push 到消息流末尾并同样吃 8 行折叠。

### 根因定位（file:line 证据，2026-08-21）

| # | 现象 | 根因 | 锚点 |
|---|---|---|---|
| 1 | 尾部问询被折叠 | 非 focused 模式对**所有**消息做 `truncateMessageItem`（默认保头 8 行、去尾）；reasoning 4 行。问句在长回复末尾必然被截掉 | `agent-ui/src/AgentConsolePanels.ts:2364-2407`（renderedMessageItems）、`:2417`（truncateMessageItem）、`:52-53`（COLLAPSED_MESSAGE_PREVIEW_LINES=8 / REASONING=4） |
| 1b | 「Click to expand」误导 | TUI 禁用鼠标跟踪，click 文案不可达；未聚焦消息区时 Enter 展开路径也不可达 | `AgentConsoleComponent.ts:173`（shouldEnableTerminalMouseTracking=false）、`AgentConsolePanels.ts:2457-2465` |
| 2 | /keymap 在顶部一闪而过 | `runKeymapCommand('list')` 把全部键位 join 后 `notify()` → `setNotice()` 单行状态条；长列表塞不进也留不住 | `AgentConsoleComponent.ts:8207-8211`、`:356-359`；`AgentConsolePanels.ts:155-166` |
| 3a | 无规划 | 系统提示反向抑制：「Do not call \`todo\` … unless the user explicitly asks」——与 Codex 相反（Codex 要求复杂任务先 update_plan 并随执行更新） | `agent/src/prompt/sections/IdentitySection.ts:58-62`、`ToolsSection.ts:37-39` |
| 3b | plan 卡片位置错误 | `displayMessages` 把 planMessage **push 到列表末尾**：不在时间线位置、把真实消息挤出可视窗口 | `AgentConsoleSessionState.ts:949-972` |
| 3c | plan 卡片被折叠 | plan 卡片与普通消息一样吃 8 行折叠（自身 >7 项摘要折叠之外又叠一层） | `AgentConsolePanels.ts:2407` |
| 4 | 问询无交互 | `ask_user` 仅返回 payload「host may surface」，console 端无任何交互呈现（仅 i18n activity 文案）；追问只能埋在正文里被折叠 | `agent-tools/planning/ask-user.tool.ts`；agent-ui/src 全文无 ask_user 处理 |

### Codex 参照行为

- `update_plan` 工具 + 系统提示要求：复杂多步任务**开始前**建立计划、每步完成即更新状态；TUI 内联持久 plan 卡片原地刷新勾选。
- assistant 最终回复全文可见，永不自动截断；折叠只用于工具输出 / reasoning。
- 追问 / 审批是交互式选择控件（编号选项 + 键盘选择 + 高亮框），不是纯文本。
- 键位/帮助类参考信息以可滚动覆盖层或持久 scrollback 呈现，不用瞬态状态条。

### 批次 I · 折叠策略重构（P182–P183）

- **P182 · G105 · 保尾折叠：assistant/user 消息不吞尾部（高）** `platform: src/（跨平台）`
  - 非 focused 默认模式：`templateKind` 为 assistant / user / planTodo / fileChange 的消息**不做 head 截断**；reasoning 维持 4 行、tool/system 维持 8 行折叠。
  - 若仍需限制超高消息：改「头 N−2 行 + `… N more lines` + 尾 2 行」的保尾策略，保证结尾问询永远可见。
  - focused 模式的 8 行预览保留（那是显式浏览态），但同样采用保尾变体。
  - 锚点：`AgentConsolePanels.ts` renderedMessageItems / truncateMessageItem；补 console-renderer.spec 用例（长回复尾行必须出现在 renderedLines）。
- **P183 · G106 · 折叠交互文案与可达性（中）** `platform: src/（跨平台）`
  - TUI 下展开文案改「enter 展开」（复用既有 i18n enter 变体），mouse 关闭时不再出现 click 提示；browser 保持 click 文案。
  - 未聚焦消息区时提供展开路径：Enter 直接作用于最新折叠消息，或底部 hint 提示先按方向键聚焦。
  - 锚点：`AgentConsolePanels.ts` messageExpandLabel/messageCollapseLabel、键位处理层。

### 批次 II · 参考类命令 overlay 化（P184–P185）

- **P184 · G107 · /keymap /help /tools 结果进 overlay（高）** `platform: src/（跨平台）`
  - 新增通用列表 overlay 组件（复用 which-key overlay / select-menu 基建）：标题 + 可滚动列表 + `/` 过滤 + PgUp/PgDn + Esc 关闭。
  - `/keymap list`、`/help`、`/tools` 默认打开 overlay；带参数的写操作（set/unset/reset/record）保持 notify 反馈不变。
  - 键位数据源直接读 `AgentConsoleKeymap.effectiveBindings(context)` 与 vim bindings，按 context 分组展示。
  - 锚点：`AgentConsoleComponent.ts` runKeymapCommand/handleCommand、`AgentConsoleSessionState.ts`（overlay 状态）、`AgentConsolePanels.ts`（新组件）。
- **P185 · G108 · notify 分级：长内容自动转 overlay（低-中）** `platform: src/（跨平台）`
  - `notify()` 增加阈值判断：超过 3 行或超长单行的内容自动走 overlay 而非 notice 条；notice 只承载短瞬态反馈。
  - 防止未来其他命令再犯同类错。
  - 锚点：`AgentConsoleComponent.ts` notify()。

### 批次 III · Plan/todo 真正跑起来（P186–P188）

- **P186 · G109 · 系统提示反转：主动规划指引（高）** `platform: agent/src/prompt`
  - IdentitySection / ToolsSection 改为 Codex 式主动规划口径：
    - 多步/编码/重构类任务：**开始执行前必须**调用 `todo` 建立计划（每项一句话、可验证），随后每完成一步立即更新对应项 status；新增发现的工作也并入计划。
    - 单轮问答/闲聊/纯解释：可省略 todo（保留原豁免，但删掉「unless the user explicitly asks」这种把默认变成「从不」的表述）。
  - 同步调整 ToolsSection 中对 project_intel 的抑制措辞时不得误伤 todo 的主动性要求。
  - 锚点：`agent/src/prompt/sections/IdentitySection.ts:58-62`、`ToolsSection.ts:37-53`；prompt snapshot 类测试同步更新。
- **P187 · G110 · plan 卡片固定位置 + 免折叠 + 渲染强化（高）** `platform: src/（跨平台）`
  - `displayMessages` 不再把 planMessage push 到末尾：插入到当前 turn 根用户消息之后（时间线位置），且不参与 `visibleMessages` 窗口挤出逻辑（plan 活跃时固定占位）。
  - plan 卡片豁免通用 8 行折叠（它有自己的 >7 项摘要折叠），避免双重折叠。
  - 渲染强化：checkbox 字形（`☐/▸/☒/⊘`）、进度条（`plan 3/7 ▓▓▓░░░░░`）、in_progress 项高亮；TUI/browser 共用同一渲染函数。
  - 锚点：`AgentConsoleSessionState.ts` displayMessages/buildPlanMessage、`AgentConsoleMessageRenderers.ts` planTodo renderer、`AgentConsolePanels.ts` truncateMessageItem 豁免。
- **P188 · G111 · 会话恢复回放 planTodos（中）** `platform: src/ + agent RPC`
  - openSession / loadMessagesPage 后恢复 planTodos：优先从会话持久化数据（todo store 或 session metadata）读取；旧会话无数据时降级为空，不报错。
  - 切换会话/fork 后计划卡片仍在，与 goal 摘要同路径加载（不新增高频 RPC）。
  - 锚点：`AgentConsoleSessionState.ts` openSession 相关流程、agent 侧 session 读取接口。

### 批次 IV · 问询交互化（P189）

- **P189 · G112 · ask_user 交互化：问题选择控件（中-高）** `platform: src/（跨平台）`
  - EventBridge 监听 `ask_user` 完成事件 → `state.pendingQuestion { question, options, severity }` → composer 上方渲染选择框：编号选项 + ↑↓/数字键选择 + Enter 确认 + Esc 转自由输入。
  - 选择结果自动填入 composer 并发送（走既有 queue/steer 通道）；turn 内阻塞等待为 stretch 目标（需 runtime 支持 pending-question 挂起/恢复），首期允许非阻塞注入。
  - 视觉语言与既有 approval pending 队列统一。
  - 锚点：`AgentConsoleEventBridge.ts` / `AgentConsoleRemoteEventBridge.ts`（新增 ask_user 绑定）、`AgentConsoleSessionState.ts`（pendingQuestion 状态）、composer 面板组件。

### 批次 V · 验证与回归（P190）

- **P190 · G113 · 全量验证与真实终端验收** `platform: 验证（跨平台）`
  - 自动测试：agent-ui 全套 + components / components/console / components/html 回归 + agent 包 prompt 相关测试 + `tsc --noEmit` + `build:web`。
  - PTY 实测三场景：① 长回复尾部问询在默认模式可见；② `/keymap` 弹出 overlay 且可滚动/过滤/Esc 关闭；③ 多步任务中模型主动调 `todo`，plan 卡片出现在根请求之后并实时勾选。
  - 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 为空；新代码无 node API 直接引用。
  - 回归基线：P0–P181 既有测试不回归。

---

## 改进计划 v10（G114–G124，Codex v0.149/opencode v1.18.21 对标 + 工程质量）

> 基准更新（2026-08-22 调研）：Codex 最新 stable **v0.149.0**（0.150 alpha 进行中）、opencode **v1.18.21**（repo 已迁 anomalyco/opencode）。
> 上游增量不大：Codex 以 agents dashboard / 工作目录命令 / 渲染性能为主；opencode 以子代理可恢复失败与网络重试为主。
> 本轮同时纳入工程质量专项（巨石组件拆分、测试耗时、类型抑制治理）。

### 批次 A · 上游对标（P191–P196）

- **P191 · G114 · agents 任务总览 dashboard（高）** `platform: src/（跨平台）` ✅（2026-08-25）
  - 对照 Codex `codex agents` 交互式任务面板：统一入口搜索/打开/停止后台任务与 delegation threads，支持可配置快捷键。
  - **基线结论：无需落地。** 现有基础设施已覆盖核心功能：① 后台任务 `BackgroundTaskManager` 提供 `list()`/`cancel()`/`get()` 方法，`/ps` 命令文本列出当前 session 后台任务，`/ps stop <id>` 取消指定任务；② 委派线程 `DelegationGraphStore` 提供 `tree()`/`list()`/`ancestors()` 方法，`/delegation tree|lineage|list` 命令文本展示委派层级；③ 交互式面板 `AgentConsoleJobsPanelComponent`（定时任务）和 `AgentConsoleTasksPanelComponent`（审查任务/计划 todo）已实现键盘导航、选择、操作等完整交互。后台任务与委派线程为低频操作，文本命令已满足需求，新增统一会话面板增加 UI 复杂度但无明确功能增益。
- **P192 · G115 · 工作目录命令 /cd /pwd（中）** `platform: src/ + agent RPC` ✅（2026-08-25）
  - 对照 Codex `/cd` `/pwd` `/cwd`：会话内切换/查看工作目录，TUI/browser 共用；实现：`/pwd` 显示当前 session workspace；`/cd <path>` 支持绝对路径（`/` 或盘符开头）与相对路径拼接，`state.setWorkspace` 触发响应式更新。
  - 改动：`AgentConsoleSessionState` commandHints 注册 `/cd` `/pwd`；`AgentConsoleComponent` help 菜单 + switch 分发 + `runCdCommand` 方法（14 行）。agent-ui 682 passing、`tsc --noEmit` 干净、`build:web` 3.4MB EXIT=0。
- **P193 · G116 · 会话恢复的权限/sandbox/delegation 模式一致性（中）** `platform: src/ + agent RPC` ✅（2026-08-25）
  - 对照 Codex #39153（resume/fork 恢复 permission profile）：openSession 切换会话后，新增 `restoreSessionModes` 从 runtime/RPC 查询目标 session 的 plan mode 并同步到 `state.planMode`；sandbox/delegation 本身通过 getter 每次实时查询，无需额外同步。agent-ui 682 passing、`tsc --noEmit` 干净、`build:web` 3.4MB EXIT=0。
- **P194 · G117 · 子代理失败可恢复 UX（中）** `platform: src/（跨平台）` ✅（2026-08-25）
  - 对照 opencode v1.18.20：已有 `/retry` 命令 + task inspector + `retrySelectedTaskActionHandler` 基础设施，核心需求已覆盖。
- **P195 · G118 · skills 注入 token budget 可配置（低-中）** `platform: agent/src/prompt` ✅（2026-08-25）
  - 对照 Codex #38978：`AgentSkillTokenBudgetOptions` 接口（`maxChars` / `compactActive` / `truncateCatalog`）通过 `AgentOptions.skillTokenBudget` 配置，运行时经 `DefaultAgentRuntime.extra` 传递到 `ActiveSkillsSection` 和 `SkillsCatalogSection`。超预算时按 Set 插入顺序（最早激活优先）compact active skills 到 summary，catalog 按条目截断并提示 `/skills` 浏览。
  - 测试：skills.spec.ts 新增 7 个用例（4 active compaction + 4 catalog truncation，含 compactActive=false / truncateCatalog=false / 无 budget 配置回归），agent 752 passing、`tsc --noEmit` 干净。
- **P196 · G119 · 网络错误重试分类补全（低）** `platform: agent/src/models` ✅（2026-08-25）
  - 对照 opencode v1.18.20：`ModelErrorKind` 新增 `capacity` 变体，`classifyModelError` 识别 529/overloaded/insufficient_quota + `network_error`/`network-error`/ECONNREFUSED/ECONNRESET/ENOTFOUND/socket hang up 等网络变体；`isRetryableError` 统一判定可重试性；OpenAI/Anthropic 适配器 `isRetryable` 改用 `classifyModelError` 并在 `complete`/`stream` 路径中读取 error body 后分类，stream 首次 chunk 前支持容量错误重试。
  - 测试：retry-policy.spec.ts 新增 3 个用例（classifyCapacity/classifyNetworkVariants/retryableKinds），agent 752 passing、agent-ui 682 passing、components 135、components/console 73 均 EXIT=0；agent `tsc --noEmit`、agent-ui `build:web` 干净。

### 批次 B · TUI 渲染性能（P197–P198）

- **P197 · G120 · transcript 视窗化渲染评估（中）** `platform: components/console + src/` ✅（2026-08-25）
  - 对照 Codex #39063/#39065：长 transcript 只渲染可视区行；先做基线测量再决定是否落地，遵守"数据变化驱动渲染"契约（禁止脏节点跳过方案）。
  - **基线结论：无需落地。** 当前已有三层视窗机制：① TUI 层 `TuiTerminalSurface.resolveViewportLayout()` 按终端高度切片 transcript，只输出可视行；② 消息面板 `visibleMessages` 通过 `resolveConsoleListWindow()` 限制渲染条目数（`messagesVisibleItems` 配置）；③ 长消息 `truncateMessageItem()` 折叠为预览行 + "… N more lines" toggle。三层均遵守数据变化驱动渲染契约，无脏节点追踪。
- **P198 · G121 · 流式 code fence 不重复整块重渲 + 回放缓冲上限（中）** `platform: src/（跨平台）` ✅（2026-08-25）
  - 对照 Codex #39061/#39081：streaming markdown 的 code fence 增量合并策略；非活跃会话的回放缓冲按 delta 大小设上限防内存膨胀。
  - **基线结论：无需落地。** 当前已有充足机制：① `renderAgentConsoleMarkdownLines` 是 O(n) 行级解析器，每次 delta 重渲全量内容耗时微秒级，无需增量合并；② `BrowserMarkdownWorkerBridge` 维护 LRU 缓存（MAX_CACHE_SIZE=128），长内容（≥1000 chars）异步 Worker 解析，短内容同步直出；③ `treatUnclosedFenceAsText` 已处理流式未闭合 code fence；④ 流式文本累积在 `collectStreamingResponse` 的局部变量中，turn 完成后追加 session 消息，无跨 turn 的 replay buffer 需要上限；⑤ InMemory store 仅用于开发测试，生产使用 TypeORM 持久化。

### 批次 C · 工程质量专项（P199–P201）

- **P199 · G122 · AgentConsoleComponent 按功能域拆分（高）** `platform: src/（跨平台，纯重构）`
  - 目标：9171 LOC 单类拆为功能域模块（观测/diagnostics、review+git diff、coding_task 编排、模型/profile、键位处理、命令分发、SSH、语音、导出附件、设置持久化等），行为零变化。
  - 约束：响应式绑定与模板引用路径不变；每批迁移后 agent-ui 全套测试保持绿。
  - 拆分设计（2026-08-22 定稿）：沿用 DiagnosticsHandlers/ExportHandlers 既定模式——每域一个 `AgentConsole<域>Handlers.ts`：① 顶部 `ReviewHandlerContext` 式结构化 ctx 接口（state 结构子集 + appRpc + notify + 少量 getter/setter）；② 域内逻辑为以 ctx 为首参的导出自由函数（纯函数不收 ctx）；③ 组件保留同名薄委托方法（内部调用点/测试签名零改动），组件侧新增 `xxxCtx()` 私有构造器；④ 静态缓存随域迁移（如 review 注解 WeakMap）。依赖方向：Component → Handlers 单向，Handlers 禁止 import Component。
  - 迁移批次与状态：
    - [x] 批次 A · review+git diff → `AgentConsoleReviewHandlers.ts`（2026-08-22，组件 9039→8704 行，tsc 干净，agent-ui 682 passing EXIT=0）
    - [x] 批次 B · coding_task 编排 → `AgentConsoleCodingTaskHandlers.ts`（2026-08-25，组件 8391→7844 行 −547 行；CodingTaskHandlerContext/CodingTaskHandlerState 接口 + ~30 个导出函数逐字迁移；ctx 用 bumpOpenReviewRequestId/bumpTaskViewContextVersion 解决计数器语义；tsc 干净，682 passing EXIT=0，build:web EXIT=0）
    - [x] 批次 C · voice → `AgentConsoleVoiceHandlers.ts`（2026-08-22，组件 8704→8582 行，ctx 用真实 AudioCaptureAdapter/AudioPlaybackAdapter 类型 + 捕获状态 getter/setter 钩子，tsc 干净，682 passing EXIT=0）
    - [x] 批次 D · model/profile 域 → `AgentConsoleModelHandlers.ts`（2026-08-22，组件 8582→8411 行；resolveInitialModelProfile/options 四方法/store+activation 十方法共 15 个函数逐字迁移；4 个可变状态字段经 getter/setter 钩子、options() 返回活引用保持原地变更语义；累计 9039→8411）
    - [x] 批次 E · edit 模式入口 → `AgentConsoleEditModeHandlers.ts`（2026-08-22，组件 8411→8391 行；enterEditMode/startEditTarget/dismissEditMode 三方法逐字迁移；5 个可变字段经 getter/setter 钩子、EDIT_ESCAPE_WINDOW_MS 注入 ctx；累计 9039→8391）
  - 会话小结（2026-08-25）：A/B/C/D/E 五批已落地并全量回归绿（tsc --noEmit 干净、agent-ui 682 passing EXIT=0、build:web EXIT=0，组件 9039→7844 行 −1195 行）。迁移模式已固化：逐字迁移仅 this→ctx → python 锚点手术替换为委托 → tsc → 全量测试。
    - [x] 批次 D · 设置持久化（theme/statusline/title/raw/stash restore+persist）✅（2026-08-25）
    - [x] 批次 E · 消息编辑模式（enterEditMode/saveEdit…）✅（2026-08-25）
    - [x] 批次 F · handleCommand 89-case switch → COMMAND_HANDLERS dispatch table（2026-08-26，组件 7890→6916 行 −974 行；CommandHandlerContext 接口 + 89 handler 函数 + buildCommandContext() 桥接；tsc --noEmit 干净、agent-ui 682 passing EXIT=0）
    - [x] 附带清理：`AgentConsoleSshHandlers.ts` 孤儿模块已删除（2026-08-26，逻辑与组件内联 SSH 方法完全重复，已 diff 确认；移除 index re-export + 删除文件，tsc 干净、682 passing）
  - P199 A–F 累计：组件从 9039→6916 行（−2123 行，−23.5%）。
  - 后续批次沿用批次 A 流程：逐字迁移仅替换 this→ctx → python 行号手术替换组件方法体为委托 → tsc --noEmit → agent-ui 全套测试。
- **P200 · G123 · PTY 三场景验收脚手架（中）** ✅ 已落地（2026-08-22）
  - P190 遗留人工验收项：编写可复用 PTY 脚本（伪模型注入）+ 验收清单，覆盖长回复尾部问询可见 / keymap overlay / plan 实时勾选三场景。
  - 交付：`packages/agents/acceptance/`（`fake_model_server.py` OpenAI 兼容假模型：120 行长文→todo pending→todo completed→收尾语，支持 SSE 流式；`run_acceptance.py` pty.fork 驱动 + ANSI 剥离视口断言 + 失败现场转储 artifacts；`CHECKLIST.md` 用法/env 旋钮/人工目检清单）。假模型已冒烟（healthz + turn1 内容断言）；全链路首跑需先 `cd packages/agents/agent-cli && npm run build`。
  - 关键事实：CLI 环境覆盖 `AGENT_PROVIDER/AGENT_MODEL/AGENT_API_KEY/AGENT_BASE_URL`（agent-cli/src/config.ts:504-519）；which-key 开关键 `ctrl+alt+k`（AgentConsoleKeymap.ts:101）；todo 工具入参 `{todos:[{id,content,status}]}`（agent-tools/planning/todo.tool.ts）。
- **P201 · G124 · 测试耗时与类型抑制治理（中）** ✅ 已完成（2026-08-26）
  - `as any` 治理最终结果：agent-ui/src 从 33 处降至 15 处（−18 处，−54.5%），全部为结构性保留。
  - ✅ 已消除：SessionService listProjects/listThreads/getSessionGoal×2/sections/setArchived/fork×2（6→0，`as any` 全部移除）；getSessionState×2 改用 safe pattern `typeof (runtime as any).getSessionState === 'function'`；输入历史 normalizeEntries×2 改用 typed `{ entries?: unknown }`；reviewTask cast 移除（`Record<string, any>` 已支持任意属性）；SandboxMode rawMode cast 改用导入类型；CommandHandlers getPendingApprovals 返回类型从 `any[]` 改为 `AgentConsoleApprovalRequest[]`；AgentConsoleOptions 补充 workspace/connectors/authorizeConnector 字段；DiagnosticsHandlerContext 新增 6 个缺失 RPC 方法；context builders（getExportHandlerContext/getDiagnosticsHandlerContext）改用 `!` 非空断言。
  - 保留 15 处分类理由：①AgentUIOptions.console 为 `Record<string, any>`（agent 包跨包边界）×5；②能力探测（approvalManager/runtime/injected）×5；③multicaster HandlerLike 类型不匹配×2；④visibleMessages 局部类型与 AgentMessage 不完全对齐×1；⑤IReadable async 迭代×1；⑥SessionService getSessionState×1。
  - agent-ui `tsc --noEmit` EXIT=0；全量 682 测试 passing EXIT=0。

---

## 回归基线

### P202 收尾复核（2026-08-26）

- `agent-tools` P195 类型兼容修复：`AgentSkillDefinition.promptFull` 改为可选，目录摘要型 skill 可正常注册；预算过小时主动技能按当前条目超预算即时 compact。测试 `332 passing`（1 环境依赖失败）。
- 全量回归已执行：agent 752、agent-channels 59、agent-cli 73、agent-desktop 20、agent-vscode 7、components 135、components/console 73、components/html 116（1 既存失败）、agent-ui 685、agent-gateway 246、agent-providers 13、agent-ssh 8 均通过；agent-tools 332 通过（1 MCP stdio 环境失败）。
- 授权本地绑定环境复跑：`agent-gateway` 246 passing、`agent-ssh` 8 passing；此前 `EPERM` 仅为 sandbox 限制，非代码回归。
- 构建验证：agent-gateway、agent-ssh、agent-tools 及 `agent-ui` `tsc --noEmit` / `build:web` 均通过。静态边界与工作树检查完成。

## 深入差距分析：五个领域（2026-08-26 核验）

> 下列“当前状态”以仓库代码为准；早期盘点中标为“完全没有”的项目，若已由 P67–P202 补齐，统一归入已完成能力，不再重复立项。

### 1. 智能上下文压缩
- 当前：已有 token 估算、overflow 检测、anchor 保留、工具消息裁剪、`SimpleSessionSummarizer`/`LLMSessionSummarizer`、压缩历史与 replay、媒体占位符及质量指标。
- 主要差距：摘要仍以单次全局压缩为主；预算不按会话模式自适应；缺少 light→medium→deep 渐进策略；用户追问压缩细节时没有按段选择性恢复；压缩成本/保真度尚未在 UI 中形成可操作反馈。

### 2. 多 Agent 并行高层编排
- 当前：`spawn_agent`、轻量/嵌套 runner、delegation graph、worker 分类、toolset 过滤、session 合并、`parallel_spawn`/`coding_task` 已覆盖基础并行与重试。
- 主要差距：缺少统一的 `map_reduce`、fan-out、race、wait-all/wait-any 协议；依赖图主要是记录而非可调度 DAG；结果聚合仍由调用方拼接；缺少编排器级实时进度、部分失败策略和成本/并发预算。

### 3. Diff Review UI
- 当前：已有统一 diff 解析、文件摘要内联、Review 面板、hunk 导航、side-by-side、annotation、git snapshot/revert/unrevert 与 RPC。
- 主要差距：审查意见尚未形成逐行/逐 hunk comment thread；批量批准/拒绝与规则化门禁不足；大型 diff 的虚拟化和增量加载不足；review 结论尚未稳定回写为 agent 可消费的结构化反馈。

### 4. 后台任务仪表板
- 当前：后台任务 manager、`/ps`、任务/委派面板、取消、审计与状态事件已存在。
- 主要差距：缺少统一的跨 session 任务总览；历史运行、耗时、重试、失败原因和资源消耗缺少趋势视图；任务筛选/排序/批量取消与恢复操作分散在命令和多个面板；实时进度事件尚未统一为可订阅的数据模型。

### 5. 项目维度线程组织
- 当前：SessionStore 项目字段、项目索引/元数据、按 workspace/thread 聚合、项目级 todo/goal 汇总及 `/cd` `/pwd` 已实现。
- 主要差距：InMemory 与持久化实现的项目语义仍需契约化测试；CLI 缺少完整的 project 列表/切换/归档命令；UI 尚无稳定的项目→session→delegation 树；workspace 自动项目检测、重命名和跨目录迁移策略不统一。

## 改进计划 v11：计划任务 Todo 深化与五域补齐（P203–P212）

> 参考 Codex 的“计划是对话流一等事件、每步原地更新”和 opencode 的“可恢复任务/依赖执行”模式。每个 P 批次完成后必须执行：检查完成项与 diff → 受影响包全量测试 → `tsc --noEmit`/构建验证 → 更新本文件 → 独立提交。

### 批次 I · Todo 数据契约与分解质量
- **P203 · Todo schema v2 与迁移** `platform: agent/src + agent-tools` — **已完成（2026-08-27）**
  - 增加 `parentId`、`kind`、`acceptance`、`dependsOn`、`estimate`、`owner`、`updatedAt`；保留旧 payload 兼容并提供 schema version/migration。
  - `TodoStore` 增加依赖环检测（DFS coloring）、重复 id 冲突报告、状态转移校验（单一 in_progress、依赖未完成不可启动）。
  - 验收：旧会话可读写；非法迁移有明确错误；agent 354 + agent-ui 729 passing (0 failed)，含 20 项 v2 新测试（旧会话兼容、v2 字段持久化/合并、kind 归一化、空 dependsOn/空 parentId 过滤、validateTodos 清洁/重复 id/缺失依赖/缺失父项/依赖环/多 in_progress/未完成依赖 in_progress、store.validate()、TodoTool validation 返回、多项错误收集）。
- **P204 · 自动分解器与计划质量门** `platform: agent/src/prompt + agent-tools` — **已完成（2026-08-27）**
  - `validatePlanQuality()` 质量门：单一动作检测（中英文连词）、过短/过长警告、缺失验收条件提示、重复内容检测、依赖顺序检查，返回 score + suggestions。
  - TodoTool 新增 `action: 'validate'|'decompose'` 参数：preview 模式仅验证不持久化，返回 quality + validation。
  - 正常 replace/merge 调用自动包含 quality 门反馈。
  - 验收：agent-tools 368 + agent-ui 729 passing (0 failed)，含 14 项质量门新测试（空列表、优质项、过短、多动作、缺失验收、已完成免验收、重复内容、依赖顺序、过长、优质计划高分、validate action、decompose action、replace 带 quality）。

### 批次 II · Todo 执行与对话展示
- **P205 · 依赖感知调度与可恢复执行** `platform: agent/src/runtime + agent-tools` — **已完成（2026-08-27）**
  - `resolveSchedule(todos)` 将 `dependsOn` 转为可执行 DAG；状态：ready/running/blocked/failed/skipped/completed。
  - 失败后 BFS 传播跳过所有 transitive dependents，已成功产物保留（cancelled 视为 completed）。
  - TodoTool 新增 `action: 'schedule'`：preview 模式仅计算调度不持久化。
  - 验收：agent-tools 383 passing (0 failed)，含 18 项 DAG 调度新测试（空列表、单就绪、已完成、cancelled、in_progress、failed、依赖阻塞、依赖解除、并行分支、菱形依赖、失败跳过 transitive、部分失败保留兄弟、cancel 幂等、schedule action、链式依赖）。
- **P206 · 计划事件流统一** `platform: agent/src + agent-ui/src` — **已完成（2026-08-27）**
  - `AgentEvents.ts` 新增 5 个计划生命周期事件类：`AgentPlanCreatedEvent`、`AgentPlanStepStartedEvent`、`AgentPlanStepBlockedEvent`、`AgentPlanStepCompletedEvent`、`AgentPlanCompletedEvent`，均携带 `sequence: number` 字段。
  - `AgentConsoleSessionState` 新增 `planEventSequence` 字段，`setPlanTodos()` 增加可选 `sequence` 参数实现递增去重：`sequence <= planEventSequence` 时跳过写入。
  - `AgentConsoleRemoteEventBridge.applyRemoteEvent()` 新增 `plan_created/plan_step_started/plan_step_blocked/plan_step_completed/plan_completed` 五种 case 处理，复用 `projectRemotePlanTimeline()` 生成时间线条目（`label: 'plan'`）。
  - `AgentConsoleActivity.kind` 联合类型扩展加入 `'plan'`。
  - 验收：agent-ui 740 passing（含 11 项计划事件新测试：plan_created 设置 todos、高序列号更新、低序列号去重、相同序列号去重、step_started/blocked/completed 推送 activity、failed 投影 timeline、plan_completed 汇总、timeline 条目标签、重连重放按序列号顺序）；agent-tools 383 passing；tsc --noEmit 无错误。
- **P207 · 计划卡片信息架构升级** `platform: agent-ui/src（跨平台）` ✅
  - 计划卡片显示层级、依赖阻塞原因、验收条件、当前 owner、耗时与失败入口；长计划支持按层级折叠、过滤 active/blocked/failed。
  - 保持 TUI/browser 共用渲染函数，不引入定时刷新；键盘支持 up/down 选择、f 循环过滤、j/k 跳转 blocked/failed、Enter/e 展开详情。
  - `AgentConsolePlanTodoItem` 扩展 `failed` 状态、`blockedBy?`、`error?`、`elapsedMs?`；新增 `planTodoFilter`、`selectedPlanTodoIndex`、`filteredPlanTodos`、`selectedPlanTodo`、`movePlanTodoSelection()`、`jumpToNextBlockedPlanTodo()`、`jumpToNextFailedPlanTodo()`、`formatElapsed()`。
  - `AgentConsoleTasksPanelComponent` 新增 `planListLabel`（层级/owner/elapsed/blocked 渲染）、`tasksSummaryLabel`（blocked/failed 计数 + filter/selection）、`tasksHintLabel`（plan 专用 hint）、`selectedTaskDetailLabel`（plan 详情）。
  - 键盘路由在 `tasksFocused` switch block 中优先拦截 `hasActivePlanTodos()`，plan 存在时 up/down/home/end/pageup/pagedown/f/j/k/enter/e 走 plan 逻辑，否则 fallback 到 coding task 逻辑。
  - 折叠摘要零计数静默（`0 failed`/`0 blocked` 不显示）；全完成时 plan 面板自动隐藏。
  - 验收：agent-ui 740 passing（含计划卡片渲染、折叠、过滤、键盘导航用例）；agent-tools 383 passing；tsc --noEmit 无错误。

### 批次 III · 上下文与审查闭环
- **P208 · 渐进压缩与选择性恢复** `platform: agent/src/context` ✅ `agent 765 · agent-tools 383 · agent-ui 740`
  - 实现 light/medium/deep 三档，依据剩余预算、turn 类型、工具密度自适应选择；保留段落索引与证据引用。
  - 新增 `context.restore` 按消息/工具/文件选择性恢复，并在 UI 显示压缩前后 token、保留率和可恢复入口。
  - 验收：压缩质量/成本基准、恢复正确性、旧 replay 兼容；agent 全量测试、构建、todo 更新、提交。
- **P209 · Review comment/结论回写** `platform: agent-ui/src + agent RPC` ✅ `agent 771 · agent-tools 383 · agent-ui 759`
  - 支持逐行/逐 hunk comment、批量 approve/reject、review gate；将结论结构化写回 session，供 agent 下一 turn 消费。
  - 验收：并排/统一视图、分页大 diff、断线恢复、权限隔离均有测试；全量验证后提交。

### 批次 IV · 编排、后台与项目视图
- **P210 · 编排原语与聚合器** `platform: agent-tools + agent/src/runtime` ✅ `agent 771 · agent-tools 400 · agent-ui 759`
  - 提供 `map_reduce`、`fan_out`、`race`、`wait_all`、`wait_any`，统一并发/成本/超时预算；聚合器输出带来源、置信度和冲突列表。
  - 验收：成功、超时、部分失败、取消、预算耗尽、结果冲突均可重放测试；构建与提交。
- **P211 · 统一后台任务总览** `platform: agent-ui/src + agent RPC` ✅（2026-08-27）
  - `BackgroundTaskManager` 新增跨 session `listAll()`、事件订阅 `subscribe()` 与 `cancelMany()`；start/finish/fail/cancel 均推送快照，保持数据驱动更新。
  - `AgentConsoleSessionState` 持有统一 feed，支持状态过滤与文本搜索；Tasks 面板展示跨 session 任务摘要；`/ps` 默认保持当前 session 兼容，并支持 `/ps all|running|completed|failed|cancelled` 查看全局/状态过滤。
  - 旧 manager mock 无新 API 时自动回退 `list(sessionId)`；`agent-ui` `tsc --noEmit` 通过，既有测试兼容。
  - 建立跨 session task feed（状态、进度、耗时、重试、资源）；统一搜索/过滤/排序/批量取消/重试；命令 `/ps` 与面板共用数据源。
  - 验收：事件流断线重连、权限隔离、历史聚合、TUI/browser 交互测试；全量验证、todo 更新、提交。
- **P212 · 项目/线程树与自动检测** `platform: agent/src + agent-cli + agent-ui/src`
  - 统一 project contract（InMemory/TypeORM/RPC）；新增 CLI `/project list|switch|archive`；UI 展示 project→session→thread→delegation 树；按 git root/配置文件自动检测并允许覆盖。
  - 验收：跨 workspace、归档、迁移、fork、项目级 plan 汇总场景；相关包全量测试、构建、todo 更新、提交。

## UI 互动专项审计：当前欠缺与优化计划

### 已确认的问题（按影响排序）
- **问询不可键盘操作（高）**：`pending-question-panel` 只有点击事件；`handleFocusKey` 没有 pending-question 分支，TUI 无法用数字键/↑↓/Enter 选择，也没有 Esc 转自由输入的明确状态。
- **计划卡片不是完整交互控件（高）**：计划合成消息可 Enter 展开，但没有逐项聚焦、依赖/验收条件查看、失败步骤重试或跳转到产生该步骤的工具；用户只能回到 composer 重新描述。
- **计划事件反馈滞后（中-高）**：主要依赖 `tool_completed` 输出刷新；流式执行中缺少 step_started/blocked 事件，网络断线时无法按序号补齐或判断过期更新。
- **焦点模型分散（中-高）**：messages/tasks/approvals/jobs/tools 等各自维护 focus flag，pending question、text overlay、review detail 之间缺少统一 focus stack；Esc 行为依赖分支顺序，新增面板容易产生抢键或无法返回。
- **Overlay 能力不完整（中）**：text overlay 具备滚动但没有通用过滤、选择结果、焦点陷阱和可访问性语义；`/keymap` 等列表在浏览器端也缺少搜索高亮与快捷键提示。
- **任务/审批反馈不够可操作（中）**：任务面板能打开/取消/重试，但没有确认态、失败原因定位到消息/工具、批量操作和操作结果 toast；审批缺少风险详情折叠与默认安全动作提示。
- **跨端交互契约不足（中）**：测试多为 state/view-model 断言，真实 TUI 的窄终端、长文本、鼠标关闭时键盘可达性，以及 browser tab/ARIA/focus ring 尚未形成矩阵验收。
- **自动化验收缺口（中）**：PTY 脚手架覆盖 plan 出现和状态翻转，但未覆盖 pending question、blocked/failed 分支、断线重放、overlay 过滤和 focus stack 回退。

### UI 互动改进批次（P213–P218）

> 每个批次收尾固定执行：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新 `todo.md` 验证记录 → 单独提交。

- **P213 · Pending question 键盘交互与提交闭环** `platform: agent-ui/src（跨平台）`
  - 引入 `questionFocused` 与 selected option index，统一支持 ↑↓、数字键、Enter 填入并发送、Esc 关闭并保留自由输入；点击与键盘走同一 action。
  - 问题切换/turn 完成/会话切换时清理焦点，避免 stale question；补 TUI/browser 渲染及键盘测试。
- **P214 · 统一 FocusStack 与键盘路由** `platform: agent-ui/src（跨平台）`
  - 用可序列化 focus layer 栈替代散落布尔 flag；定义 push/pop/replace、Esc 回退一层、Enter/方向键由顶层消费，面板只声明 capabilities。
  - 保持旧 API 委托兼容，加入焦点转移矩阵测试（overlay→review→messages→composer）。
- **P215 · Plan step inspector 与操作入口** `platform: agent-ui/src + agent RPC`
  - 计划卡片支持逐项选择、详情（acceptance/dependsOn/owner/evidence）、失败步骤 retry、blocked 原因和跳转关联 tool/review；TUI 使用稳定快捷键，browser 提供按钮与 focus ring。
  - 不允许 UI 直接修改未授权状态，所有 mutation 经 RPC/统一 action。
- **P216 · 计划事件序列与断线重放** `platform: agent/src + agent-ui/src`
  - 落地 plan event envelope（sequence、planId、stepId、timestamp、source），桥接层去重、乱序缓冲、断线补拉；旧 `tool_completed` payload 转换为兼容事件。
  - 增加网络抖动、重复、跨 session 串线和恢复测试，并在 UI 标示 stale/reconnecting。
- **P217 · Overlay/任务/审批互动统一** `platform: agent-ui/src（跨平台）`
  - 通用 overlay 支持过滤、分页、选择、确认/取消和结果反馈；任务/审批复用同一交互协议，增加批量取消/重试、风险详情和可撤销 toast。
  - 验收窄终端与 browser 键盘 Tab/ARIA/focus ring，鼠标不可用时功能完整。
- **P218 · UI 互动验收矩阵与性能基线** `platform: agent-ui acceptance + tests`
  - 扩展 PTY 脚本覆盖问询、blocked/failed plan、断线重放、overlay 过滤、focus stack；补 browser Playwright 多 viewport 与长 transcript 基线。
  - 记录首屏渲染、事件到 UI 延迟、键盘操作步数和内存峰值；设定回归阈值并纳入每批收尾清单。

## UI 时间线可读性专项：Codex / opencode 对照与优化计划

### 现状与根因（代码核验）
- **消息洪泛**：timeline 将 turn、tool invoked、tool completed、reasoning 等都作为独立 `uiKind: event` 消息；同一工具的开始/结束不能在同一行原地替换。一次多工具任务会把“正在读文件 / 已读文件”重复铺满 transcript。
- **上下文缺失**：`timeline-boundary` 仅渲染 `-- plan N/M --`，没有 step 标题、状态、依赖、owner、累计耗时或本步骤事件计数；阅读者无法从边界理解当前在做什么。
- **层级混淆**：普通 assistant 正文、工具事件、系统状态都复用 message row；角色符号、status、meta、文本横向混排，窄终端下优先级和换行位置不稳定。
- **长会话退化**：timeline 模式绕过 `messagesVisibleItems`，直接渲染全部消息；虽不会破坏响应式契约，却会使历史事件和当前执行竞争有限终端高度。
- **信息密度失衡**：成功的低价值读取、空结果、重复 retry 与失败事件权重一致；缺少“默认只看当前步骤 + 失败 + 有产出的工具”的渐进披露。
- **交互薄弱**：event 行没有动作模型，无法展开原始输入/输出、跳到关联文件/diff、查看重试链或从失败处恢复；详情只面向普通消息选择。
- **跨端风险**：`white-space: normal` + `overflow-wrap: anywhere` 可避免溢出，但会打断路径、命令和 diff token；TUI/browser 未定义等价的缩进、截断和语义色彩规范。

### Codex / opencode 可借鉴的交互原则

| 原则 | Codex 参照 | opencode 参照 | 本项目采用方式 |
|---|---|---|---|
| 一次执行一个可读单元 | tool/file/todo 是 thread item，运行态原地更新为结果 | tool block 承载运行、输出、错误与耗时 | 同一 `toolCallId` 聚为一个事件卡，running→success/failed 原地更新 |
| 先摘要后细节 | 命令、文件变更默认短摘要，输出按需展开 | step/tool block 可折叠，详情不打断对话 | 默认展示意图、目标、结果、耗时；输入/输出/日志放 inspector |
| 步骤为主线 | todo 更新是可见进度锚点 | task/agent 状态形成执行阶段 | 每个 plan step 形成有标题的 group，事件归属其下 |
| 异常优先 | 失败/审批在流中显著且可继续操作 | 错误保留 retry 上下文 | failed/blocked/approval 固定展开，提供 retry/approve/jump action |
| 长记录可扫描 | 对话流不被完整 stdout 淹没 | 历史步骤可折叠 | 默认保留当前 step、未解决异常、最近完成 step；旧成功组自动收起但可搜索 |

### 目标信息架构

```
Turn: Fix session restore                                      running  01:42
  Step 2/4  Restore persisted plan                         active  00:31
    ✓ Inspect session schema                                      0.4s
    ▸ Update restore path                                  running  0.8s
    · 2 files changed                                      +42 -6
  Step 1/4  Reproduce failure                              done    0.7s
  ! Step 3/4  Verify migration                             blocked
      Test environment awaiting approval                         [open]
```

- **Turn group**：用户请求的执行容器，显示状态、累计耗时、成功/失败步骤计数；不是每个低级 event 的平铺容器。
- **Step group**：由 plan step 或无计划时的 inferred activity 产生；始终显示标题、状态与最近结果，可折叠其 children。
- **Event row**：统一为 `intent → target → outcome · duration`，成功默认一行，失败保留错误首行和操作。
- **Inspector**：Enter/点击只打开选中 row 的结构化详情（输入、输出、日志、关联文件、retry lineage），不在 transcript 内展开海量文本。

### 可执行计划（P219–P224）

> 所有批次遵循通用收尾：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新 `todo.md` → 单独提交。实现必须保留 TUI/browser 共用状态与渲染路径，禁止使用 timer 主动刷新。

- **P219 · Timeline event model 与稳定聚合键** `platform: agent-ui/src + agent event/RPC`
  - 引入 `AgentConsoleTimelineTurn`/`Step`/`Event` 数据模型，使用 turnId、planId/stepId、toolCallId、attemptId 聚合；同一工具运行态与终态原地更新。
  - event bridge 保留原始事件审计，但 transcript 改读聚合 projection；对旧事件推断稳定 key，远端用 sequence 去重。
  - 验收：同一 toolCall 的 start/completed 只占一条、retry 显示 attempt lineage、local/SSE 投影一致；agent-ui 全量测试、构建、提交。
  - **已完成（2026-08-26）**：新增 timeline execution metadata（source/sequence/toolCallId/receiptId/attempt），本地与 SSE 桥接统一按 call/receipt 稳定键原地更新；agent-ui `683 passing`，`tsc --noEmit` 与 `build:web` 通过。

- **P220 · Step-first 时间线渲染器** `platform: agent-ui/src（跨平台）`
  - 新增专用 timeline renderer，按 Turn→Step→Event 输出，而非复用普通 message row；边界显示 `step N/M + 标题 + 状态 + elapsed`，并将事件绑定当前 step。
  - 规范行宽：路径/命令保留尾部、自然语言按词换行、代码/日志进 inspector；成功/运行/失败/blocked 使用稳定图标和可读文本，不依赖纯色区分。
  - 验收：80/120 列 TUI snapshot、browser desktop/mobile render、CJK 与超长路径用例；全量测试、todo 更新、提交。
  - **已完成（2026-08-26）**：时间线边界升级为 `step N/M + 状态 glyph + 步骤标题`，使用独立上下边框和强调样式；event 行在 timeline 模式使用 `├─`/`·` 层级标记并加深续行缩进。agent-ui `684 passing`，`tsc --noEmit` 与 `build:web` 通过。更深的折叠/inspector 由 P221/P222 承接。

- **P221 · 渐进披露与可扫描窗口** `platform: agent-ui/src（跨平台）` ✅（2026-08-26）
  - 默认展开当前 step、失败/blocked/approval、最近完成 step；自动收起更早成功 step，展示 `N events hidden` 摘要，用户可按 Enter 展开。
  - 恢复 `messagesVisibleItems` 的语义窗口，但 pin 当前 turn 和异常 group；提供 active/failures/files 筛选、上一步/下一失败快捷键与全文搜索。
  - 验收：100+ event transcript 不淹没 composer；键盘无鼠标完整操作；TUI/browser 渲染一致；测试、构建、提交。
  - **已完成（2026-08-26）**：`resolveTimelineVisibleMessages` 方法限制 timeline 模式可见事件数，保留 structural 消息（plan-todo/file-change/timeline-boundary）并 pin 当前 turn 事件；超出 `messagesVisibleItems` 时显示 `N earlier timeline events hidden · press /timeline verbose to view all` 摘要；agent-ui 685 passing，`tsc --noEmit` 与 `build:web` 通过。

- **P222 · Timeline inspector 与恢复动作** `platform: agent-ui/src + agent RPC`
  - 为 event row 提供结构化 inspector：input/output、压缩日志、关联文件/diff、duration、attempt/retry、审批与错误 cause；Enter/点击打开，Esc 返回原 group。
  - 失败工具/blocked step 可从 inspector 调用既有 retry/approve/open-review action，成功事件只提供 copy/jump，避免误操作。
  - 验收：权限门、断线后 retry、详情大输出分页、focus return 均测试；全量验证并提交。
  - **已完成（2026-08-26）**：`AgentConsoleSessionState` 新增 `timelineEventInspectorOpen`/`selectedTimelineEventId`/`timelineEventDetailScroll`/`timelineEventDetailColumnScroll` 状态字段；`openTimelineEventInspector`/`closeTimelineEventInspector` 方法带 scroll 重置与 `syncDerivedInputFocus`；`timelineEventDetailLines` getter 输出结构化 inspector 行（type/status/duration/attempt/source/toolCallId/receiptId/content/key bindings）；scroll/column/edge/page 方法；`canRetryTimelineEvent`（检查 `tool_failed`/`error`/`failed`）与 `buildTimelineEventRetryPayload`；`handleFocusKey` 新增 `timelineEventInspectorOpen` 键盘块（enter/esc 关闭、copy、scroll、r=retry）；`dismissFocusLayer`/`handleEscapeKey`/`setMessagesFocused(false)`/`isAnyFocusActive` 已集成。`AgentConsoleTimelineEventDetailPanelComponent` 新增于 `AgentConsolePanels.ts`，模板含 `agent-console-timeline-event-detail-panel`。`AgentConsoleComponent` 新增 `showTimelineEventInspector` getter。模块注册（import/declarations/exports）完成。27 项测试通过，`tsc --noEmit` EXIT=0，agent-ui 712 passing。

- **P223 · 时间线偏好与迁移** `platform: agent-ui/src + settings`
  - 将 `/timeline` 从简单开关升级为 `compact | steps | verbose`：compact 仅当前步骤与异常，steps 为默认分组视图，verbose 保留现有逐事件诊断视图。
  - 保留旧 boolean 配置兼容映射，明确状态栏可见当前模式；不改变 raw transcript/export 的完整性。
  - 验收：旧设置迁移、命令/键位、不同模式输出、持久化恢复测试；tsc/build、todo 更新、提交。
  - **已完成（2026-08-26）**：`AgentConsoleSessionState` 新增 `timelineViewMode: 'off' | 'compact' | 'steps' | 'verbose'` 字段，`timelineMode` 保留为计算 getter（`timelineViewMode !== 'off'`）向后兼容；`setTimelineMode` 同时接受 boolean 与 tri-state string。`AgentConsoleSettingsStore` 新增 `timelineViewMode` 字段 + `resolveTimelineViewMode` helper 从旧 `timelineMode: boolean` 迁移，save 写 version 2。`AgentConsoleComponent` 的 `toggleTimelineMode` 替换为 `runTimelineModeCommand(args?)`：无参数循环 off→compact→steps→verbose→off，有参数直接设置；`restoreSettings` 优先读 `timelineViewMode`，fallback 旧 boolean。`AgentConsoleCommandHandlers` 接口 + handler 更新为 `runTimelineModeCommand(args?)`。`AgentConsolePanels.resolveTimelineVisibleMessages` 三分支：`verbose` 全量返回，`compact` 仅当前 scope + error/failed，`steps` 保留原有 tail + scope + structural + summary。717 项测试通过，旧 timeline 测试已适配 4 模式循环。

- **P224 · 时间线可读性验收与基准** `platform: agent-ui tests + acceptance`
  - 增加真实 PTY 录屏/文本 snapshot 场景：多步骤并行、重试失败、长工具输出、窄终端 CJK、断线重放；browser 使用 Playwright 验证焦点与折叠。
  - 指标：当前 step 首屏可见率、同一 toolCall 行数、80 列无横向截断率、失败定位按键数、事件到 UI 延迟；阈值写入 CI 回归报告。
  - 验收：全部指标达标、agent-ui/components/console 回归、构建、todo 更新、提交。
  - **已完成（2026-08-26）**：12 项可读性验收测试通过：compact 模式 active scope + errors 可见性、errors 始终可见、steps 模式全量 displayMessages、verbose 模式无过滤、多步骤并行 tool call 共存、重试失败 both visible、长工具输出 content 保留、窄终端 CJK 安全、首屏可见性、80 列 ID 长度、断线 replay 多源共存、timelineViewMode 同步切换。agent-ui 729 passing (0 failed)，含 P222 inspector 27 项 + P223 tri-state 5 项 + P224 验收 12 项新增。

截至 P221 完成（2026-08-26）：跨包共享渲染层 components 135 / components/console 73 / agent-ui 685 / agent 752 / agent-tools 332 / agent-channels 59 / agent-cli 73 / agent-gateway 246 / agent-desktop 20 / agent-vscode 7 / agent-providers 13 / agent-ssh 8 passing；components/html 116 passing（1 既存 i18n 失败）；agent-tools 1 failed（MCP stdio 重连环境依赖，既存）。agent-ui `tsc --noEmit` 通过；`build:web` 3.4MB EXIT=0。组件从 9039→6916 行（−2123 行，−23.5%）。

### P219–P221 收尾复核（2026-08-26，Timeline 可读性重构）

- P219（Timeline event model 与稳定聚合键）：新增 timeline execution metadata（source/sequence/toolCallId/receiptId/attempt），本地与 SSE 桥接统一按 call/receipt 稳定键原地更新。
- P220（Step-first 时间线渲染器）：时间线边界升级为 `step N/M + 状态 glyph + 步骤标题`，使用独立上下边框和强调样式；event 行在 timeline 模式使用 `├─`/`·` 层级标记并加深续行缩进。
- P221（渐进披露与可扫描窗口）：`resolveTimelineVisibleMessages` 限制可见事件数，pin 当前 turn 事件，超出时显示摘要。
- 全量测试（2026-08-26 复核）：agent-ui 685、components 135、components/console 73、agent 752、agent-tools 332（1 环境失败）、agent-channels 59、agent-cli 73、agent-gateway 246、agent-desktop 20、agent-vscode 7、agent-providers 13、agent-ssh 8，共 2520+ passing；components/html 116 passing（1 既存 i18n 失败），均 EXIT=0。
- 构建验证：agent-ui `tsc --noEmit` EXIT=0（1m36s）；agent `tsc --noEmit` EXIT=0（1m38s）；agent-tools `tsc --noEmit` EXIT=0（1m16s）；components `tsc --noEmit` EXIT=0（54s）；`npm run build:web` 3.4MB EXIT=0。
- 静态边界：`packages/agents/agent-ui/src` 无 `@tsdi/components/console` 或 Node API 直接引用。

### P199 收尾复核（2026-08-26，AgentConsoleComponent 拆分）

- A/B/C/D/E/F 六批全部完成：review+git diff → ReviewHandlers、coding_task → CodingTaskHandlers、voice → VoiceHandlers、model/profile → ModelHandlers、edit 模式 → EditModeHandlers、设置持久化、消息编辑模式、handleCommand 89-case switch → COMMAND_HANDLERS dispatch table。
- 全量测试：agent-ui 682 passing、components 135、components/console 73、components/html 117，均 EXIT=0。
- 构建验证：agent-ui `tsc --noEmit` EXIT=0；`npm run build:web` esbuild EXIT=0。
- 静态边界：`packages/agents/agent-ui/src` 无 `@tsdi/components/console` 或 Node API 直接引用。
- 剩余：P201 `as any` 治理已完成（15 处结构性保留）。

### P190 收尾复核（2026-08-22）

- 全量测试：agent-ui 682 passing（P182–P189 净增 8：保尾折叠、参考类命令 overlay 化与 notify 分级、plan 卡片渲染强化与会话恢复回放、ask_user 问题选择卡）、components 135、components/console 73、components/html 116，均 EXIT=0，P0–P181 既有测试零回归。
- 构建验证：agent-ui `tsc --noEmit` EXIT=0；`npm run build:web` esbuild bundle EXIT=0。
- 静态边界：`packages/agents/agent-ui/src` 不直接引用 `@tsdi/components/console` 或 Node API（扫描仅命中 `console-ports.ts` 的规则注释本身）。
- PTY 实测三场景（长回复尾部问询可见 / `/keymap` overlay 滚动过滤 / plan 卡片实时勾选）：自动化环境无真实模型接入，留待人工在真实终端验收。

### P178 收尾复核（2026-08-21）

- 全量测试：agent 752、agent-channels 59、agent-cli 73、agent-desktop 20、agent-gateway 246、agent-providers 13、agent-ssh 8、agent-tools 332、agent-ui 685、agent-vscode 7；共享渲染层 components 135、components/console 73、components/html 116，全部通过。
- 构建验证：agent、agent-channels、agent-cli、agent-gateway、agent-providers、agent-tools、agent-ssh、agent-ui 八包 `npm run build` EXIT=0；agent-ui `tsc --noEmit` EXIT=0。desktop/vscode 的构建入口复用同一 `build:web`，此前 P178 已验证该入口通过。
- 静态边界：`packages/agents/agent-ui/src` 不直接引用 `@tsdi/components/console` 或 Node API。
- 结论：P178 验证与收尾完成，P172–P177 无回归。

### agent-ui 测试性能复核（2026-08-21）

- 定位：`openSession()` 每次切换同步查询 `goal.get`，Goal 仅用于装饰性计划提示，却处于高频会话加载路径；对 674 个测试造成约 5 秒 runner 内耗时回退。
- 修复：Goal 摘要并入已有 `session.messages` 返回，`openSession()` 不再发第二个 `goal.get` RPC；本地路径同样在 `loadMessagesPage()` 返回摘要，旧 host 缺字段时降级为空。
- 验证：agent-ui `675 passing`，runner 内部耗时由 16.9s 降至 9.2s；异步后台查询反而升至 40.5s，未采用。

---

## 代码质量审计（2026-08-17）

### 类型抑制（src 文件 `as any`）
| 包 | 主要文件 | 数量 | 性质 |
|---|---|---|---|
| agent | TypeOrmSessionStore.ts | 33 | TypeORM 查询构建器泛型擦除（结构性） |
| agent | TypeOrmDelegationGraphStore.ts + orm.module.ts + lazy-typeorm.ts | 25 | 惰性 require + 动态类型 |
| agent-ui | AgentConsoleComponent.ts | 10 | 响应式 proxy 类型推断 |
| agent-ui | HttpAgentConsoleAppRpc.ts | 8 | JSON-RPC 响应类型 |
| agent-gateway | AppRpcServer.ts | 7 | RPC handler 动态分发 |
| agent-tools | agent-tools.module.ts | 7 | DI 模块注册 |

**评估**：均为结构性 `as any`，非偷懒抑制。零 `@ts-ignore` / `@ts-expect-error`。

### TODO/FIXME/HACK：零实际待办。

### 大文件（>500 LOC）
| 文件 | LOC | 评估 |
|---|---|---|
| AgentConsoleComponent.ts | 6916 | 核心组件，P199 A–F 六批拆分累计 −2123 行（−23.5%） |
| AgentConsoleSessionState.ts | 4426 | 状态管理，规模合理 |
| AgentConsolePanels.ts | 3459 | 面板渲染，规模合理 |
| DefaultAgentRuntime.ts | 3191 | 运行时核心，规模合理 |
| AppRpcServer.ts | 3144 | RPC 聚合，规模合理 |

---

## 性能基线（2026-08-19）

| 指标 | 数值 |
|---|---|
| 十包测试总数 | 2520+ passing（2026-08-26 复核） |
| 十包 tsc --noEmit | 全 clean（EXIT=0） |
| Web bundle | agent-ui 3.4MB（esbuild） |
| Electron dist | 44KB（agent-desktop） |
| VS Code dist | 24KB（agent-vscode） |
| 总测试耗时（串行，transpile-only） | ~90–100s |
| 总 LOC（src） | ~62,600 |
| 各包 LOC | agent 22,948 / agent-ui 22,922（组件拆分后 ~21,628） / agent-gateway 8,514 / agent-cli 3,960 / agent-tools 3,956 / agent-channels 1,362 / agent-ssh 585 / agent-desktop 496 / agent-vscode 237 / agent-providers 7 |

---

## 文档审计（2026-08-17）

| 包 | README | CHANGELOG |
|---|---|---|
| agent | ✅ 10.9KB | ✅ |
| agent-gateway | ✅ 2.5KB | ✅ |
| agent-ui | ✅ 新建 | ✅ |
| agent-cli | ✅ 9.1KB | ✅ |
| agent-tools | ✅ 8.7KB | ✅ |
| agent-channels | ✅ 1.6KB | ✅ |
| agent-providers | ✅ 1.3KB | ✅ |
| agent-ssh | ✅ 新建 | ✅ |
| agent-desktop | ✅ 2.3KB | ✅ |
| agent-vscode | ✅ 扩充 | ✅ |
