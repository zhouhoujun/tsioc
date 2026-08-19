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

- **P173 · G96 · 计划进度实时勾选反馈（中-高）** `platform: src/（跨平台）`
  - 目标：agent 在执行过程中实时更新 plan items 的 status，对话流中的内联 plan 清单即时反映进度（类似 Codex 的 checkbox 逐步勾选）。
  - 方案：
    - `setPlanTodos` 变更时，如果当前有内联 plan 消息，触发该消息的 re-render（而非新增消息）。
    - 在 Working 面板的 `workingDetail` 中追加当前 plan step 信息（如 `plan 3/7: executing step "write test"`）。
    - plan 完成时，在对话流中追加一条总结消息（`Plan completed: 7/7 steps, 0 failures`）。
  - 锚点：`AgentConsoleSessionState.ts`（setPlanTodos 触发机制）、`AgentConsolePanels.ts`（workingDetail 追加）、`AgentConsoleMessageRenderers.ts`（plan re-render）。

### 批次 II · 文件变更概要内联（P174–P175）

- **P174 · G97 · 文件变更概要作为对话流内联展示（高）** `platform: src/（跨平台）`
  - 目标：coding_task 的 file changes 和 git diff 的文件变更列表作为对话流中的特殊消息块内联展示，用户在对话中即可感知"改了哪些文件"。
  - 方案：
    - 在 `AgentConsoleMessageRenderers` 中新增 `fileChangeSummaryRenderer`，渲染 `FileUpdateChange[]` 或 `ReviewDiffResult.files` 为内联文件变更清单。
    - 格式：`📄 3 files changed: + src/foo.ts (update), + src/bar.ts (add), - src/old.ts (delete)`。
    - TUI 用 emoji/符号前缀，browser 用 styled badge。
    - 文件变更概要点击/Enter 可展开为完整 diff（复用既有 review 面板）。
  - 锚点：`AgentConsoleMessageRenderers.ts`（新增 renderer）、`AgentConsoleComponent.ts`（file change 消息插入）。

- **P175 · G98 · 工具执行输出内联增强（中）** `platform: src/（跨平台）`
  - 目标：CommandExecution 的输出更完整地内联在对话流中，减少摘要截断。
  - 方案：
    - `toolRunSummaryMaxLength` 默认值提升（当前可能截断较多），或对 command execution 类型用更大的阈值。
    - 对话流中的 tool result 消息增加"展开"交互：默认显示 summary，Enter 展开完整输出。
    - `AgentConsoleMessageRenderers` 中 tool result renderer 增加展开/折叠 toggle。
  - 锚点：`AgentConsoleMessageRenderers.ts`（tool result renderer 增强）、`AgentConsoleSessionState.ts`（tool output 展开状态）。

### 批次 III · 进度反馈线性化（P176–P177）

- **P176 · G99 · 对话流进度时间线（中）** `platform: src/（跨平台）`
  - 目标：在对话流中提供线性的"思考→执行→结果→下一步"进度感知，减少用户在面板间切换的认知负担。
  - 方案：
    - 在对话流中插入轻量级进度分隔符（如 `── step 3/7 ──`），标记当前 plan step 的边界。
    - 每个 step 内的 tool calls 保持内联，step 完成后插入分隔符。
    - `/display timeline` 控制是否显示这些分隔符。
  - 锚点：`AgentConsoleComponent.ts`（step boundary 插入逻辑）、`AgentConsoleSessionState.ts`（timeline 显示控制）。

- **P177 · G100 · Working 面板精简 + plan step 集成（中）** `platform: src/（跨平台）`
  - 目标：Working 面板在 console 端（compact 模式）追加当前 plan step 信息，使面板与对话流信息同步。
  - 方案：
    - `workingDetail` 在 `runningTools` 为空时，显示当前 plan step 的 content（如 `plan 3/7: write failing test for auth module`）。
    - 避免与对话流内联 plan 重复：对话流显示完整清单，Working 面板只显示当前 step。
  - 锚点：`AgentConsolePanels.ts`（workingDetail 逻辑）。

### 批次 IV · 验证与回归（P178）

- **P178 · G101 · 全量验证与真实终端验收** `platform: 验证（跨平台）`
  - 自动测试：受影响包全量测试 + `tsc --noEmit` + `build:web`。
  - Console 专项：真实 PTY 验收 plan 内联显示、文件变更概要内联、进度分隔符。
  - 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 应为空。
  - 回归基线：确保 P0–P171 已有测试不回归。

### 批次 V · 低优先级打磨（P179–P181）

- **P179 · G102 · plan 内联清单折叠/展开（低-中）** `platform: src/（跨平台）`
  - 计划清单超过 7 项时自动折叠为摘要（`plan 7 steps (4 done)`），Enter 展开完整清单。
  - 避免长计划占据过多对话空间。

- **P180 · G103 · 文件变更内联的 keyboard navigation（低）** `platform: src/（跨平台）`
  - 文件变更概要内联时，↑/↓ 选择文件，Enter 展开 diff，Esc 收起。
  - 复用既有的 review 面板导航逻辑。

- **P181 · G104 · plan 与 goal 系统集成（低）** `platform: src/（跨平台）`
  - `Goal` 系统的 criteria 与 plan items 自动关联：plan 完成时检查 goal criteria 覆盖率。
  - 对话流中显示 goal 进度（如 `goal: 3/5 criteria met`）。

---

## 回归基线

截至 P171（2026-08-19）：十包 **2156+ passing 全部 EXIT=0**；跨包共享渲染层 core 133 / components 126 / components/console 72 / components/html 117 / agent-ui 654 passing；受影响包 `tsc --noEmit` 与 build 通过，agent-ui build:web 保持通过。

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
| AgentConsoleComponent.ts | 9171 | 核心组件，建议按功能域拆分 |
| AgentConsoleSessionState.ts | 4426 | 状态管理，规模合理 |
| AgentConsolePanels.ts | 3459 | 面板渲染，规模合理 |
| DefaultAgentRuntime.ts | 3191 | 运行时核心，规模合理 |
| AppRpcServer.ts | 3144 | RPC 聚合，规模合理 |

---

## 性能基线（2026-08-19）

| 指标 | 数值 |
|---|---|
| 十包测试总数 | 2156+ passing |
| 十包 tsc --noEmit | 全 clean（EXIT=0） |
| Web bundle | agent-ui 3.4MB（esbuild） |
| Electron dist | 44KB（agent-desktop） |
| VS Code dist | 24KB（agent-vscode） |
| 总测试耗时（串行） | ~75–80s |
| 总 LOC（src） | ~62,600 |
| 各包 LOC | agent 22,948 / agent-ui 22,922 / agent-gateway 8,514 / agent-cli 3,960 / agent-tools 3,956 / agent-channels 1,362 / agent-ssh 585 / agent-desktop 496 / agent-vscode 237 / agent-providers 7 |

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
