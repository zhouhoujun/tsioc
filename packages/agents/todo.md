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

### 交互与时间线能力归并（P203–P224，已完成）

- 计划控制面：Todo revision/冲突重放、分解/依赖校验、step evidence/receipt、DAG 执行波、统一 action（complete/retry/block/unblock/assign）及失败回滚已落地。
- 对话内计划与执行反馈：计划卡片固定 ID、步骤树/inspector、当前步骤与失败原因、retry/approve 入口、tool event 稳定聚合和 timeline Turn→Step→Event 分组已落地。
- 时间线可读性：compact/steps/verbose 三模式、异常优先与历史折叠、长输出 inspector、断线事件去重/序列保护、窄终端/CJK 断言已落地。
- 交互基础：pending question 支持点击与 ↑↓/1–9/Enter/Esc，计划操作具备确认、乐观更新、拒绝/异常回滚；后台任务已有 InMemory durable feed 与项目/session 聚合基础。
- 以上条目的详细实现记录保留在 P203–P224 段落，仅用于审计；后续不得重复立项，未完成的端到端验收按 P238 执行。

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

## 架构约束（必须遵守）

### 1. 禁止 InMemory 实现

> **2026-09 确认：删除所有 InMemory store 实现，默认使用 SQLite（TypeORM）。**

- **禁止新增 `InMemory*` 类**：所有持久化 store（Session、Memory、Timeline、BackgroundTask、Goal、Audit、Compaction、Diagnostics、Summary、Delegation）必须通过 TypeORM 实现，默认 SQLite。
- **禁止 Default* 回退到 InMemory**：`Default*Store` 类在无 TypeORM adapter 时应抛出错误，不得静默降级到内存实现。
- **测试使用真实 SQLite**：测试用 `better-sqlite3` 的 `:memory:` 模式，不使用 InMemory stub。
- **agent.module.ts 默认导入 AgentOrmModule**：确保 TypeORM adapter 自动可用。

### 2. IoC 依赖倒置（必须遵守）

> **消费者只管使用抽象类，resolve 是 IoC 容器的职责。**

- **构造器直接注入抽象类**：消费者类的构造器直接声明抽象类参数，不使用 `@Optional()` + 手动 fallback。依赖未注册时 IoC 容器直接报错，不要空值兜底。
- **禁止手动 resolve**：不要在构造器或 `resolveStore()` 中手动调 `resolveTypeormAdapter(app)` + `lazyTypeOrmAdapters.getTypeOrm*()`，这是反模式。
- **禁止 `Default*` 包装类**：不要创建 `Default*Store` 这样的中间层来手动 resolve TypeORM adapter。直接在 `agent.module.ts` 注册 `TypeOrm*` 类为抽象 token 的实现。
- **正确的 DI 注册模式**：

```typescript
// ❌ 反模式：手动 resolve + Default* 包装
class DefaultSessionStore extends SessionStore {
    constructor(@Inject(ApplicationContext) private app: ApplicationContext) {}
    private resolveStore() {
        const adapter = resolveTypeormAdapter(this.app);
        return lazyTypeOrmAdapters.getTypeOrmSessionStore(adapter);
    }
}

// ✅ 正确：IoC 直接注入抽象类
// 在 agent.module.ts 中注册：
{ provide: SessionStore, useClass: TypeOrmSessionStore }

// 在消费者中使用：
constructor(private sessionStore: SessionStore) {}
```

- **抽象类用 `@Abstract()` 装饰器**：所有 store 抽象类必须用 `@Abstract()` 装饰器标记。
- **具体实现用 `@Injectable()` 装饰器**：TypeORM 实现类用 `@Injectable()` 装饰器标记，IoC 容器自动解析。
- **消费者不关心具体实现**：消费者类（如 `LocalToolRegistry`、`TurnHandler` 等）只注入抽象类，不需要知道底层是 TypeORM 还是其他实现。

### 3. 跨平台约束

- `src/` 下的新功能**只能依赖主入口的跨平台基础**，不得直接 import console 模块或 node API。
- `console` 专属行为（如 Buffer、process.stdin）通过 DI ports 桥接。

### 4. 响应式框架约束

- Components 是响应式框架，**不需要手动触发更新，不需要定时刷新**。
- 渲染完全由真实数据变化驱动，无数据变化即无渲染。

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

**通用架构规则（2026-08-31 用户确认，适用于 `packages/agents/` 下所有子项目：`agent`、`agent-ui`、`agent-gateway`、`agent-cli`、`agent-channels`、`agent-tools`、`agent-providers` 等，及本 todo 全部后续批次）**：
1. **通用功能走抽象类，禁止各实现各写一遍**：跨项目/跨平台共享能力一律基于既有抽象承接——如持久化统一走 `@tsdi/common` 的 `FileAdapter`（`AgentConsoleSettingsStore`/`AgentConsoleStash`/`AgentConsoleTheme` 同款），不要在 TUI node-fs、browser storage、gateway MemoryStore 各写一份。需要环境差异时，把差异收敛到最小 seam（如 `FileAdapter` 注入、`CommandOutputStore` 端口），共享逻辑只实现一次。
2. **优先 IoC 依赖倒置，方便扩展与性能优化**：通用能力通过 DI port（接口/抽象类）注入，定义方持有 port，各平台/各子项目提供实现。状态/服务对象只依赖 port，不依赖任何平台或具体实现，禁止直接 new 平台类或静态引用平台全局。例：`AgentConsoleSessionState.setCommandOutputStore(store)` 接收 `CommandOutputStore` 端口，TUI/CLI 注入 `BoundedFileCommandOutputStore`（FileAdapter 实现），browser/gateway 注入 RPC store；共享的过滤/分页/淘汰逻辑全部落在 `AbstractCommandOutputStore` 抽象基类里，具体 store 只覆写各自的持久化 seam。
3. **共享逻辑覆盖优先于重复实现**：新增能力前先确认既有抽象是否已提供（`FileAdapter`、`MemoryStore` 键值抽象、`AbstractCommandOutputStore`、`CommandOutputStore` 端口、`AGENT_CONSOLE_APP_RPC` 等）；确实需要新端口时，先定义接口/抽象基类 + 默认实现，再由各子项目/平台注入具体实现。
4. **跨平台跨端先行，子项目不得单宿主定型**：`packages/agents/` 下任一子项目新增或重构功能前，必须先判定其是否需在本地 runtime、CLI/TUI、browser、gateway/remote、VS Code/Electron 等多个端运行或互通；只要存在跨端需求，就先在共同依赖层定义稳定的数据 contract、纯逻辑与 IoC port，再由各端注入 transport/存储/系统能力实现。禁止在 `agent`、`agent-ui`、`agent-gateway`、`agent-cli` 或具体宿主中各自维护协议、状态机、持久化或平台分支，之后再以同步/复制方式补齐其他端。每个计划项必须标明 `platform:`、共享层、port 所有者、各端实现和跨端验收；未具备这些信息不得标记完成。

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

### 批次 V · 关键信息优先展示（P179–P181，Codex 对标）

- **P179 · G113 · /command 支持完善（高）** `platform: src/ + agent-ui/src`
  - 目标：实现 /command 关键信息实时展开，用户无需进入面板即可感知命令执行状态、plan 进度与关键文件变更。
  - 方案：
    - /command 结果增加"展开"交互：默认显示关键信息（plan step、主要 file changes、tool 执行状态），Enter 展开完整输出。
    - 在对话流中固定 ID 的 command summary 渲染，与 planTodoRenderer 双向同步。
    - /help 与 /tools 结果支持搜索过滤和键位高亮。
  - 锚点：`AgentConsoleMessageRenderers.ts` command renderer、`AgentConsoleComponent.ts` handleCommand 分支。
  - **已规划**：待 P239-P246 基础设施确认无误后启动。

- **P180 · G114 · 折叠策略重构：尾部永不吞（中）** `platform: src/`
  - 非 focused 默认模式：assistant/user 消息不做 head 截断；采用"头 N−2 行 + `… N more lines` + 尾 2 行"保尾策略，确保结尾问询永远可见。
  - reasoning 维持 4 行、tool/system 维持 8 行折叠，但尾部始终保留关键上下文行。
  - focused 模式保留原有 8 行预览机制。
  - 锚点：`AgentConsolePanels.ts` truncateMessageItem，补 console-renderer.spec 用例（长回复尾行必须包含用户问询）。

- **P181 · G115 · plan 卡片免折叠豁免（中）** `platform: src/`
  - planTodo 类型的消息豁免通用 8 行折叠规则（即使用>7项摘要折叠，plan卡片自身仍保持展开或仅执行自身折叠）。
  - 避免双重折叠：plan卡片不再被普通消息折叠机制双重吃行。
  - 渲染强化：checkbox 字形（`☐/▸/☒/⊘`）、进度条（`plan 3/7 ▓▓▓░░░░░`）、in_progress 项高亮；TUI/browser 共用同一渲染函数。
  - 锚点：`AgentConsoleSessionState.ts` displayMessages/buildPlanMessage 豁免标记、`AgentConsoleMessageRenderers.ts` planTodo renderer。

### 批次 VI · /command 交互化与关键信息展示（P182–P184）

- **P182 · G116 · /command 交互化：问题选择控件（中-高）** `platform: src/`
  - /command 结果弹出带编号选项的选择控件：问题文本 + 编号选项列表 + ↑↓/数字键选择 + Enter 确认 + Esc 转自由输入。
  - 选择结果自动填入 composer 并发送（走既有 queue/steer 通道）；turn 内阻塞等待为 stretch 目标，首期允许非阻塞注入。
  - 视觉语言与既有 approval pending 队列统一。
  - 锚点：`AgentConsoleComponent.ts` runKeymapCommand/handleCommand、「/command」绑定、`AgentConsoleSessionState.ts`（pendingCommand 状态）。

- **P183 · G117 · 关键信息优先展示（高）** `platform: src/`
  - 在回复末尾优先展示：plan 进度（如 `plan 3/7 steps`）、关键 file changes（新增/修改的文件计数 + 简短摘要）、工具执行状态（成功/失败/进行中）。
  - 次要信息（完整 reasoning、完整工具输出）进入折叠状态，Enter 展开，但尾部始终保留关键上下文行不被折叠掉。
  - 遵循 Codex 行为：assistant 最终回复全文可见，永不自动截断关键信息；折叠仅用于非关键辅助内容。
  - 锚点：`AgentConsolePanels.ts` renderedMessageItems、truncateMessageItem 策略重构。

- **P184 · G118 · /help /tools 可搜索 overlay（中）** `platform: src/`
  - /help 与 /tools 结果默认打开带搜索框的列表 overlay：标题 + 可滚动列表 + `/` 过滤 + PgUp/PgDn + Esc 关闭。
  - 列表数据源直接读 `AgentConsoleKeymap.effectiveBindings(context)` 与 vim bindings，按 context（全局/terminal/command）分组展示。
  - 带参数的写操作（set/unset/reset/record）保持 notify 反馈不变。
  - 锚点：`AgentConsoleComponent.ts` runKeymapCommand/handleCommand、`AgentConsoleSessionState.ts`（overlay 状态）、`AgentConsolePanels.ts`（新组件）。
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
- 全量回归已执行：agent 797、agent-channels 59、agent-cli 73、agent-desktop 20、agent-vscode 7、components 135、components/console 73、components/html 117（1 既存失败）、agent-ui 953、agent-gateway 267、agent-providers 13、agent-ssh 8 均通过；agent-tools 478 通过（1 环境依赖失败）。
- 授权本地绑定环境复跑：`agent-gateway` 267 passing、`agent-ssh` 8 passing；此前 `EPERM` 仅为 sandbox 限制，非代码回归。
- 构建验证：agent-gateway、agent-ssh、agent-tools 及 `agent-ui` `tsc --noEmit` / `build:web` 均通过。静态边界与工作树检查完成。
### P233 · /command 关键信息实时展示（高） `platform: src/ + agent-ui/src`
- 目标：/command 执行后在对话流中固定展示关键信息：plan 进度（当前step/总步数）、关键 file changes（新增/修改计数+简短摘要）、工具执行状态（成功/失败/进行中）
- 方案：
  - 在 handleCommand 完成后，渲染一个固定 ID 的 command summary 消息块，包含 plan step 进度条、主要 file changes 统计、工具运行状态图标
  - 内容采用"保尾策略"：头部关键信息永不折叠，底部可折叠的完整输出/Reasoning
  - /command 结果Enter可展开查看完整输出，但尾部始终保留关键上下文行不被折叠掉
  - 遵循 Codex 行为：assistant 最终回复全文可见，永不自动截断关键信息；折叠仅用于非关键辅助内容
- 锚点：`AgentConsoleMessageRenderers.ts` command renderer、`AgentConsoleComponent.ts` handleCommand 分支、`AgentConsolePanels.ts` truncateMessageItem 策略重构
- **验收标准**：/command 执行后对话流中固定出现 plan 进度+file changes计数+工具状态图标；内容≤200字符默认全显，>200字符按保尾策略折叠尾部而非头部

### P234 · 折叠策略保尾：内容不长不折叠（中） `platform: src/`
- 目标：采用"头 N−2 行 + `… N more lines` + 尾 2 行"的保尾策略，确保结尾问询永远可见
- 方案：
  - 默认折叠线数 COLAPSED_MESSAGE_PREVIEW_LINES 从 8 行调整为 6 行
  - 内容总长度 < 300 字符时自动展开，无需手动折叠
  - 始终保留尾部 2 行内容（包括用户问询/关键提示）
  -  focus 模式保留原有 8 行预览机制（那是显式浏览态）
- 锚点：`AgentConsolePanels.ts` truncateMessageItem、COLLAPSED_MESSAGE_PREVIEW_LINES 常量重定义
- **验收标准**：内容≤300字符始终全显；内容>300字符采用保尾策略，尾部始终可见用户问询；focus 模式可选 8 行预览

### P235 · 关键信息优先渲染（中） `platform: src/ + agent-ui/src`
- 目标：在消息渲染中优先展示关键信息：plan 进度、关键 file changes、工具执行状态，确保用户无需进入面板即可感知
- 方案：
  - 新增消息模板标记 `templateKind: 'critical'`，渲染时优先展开而非折叠
  - planTodo 和 fileChange 消息类型豁免通用折叠规则（它们有自己的 >7 项摘要折叠，自身仍保持展开或仅执行自身折叠）
  - /command 结果和计划更新消息优先级高于普通 assistant/user 消息
  - 键位/帮助类参考信息以可滚动覆盖层或持久 scrollback 呈现，不用瞬态状态条
- 锚点：`AgentConsoleMessageRenderers.ts` templateKind 类型、 `AgentConsolePanels.ts` renderedMessageItems 豁免逻辑
- **验收标准**：/command 关键信息永不被折叠吞掉；plan 卡片和关键消息有专用豁免机制；键位/帮助信息以持久 scrollback 形式呈现

### P236 · 抽象类与IoC依赖倒置重构（中） `platform: src/ + agent/ + agent-tools/`
- 目标：提取通用折叠/展开逻辑到抽象基类，通过 IoC 依赖倒置实现可扩展
- 方案：
  - 新建 `AgentConsoleCollapseService` 抽象类，定义 `shouldCollapse(text: string): boolean` 和 `getCollapsedConfig(text: string): CollapseConfig` 纯虚方法
  - 实现 TUI 版和 browser 版两个具体策略类，注入到 AgentConsoleSessionState
  - 通过 DI port (`@Inject(COLLAPSE_SERVICE)`) 而非直接 new 实现，便于扩展新平台（如 VS Code 扩展）
  - COLAPSED_MESSAGE_PREVIEW_LINES 等常量移至抽象基类，由各端实现具体值
  - 同理提取 truncateMessageItem 逻辑到抽象基类，支持不同平台的行计算差异
- 锚点：`AgentConsoleSessionState.ts` collapseService 注入、`AgentConsolePanels.ts` 折叠逻辑调用
- **验收标准**：`tsc --noEmit` 通过；抽象基类与两平台实现并存；新增平台注入无需修改核心逻辑

### P237 · UI 互动矩阵与性能基线（中） `platform: agent-ui acceptance + tests`
- 目标：扩展 PTY 脚本覆盖 /command、折叠、focus stack 等场景；补 browser Playwright 多 viewport 基线
- 方案：
  - 扩展 acceptance/fake_model_server.py：新增 /command 关键信息展示、折叠策略测试、focus stack 回退测试场景
  - 扩展 acceptance/run_acceptance.py：新增 /command 关键信息可见率测试、折叠/展开按键计数测试、focus stack 断线后恢复测试
  - 新增 PTY 验收脚本：覆盖 /command 关键信息展示、折叠/展开全流程、focus stack 完整测试
  - browser Playwright 矩阵：320px/1024px/1440px/CJK 视口，验收长消息折叠表现、键位操作、focus stack 回退
- **验收标准**：agent-ui 全量测试不回归；PTY 三场景通过；browser 矩阵至少 2/3 视口通过；`toolRunSummaryMaxLength` 从 400 调整至 200 且无回归

### P225 收尾复核（2026-08-27，Plan revision / 乐观并发）

- agent-tools：`TodoStore` 引入 `planId`/`revision` 追踪 + `readPlan`/`replaceAtRevision`/`mergeAtRevision` + `TodoPlanConflict` rebase payload + `version:3` 持久化与旧 payload 迁移；`TodoTool` 增 `expectedRevision` 入参并在结果暴露 `planId`/`revision`。新增 5 项测试（revision 推进、stale replace/merge 拒绝、tool 输出暴露 revision、expectedRevision 成功推进、非 revision 调用不回退冲突、旧数组 payload 迁移、persisted revision 存活）→ `406 passing`，`tsc --noEmit` EXIT=0。
- agent-ui：local/remote 事件桥从 `todo` tool 输出与 `plan_created` 事件提取 `planId`/`revision` 写入 `sessionState.planId`/`planRevision`；`setPlanTodos` 增可选 `revision`/`planId`；失败步骤 retry 生成携带当前 revision 的结构化指令。新增 2 项测试 → `763 passing`，`tsc --noEmit` EXIT=0，`build:web` EXIT=0（3.5MB）。
- agent：`771 passing`（未改动，回归基线）。
- 静态边界复核：`agent-ui/src` 无 `@tsdi/components/console` 或 `node:` 直接 import（仅 `console-ports.ts` 规则注释与 `Record<string, any>` 类型）。

## 深入差距分析：五个领域（2026-08-26 核验，已由 P203–P212 覆盖，保留历史）

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

## 已实现能力归并：计划、执行与五域（P203–P212）

- **Todo 分解与执行控制面**：schema v2（层级、依赖、验收、owner、估时、更新时间）、旧 payload 迁移、状态机/环检测/单执行校验、质量门、DAG schedule preview、失败依赖传播、plan 生命周期事件与序列去重均已完成。
- **计划展示与恢复**：对话内联计划、Tasks 面板层级/过滤/详情、当前步骤与时间线、失败/阻塞定位、键盘导航、会话切换恢复和跨端共享渲染路径均已完成。
- **上下文与审查闭环**：自适应 light/medium/deep 压缩、按消息/工具/文件恢复、压缩指标；逐行/逐 hunk review comment、批量结论和 review gate 回写均已完成。
- **并行与任务**：`parallel_spawn`、`fan_out`、`map_reduce`、`race`、`wait_all`、`wait_any`、预算/超时/冲突聚合；跨 session BackgroundTask feed、`/ps` 过滤与 Tasks 面板共用数据源均已完成。
- **项目组织**：InMemory/TypeORM 项目索引、workspace/thread 聚合、`project list|sessions|switch|archive` CLI、`/projects`/`/threads` UI 与 git-root 自动归组均已完成。

## 深入差距分析：当前五域（2026-08-27 复核）

> 参照 Codex 的 `update_plan`（计划作为持久 thread item、状态原地更新）与 opencode 的 task/workflow（任务可恢复、资源受控、结果可聚合）。下列为已落地能力之外的真实缺口。

**代码证据（2026-08-27）**：`AgentContextManager` 已存在 `CompactionLevel` 和 `restoreByMessageIds/Tool/File`；agent-tools provider 已注册 `fan_out/map_reduce/race/wait_all/wait_any`；Review 与计划 lifecycle event 已存在。反之，TodoStore 查询不到 `revision/expectedRevision`；`DefaultAgentRuntime` 的 EvidenceLedger 只记录 turn evidence，未关联 `stepId`；`resolveSchedule()` 未调用编排工具；`BackgroundTaskManager` 使用进程内 `Map`；UI 计划消息固定 ID 为 `__plan_todo_inline__`。v12 仅针对这些缺口立项。

| 领域 | 当前能力 | 剩余不足 | 优先级 |
|---|---|---|---|
| 智能上下文压缩 | 自适应三级压缩、索引化恢复、质量指标已具备。 | 预算策略仍主要基于 token/密度阈值；用户无法在 UI 比较不同压缩层级、预览恢复成本或将恢复内容限定注入下一 turn。 | 中 |
| 多 Agent 编排 | 五种并发原语、DAG preview、预算/聚合已具备。 | 计划 DAG 尚未直接驱动 worker 调度；任务依赖、并发配额、局部失败策略与实时进度仍分散在调用方。 | 高 |
| Diff Review | hunk/line comment、批量结论、gate、回写和快照已具备。 | 大 diff 缺少按文件/hunk 的虚拟化和增量载入；agent 消费 review 结论缺少“必须先处理 rejected findings”的 turn 前门禁。 | 中 |
| 后台任务仪表板 | 跨 session feed、事件订阅、`/ps`、Tasks 面板已具备。 | feed 仍为进程内快照，重启/远端 host 的历史、进度百分比、资源使用、批量操作确认和恢复策略未形成统一持久 RPC。 | 高 |
| 项目维度线程组织 | 索引、CLI、UI 选择器和 git-root 归组已具备。 | 项目→session→thread→delegation 仍是分开的视图；显式重命名/迁移/覆盖 git-root 与跨存储契约测试不足。 | 中 |

## 改进计划 v12：Todo 分解、执行和展示闭环（P225–P232）

> 核心目标：把 Todo 从“模型建议的清单”升级为“可审计、可恢复、以证据推进的执行控制面”。每一项收尾**必须**执行：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新本文件（含测试数字与遗留环境限制）→ 独立提交。

### 批次 I · 计划分解质量与持久化
- **P225 · Plan revision / optimistic concurrency contract** `platform: agent-tools + agent RPC + agent-ui/src`
  - 为 TodoStore 引入 `planId`、`revision`、事件 cursor；replace/merge/retry 必须携带预期 revision，冲突返回结构化 rebase payload，禁止旧 UI 或重连 replay 覆盖新计划。
  - 将当前失败步骤的 retry 从 composer 草稿升级为显式、可确认的 `todo` mutation；保留"发送 retry prompt"作为无权限 host 的降级路径。
  - 验收：双客户端竞争、乱序事件、fork/restore、retry/cancel 幂等和旧 schema 迁移。
  - **已完成（2026-08-27，Store + tool 契约 + UI revision 感知）**：
    - `TodoStore` 引入 `planId`/`revision` 追踪：`readPlan()` 返回 `{planId, revision, todos}`；`replaceAtRevision`/`mergeAtRevision` 携带 `expectedRevision`，不匹配返回 `TodoPlanConflict`（`conflict/expectedRevision/current` rebase payload）；持久化升级为 `version:3 {version, planId, revision, todos}`，旧数组/`v2` payload 读取时自动迁移（`revision` 解析为 1）。
    - `TodoTool` 增加可选 `expectedRevision` 入参；`buildResult` 结果新增 `planId`/`revision` 字段供 revision-aware 消费者识别当前版本。
    - `agent-ui` 两端事件桥（local `AgentConsoleEventBridge` + remote `AgentConsoleRemoteEventBridge`）从 `todo` tool 输出/`plan_created` 事件提取 `planId`/`revision` 写入 `sessionState.planId`/`planRevision`；`setPlanTodos` 支持 `revision`/`planId` 可选参数。
    - 失败步骤 retry 生成结构化指令时携带当前 `revision`（`Retry plan step at revision N: ...`），为后续 model 调 `todo` 传 `expectedRevision` 提供确认链；composer 发送作为无权限 host 的降级路径保留。
    - 测试：agent-tools 新增 5 项（revision 推进、stale write 拒绝、tool 输出暴露 revision、expectedRevision 成功推进、非 revision 调用不回退冲突、旧数组 payload 迁移、跨 persisted store revision 存活）→ `406 passing`；agent-ui 新增 2 项（todo output 追踪 revision、plan_created 追踪 revision）→ `763 passing`。agent `771 passing`。agent-tools/agent-ui `tsc --noEmit` EXIT=0，`build:web` EXIT=0（3.5MB）。
- **P226 · Evidence-aware plan compiler** `platform: agent/src/prompt + agent-tools`
  - 在现有质量门之上建立分解编译器：每项必须映射到 acceptance、依赖、预期证据类型（test/diff/diagnostic/review）和风险；将模糊/多动作项拆为提案，要求模型确认或工具自动规范化。
  - 提示词要求复杂 coding task 先 `decompose`，再按 accepted plan 执行；单轮问答豁免，避免过度规划。
  - 验收：中英文复杂请求、重复/循环依赖、无验证步骤、低风险单项、token 预算和 prompt snapshot。
  - **已完成（2026-08-27，plan-compiler + decompose action + 可配置分割）**：
    - 新增 `agent-tools/planning/plan-compiler.ts`：`compilePlan` 为每项推导 acceptance/evidence（test/diff/diagnostic/review）/risk 并拆模糊/多动作项为 `proposed:true` 提案；`autoNormalizeStep`/`inferEvidenceType`/`inferRiskLevel`/`defaultAcceptanceFor`；支持 `acceptAll` 批量确认。`planning/index.ts` 已导出。
    - `TodoTool` 新增 `decompose` action（不持久化，返回 `PlanCompileResult`：steps/proposals/accepted/rejected），保留 `validate`/`schedule`。
    - **不写死硬编码分割正则**（对齐 opencode/codex：续跑由 todo status 驱动，不靠解析固定连词）：`MULTI_ACTION_PATTERNS` 改为数据驱动——导出 `DEFAULT_CONJUNCTIONS` + `buildMultiActionPattern(conjunctions?)` 构建器，`splitAtomicFragments(content, conjunctions?)` 可注入自定义集合，`compilePlan(..., { conjunctions })` / TodoTool `conjunctions` 入参可覆盖默认；`\b` 边界仅对纯词字符 token 启用（CJK 与标点按字面量匹配）。
    - 提示词（`IdentitySection`/`ToolsSection`）恢复复杂/多部分请求先 `todo action:"decompose"` 的指引。
    - 测试：agent-tools 新增 `plan-compiler.spec.ts`（compile 单/多动作、acceptAll、拒空、evidence/risk/acceptance、自定义连词注入）+ `todo-store-v2.spec.ts` decompose 断言 → `420 passing`；agent `771 passing`；两包 `tsc --noEmit` EXIT=0。

### 批次 II · Todo 驱动执行
- **P227 · Plan execution reconciler** `platform: agent/src/runtime + agent-tools`
  - 建立 tool receipt / LSP / verify / review evidence 到 plan step 的确定性关联；只有满足 acceptance 的证据才能自动 completed，失败证据转 failed/blocked 并记录 cause/next action。
  - 生成可消费的 step summary，下一 turn 注入未解决步骤和最近失败原因，而非完整 Todo 文本。
  - 验收：测试通过/失败、无关工具、并行工具、review rejected、人工 override、重放一致性。
  - **已完成（2026-08-27，evidence→step 确定性 reconciler + step summary）**：
    - `agent/src/harness/EvidenceLedger.ts`：`ToolEvidenceEntry` 新增可选 `stepId` 字段（确定性 evidence→step 关联），`record` 透传；`ToolEvidenceInput` 自动携带。
    - 新增 `agent-tools/planning/step-reconciler.ts`（纯函数、可测、重放一致）：`reconcileStepStatus` 按 `stepId`（缺失回退到 `inProgressStepId`）确定性归因证据；仅 acceptance 满足且无 falsified 的证据自动 `completed`；falsified/失败/verify 非零证据转 `failed` 或 `blocked`（gated）并记录 `cause`/`nextAction`；无关/并行工具按 stepId 各不污染；review rejected 回退已完成步骤；`manualOverrides` 人工 override 永不被覆盖；`buildStepSummary`/`renderStepSummary` 生成紧凑未解决步骤+失败原因摘要（非完整 todo 文本）。`planning/index.ts` 已导出。
    - 测试：agent-tools 新增 `step-reconciler.spec.ts` 12 项（acceptance 通过、无关工具不动、in-progress 回退、并行工具按步归因、falsified→failed+cause/next、verify 失败→failed、gated→blocked、review rejected 回退、人工 override、重放一致性、紧凑摘要渲染）→ `431 passing`（420→431）；agent `771 passing`；两包 `tsc --noEmit` EXIT=0。
- **P228 · Plan DAG → orchestration bridge** `platform: agent-tools + agent/src/runtime` ✅ **已完成（2026-08-27）**
  - 将 `resolveSchedule()` 的 ready 集映射到 `fan_out`/`wait_all`，按 owner、toolset、cost/concurrency budget 调度 worker；支持串行屏障、可选步骤、部分失败和取消传播。
  - 聚合 worker 结果时回写每个 step 的 evidence 和 lineage，避免调用方自行拼接字符串。
  - 验收：链/菱形 DAG、超时、预算耗尽、worker 重试、取消、部分成功与 deterministic replay。
  - **实现**：新增 `agent-tools/planning/dag-orchestrator.ts`（纯函数、可测、重放一致）：`buildDagExecutionRounds` 把 DAG 映射为确定性执行波（首个 ready 集→逐波推进；`failed` step 取消其传递依赖但保留独立波=部分失败；含 barrier 的波以单步串行波运行=wait_all；concurrency 预算把并行波切为子波；可选步骤失败降级 skipped 非致命；cancelled 用 visited 去重收集）；`roundToWorkerTasks` 把波映射为隔离 worker spec（goal/toolsets/profile/reasoning/maxTurns，携带稳定 stepId）；`pickPrimitiveForRound` 选 wait_all（串行屏障）/map_reduce（聚合波）/fan_out（普通并行）；`aggregateStepResults` 按 step 回写 evidenceId（`step#<id>#<depth>#1`）+ lineage（DAG 父链）、缺失结果计失败、timed_out 单独成文、产出紧凑部分失败 summary。`planning/index.ts` 已导出。
  - **测试**：agent-tools 新增 `dag-orchestrator.spec.ts` 13 项（链/菱形 DAG、串行屏障→wait_all、concurrency 子波、失败+传递取消、已完成步骤解锁依赖、worker spec 映射、evidence+lineage 回写、非可选失败、可选跳过、超时、缺失结果、map_reduce 聚合波、deterministic replay）→ `445 passing`（431→445）；`tsc --noEmit` EXIT=0。注：首轮 4 项失败为测试断言与实现口径不一致（波按字母序排序保证确定性、worker profile 需显式传 options、lineage 依赖 completed 前置、可选测试轮需只含可选步），已修正并全绿。

### 批次 III · 计划展示与用户控制
- **P229 · Plan-first transcript renderer** `platform: agent-ui/src（跨平台）` ✅ **已完成（2026-08-27）**
  - 用稳定 `planId/revision/stepId` 渲染一个 plan thread item，步骤事件原地归并；同一执行不再同时分散在 plan 卡、timeline 和工具摘要。
  - 设计三层披露：紧凑进度（当前/异常）、步骤树（依赖/owner/evidence）、inspector（receipt/diff/test/review）；TUI 与 browser 共用 renderer，不加 timer。
  - 验收：80/120 列、mobile、CJK/超长路径、100+ step、重连/版本冲突、无鼠标键盘可达。
  - **实现**（`agent-ui/src/AgentConsoleSessionState.ts` + `AgentConsoleEventBridge.ts`，跨平台状态/事件层落地）：
    - `AgentConsolePlanTodoItem` 新增可选字段：`planId?`、`revision?`、`blockedReason?`、`evidenceIds?`、`receiptId?`、`testSummary?`、`diffSummary?`、`reviewSummary?`。
    - `planThreadKey` getter = `${planId}#r${revision}`（无 planId 返回 `''`），作为稳定 thread 标识。
    - `mergePlanCreated(steps, planId?, revision?, sequence?, sourceSessionId?, scope?)` 从 plan_created 步骤种子 `planTodos`，携带稳定 planId/revision，sequence 守卫，重建 planMessage。
    - `mergePlanStepStatus(planId, stepId, status, {sequence?, owner?, reason?, error?, elapsedMs?})` 按 stepId 原地归并步骤事件，sequence 丢弃过期事件，跨 planId/未知 stepId 忽略，reason 置 `blockedReason` 并追加 `blockedBy`。
    - `cancelRemainingPlanSteps(planId?, sequence?)` 批量取消剩余 pending/in_progress 步骤，sequence 对**整批**一次性守卫（而非逐 step），避免单个 PlanCompleted 事件 sequence 复用导致只取消首个步骤。
    - `setPlanTodos` 仅在存在 planId 上下文中为 todo 打 `planId/revision` 戳（保持无 plan 上下文下 todo 形状不变，避免回归）。
    - `selectedPlanTodoDetailLabel`（layer-3 inspector）暴露 `blockedReason`/`evidenceIds`/`receiptId`/`testSummary`/`diffSummary`/`reviewSummary`；`buildPlanMessage` 步骤树（layer-2）渲染 `needs …` 依赖、`(owner)`、`~estimate`、`evidence[N]`。
    - `AgentConsoleEventBridge.subscribe()` 新增 5 个 plan 事件绑定：`AgentPlanCreatedEvent→mergePlanCreated`、`StepStarted→in_progress`、`StepBlocked→pending+reason`、`StepCompleted→按 event.status`、`PlanCompleted→取消剩余 pending/in_progress`。
  - **测试**：agent-ui 新增 `test/plan-thread.spec.ts` 11 项（mergePlanCreated 种子+stamp、mergePlanStepStatus 原地归并、blockedReason+blockedBy、过期丢弃、跨 planId / 未知 stepId 忽略、步骤树依赖/owner/estimate/evidence、inspector 五类细节、setPlanTodos 戳 planId/revision、planThreadKey、cancelRemainingPlanSteps 批量取消、stale sequence no-op）→ `774 passing`；regression：components `135 passing`、components/console `73 passing`；agent-ui `tsc --noEmit` EXIT=0。注：`setPlanTodos` 初版无条件 stamp 导致既有 `tool_completed` todo 深度相等测试回归（revision:0/planId:undefined 泄漏进无 plan 上下文），已改为仅在 planId 存在时打戳并调整 revision 顺序后全绿；`PlanCompleted` 绑定初版逐 step 复用同一 sequence 会触发 `mergePlanStepStatus` 守卫只取消首个步骤，已改为 `cancelRemainingPlanSteps` 对整批一次性守卫。
- **P230 · Plan interaction action model** `platform: agent-ui/src + agent RPC` ✅ **已完成（2026-08-27）**
  - 完成/retry/block/unblock/reorder/assign/approve 统一走受权限保护的 action port，带确认、optimistic UI、错误回滚和 audit link；composer retry 只作为显式 fallback。
  - 统一 focus stack/overlay 的 plan inspector 操作，避免面板各自抢键。
  - 验收：权限拒绝、离线重试、action 幂等、Esc 回退、screen-reader/Tab 和 TUI 快捷键矩阵。
  - **实现**（`agent-ui/src/AgentConsoleSessionState.ts`，跨平台状态层）：统一 plan action model 将 `complete/retry/block/unblock/assign` 收敛到单条权限感知路径 `request → (confirm gate) → optimistic apply → dispatch(planActionBus) → 失败/拒绝 rollback`，composer retry 仅在未接入 action bus 时作为显式 fallback。
    - 新增 `AgentConsolePlanActionKind` 与 `AgentConsolePlanActionPrompt` 类型；状态字段 `planActionPrompt`（默认 `null`，作为确认门禁）、注入式 `planActionBus`（`(action, stepId, payload) => Promise<boolean>`，host 侧权限保护的 action port）、`planActionApplying`（in-flight 标记）。
    - `isPlanActionApplicable(action, item)` 定义各 action 前置条件（幂等守卫）：complete 需 pending/in_progress、retry 需 failed/cancelled、block 需未完成且未阻塞、unblock 需已阻塞、assign 需未终态。
    - `requestPlanAction(action, stepId, payload?)`：破坏性 action（complete/block/unblock/assign）打开确认 prompt（`planActionPrompt`），retry 直接乐观应用并 dispatch（无确认，含 composer fallback 路径）。
    - `confirmPlanAction()`：乐观应用（`applyPlanActionOptimistically` 返回快照）→ dispatch → bus 返回 `false`（权限拒绝）或抛错时经 `rollbackPlanAction(stepId, previous)` 恢复快照；`dismissPlanAction()` 仅清 prompt 不动状态。
    - `block` 置 `blockedReason`/追加 `blockedBy`；`unblock` 清阻塞；`assign` 置 owner（payload 驱动）；`retry` 复用既有 composer fallback（`retrySelectedPlanTodoAction`）当未接入 bus。
  - **测试**：agent-ui 新增 `test/plan-action.spec.ts` 12 项（确认 gate 打开不改状态、inapplicable 拒绝、retry 立即应用、confirm 乐观应用、bus 拒绝回滚、bus 抛错回滚、dismiss 不动状态、composer fallback 保留、block/unblock 往返、assign owner、block 幂等守卫、rollback 快照）→ `786 passing`（774→786）；regression：components `135 passing`、components/console `73 passing`；agent-ui `tsc --noEmit` EXIT=0、`build:web` EXIT=0（3.5MB）。注：首轮 2 项失败为 `planActionPrompt` 初始值 `undefined` 与 `dismiss/confirm` 置 `null` 不一致（toBeNull 断言），已改为字段默认 `null` 后全绿；`dispatchPlanAction` 起初只在抛错时回滚，权限拒绝（bus 返回 `false`）不触发回滚，已改为统一 `Promise<boolean>` 返回值，拒绝/异常均回滚。

### 批次 IV · 后台和项目控制面
- **P231 · Durable task/project control-plane RPC** `platform: agent + agent-gateway + agent-ui/src`
  - 持久化 background task 历史和状态事件，暴露 cursor 分页/订阅/取消批量 action；补 progress、elapsed、retry、usage 与失败 cause，跨重启/远端 host 一致。
  - 将 project→session→thread→delegation 作为单一查询投影，支持命名、迁移、归档和显式 workspace override。
  - 验收：重启、权限隔离、SSE 断线补拉、跨 workspace、fork、迁移及索引一致性。
  - **已完成（2026-08-27，part A：durable 任务历史核心；part B 投影 RPC 顺延到后续增量）**：
    - 新增 `agent-tools/src/background-task-store.ts`：`BackgroundTaskRecord` 扩充 `progress?`（0..1）、`retryCount?`、`usage?`、`cause?`（`{kind, detail}`）、`updatedAt?`；`BackgroundTaskHistoryStore` 抽象契约（`put/get/pageAll/pageBySession/batchCancel/subscribe`）+ `InMemoryBackgroundTaskHistoryStore` 默认实现，cursor 分页为 `startedAt desc + id asc` 稳定排序（`encode/decodeBackgroundTaskCursor`，limit 默认 50 上限 500，未知 cursor 回退从头取），`put` 按 id 幂等覆盖并广播订阅快照，`batchCancel` 仅取消 `running` 并返回实际取消的 id 列表。
    - `BackgroundTaskManager` 增加可选第 4 参注入 `@Inject(BACKGROUND_TASK_HISTORY_STORE)`；`start/finish/fail/cancel` 写穿到 store（fire-and-forget，吞错不阻塞运行链路），并补 `updatedAt/retryCount/progress`（start 置 0，finish 置 1）+ 完成时 `usage`、失败时 `cause`。`fetch`/完成后持久化 `clone` 深拷贝 `usage/cause`。
    - `provider.ts` 注册 `{ provide: BACKGROUND_TASK_HISTORY_STORE, useClass: InMemoryBackgroundTaskHistoryStore }`；`index.ts` 显式再导出 store 非重叠符号（`BackgroundTaskHistoryStore`/`Page`/`PageOptions`/`Cursor`/`Listener`/`encode`/`decode`/`clone`），`BackgroundTaskRecord/Status/BACKGROUND_TASK_HISTORY_STORE/InMemoryBackgroundTaskHistoryStore` 经 manager 再导出以避开 `export *` 重名歧义。
    - **历史顺延项已部分落地**：project→session→thread 导航投影与批量取消已在后续 P236 增量实现；`TypeOrmBackgroundTaskStore` 及默认惰性持久化选择已落地并有回归测试。delegation 级聚合与 gateway 层批量任务 RPC 仍需独立增量。
    - 测试：agent-tools 新增 `test/background-task-store.spec.ts` 9 项（put/get 富记录往返、put 幂等覆盖、cursor 分页无跳/重（同时间戳 6 记录两页）、pageBySession 过滤、batchCancel 仅 running、subscribe/退订生命周期、cursor 编解码、manager 写穿富记录、manager 失败 cause）→ `454 passing`（445→454）；`tsc --noEmit` EXIT=0、下游 agent-ui `tsc --noEmit` EXIT=0。

### 批次 V · 验收与度量
- **P232 · Plan quality and UX evaluation harness** `platform: agent-tools tests + agent-ui acceptance`
  - 增加 plan 分解/执行基准集，指标包括可验证步骤率、依赖正确率、无证据完成率、失败恢复成功率、计划版本冲突率和 token 开销。
  - 扩展 PTY/browser 验收：计划创建→并行执行→失败→确认 retry→恢复→review gate→完成；记录首屏当前步骤可见率、失败定位按键数和 event-to-UI 延迟阈值。
  - 验收：基线结果入库，CI 输出回归报告，components/components-console/agent/agent-tools/agent-ui 受影响包回归通过。
    - **已完成（2026-08-27，part A：plan 质量度量评估器核心 + part B：PTY 生命周期验收与基线回归流水线）**：
    - 新增 `agent-tools/planning/plan-eval.ts`：纯函数、无模型依赖的 plan 分解/执行度量。输入 `PlanEvalTrace`（step 状态、`dependsOn`、`completedWithoutEvidence`/`everFailed`/`recovered` 标记、`writes` 版本冲突记录、token 计数）。
    - 六个指标（`computePlanEvalMetrics`）：可验证步骤率（step 同时有 `acceptance` + `evidence`）、依赖正确率（`dependsOn` 边引用真实 step 的比例）、无证据完成率（`completed` 中 `completedWithoutEvidence` 的比例，越低越好）、失败恢复成功率（曾失败/阻塞后又 `completed` 的比例）、计划版本冲突率（revision-aware 写入中被判 stale/`TodoPlanConflict` 的比例，越低越好）、token 每步开销（`(tokensUsed - payloadTokens)/acceptedSteps`，越低越好）。
    - `buildPlanEvalReport` 聚合多 trace 均值 + 与 baseline 的回归 delta（负向 = 改善），`renderPlanEvalReport`/`summarizePlanEvalReport` 输出 CI 可读报告；`stepsFromCompiledPlan`/`stepsFromReconcileResult`/`planConflictsFromResult` 适配器把真实 `compilePlan`/`reconcileStepStatus`/冲突结果映射为 trace，保证度量落在地真实行为上。
    - `planning/index.ts` 增加 `export * from './plan-eval'`。
    - **part B：PTY 生命周期验收 + 基线持久化/CI 回归报告**：
      - 扩展 `acceptance/fake_model_server.py`：新增 `FAKE_SCENARIO=plan-lifecycle` 剧本（8 个脚本轮次）覆盖 计划创建(4 步并行, `dependsOn`)→并行执行(1/2 `in_progress`)→失败(1 `failed`)→确认 retry(文本提示)→恢复(1/2 `completed`+3 `in_progress`)→review gate(文本 `review 门禁`)→完成(3/4 `completed`)；复用 `TodoStatus` 合法枚举。
      - 扩展 `acceptance/run_acceptance.py`：新增 `scenario_plan_lifecycle`（创建/并行/失败/恢复/门禁/完成各阶段依次 `wait_for` 断言）+ 三个 P232 度量纯函数 `first_screen_step_visibility`（当前 `in_progress` 步骤首屏可见占比）、`fail_loc_keypresses`（失败定位按键数 `abs(diff)+1`）、`event_to_ui_latency`（状态变更→UI 帧毫秒，monotonic）。修复 `REPO` 路径 off-by-one（双 `packages` 拼接）与 Python 3.8 `str|None`→`Optional` 兼容，`main` 按 `FAKE_SCENARIO` 路由场景 4；`CHECKLIST.md` 增补场景 4 与度量说明。
      - 新增 `agent-tools/planning/plan-eval-bench.ts`：`runPlanEvalRegression`（按 per-metric 容差判定回归，`higher-is-better` 负向漂移/`lower-is-better` 正向漂移即 REGRESS）、`renderPlanEvalRegression`（CI 可 grep 的 `[REGRESSION]`/`[OK]` 门禁行）、`defaultPlanEvalTraces`（P232 基准集）、`baselineFromTraces`（summary 入库）；`planning/index.ts` 增加 `export * from './plan-eval-bench'`。
      - `test/plan-eval-bench.spec.ts` 8 项：baseline summary 回卷一致、相同运行无回归、可验证率下降/无证据率上升触发回归、渲染报告含 delta 符号与门禁标记、baseline JSON 持久化→重载一致（`fs` 入库）、入库 baseline 被退化运行消费后输出 `[REGRESSION]`（CI 报告）、`computePlanEvalMetrics` 与 summary 一致 → `471 passing`（463→471）。
    - 验证：agent-tools `471 passing 0 failing`；`tsc --noEmit` EXIT=0（agent-tools / agent / agent-cli / agent-ui）；新增 TS 文件 LSP 无诊断；Python 脚本 `py_compile` 通过、度量纯函数断言通过；`.gitignore` 纳入 `__pycache__/.pyc/acceptance/artifacts`。
    - **顺延（后续增量）**：完整 PTY 生命周期端到端在真实终端手动执行并回填三类度量阈值；browser(Playwright) 多 viewport 矩阵验收；基线阈值纳入 CI 门禁文件并在 agent 全量回归时随 batch 收尾执行。

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

> 归并说明（2026-08-28）：P213 的问询键盘闭环已在 `UI 互动专项进展` 验证；P215/P216 的计划 inspector、action 与事件序列已分别归入 P229/P230/P219；P214、P217、P218 尚未完整实现，后续执行项已重编号为 P233、P237、P238，旧条目仅保留历史映射。

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

## UI 互动专项进展（2026-08-27）

## 深入差距分析与改进计划 v13（2026-08-28，Codex/opencode 对标复核）

本节只记录当前仍可复现、且未被 P203–P224 覆盖的缺口。对照 Codex 的 thread-item 原地更新/单一线性 transcript，以及 opencode 的可恢复 question、permission、task block 和统一 TUI focus 后，当前优先级如下：

| 领域 | 代码证据 | 用户影响 | 优先级 |
|---|---|---|---|
| 统一焦点与返回 | `AgentConsoleSessionState` 仍维护 `messagesFocused`、`tasksFocused`、`approvalsFocused`、`textOverlay` 等独立状态；`syncDerivedInputFocus`/`handleEscapeKey` 依赖分支顺序 | 新增面板可能抢 Esc/Enter，键盘用户无法预测返回路径；browser Tab 顺序与 TUI 不一致 | P0 |
| 问询提交语义 | pending question 目前只把选项写入 composer；没有 question id、提交/拒绝结果、重复事件去重或超时状态 | 用户按 Enter 后仍需再次发送，断线/重复回复可能造成二次回答 | P0 |
| 计划/工具线性投影 | plan 已内联，但旧 `tool_invoked`/`tool_completed` 兼容事件仍可能产生重复行；聚合键缺少跨 turn 的持久投影查询 | 长任务 transcript 仍噪声大，刷新/重连后运行态与终态可能分裂 | P1 |
| 任务与审批可恢复性 | `BackgroundTaskManager` 的 durable store 目前以 InMemory 为主；任务面板缺少分页 cursor、批量结果反馈与失败定位链接 | 重启/多窗口后看不到完整任务历史，批量操作不可审计 | P1 |
| 项目导航一致性 | project→session→thread→delegation 尚无单一查询投影；项目列表与 `/sessions`、`/tasks` 的筛选状态分离 | 用户在项目、线程、任务之间切换会丢失上下文和筛选条件 | P1 |
| 跨端验收与可访问性 | 现有测试以 view-model 为主；PTY/browser 尚未覆盖 focus trap、ARIA、鼠标禁用、窄屏分页和断线恢复全链路 | 回归可能只在真实终端或浏览器键盘操作时暴露 | P1 |

### P233 · FocusStack 与跨端键盘契约 `platform: agent-ui/src（跨平台）`

✅ **已完成（2026-08-28）**：`AgentConsoleSessionState` 新增可序列化 `focusStack`/`activeFocusLayer` 投影及 `push/pop/replace/consume` 操作，统一映射现有面板、问询、overlay、详情与 review 焦点；Esc 关闭顶层问询后按底层焦点重新派生输入状态。新增 3 项 focus-stack 回归测试，agent-ui 全量 789 passing，`tsc --noEmit` 通过；`build:web` 受 sandbox `spawnSync /bin/sh EPERM` 限制未能执行。跨平台边界扫描无直接 console/node import（仅 globalThis 守卫与约束注释命中）。

- 将布尔 focus 字段映射为可序列化 `FocusLayer`（`composer|messages|plan|review|tool|approval|question|overlay|select`），提供 `push/pop/replace/consume`；旧 setter 保留为兼容适配器。
- 明确路由优先级：modal/select/question → inspector/overlay → panel list → transcript → composer；Esc 只弹出一层，Enter/方向键由当前 layer 声明 capability 后消费。
- browser 输出 `tabIndex`、`aria-activedescendant`、focus-visible 状态；TUI 使用同一 action 名称和 keymap，不在平台层复制业务逻辑。
- 验收：焦点状态序列可重放；连续 Esc 恢复 composer；会话切换/turn 完成清理 stale layer；键盘无鼠标完成计划、审批、问询和 inspector 操作。
- 收尾：检查 `git diff` 与边界扫描 → agent-ui、components、components/console 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果与测试数字 → 独立提交。

### P234 · Pending question request/response 生命周期 `platform: agent + agent-ui/src + agent RPC`

**Part A 已完成（2026-08-28）**：`ask_user` 支持稳定 `questionId`（兼容旧 payload 的生成式 fallback）；跨平台 UI 归一化 `sessionId`、时间戳及 `pending/submitting/answered` 状态。选择问题时通过 `questionAction` 调用 gateway `question.answer`，成功后清理、失败保留草稿和错误；gateway 按 session/questionId 幂等记录并提供 `question.list`。剩余：多问询队列、过期语义与断线补拉/运行时挂起恢复。

**Part A 收尾复核（2026-08-28）**：全量测试 agent-gateway 247、agent-ui 791、agent-tools 463、agent 771、components 135、components/console 73，均 EXIT=0；agent-tools / agent-gateway / agent / agent-ui `tsc --noEmit` EXIT=0；agent-ui `build:web` 3.5MB EXIT=0。静态边界：`agent-ui/src` 无 `@tsdi/components/console` 或 Node API 直接 import（扫描仅命中 `console-ports.ts` 规则注释与既有 globalThis `runtimeBuffer`/`Record<string, any>` 守卫）。顺带修正既存 `retentionRate` 字段被提交进 `AgentContextManager` 后 gateway 测试断言未同步（`gateway-server.spec.ts` 两处 `AgentContextPreparedEvent` 补齐 `retentionRate`）。已独立提交。

- 为 question 增加稳定 `questionId`、`sessionId`、`createdAt`、`status: pending|answered|dismissed|expired` 和 `answer`；桥接层按 id 去重并拒绝过期回复。
- UI 将选择、自由输入、确认、取消统一为 `questionAction`，Enter 直接提交 RPC；提交中显示不可重复提交状态，失败保留草稿并提供 retry。
- 支持多问询队列（当前项/总数）、断线重连补拉与 turn 结束自动清理；保留无 questionId 旧 payload 的生成式兼容 id。
- 验收：重复/乱序/跨 session 事件、超时、RPC 拒绝、断线恢复、TUI 1–9/↑↓/Enter/Esc 与 browser Tab/ARIA。
- 收尾：按 P233 同一检查、全量测试、构建、todo 更新、独立提交门禁执行。

**Part B 已完成（2026-08-29）**：agent-ui `AgentConsoleSessionState` 增加 `pendingQuestionQueue` 队列（同 `questionId` 去重保留 pending/answered/dismissed，新问询追加、投影队列首项）、`finishPendingQuestion()`（回答/过期后出队并投影下一项）、`pendingQuestionTotal` 当前/总数 getter、`markPendingQuestionExpired(questionId?)`；`AgentConsolePanels` 在队列长度 >1 时 title 追加 `[1/N]` 位置标记；`choosePendingQuestion` 用 `finishPendingQuestion()` 取代 `setPendingQuestion(null)`，并在 RPC 返回 "expired" 错误时标记过期并推进队列（不遗留卡死错误态）。agent-gateway 新增共享 `QuestionStore`（`register/answer/dismiss/list/listPending/clearSession`，`DEFAULT_QUESTION_TIMEOUT_MS=15min` 过期语义，`expiresAt=createdAt+timeoutMs` 使重放旧问询按原窗口过期，过期或幂等重复回复标记 `expired`/`duplicate`，晚到过期回复按 -32603 拒绝），在 agent-gateway.module 与 agent-app-server.module 注册导出；`EventHandler` 在 `onToolCompleted` 捕获 `ask_user` 载荷调用 `register`；`AppRpcServer` 注入 `@Optional()` QuestionStore + `onQuestionAnswered` 钩子、`answerQuestion`/`listQuestionResponses` 改走共享 store、补 `toQuestionView` mapper（保留 fallback `questionResponses` Map）。agent-ui `AgentConsoleRemoteEventBridge` 新增 `seedFromQuestions()`（首连时 `question.list` 播种 pending 问题），实现断线重连补拉。**运行时挂起恢复：经评估判定不可行**——`AskUserTool` 明确非阻塞（返回 `{ requested:true, kind:'ask_user' }` 即继续 turn，不挂起），实现真挂起需把工具改 Promise 阻塞并跨进程持久化 turn 中执行状态以恢复，直接违反非阻塞 ask_user 契约且会卡死后台/自动化代理；故不实现，以"队列+过期+重连补拉"的非阻塞模型承接澄清诉求。
- 验证通过（part B）：agent-gateway 255（含新增 `test/p234-question-store.spec.ts` 6 例：注册/幂等回答/dismiss/过期拒绝/同 id 保留首条/clearSession）、agent-ui 834（含 p234 spec 新增 5 例：队列推进/同 id 去重/过期推进/clear 清空/null 清空）、agent 792、agent-tools 471；gateway/agent-ui `tsc --noEmit` EXIT=0；agent-ui `build:web` 3.6MB EXIT=0；静态边界干净。已独立提交。

### P235 · 单一 Timeline projection 与刷新恢复 `platform: agent + agent-gateway + agent-ui/src`

- 以 `turnId/planId/stepId/toolCallId/attemptId` 建立持久 projection；start/update/completed/failed/retry 合并为一条可重放记录，原始事件仍写 audit ledger。
- gateway 提供按 session 的 cursor 查询与 last-seen replay；UI 对重复、乱序、旧 sequence 显示 reconnect/stale 标记，不再把兼容事件直接追加 transcript。
- compact/steps/verbose 三模式都读取同一 projection；export/raw 保持完整原始事件，避免展示优化破坏审计。
- 验收：刷新、双窗口、网络抖动、重试 lineage、并行 step、旧事件兼容；同一 toolCall 在 transcript 始终一行。
- 收尾：受影响包全量测试、类型检查/构建、更新 todo、独立提交。
- **Part A 已完成（2026-08-28）**：agent 新增纯 `memory/timeline-projection.ts`（`TimelineEventRecord`/`TimelineEntry`/`TimelineEventType`、纯 reducer `applyTimelineEvent`/`reduceTimelineEvents`/`mergeTimelineEvent`/`sortTimelineEntries`、cursor `encodeTimelineCursor`/`decodeTimelineCursor`、抽象 `TimelineHistoryStore` 契约 + `InMemoryTimelineHistoryStore` + `TIMELINE_HISTORY_STORE` token，按 cat 注册 provider 并导出）。gateway 的 `EventHandler` 注入 `@Optional()` timeline store 并捕获 tool/turn/plan 原始事件（含新增 plan 系列 handler），`AppRpcServer` 新增 `timeline.query`（cursor 分页投影）与 `timeline.replay`（sinceSeq last-seen）RPC。agent-ui 的 `AgentConsoleSessionState` 新增 `timelineReconnecting`/`timelineStale`/`timelineSeedCount`/`timelineTailSeq` 字段与 `seedTimeline`/`markTimelineReconnecting` 方法（用同一投影键原地 upsert，重开/刷新从 `timeline.query` 种子、live 事件继续增量归并）；`AgentConsoleRemoteEventBridge` 在首次连接 `timeline.query` 种子、重连置 reconnect/stale 标记。新增 agent `timeline-projection.spec.ts`（8 例：聚合/陈旧拒绝/plan step/游标/分页/replay 幂等）与 agent-ui `p235-timeline-projection.spec.ts`（4 例：种子 upsert/重复幂等/重连标记/种子+live 合并）、gateway `gateway-server.spec.ts` timeline RPC 例。全量：agent 779、agent-gateway 248、agent-ui 795、components/console 73 通过；agent/gateway/agent-ui `tsc --noEmit` EXIT=0；agent-ui `build:web` 3.5MB；静态边界干净。TypeOrm 持久后端与 PTY 端到端验收顺延 Part B。
- **Part B 已完成（2026-08-29）**：agent 新增 `memory/entities.ts` `AgentTimelineEventEntity`（uuid 主键 + sessionId/eventId/seq/type/timestamp 必填列 + turnId/planId/stepId/toolCallId/receiptId/attempt/toolName/status/sequence/summary/detail/durationMs 可空列），并在 orm.module.ts 三处（import/@Module entities/createAgentOrmProviders）注册。`timeline-projection.ts` 提取并导出 `pageTimelineEntries(entries, options?)` 游标分页 helper（`InMemoryTimelineHistoryStore.query` 与 TypeOrm 后端共用同一条 reduce→sort→page 链路）。新增 `TypeOrmTimelineHistoryStore`：per-session 单调 seq 追加（count 得次序号）、**无条件 append 不去重**（gateway `EventHandler` 以同一 `receiptId ?? toolCallId` 先后写 tool_invoked/tool_completed，去重会丢 completed 事件）、get 按 seq 升序、replay 自 `sinceSeq+1` 严格之后、query 委托 `pageTimelineEntries`，bigint 列 `Number()` 转换；新增 `DefaultTimelineHistoryStore`（DefaultGoalStore 同型 wrapper：adapter 存在走 TypeOrm、否则 InMemory 回退），`lazy-typeorm.ts` 增 `getTypeOrmTimelineHistoryStore` 懒加载工厂，agent.module.ts 改 `{ provide: TIMELINE_HISTORY_STORE, useExisting: DefaultTimelineHistoryStore }`，index.ts 导出两个新 store。新增 `agent/test/persistent-timeline.spec.ts`（5 例：per-session 单调 seq / 多会话独立计数 / replay 严格 after / 游标分页 hasMore+nextCursor / 工具生命周期合并投影）。
- 验证通过（part B）：agent 792（787+5 新增）、agent-gateway 249、agent-ui 829、components/console 73 通过；agent/gateway/agent-ui `tsc --noEmit` EXIT=0；agent-ui `build:web` 3.5MB；静态边界干净。PTY 端到端验收仍顺延 P238。

### P236 · Durable task feed 与项目导航投影 `platform: agent + agent-gateway + agent-ui/src`

- 将 BackgroundTaskHistoryStore 抽象为可替换持久化实现（TypeORM/SQLite 等），定义 cursor 分页、幂等写入、批量 cancel/retry、审计 receipt 和错误 cause 契约。
- 增加 project→session→thread→delegation 单一查询 DTO；`/projects`、`/sessions`、`/tasks` 共用 selection/filter store，切换后恢复滚动位置与筛选条件。
- 任务详情提供关联 plan step、tool receipt、diff/test/review 链接；批量操作显示成功/失败明细并支持撤销窗口。
- 验收：进程重启、多窗口 cursor 不跳不重、跨项目隔离、权限拒绝回滚、批量部分失败、旧 host 降级。
- 收尾：agent/agent-gateway/agent-ui 及存储实现全量测试，`tsc --noEmit`/构建，更新 todo，独立提交。

### P236 Durable task feed 持久化（2026-08-29 完成 BackgroundTaskHistoryStore 可替换持久化实现）

- 契约迁移到 `@tsdi/agent`（避免 `agent → agent-tools` 循环依赖）：`BackgroundTaskHistoryStore` 抽象 + `BACKGROUND_TASK_HISTORY_STORE` token + cursor 编解码/克隆 helper + `InMemoryBackgroundTaskHistoryStore` 从 `agent-tools/src/background-task-store.ts` 原样迁入 `agent/src/memory/background-task-store.ts`；定义 cursor 分页、幂等写入（按 id 替换）、批量 cancel（仅 running）、subscribe 与错误 cause 契约。`agent-tools/src/background-task-store.ts` 改为 `@tsdi/agent` 重导出 shim（含新增 Default/TypeOrm store），既有 `./background-task-store` 导入全部保持可用。
- 提取共享分页 helper `pageBackgroundTaskRecords(sorted, options)`，InMemory 与 TypeOrm 后端共用同一 reduce→sort→page 链路（未知 cursor 稳定回退到开头）。
- 新增 `AgentBackgroundTaskEntity`（uuid rowId + taskId/sessionId/status/goal/startedAt 必填 + finishedAt/updatedAt/result/error/progress/retryCount/usage/cause 可空列），并在 orm.module.ts 三处注册。
- 新增 `TypeOrmBackgroundTaskStore`（注入 `TypeormAdapter`，put 幂等 upsert、get、pageAll/pageBySession 委托 `pageBackgroundTaskRecords`、batchCancel 置 cancelled + finishedAt、subscribe 本地监听）与 `DefaultBackgroundTaskStore`（DefaultGoalStore 同型 wrapper：adapter 存在走 TypeOrm、否则 InMemory 回退）；`lazy-typeorm.ts` 增 `getTypeOrmBackgroundTaskStore` 懒加载工厂；agent.module.ts `{ provide: BACKGROUND_TASK_HISTORY_STORE, useExisting: DefaultBackgroundTaskStore }`；agent index.ts 导出三个新 store。
- `agent-tools/src/provider.ts` 的 `provideAgentTools` 由 `useClass: InMemoryBackgroundTaskHistoryStore` 改为 `InMemoryBackgroundTaskHistoryStore + DefaultBackgroundTaskStore + { provide: BACKGROUND_TASK_HISTORY_STORE, useExisting: DefaultBackgroundTaskStore }`，使 agent-tools 的 `BackgroundTaskManager` 在检测到 TypeormAdapter 时透明切换到持久后端（无 adapter 时回退 InMemory，零行为变化）。
- 新增 `agent/test/persistent-background-task.spec.ts`（5 例：put/get 幂等替换 / 游标分页 hasMore+nextCursor 跨 reload / 按 session 过滤隔离 / batchCancel 仅 running 且持久化 cancelled / subscribe 通知与退订）。
- 验证通过：agent 797（792+5 新增）、agent-tools 471、agent-gateway 255、agent-ui 834、components 135、components/console 73 均 EXIT=0；agent/agent-tools `tsc --noEmit` EXIT=0；agent-ui `build:web` 3.6mb EXIT=0；跨平台边界扫描干净（未触碰 agent-ui/src）。已独立提交。


### P236 项目导航投影（2026-08-28 完成查询 DTO + agent-ui 共用 selection/filter store 切片）

- agent `src/memory/nav.ts` 落地单一查询 DTO：`NavTree`/`NavNode`/`NavFilter`/`NavSelection`，`buildNavTree` 折叠 project→thread→session 并表面化无索引孤儿会话（`tree.sessions` + `totalSessions`），`applyNavFilter`/`flattenNav`/`navigateCursor`/`resolveNavSelection` 提供过滤、扁平序、光标移动与跨刷新存活解析。
- agent-gateway `nav.query` RPC（能力列表 + 分发 + `queryNav`）：按 `context.principalId` 做 session 归属过滤（跨项目隔离），`listSessionInfos` 投影 `NavSessionSource`，树构建后应用 `params.filter`；`includeArchived`/`includeAutomation` 透传。
- agent-ui `AgentConsoleSessionState` 增加共用 selection/filter store：`navFilter`/`navSelection`/`navViewScroll` + `seedNavTree`/`setNavFilter`/`setNavSelection`/`navigateNav`（cursor 在过滤后树上移动）/`resolveNavSelectionTarget`/`setNavViewScroll`/`getNavViewScroll`；`configure()` 不重置 nav 状态，视图切换后滚动位置与筛选条件恢复。
- agent-ui `AgentConsoleRemoteEventBridge` 首次连接时以 `nav.query` 播种导航树（`seedFromNav`，失败静默降级）。
- P236 part B：`AgentConsoleSessionState` 光标/面板列表改走 `navFilteredSessions`（`navFilter` 的 text/workspace/projectId(projectId OR projectKey)/threadId/pinnedOnly 过滤，空过滤返回全量）；`setSessions` 经 `clampSessionSelectionToFilter` 在过滤后列表内重钳选择；`setSessionsFocused(true)` 按 `getNavViewScroll('sessions')` 恢复选择并同步 `navSelection`，`(false)` 回写滚动位置；`/projects` 选中会话后写 `navFilter({projectId})`+`navViewScroll`+`navSelection`（canonicalProjectId 优先会话 projectId，缺失回退 project key），切回 `/sessions` 即恢复项目过滤与会话滚动位置。
- 验证通过（part B）：agent-ui 829（新增 `test/p236-nav-sessions.spec.ts` 27 项：过滤列表/光标/焦点往返/重钳/configure 存活/`/projects` 接线）；三包 `tsc --noEmit` 通过；边界扫描干净。
- 验证通过：agent 787、agent-gateway 249（含 `nav.query` @Test）、agent-ui 802（含 P236 nav state suite）；三包 `tsc --noEmit` 通过；跨平台边界扫描 agent-ui `src/` 无 `@tsdi/components/console`/`node:` 直接 import（仅约束注释命中）。

### P236 任务详情与批量操作撤销（2026-08-29 完成任务详情链接 + 批量成功/失败明细 + 撤销窗口）

- `agent-tools/background-task-manager.ts` 新增 `BackgroundTaskCancelOutcome`/`BackgroundTaskRestoreOutcome` 类型与 `cancelBatch(taskIds)`（逐任务返回 `cancelled`/`not-found`/`not-running`）、`restoreBatch(taskIds)`（撤销；无参时撤销 undo buffer 中最近一次批量取消，逐任务返回 `restored`/`not-found`/`not-cancelled`/`already-finished`）；manager 新增 `pending` 集合（跟踪底层 runner promise 未 settle 的 id）与 `undoBuffer`（取消时快照），`restore` 仅对仍 in-flight 的已取消任务恢复为 `running`（否则 `already-finished`，避免僵尸 running）；`finish`/`fail` settle 时清 `pending`。`cancelMany` 改为委托 `cancelBatch`，`cancel` 委托 `cancelBatch([id])`，行为向后兼容。
- `agent-ui/AgentConsoleComponent` `/ps` 升级：`/ps show <taskId>` 详情（status/session/goal/started/duration/retries/progress/usage/error/cause + `result.report` 的 summary/completed/diff/artifacts/nextSteps/risks —— 即任务详情关联 diff/test/review 内容）；`/ps stop <id1> ...` 批量取消逐条打印成功(✓)/失败(✗ 逐因) 明细并提示 `/ps undo`；`/ps undo [id...]` 撤销（无参撤销最近批量），逐条打印恢复/失败明细、`already-finished` 说明底层 run 已结束不可恢复。无 `cancelBatch`/`restoreBatch` 的旧 manager 降级（stop 走单 `cancel`，undo 提示不支持）。
- 测试：`agent-tools/test/background-task.spec.ts` 新增 5 例（cancelBatch 逐任务成败明细 / restore 仅恢复 in-flight 已取消任务 / 无参 undo 撤销最近批量 / 非可恢复任务原因 / run 已结束拒绝恢复）。`agent-ui/test/p126-commands.spec.ts` `/ps stop` 断言更新为批量明细格式。
- 验证通过：agent 797、agent-tools 476（471+5）、agent-gateway 255、agent-ui 834、components 135、components/console 73 均 EXIT=0；agent-tools/agent-ui `tsc --noEmit` EXIT=0；agent-ui `build:web` 3.6mb EXIT=0；跨平台边界扫描干净（agent-ui `/ps` 仍在通用层，未破坏响应式契约）。已独立提交。

### P237 · Timeline/Plan 信息密度与可访问性基线 `platform: agent-ui/src（跨平台）`

- 统一 event row 的摘要字段（intent、target、outcome、duration、status），长 stdout/diff 只进入 inspector；失败、审批、blocked 默认展开且提供 action label。
- 为 CJK、超长路径、80/120 列、browser mobile 增加稳定宽度和折行规则；禁止依赖颜色表达状态，补 glyph/text/ARIA label。
- 增加 `/timeline`、`/plan`、`/tasks` 的筛选与搜索状态持久化，显示当前过滤条件和结果计数，避免隐式空列表。
- 验收：snapshot + Playwright 多 viewport、screen-reader tree、键盘 only、内存/渲染延迟基线；设定同一 toolCall 行数、首屏当前 step 可见率和失败定位按键数阈值。
- 收尾：agent-ui/components/console 全量测试、类型检查/构建、todo 更新、独立提交。

- P237 B1 完成（统一 event row 摘要 + 默认展开/action label）：`resolveTimelineMeta` 事件行 meta 稳定为 `duration · 状态（· action）` —— 状态文本化（不再仅靠颜色）；新增 `TIMELINE_EVENT_ROW_CONTENT_MAX`(200) 与 `truncateTimelineEventRowContent`（长 stdout/diff 只保留在完整 event content，行级截断加 `…`；failed/error 行默认展开不截断）；`resolveTimelineEventActionLabel` 输出 `retry`（tool 失败）/`重试`（plan step 失败/blocked）/`审批`（approval）并写入事件行 meta；`isTimelineEventMessage` 扩展接受 `plan_step_failed`/`plan_step_blocked`/`approval`/`approval_request`，失败/blocked/审批事件可打开 inspector。审批/blocked 桥接层仍只 pushActivity（不上时间线），端到端补齐留 P238 验收阶段。新增 `test/p237-event-row-summary.spec.ts` 6 例。验证：agent-ui 840（834+6）EXIT=0、`tsc --noEmit` EXIT=0、`build:web` 3.6mb EXIT=0、边界扫描干净。已独立提交。

- P237 B2 完成（CJK/超长路径稳定宽度 + 状态 glyph/text/ARIA label）：新增 `src/AgentConsoleTextWidth.ts`（`getDisplayWidth`/`sliceByDisplayWidth`/`fitByDisplayWidth`/`isWideCodePoint`，CJK/emoji=2、零宽=0、ANSI SGR 安全，镜像 `components/console` display-width 语义但 agent-ui 自包含，避免跨层 import）；`truncateTimelineEventRowContent` 改为按显示宽度截断（全角 300 字 → 100 字+`…`，ASCII 行为与 B1 完全一致，failed/error 仍不截断）；事件行与 timeline 模式默认状态 glyph（running `●`/success `✓`/failed·error `✕`），自定义 `consoleOptions.messageStatusSymbol` 优先，非事件非 timeline 行 status 保持 `''`；每行新增 `ariaLabel` 文本（状态 label + meta + prefix + content，去重且不含 color code）并在 messages 面板与 message-line 组件模板接 `aria-label="{{...}}"`（interpolation → `setAttribute`，DOM/ConsoleElement 双端安全），不依赖颜色表达状态。新增 `test/p237-b2-width-glyph-aria.spec.ts` 11 例。验证：agent-ui 851（840+11）EXIT=0、`tsc --noEmit` EXIT=0、`build:web` 3.6mb EXIT=0、边界扫描干净。已独立提交。

### P238 · 真实终端与浏览器端到端验收 `platform: agent acceptance + agent-ui acceptance`

- **当前状态（2026-08-31）**：未标记完成。PTY 验收脚本可在 Linux/macOS 运行但仍有场景 3/5 的 fake-model/driver 时序限制；browser 侧仓库仅有 Playwright 依赖，未提供独立 E2E runner，且当前环境缺少 Chromium 浏览器二进制（`chromium.executablePath()` 指向缓存但文件不存在）。需在具备浏览器缓存和可复现 gateway/mock harness 的 CI 或人工终端环境中继续，不影响跨平台产品构建。
- 扩展 PTY/browser harness：创建计划→并行任务→问询→审批→失败→retry→断线→恢复→review→完成；覆盖鼠标不可用、窄终端、CJK、长输出和多窗口。
- 记录并持久化基线：首屏当前步骤可见率、question 完成按键数、失败定位按键数、event-to-UI 延迟、重复 toolCall 行数、焦点回退成功率。
- 将阈值与失败现场（ANSI 脱色 transcript、DOM/ARIA 快照、事件 cursor）纳入 CI 报告；任何阈值回退阻止计划标记完成。
- 收尾：执行受影响包全量测试与构建，静态跨平台边界检查，更新本文件写明通过/环境限制，最后独立提交。

- `pending-question-panel` 已支持 TUI/browser 共用的键盘选择：↑/↓ 循环选项、1–9 直选、Enter 确认填入 composer、Esc 取消并恢复输入焦点；保留既有点击路径。
- `/ps` 优先读取 SessionState 的统一后台任务 feed，与 Tasks 面板共享同一数据源；旧宿主仍回退 manager 查询。
- 计划面板失败步骤支持 `r` 快捷键重置为 pending，清理错误/阻塞/耗时信息并生成可确认的 `Retry plan step` 草稿；用户按 Enter 后走既有 agent/tool 事件链持久化。

### P211/P212 与互动收尾复核（2026-08-27）

- 验证通过：agent-ui 761、agent 771、agent-cli 73；agent、agent-tools、agent-cli、agent-ui 均 `tsc --noEmit` 通过，agent-ui `build:web` 通过（3.5MB bundle）。
- agent-tools 全量测试在当前 sandbox 因 LSP/MCP 集成用例无法绑定 `127.0.0.1`（`EPERM`）退出；为既有环境限制，BackgroundTaskManager 相关用例已通过。
- 跨平台边界复核：agent-ui `src/` 没有 `@tsdi/components/console` 或 `node:` 直接 import；扫描命中均为已有 `globalThis` 环境守卫或约束注释。
- 修正全量回归发现的共享 fixture 状态泄漏：plan retry 测试在结束时释放 tasks focus/plan；数字键选择同步选中索引，保证后续 Enter 的目标一致。

### 计划/任务/代码修改展示改进（Codex/opencode 对标）

> 参考 opencode 的 TodoListItem thread item 展示与 Codex 的内联消息块模式，提升 plan、task、code modification 的即时性与认知负担。每个批次收尾固定执行：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新本文件 → 独立提交。

- **P239 · Plan items 作为 thread item 内联展示（高）** `platform: agent-ui/src（跨平台）`
  - 目标：`AgentConsolePlanTodoItem[]` 为对话流中的稳定 thread item（固定 ID `__plan_todo_inline__`），展示为 checkbox 清单（`- [ ] / - [x] / - [-]` 风格），用户无需切换面板即可看到计划进展。
  - 方案：
    - 在 `AgentConsoleMessageRenderers` 中新增 `planTodoRenderer`，将 plan items 渲染为对话流中的 checkbox 清单。
    - plan 更新时在对话流中原地替换（而非新增消息），保持计划清单连续性。
    - 内联 plan 清单与 TasksPanel 双向同步：面板操作反映到内联，内联视觉状态反映到面板。
    - TUI 端用 checkbox 字符，browser 端用 styled checkbox。
  - 锚点：`AgentConsoleMessageRenderers.ts`（新增 renderer）、`AgentConsoleComponent.ts`（plan 消息插入逻辑）、`AgentConsoleSessionState.ts`（plan 内联状态）。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

- **P240 · 文件变更概要作为 thread item 内联展示（高）** `platform: agent-ui/src（跨平台）`
  - 目标：coding_task 的 file changes 与 git diff 文件变更列表作为对话流中的特殊消息块内联展示，用户在对话中即可感知"改了哪些文件"。
  - 方案：
    - 在 `AgentConsoleMessageRenderers` 中新增 `fileChangeSummaryRenderer`，渲染 `FileUpdateChange[]` 或 `ReviewDiffResult.files` 为内联文件变更清单。
    - 格式：`📄 3 files changed: + src/foo.ts (update), + src/bar.ts (add), - src/old.ts (delete)`。
    - TUI 用 emoji/符号前缀，browser 用 styled badge。
    - 文件变更概要点击/Enter 可展开为完整 diff（复用既有 review 面板）。
  - 锚点：`AgentConsoleMessageRenderers.ts`（新增 renderer）、`AgentConsoleComponent.ts`（file change 消息插入）。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

- **P241 · tool result 输出内联增强（中）** `platform: agent-ui/src（跨平台）`
  - 目标：CommandExecution 的输出更完整地内联在对话流中，减少摘要截断，参考 opencode 完整保留 stdout/stderr 展示方式。
  - 方案：
    - `toolRunSummaryMaxLength` 默认值显著提升（从 200 提升至 400+），或对 command execution 类型用更大阈值。
    - 对话流中的 tool result 消息增加"展开"交互：默认显示 summary，Enter 展开完整输出。
    - `AgentConsoleMessageRenderers` 中 tool result renderer 增加展开/折叠 toggle。
    - 摘要显示关键信息（退出码、主要输出片段），完整输出通过 overlay/详情面板访问。
  - 锚点：`AgentConsoleMessageRenderers.ts`（tool result renderer 增强）、`AgentConsoleSessionState.ts`（tool output 展开状态）。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

- **P242 · 对话流进度分隔符与线性感知（中）** `platform: agent-ui/src（跨平台）`
  - 目标：在对话流中提供线性的"思考→执行→执行→结果→下一步"进度感知，减少用户在面板间切换的认知负担。
  - 方案：
    - 在对话流中插入轻量级进度分隔符（如 `── step 3/7 ──`），标记当前 plan step 的边界。
    - 每个 step 内的 tool calls 保持内联，step 完成后插入分隔符。
    - `/display timeline` 控制是否显示这些分隔符。
    - 当前 step 高亮显示，已完成 step 标记为已勾选。
  - 锚点：`AgentConsoleComponent.ts`（step boundary 插入逻辑）、`AgentConsoleSessionState.ts`（timeline 显示控制）。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

### P243 · Harness多代理协作展示（中）** `platform: agent + agent-tools + agent-ui/src`**

> 对照 opencode 的 multi-agent 会话可视化与 Codex 的 delegation dashboard：当前项目的后台任务与委派线程已有基础设施（`BackgroundTaskManager`、`DelegationGraphStore`、`/ps`、`/delegation` 命令），但缺少跨会话的实时协作展示。用户无法直观看到委派链路、worker 状态与任务进度的实时投影。

- **目标**：在对话流或 dedicated 面板中展示实时的 multi-agent 协作状态，包括委派链路、worker 运行态、任务进度与交互历史。
- **方案**：
  - 新增 `harness-projection.ts`：纯函数，基于 `DelegationGraphStore` 构建实时委派树投影，包含 `planId`/`stepId` 联合键，支持 `tree()`/`list()`/`ancestors()` 投影。
  - `AgentConsoleSessionState` 新增 `harnessState` 字段：`{ delegations: Map<string, DelegationInfo>, activeWorkers: Map<string, WorkerStatus>, taskAggregates: Map<string, TaskAggregate> }`。
  - `AgentConsoleComponent` 新增 `/harness` 命令：文本列出当前会话的委派树（`/harness tree`）与任务概览（`/harness list`），支持 `/harness stop <id>` 取消指定任务。
  - 跨平台一致性：TUI 与 browser 共用同一 projection 数据，仅渲染差异（TUI 用树状结构，browser 用带搜索/过滤的面板）。
- **锚点**：`DelegationGraphStore`（已有 tree/list/ancestors 方法）、`BackgroundTaskManager`（已有 list/cancel/get）、`AgentConsoleComponent`（command handling 框架）。
- **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

- **P244 · /command 支持完善（中）** `platform: agent-ui/src + agent RPC`
  - **目标**：显著提升 `/command` 列表的实用性，目前多数子命令要么未实现、要么只在特定上下文生效，用户期望获得类似 Codex 的统一命令面板体验。
  - **方案**：
    - 重新设计 `CommandHandlerContext` 与 `CommandHandler` 接口，引入 `command` 元数据：`description`、`platform`、`contextRequirements`（如 `planActive`、`toolRunning`、`readOnly`）与 `aliases`。
    - 新增/完善以下常用 `/command`：`/ps`（已落地，进一步补充 batch stop details）、**/model**（补充 provider/model 切换的快捷键冲突检测）、**/skills**（补充技能市场浏览与搜索）、**/toggle**（统一开关切换：which-key、模型、提示框）、**/profile**（快速切换 model profile）。
    - 统一 `runKeymapCommand` 行为：优先走既有 handler，未实现时弹出带原因的 notice（非静默失败），并记录至 `/command` 历史。
    - TUI 与 browser 共用同一 command metadata，仅渲染差异（TUI 用列表 + shortcut标记，browser 用带描述的面板）。
  - **锚点**：`AgentConsoleComponent` `runKeymapCommand`、`AgentConsoleSessionState` commandHints、`AgentConsoleKeymap` effectiveBindings。
- **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

- **P245 · 信息展示重构：保尾策略与结构化 inline（高）** `platform: agent-ui/src（跨平台）`
  - **目标**：解决" assistant/user 长回复尾部问询被折叠吞掉" 与"关键设计plan信息隐藏在折叠中的"问题，改用"保尾 + 结构化 inline" 的混合展示策略，确保尾部永远可见关键交互信息，同时保留折叠获取完整内容的能力。
  - **方案**：
    - 修改 `truncateMessageItem`：非 focused 模式对 assistant/user 消息采用"头 2 行 + `… N more lines` + 尾 2 行" 保尾策略，确保尾部永远可见（包括 `ask_user` 问句、plan step 完成语、关键提示）。
    - reasoning/tool/system 保持现有 8 行/4 行 折叠不变。
    - 关键消息标记：引入 `criticalFlag` 字段，当 `templateKind` 为 `planTodo`/`ask_user`/`fileChange` 时自动置 `true`，强制不进入折叠（或最多折叠 1 行，尾部永远可见 3 行）。
    - `/display critical` 命令：切换是否对所有消息应用关键标记策略，便于调试与验收。
    - browser 与 TUI 共用同一 truncate logic，仅渲染差异（TUI 用行号标记，browser 用 ellipsis + "show more"）。
  - **锚点**：`AgentConsolePanels.ts` `renderedMessageItems`、`truncateMessageItem`、`COLLAPSED_MESSAGE_PREVIEW_LINES`。
- **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

- **P246 · 设计计划关键信息优先展示（中）** `platform: agent/src/prompt + agent-ui/src`
  - **目标**：解决"系统提示明确抑制：`Do not call todo … unless the user explicitly asks`" 与"plan 卡片被 push 到消息流末尾并吃 8 行折叠" 两个问题，改为主动引导模型先建立计划，随后每步完成即实时更新，且关键plan信息优先在对话流中可见。
  - **方案**：
    - 调整 `IdentitySection`/`ToolsSection`：将"复杂多步任务开始前必须调用 `todo`"的指引保留，但删掉"unless the user explicitly asks"这种把默认变成"从不"的表述；改为"建议在复杂任务开始时主动调用 `todo`，单轮问答/闲聊可省略"。
    - `displayMessages`：planMessage 插入到"当前 turn 根用户消息之后（时间线位置）"且"不参与 visibleMessages 窗口挤出逻辑（plan 活跃时固定占位）"，避免被折叠挤出视野。
    - plan卡片豁免通用8行折叠：plan 卡片有自己的 >7 项摘要折叠，避免双重折叠。
    - 在对话流中直接渲染 plan 关键信息：plan 标题、当前 step、完成率（`plan 3/7 steps (2 done)`），以及失败/阻塞步骤的标记，确保关键信息永远在视线范围内。
  - **锚点**：`AgentConsoleSessionState.ts` `displayMessages`、`buildPlanMessage`、`AgentConsoleMessageRenderers.ts` planTodo renderer。
- **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

---

## 改进计划 v11（P247–P251，Codex/opencode 深度对标——UI Agent 交互细节展示）

> 基准更新（2026-08-29 深度调研）：Codex v0.149.0 / opencode v1.18.21。
> 重点对标 opencode 的 `/command` 交互范式与信息展示策略。
> 核心问题：
> 1. `/command` 大部分子命令不支持，用户无法获得统一命令面板体验；
> 2. 设计方案未将关键信息和 plan 关键信息展示出来，而是全部返回成一个回复并折叠起来；
> 3. assistant 长回复尾部问询被折叠吞掉；
> 4. plan/todo 从不出现或位置错误、被折叠双重吃行。
> 参考 opencode 行为：`/command` 结果为带编号选项的选择控件，Enter 确认/Esc 收起，非阻塞注入；关键信息优先展示，尾部永不吞。

### 批次 I · /command 支持完善（P247）

- **P247 · /command 支持完善（高）** `platform: agent-ui/src + agent RPC`
  - **目标**：显著提升 `/command` 列表的实用性，目前多数子命令要么未实现、要么只在特定上下文生效，用户期望获得类似 opencode 的统一命令面板体验。
  - **方案**：
    - 重新设计 `CommandHandlerContext` 与 `CommandHandler` 接口，引入 `command` 元数据：`description`、`platform`、`contextRequirements`（如 `planActive`、`toolRunning`、`readOnly`）与 `aliases`。
    - 新增/完善以下常用 `/command`：`/ps`（已落地，进一步补充 batch stop details）、**`/model`**（补充 provider/model 切换的快捷键冲突检测）、**`/skills`**（补充技能市场浏览与搜索）、**`/toggle`**（统一开关切换：which-key、模型、提示框）、**`/profile`**（快速切换 model profile）。
    - 统一 `runKeymapCommand` 行为：优先走既有 handler，未实现时弹出带原因的 notice（非静默失败），并记录至 `/command` 历史。
    - TUI 与 browser 共用同一 command metadata，仅渲染差异（TUI 用列表 + shortcut 标记，browser 用带描述的面板）。
  - **锚点**：`AgentConsoleComponent` `runKeymapCommand`、`AgentConsoleSessionState` commandHints、`AgentConsoleKeymap` effectiveBindings。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

### 批次 II · 折叠策略重构：尾部永不吞（P248）

- **P248 · 折叠策略重构：尾部永不吞（中）** `platform: agent-ui/src（跨平台）`
  - **目标**：解决"assistant/user 长回复尾部问询被折叠吞掉"的问题，改用"保尾"策略，确保尾部永远可见关键交互信息。
  - **方案**：
    - 修改 `truncateMessageItem`：非 focused 模式对 assistant/user 消息采用"头 2 行 + `… N more lines` + 尾 2 行" 保尾策略，确保尾部永远可见（包括 `ask_user` 问句、plan step 完成语、关键提示）。
    - reasoning/tool/system 保持现有 8 行/4 行 折叠不变。
    - `/display critical` 命令：切换是否对所有消息应用关键标记策略，便于调试与验收。
    - browser 与 TUI 共用同一 truncate logic，仅渲染差异（TUI 用行号标记，browser 用 ellipsis + "show more"）。
  - **锚点**：`AgentConsolePanels.ts` `renderedMessageItems`、`truncateMessageItem`、`COLLAPSED_MESSAGE_PREVIEW_LINES`。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

### 批次 III · 信息展示重构：保尾 + 结构化 inline（P249）

- **P249 · 信息展示重构：保尾策略与结构化 inline（高）** `platform: agent-ui/src（跨平台）`
  - **目标**：解决"关键设计plan信息隐藏在折叠中"的问题，改用"保尾 + 结构化 inline" 的混合展示策略，确保尾部永远可见关键交互信息，同时保留折叠获取完整内容的能力。
  - **方案**：
    - 修改 `truncateMessageItem`：非 focused 模式对 assistant/user 消息采用"头 2 行 + `… N more lines` + 尾 2 行" 保尾策略，确保尾部永远可见（包括 `ask_user` 问句、plan step 完成语、关键提示）。
    - reasoning/tool/system 保持现有 8 行/4 行 折叠不变。
    - 关键消息标记：引入 `criticalFlag` 字段，当 `templateKind` 为 `planTodo`/`ask_user`/`fileChange` 时自动置 `true`，强制不进入折叠（或最多折叠 1 行，尾部永远可见 3 行）。
    - `/display critical` 命令：切换是否对所有消息应用关键标记策略，便于调试与验收。
    - browser 与 TUI 共用同一 truncate logic，仅渲染差异（TUI 用行号标记，browser 用 ellipsis + "show more"）。
  - **锚点**：`AgentConsolePanels.ts` `renderedMessageItems`、`truncateMessageItem`、`COLLAPSED_MESSAGE_PREVIEW_LINES`。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

### 批次 IV · 设计计划关键信息优先展示（P250）

- **P250 · 设计计划关键信息优先展示（中）** `platform: agent/src/prompt + agent-ui/src`
  - **目标**：解决"系统提示明确抑制：`Do not call todo … unless the user explicitly asks`" 与"plan 卡片被 push 到消息流末尾并吃 8 行折叠" 两个问题，改为主动引导模型先建立计划，随后每步完成即实时更新，且关键plan信息优先在对话流中可见。
  - **方案**：
    - 调整 `IdentitySection`/`ToolsSection`：将"复杂多步任务开始前必须调用 `todo`"的指引保留，但删掉"unless the user explicitly asks"这种把默认变成"从不"的表述；改为"建议在复杂任务开始时主动调用 `todo`，单轮问答/闲聊可省略"。
    - `displayMessages`：planMessage 插入到"当前 turn 根用户消息之后（时间线位置）"且"不参与 visibleMessages 窗口挤出逻辑（plan 活跃时固定占位）"，避免被折叠挤出视野。
    - plan卡片豁免通用8行折叠：plan 卡片有自己的 >7 项摘要折叠，避免双重折叠。
    - 在对话流中直接渲染 plan 关键信息：plan 标题、当前 step、完成率（`plan 3/7 steps (2 done)`），以及失败/阻塞步骤的标记，确保关键信息永远在视线范围内。
  - **锚点**：`AgentConsoleSessionState.ts` `displayMessages`、`buildPlanMessage`、`AgentConsoleMessageRenderers.ts` planTodo renderer。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。

### 批次 V · /command 交互化：问题选择控件（P251）

- **P251 · /command 交互化：问题选择控件（中-高）** `platform: agent-ui/src`
  - **目标**：实现 `/command` 结果的交互式选择控件，参考 opencode 行为：`/command` 结果为带编号选项的选择控件，Enter 确认/Esc 收起，非阻塞注入。
  - **方案**：
    - `/command` 结果弹出带编号选项的选择控件：问题文本 + 编号选项列表 + ↑↓/数字键选择 + Enter 确认 + Esc 转自由输入。
    - 选择结果自动填入 composer 并发送（走既有 queue/steer 通道）；turn 内阻塞等待为 stretch 目标，首期允许非阻塞注入。
    - 视觉语言与既有 approval pending 队列统一。
    - 支持 `/command` 历史记录与快速重放。
  - **锚点**：`AgentConsoleComponent.ts` `runKeymapCommand`/`handleCommand`、`AgentConsoleSessionState.ts`（pendingCommand 状态）、`AgentConsolePanels.ts`（选择控件渲染）。
  - **收尾**：检查完成项与 git diff → agent-ui 全量测试 → `tsc --noEmit`/`build:web` → 更新本节结果 → 独立提交。
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

---

## 深度对比：Codex/opencode vs 本项目——UI Agent 交互细节展示（v12，2026-08-29）

> 基准：Codex v0.149.0（Rust TUI + TypeScript SDK）+ opencode v1.18.21。
> 重点对标 opencode 的 `/command` 交互范式与信息展示策略。
> 核心问题（用户实测反馈）：
> 1. `/command` 大部分子命令不支持交互式操作——结果全部以 `notify()` 塞入顶部 notice 条一闪而过，或走 `ctx.select()` 单次 picker 消失即灭，没有持久化、可搜索、可键盘导航的交互面板；
> 2. 设计方案未将关键信息和 plan 关键信息展示出来，而是全部返回成一个回复并折叠起来——plan/todo、文件变更、工具结果、ask_user 问询全部挤在 assistant 消息里，折叠后关键信息被吞；
> 3. assistant 长回复尾部问询被折叠吞掉；
> 4. plan/todo 从不出现或位置错误、被折叠双重吃行。
> 参考 opencode 行为：`/command` 结果为带编号选项的选择控件，Enter 确认/Esc 收起，非阻塞注入；关键信息优先展示，尾部永不吞；plan 作为 thread item 内联实时勾选。

### 一、/command 交互现状与差距

#### 1.1 当前实现（代码证据）

| 命令 | 当前交互方式 | 代码锚点 | 问题 |
|---|---|---|---|
| `/help` | `ctx.select('Help', [...], 0, hint)` 单次 picker | `AgentConsoleCommandHandlers.ts:241-333` | 选择后消失，无历史、无搜索、无键盘导航 |
| `/keymap` | `ctx.openTextOverlay('keymap', entries)` 文本列表 | `AgentConsoleComponent.ts:6447` | 只读列表，无搜索过滤，无序号选择，无高亮 |
| `/tools` | `ctx.state.setToolsFocused(true)` 切到面板 | `AgentConsoleCommandHandlers.ts:379-395` | 切面板而非内联，工具列表不可搜索 |
| `/skills` | `ctx.select(...)` 单次 picker 或切面板 | `AgentConsoleCommandHandlers.ts` | 无浏览/搜索/详情 |
| `/mcp` | 同上 | 同上 | 无状态持久化 |
| `/plugins` | 同上 | 同上 | 无交互 |
| `/apps` | `ctx.select(...)` 单次 picker | 同上 | 无浏览器式交互 |
| `/model` | `ctx.openModelSwitcher()` 或 `ctx.activateModelProfile()` | `AgentConsoleCommandHandlers.ts:335-356` | 切换器不持久 |
| `/goal` | `ctx.select(...)` 单次 picker | 同上 | 无进度条/可视化 |
| `/usage` | `this.notify(this.formatUsage(...).join(' \| '))` 状态条 | `AgentConsoleComponent.ts:490` | 长内容挤状态条 |
| `/quality` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:478` | 同上 |
| `/compactions` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/diagnostics` | `ctx.select(...)` picker | 同上 | 同上 |
| `/delegation` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:785` | 同上 |
| `/hooks` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4527` | 同上 |
| `/memories` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4548` | 同上 |
| `/personality` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4637` | 同上 |
| `/experimental` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/feedback` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/ide` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/editor` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/share` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/title` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4415` | 同上 |
| `/statusline` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4476` | 同上 |
| `/theme` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4296` | 同上 |
| `/thinking` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4189` | 同上 |
| `/raw` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4208` | 同上 |
| `/stash` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4279` | 同上 |
| `/init` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/snapshot` | `this.notify(...)` 状态条 | `AgentConsoleComponent.ts:4266` | 同上 |
| `/snapshots` | `ctx.select(...)` picker | `AgentConsoleCommandHandlers.ts:670-712` | 同上 |
| `/git-snapshots` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/review` | `ctx.openCodingTaskReview(...)` 切面板 | 同上 | 同上 |
| `/diff` | `ctx.openGitDiffReview(...)` 切面板 | 同上 | 同上 |
| `/approve` | `ctx.select(...)` picker + `ctx.applyApprovalDecision()` | `AgentConsoleCommandHandlers.ts:407-450` | 部分交互但无确认门禁 |
| `/retry` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/rollback` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/ps` | `this.notify(...)` 状态条 | 同上 | 同上 |
| `/voice` | `this.notify(...)` 状态条 | 同上 | 同上 |

**根因**：90%+ 的 `/command` 结果走 `notify()`（瞬态 notice 条）或 `ctx.select()`（一次性 picker），没有持久化、可搜索、可键盘导航的交互面板。opencode 的 `/command` 结果为带编号选项的选择控件，Enter 确认/Esc 收起，非阻塞注入——本项目尚未实现这一范式。

#### 1.2 Codex/opencode 参照行为

| 原则 | opencode 参照 | 本项目采用方式 |
|---|---|---|
| 命令结果持久化 | `/command` 结果在 overlay 中持久显示，可搜索过滤 | 全部瞬态（notify/select），消失即灭 |
| 交互式选择 | 带编号选项 + ↑↓/数字键选择 + Enter 确认 + Esc 转自由输入 | 仅 `ctx.select()` 一次选择，无键盘导航 |
| 搜索过滤 | `/command` 列表支持 `/` 过滤 | 无 |
| 历史与重放 | `/command` 历史记录，可快速重放 | 无 |
| 状态持久 | 命令状态在 UI 中持久可见 | 命令执行完即消失 |

#### 1.3 改进方案

**P252 · /command 交互化：统一命令面板（高）** `platform: agent-ui/src（跨平台）`
- 目标：所有 `/command` 结果在统一的交互式命令面板中展示，支持搜索过滤、键盘导航、序号选择、Enter 确认、Ecs 转自由输入。
- 方案：
  - 新增 `AgentConsoleCommandPanelComponent`：命令列表 overlay，支持 `/` 过滤、↑↓ 导航、Enter 确认、Esc 收起。
  - 所有 `/command` 结果统一走命令面板：`notify()` 和 `ctx.select()` 改为打开命令面板。
  - 命令面板数据源为 `AgentConsoleKeymap.effectiveBindings(context)` 与 command handlers 注册表，按 context（global/composer/list/approval/pager）分组展示。
  - 带参数的写操作（set/unset/reset/record）保持 notify 反馈不变。
  - TUI 与 browser 共用同一面板组件，仅渲染差异。
- 锚点：`AgentConsoleComponent.ts` `runKeymapCommand`/`handleCommand`、`AgentConsoleSessionState.ts`（overlay 状态）、`AgentConsolePanels.ts`（新组件）。
- 自动测试：受影响包全量测试 + `tsc --noEmit` + `build:web`。
- Console 专项：真实 PTY 验收命令面板搜索/过滤/导航。
- 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 应为空。

---

### 二、Plan/Design 关键信息展示差距

#### 2.1 当前实现（代码证据）

**已修复的问题（通过 P172–P238 前期计划）**

| 维度 | 代码证据 | 状态 |
|---|---|---|
| Plan 位置 | `AgentConsoleSessionState.ts:1140-1153` `displayMessages` 已将 `planMessage` 插入到当前 turn 根用户消息之后（时间线位置），不再 push 到末尾 | ✅ 已修复（P187/P233） |
| Plan 折叠 | `AgentConsolePanels.ts` plan 卡片已豁免通用 8 行折叠；`AgentConsoleMessageRenderers.ts:139-157` `resolvePlanTodoContent` 渲染 checkbox 清单 | ✅ 已修复（P187/P233） |
| Ask_user 交互 | `AgentConsoleSessionState.ts:567-571` `pendingQuestion`/`pendingQuestionQueue`/`questionAction` 已实现；`AgentConsolePanels.ts:1944-1951` `pending-question-panel` 已渲染选择控件 | ✅ 已修复（P189/P234） |
| 文件变更内联 | `AgentConsoleMessageRenderers.ts:208` `fileChange` templateKind 已有专用 renderer；`AgentConsoleSessionState.ts` 已支持文件变更概要 | ✅ 已修复（P174） |

**仍待解决的问题**

| 维度 | 代码证据 | 问题 |
|---|---|---|
| /command 无交互面板 | `AgentConsoleCommandHandlers.ts` 90%+ 命令走 `notify()` 或 `ctx.select()` | 结果消失即灭，无搜索/过滤/键盘导航 |
| 尾部问询被折叠 | `AgentConsolePanels.ts:2668` `truncateMessageItem` 默认 `COLLAPSED_MESSAGE_PREVIEW_LINES=8`，对所有消息做 head 截断 | 问句在长回复末尾必然被截掉 |
| "Click to expand" 误导 | `AgentConsoleComponent.ts:241` `shouldEnableTerminalMouseTracking()` 返回 false，TUI 禁用鼠标 | click 文案不可达 |
| 工具输出截断过多 | `AgentConsoleSettingsStore.ts:409` `toolRunSummaryMaxLength: 96` | 摘要可能丢失关键信息 |
| 系统提示抑制 todo | `agent/src/prompt/sections/ToolsSection.ts:37-41` 已改为主动规划口径，但 `IdentitySection.ts:67` 仍含 "unless the user explicitly asks"（针对 project_intel，非 todo） | 部分残留抑制措辞 |

#### 2.2 Codex/opencode 参照行为

| 原则 | Codex 参照 | opencode 参照 | 本项目采用方式 |
|---|---|---|---|
| 计划内联 | `TodoListItem` thread item 内联，对话中 checkbox 逐步勾选 | task block 承载运行/输出/错误/耗时 | plan 卡片插入根用户消息之后，时间线位置 |
| 文件变更内联 | `FileChangeItem` thread item，文件名+变更类型 | diff 摘要内联 | 文件变更概要内联，点击展开 |
| 工具输出内联 | `CommandExecutionItem` 完整保留 stdout/stderr | tool block 可折叠 | 工具结果默认摘要，Enter 展开 |
| 异常优先 | 失败/审批在流中显著 | 错误保留 retry 上下文 | failed/blocked/approval 固定展开 |
| 尾部永不吞 | assistant 最终回复全文可见 | 折叠只用于工具输出/reasoning | 保尾策略：头 N-2 + … + 尾 2 行 |
| 追问交互 | 编号选项 + 键盘选择 + 高亮框 | question block 可交互 | ask_user 交互化选择控件 |

#### 2.3 改进方案

**P252 · /command 交互化：统一命令面板（高）** `platform: agent-ui/src（跨平台）`
- 见 1.3 节。

**P253 · 保尾折叠：assistant/user 消息不吞尾部（高）** `platform: agent-ui/src（跨平台）`
- 目标：解决"assistant/user 长回复尾部问询被折叠吞掉"的问题。
- 方案：
  - 修改 `truncateMessageItem`：非 focused 模式对 assistant/user 消息采用"头 2 行 + `… N more lines` + 尾 2 行"保尾策略，确保尾部永远可见（包括 `ask_user` 问句、plan step 完成语、关键提示）。
  - reasoning/tool/system 保持现有 8 行/4 行折叠不变。
  - `/display critical` 命令：切换是否对所有消息应用关键标记策略。
  - TUI 端去掉 "Click to expand" 文案（不可达），改为 "enter 展开"。
- 锚点：`AgentConsolePanels.ts` `renderedMessageItems`/`truncateMessageItem`、`AgentConsoleComponent.ts` `shouldEnableTerminalMouseTracking`。

**P254 · Plan 卡片固定位置 + 免折叠 + 渲染强化（高）** `platform: agent-ui/src（跨平台）`
- 目标：解决"plan/todo 从不出现或位置错误、被折叠双重吃行"。
- 方案：
  - `displayMessages` 不再把 `planMessage` push 到末尾：插入到当前 turn 根用户消息之后（时间线位置），且不参与 `visibleMessages` 窗口挤出逻辑（plan 活跃时固定占位）。
  - plan 卡片豁免通用 8 行折叠（它有自己的 >7 项摘要折叠），避免双重折叠。
  - 渲染强化：checkbox 字形（`☐/▸/☒/⊘`）、进度条（`plan 3/7 ▓▓▓░░░░░`）、in_progress 项高亮；TUI/browser 共用同一渲染函数。
- 锚点：`AgentConsoleSessionState.ts` `displayMessages`/`buildPlanMessage`、`AgentConsoleMessageRenderers.ts` planTodo renderer。

**P255 · 文件变更概要内联（高）** `platform: agent-ui/src（跨平台）`
- 目标：coding_task 的 file changes 与 git diff 文件变更列表作为对话流中的特殊消息块内联展示。
- 方案：
  - 新增 `fileChangeSummaryRenderer`，渲染 `FileUpdateChange[]` 为内联文件变更清单：`📄 3 files changed: + src/foo.ts (update), + src/bar.ts (add), - src/old.ts (delete)`。
  - 文件变更概要点击/Enter 可展开为完整 diff（复用既有 review 面板）。
- 锚点：`AgentConsoleMessageRenderers.ts`（新增 renderer）、`AgentConsoleComponent.ts`（file change 消息插入）。

**P256 · Ask_user 交互化：问题选择控件（中-高）** `platform: agent-ui/src（跨平台）`
- 目标：`ask_user` 不再是纯文本埋在正文里，而是交互式选择控件。
- 方案：
  - EventBridge 监听 `ask_user` 完成事件 → `state.pendingQuestion { question, options, severity }` → composer 上方渲染选择框：编号选项 + ↑↓/数字键选择 + Enter 确认 + Esc 转自由输入。
  - 选择结果自动填入 composer 并发送（走既有 queue/steer 通道）。
  - 视觉语言与既有 approval pending 队列统一。
- 锚点：`AgentConsoleEventBridge.ts`/`AgentConsoleRemoteEventBridge.ts`（新增 ask_user 绑定）、`AgentConsoleSessionState.ts`（pendingQuestion 状态）。

**P257 · 设计计划关键信息优先展示（中）** `platform: agent/src/prompt + agent-ui/src`
- 目标：解决"系统提示明确抑制 `Do not call todo … unless the user explicitly asks`"与"plan 卡片被 push 到消息流末尾并吃 8 行折叠"。
- 方案：
  - `IdentitySection`/`ToolsSection`：改为 Codex 式主动规划口径——复杂多步任务开始前必须调用 `todo`，单轮问答/闲聊可省略。
  - `displayMessages`：planMessage 插入到当前 turn 根用户消息之后，不参与 visibleMessages 窗口挤出。
  - plan 卡片豁免通用 8 行折叠。
  - 在对话流中直接渲染 plan 关键信息：plan 标题、当前 step、完成率、失败/阻塞步骤标记。
- 锚点：`agent/src/prompt/sections/IdentitySection.ts:58-62`、`ToolsSection.ts:37-53`；`AgentConsoleSessionState.ts` `displayMessages`。

**P258 · 工具执行输出内联增强（中）** `platform: agent-ui/src（跨平台）`
- 目标：CommandExecution 的输出更完整地内联在对话流中。
- 方案：
  - `toolRunSummaryMaxLength` 默认值从 200 提升至 400+。
  - 对话流中的 tool result 消息增加"展开"交互：默认显示 summary，Enter 展开完整输出。
  - `AgentConsoleMessageRenderers` 中 tool result renderer 增加展开/折叠 toggle。
- 锚点：`AgentConsoleMessageRenderers.ts`（tool result renderer 增强）、`AgentConsoleSessionState.ts`（tool output 展开状态）。

---

### 三、实施批次

#### 批次 I · /command 交互化（P252）
- **P252 · /command 交互化：统一命令面板（高）** `platform: agent-ui/src（跨平台）`
  - 新增 `AgentConsoleCommandPanelComponent`：命令列表 overlay，支持 `/` 过滤、↑↓ 导航、Enter 确认、Esc 收起。
  - 所有 `/command` 结果统一走命令面板。
  - 命令面板数据源为 `AgentConsoleKeymap.effectiveBindings(context)` 与 command handlers 注册表。
  - 自动测试：受影响包全量测试 + `tsc --noEmit` + `build:web`。
  - Console 专项：真实 PTY 验收命令面板搜索/过滤/导航。
  - 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 应为空。
  - 回归基线：确保 P0–P251 已有测试不回归。

#### 批次 II · 折叠策略重构（P253）
- **P253 · 保尾折叠：assistant/user 消息不吞尾部（高）** `platform: agent-ui/src（跨平台）`
  - 修改 `truncateMessageItem`：非 focused 模式对 assistant/user 消息采用"头 2 行 + … + 尾 2 行"保尾策略。
  - reasoning/tool/system 保持现有折叠不变。
  - TUI 端去掉 "Click to expand" 文案，改为 "enter 展开"。
  - 自动测试 + `tsc --noEmit` + `build:web` + 真实终端验收。

#### 批次 III · Plan 卡片修复（P254）✅ 已完成
- **P254 · Plan 卡片固定位置 + 免折叠 + 渲染强化（高）** `platform: agent-ui/src（跨平台）`
  - `displayMessages`：planMessage 插入到当前 turn 根用户消息之后，不参与 visibleMessages 挤出。
  - plan 卡片豁免通用 8 行折叠。
  - 渲染强化：checkbox 字形、进度条、in_progress 高亮。
  - ✅ 已实现：通过 P187/P233 完成。

#### 批次 IV · 文件变更 + Ask_user + 输出内联（P255-P256, P258）
- **P255 · 文件变更概要内联（高）** `platform: agent-ui/src（跨平台）` ✅ 已完成
  - ✅ 已实现：通过 P174 完成。
- **P256 · Ask_user 交互化（中-高）** `platform: agent-ui/src（跨平台）` ✅ 已完成
  - ✅ 已实现：通过 P189/P234 完成（pendingQuestion/pendingQuestionQueue/questionAction 已存在）。
- **P258 · 工具执行输出内联增强（中）** `platform: agent-ui/src（跨平台）` ✅ **已完成（2026-08-31）**
  - 工具运行面板摘要默认值从 96 提升至 400，与 `summarizeToolDisplayText` 的对话流预览一致；完整原文仍经既有 Enter 消息详情面板分页查看。
  - 新增默认预览预算回归；agent-ui 872 passing，`tsc --noEmit` 与 `build:web` 通过。

#### 批次 V · 设计计划关键信息优先展示（P257）✅ 已完成
- **P257 · 设计计划关键信息优先展示（中）** `platform: agent/src/prompt + agent-ui/src`
  - `IdentitySection`/`ToolsSection` 改为主动规划口径。
  - `displayMessages`：planMessage 插入到当前 turn 根用户消息之后。
  - plan 卡片豁免通用 8 行折叠。
  - ✅ 已实现：ToolsSection.ts 已含主动规划口径。

#### 批次 VI · 验证与回归（P259）
- **P259 · 全量验证与真实终端验收** `platform: 验证（跨平台）`
  - **自动回归完成（2026-08-31）**：agent 797、agent-ui 872、components 135、components/console 73、components/html 117 均通过；agent-ui `tsc --noEmit`/`build:web` 通过，`src/` 无 `@tsdi/components/console` 或 `node:` 直接 import。
  - **端到端限制**：Playwright 已作为工具依赖安装，但当前没有 agent-ui browser E2E runner；PTY 脚本限 Linux/macOS，场景 1/2 已通过，场景 3/5 仍受 fake model/driver 时序限制（见 P262）。这些限制需由独立的 P238 harness 工作承接。
  - 自动测试：agent-ui 全套 + components / components/console / components/html 回归 + agent 包 prompt 相关测试 + `tsc --noEmit` + `build:web`。
  - PTY 实测四场景：① 长回复尾部问询在默认模式可见；② `/command` 弹出统一命令面板且可搜索/过滤/导航；③ 多步任务中模型主动调 `todo`，plan 卡片出现在根请求之后并实时勾选；④ `ask_user` 弹出交互式选择控件。
  - 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 为空；新代码无 node API 直接引用。
  - 回归基线：P0–P258 既有测试不回归。

---

### 四、差距总结

| 差距 | 优先级 | 描述 | 状态 |
|---|---|---|---|
| /command 无交互式面板 | **高** | 统一命令注册表、fuzzy 搜索、持久输出回看已落地 | ✅ P260–P262 |
| Plan 卡片位置错误+折叠 | **高** | planMessage push 到末尾被挤出可视窗口，且被 8 行折叠双重吃行 | ✅ P254 已修复 |
| 尾部问询被折叠吞掉 | **高** | 保尾折叠与关键消息豁免已落地 | ✅ P253/P264 |
| Ask_user 无交互 | **高** | 仅纯文本埋在正文，无选择控件 | ✅ P256 已修复 |
| 文件变更不直观 | **中** | 变更信息散落 tool result，无内联可视化 | ✅ P255 已修复 |
| 工具输出截断过多 | **中** | 工具预览预算已统一为 400，详情面板保留完整原文 | ✅ P258 |
| 系统提示抑制 todo | **中** | "unless the user explicitly asks" 把默认变成"从不" | ⚠️ 非 v12 范围 |

---

### 五、本项目优势（保持并强化）

1. **循证验证螺旋**：evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由 + LSP 诊断证据 + AGENTS 规则草案——codex/opencode 均无系统化闭环。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类、thread 终态回写、coding_task 结构化编排。
3. **上下文压缩严谨性**：anchor 保留 + 五字段 summary schema + 质量评分 + 压缩历史观测 + overflow replay。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO + 审计落库 + LIFO 补偿 + Git step 快照 revert/unrevert。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层。
6. **覆盖面**：40+ 工具组、MCP 三形态 + OAuth + server、skills 本地 + 远程市场 + 插件（1.0.0 标准）、hooks 双形态、gateway 多协议 + OpenAPI。
7. **跨平台响应式 UI 架构**：TUI/浏览器/VS Code/Electron 四端共用响应式渲染层（数据驱动、无定时器、时间派生动画）。
8. **TUI 功能密度**：~70 命令 / ~20 面板 / vim / which-key / 5 上下文分域键位 / 模型收藏/最近/变体循环。
9. **代码审查能力**（vs Codex）：hunk 级别导航、file annotations（approved/rejected）、side-by-side 模式、列滚动——Codex 的 file change 只有 add/delete/update 概要，无 hunk 级审查。
10. **Durable 任务历史**（vs opencode）：BackgroundTaskHistoryStore 支持 cursor 分页、batch cancel、subscribe、failure cause 追溯——opencode 无等价持久化任务历史。
11. **Plan revision/乐观并发**（vs Codex）：planId/revision 追踪 + expectedRevision 冲突检测 + rebase payload——Codex 无 plan 版本控制。
12. **证据感知计划编译器**（vs opencode）：compilePlan 自动推导 acceptance/evidence/risk + decompose action——opencode 无等价计划质量编译器。
13. **Plan execution reconciler**（vs Codex）：tool receipt/LSP/verify/review evidence 确定性关联到 plan step——Codex 无等价 evidence→step 关联。
14. **DAG orchestration bridge**（vs opencode）：resolveSchedule 映射到 fan_out/wait_all + worker 调度 + 部分失败传播——opencode 无等价 DAG 调度。

---

## 改进计划 v12：Slash Command 交互化与关键信息优先展示（P252–P259）

> 对照 opencode 的 `/command` 交互范式与 Codex 的内联消息块模式，解决三个核心体验断点：
> 1. `/command` 大部分子命令不支持交互式操作——结果全部以 `notify()` 塞入顶部 notice 条一闪而过，或走 `ctx.select()` 单次 picker 消失即灭；
> 2. 设计方案未将关键信息和 plan 关键信息展示出来，而是全部返回成一个回复并折叠起来；
> 3. assistant 长回复尾部问询被折叠吞掉。
> 每个批次收尾固定执行：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新本文件 → 独立提交。

---

## 深度对比 v13：/command 与 Plan 交互再审视（2026-08-30）

> 在 v12（P252–P259）基础上，对本项目已落地代码做逐条证据复核，并对照 opencode 2026-08 实际行为补充新差距。
> **复核结论先行**：P253（保尾折叠）实际已在全部渲染分支落地，v12 的 ❌ 标记过时；P254/P255/P256/P257 确认已落地；P252 部分实现（可搜索命令总表已存在，缺描述/分组/持久输出）；P258 仍待实现。
> 参考：opencode.ai/docs/tui（2026-08-28 快照）、cheatsheets.zip/opencode（2026-04-03）。

### 一、v12 遗留项复核（代码证据）

| 项 | v12 标记 | 当前代码证据 | 复核结论 |
|---|---|---|---|
| P252 命令面板 | ✅ 已完成 | 命令元数据、fuzzy 过滤与持久输出已由 P260–P262 承接完成 | P260–P262 |
| P253 保尾折叠 | ✅ 已完成 | `AgentConsolePanels.ts:2604-2655` 三个分支全部带保尾；`truncateMessageItem` 使用 `trailingQuestionLineCount` + `QUESTION_TAIL_VISIBLE_BUDGET` 保留问询尾部；TUI 默认交互为 Enter，`/display critical` 由 P264 补齐 | P253/P264 |
| P254 Plan 卡片位置/免折叠 | ✅ P187/P233 | `displayMessages` 插入当前 turn 根用户消息后；plan item 豁免折叠（`Panels.ts:2614/2652` `isPlanTodoMessageItem`）；`AgentConsoleMessageRenderers.ts:139-157` `resolvePlanTodoContent` checkbox 渲染 | ✅ 确认；缺失败/阻塞标记与实时勾选联动 → P263 |
| P255 文件变更内联 | ✅ P174 | — | ✅ |
| P256 Ask_user | ✅ P189/P234 | `AgentConsoleSessionState.ts:567-571` `pendingQuestion`；`Panels.ts:1944-1951` 面板 | ✅ |
| P257 提示主动规划 | ✅ | `agent/src/prompt/sections/ToolsSection.ts:37-41` | ✅ |
| P258 工具输出内联 | ✅ 已完成 | `toolRunSummaryMaxLength: 400`，完整原文可从详情面板查看 | P258（2026-08-31） |

### 二、opencode 2026-08 参照行为 → 本项目差距（新增）

| opencode 行为 | opencode 细节 | 本项目现状 | 差距 |
|---|---|---|---|
| Slash 补全显示描述 | 输入 `/` 弹下拉、逐字客户端过滤；每条命令显示 `description`（官网原话 "This is shown as the description in the TUI when you type in the command"） | composer `/` 补全只显示裸命令名（`AgentConsoleSuggestions.ts:53-56`，label=value=命令名）；palette `description:'command'` 硬编码（`AgentConsoleComponent.ts:6064`） | 全链路无命令描述数据源 → P260 |
| 智慧运行（smart run） | 选中 `$ARGUMENTS` 模板命令 → 插入 `/name ` 等待参数；无参命令 → 选中即执行 | 选中任何命令都只注入文本（`AgentConsoleSessionState.ts:4627-4636`），必须再按一次 Enter | 无 smart-run → P261 |
| 过滤一致性 | 补全与 palette 同一过滤基准 | palette 用 subsequence fuzzy（`AgentConsoleKeymap.ts:126`），composer 补全用 `startsWith`（`AgentConsoleSuggestions.ts:51`） | 行为不一致 → P261 |
| 命令定义结构 | name/description/aliases/keybind/agent/model/subtask；`.opencode/commands/*.md` 用户可扩展 | `commandHints` 是扁平 string[]（`AgentConsoleSessionState.ts:678`），`COMMAND_HANDLERS` 是 `Record<string, fn>`（`AgentConsoleCommandHandlers.ts:1358`） | 无 structured registry → P260 |
| 命令结果持久 | 命令结果在 overlay 持久显示 | 90%+ 命令结果走 notify() 瞬态 / ctx.select() 一次性（v12 1.1 表 37 行证据） | → P262 |
| Plan 内联实时勾选 | plan 作为 thread item 内联，checkbox 步步勾选 | plan 卡片已定位 + 豁免折叠，但无失败/阻塞标记、无 tool receipt 实测联动 | → P263 |

### 三、新增改进项（v13，P260 起）

**P260 · 命令元数据注册表 CommandDefinition（高）** `platform: agent-ui/src（跨平台）` ✅ **已完成（2026-08-30）**
- 状态：新增 `AgentConsoleCommandRegistry.ts`（88 定义、8 组、`/help` 索引 0、10 条 needsArgs、别名 `/q` `/x`）；`commandHints` 改派生 getter + `injectedCommandHints` 注入合并；palette/补全/`/help` 三路消费 description+group（`openCommandPalette` 取 label/description/group，Suggestions `/` 分支 fuzzy + 描述 + hint，`buildAgentConsoleHelpOptions` 按组渲染）。`test/command-registry.spec.ts` 10 项单元全绿（完整性/组计数/别名唯一/needsArgs/hints 合并/描述格式/help 分组/smart-run 分流/外部 hint 提交）。agent-ui 全量 862 passing，`tsc --noEmit` 通过，`build:web` 成功。
- 目标：为所有 `/command` 提供单一事实源（name/description/aliases/group/needsArgs/contexts），根治"补全与面板无描述、/help 无分组"的结构性缺陷。
- 方案：
  - 新增 `AgentConsoleCommandRegistry` 导出 `AgentConsoleCommandDefinition[]`；`COMMAND_HANDLERS` 迁移为 `Record<string, CommandHandler>` 仍按名索引，定义项按名关联。
  - 删除 `AgentConsoleSessionState.ts:678` 硬编码 `commandHints` 数组，改为派生只读 getter（= registry 条目）；setter `:4142` 仅保留外部注入合并（去重）。
  - 命令按 group 归类（核心/会话/显示/输入/审查/钩子/委托/系统），description 中文短句 + 参数示例。
  - 三路消费：palette（`AgentConsoleComponent.ts:6060` 取 label/description/group，废弃 `description:'command'` 硬编码）、composer 补全（`AgentConsoleSuggestions.ts`）、`/help`（`AgentConsoleCommandHandlers.ts:241-333` 改按 group 分组渲染）。
- 锚点：`AgentConsoleSessionState.ts:678/4142`、`AgentConsoleCommandHandlers.ts:1358`、`AgentConsoleComponent.ts:6060-6070`、`AgentConsoleSuggestions.ts:39-79`。
- 自动测试：单元（registry 完整性：commandHints ⊆ registry、无孤儿命令、别名唯一、needsArgs 一致性）+ agent-ui 全量 + `tsc --noEmit` + `build:web`。
- Console 专项：PTY 验收 palette/补全/help 三路显示 description+group 一致。
- 静态约束：`rg "@tsdi/components/console" packages/agents/agent-ui/src` 为空。

**P261 · composer `/` 补全升级：描述行 + fuzzy 一致 + 智慧运行（高）** `platform: agent-ui/src（跨平台）` ✅ **已完成（2026-08-30）**
- 状态：`resolveAgentConsoleInputSuggestions` `/` 分支改用 `fuzzyMatchAgentConsoleCommand` + option 附 `description`（registry 消费）+ hint 更新；`selectMenuAction` 按 registry `needsArgs` 分流（无参加载注入 → smart-run 直接执行 `handleCommand(value)`，带参保留注入 `/name `）；`handleCommand` 完成命令名 canonicalization。`command-registry.spec.ts` 覆盖无参/带参 smart-run 分流与外部 hint 合并提交，与 palette 过滤一致。
- 目标：对齐 opencode——补全项带描述、过滤与 palette 同一 fuzzy、无参命令选中即执行、带参命令注入 `/name ` 等待。
- 方案：
  - `resolveAgentConsoleInputSuggestions`（`AgentConsoleSuggestions.ts:39-79`）`/` 分支过滤从 `startsWith` 改为复用 `fuzzyMatchAgentConsoleCommand`（`AgentConsoleKeymap.ts:126`）；option 附 `description`（来自 P260 registry，回退"命令行参数示例"）。
  - `selectMenuAction`（`AgentConsoleSessionState.ts:4627-4636`）按 registry `needsArgs` 分流：无参 → 直接 `handleCommand(value)` 并清空输入（smart-run）；带参 → 保留现注入行为 `applyAgentConsoleSuggestion`（`/name ` 待参数）。
  - 补全 hint 更新为 `enter 执行   tab 补全   up/down 选择`。
- 锚点：`AgentConsoleSuggestions.ts`、`AgentConsoleSessionState.ts:4595-4639`、`AgentConsoleKeymap.ts:126`。
- 自动测试：单元（无参/带参/多 token/光标中段/fuzzy 命中）+ agent-ui 全量 + `tsc --noEmit` + `build:web`。
- Console 专项：PTY 验收选中 `/help` 二次回车消失（直接执行）与 `/model ` 注入等待。
- 静态约束：同上。

**P262 · 命令结果历史回看面板（中）** `platform: agent-ui/src（跨平台）` ✅ **已完成（2026-08-30）**
- 状态：`state.commandOutputs` 环形上限 20 条 + `pushCommandOutput(command, text, kind)`（trim 空值丢弃、kind 默认 'result'）；新增 `AgentConsoleCommandOutputsPanelComponent`（`/outputs` 命令 + Ctrl+O 全局键位，`↑↓/j/k` 翻页、pageup/down、home/end、Esc 收起、`/` 过滤、Enter 复制、backspace 退格），面板状态入 overlay 体系（focus 层、`hasCommandOutputsFocus`、browser 路由 `handleBrowserGlobalKeyInput`）。迁移 ~38 处命令结果写入到 `ctx.pushCommandOutput`（DiagnosticsHandlers 12 处：/compactions /diagnostics /usage /harness audit·profile·diff /quality·list·trend；Component 23 处：/quality trend /diagnostics trend /delegation tree·lineage·list /hooks /memories /personality /debug-config /skills /mcp /plugins /ps /ide /title list /statusline list /stash list /status /init；VoiceHandlers 2 处：/voice stop、/voice status；CommandHandlers 1 处：/snapshot）；桥接 `this.pushCommandOutput()` 内部仍 `notify(text)`（瞬态体验保留，notice 测试不受影响）；kind 参数类型化为 `AgentConsoleCommandOutputEntry['kind']`（去掉 `as any`）。`/git-snapshots` diff 走 overlay（`openGitSnapshotDetail`）无需迁移。新增 8 项单元测试（环形上限、trim 空值丢弃、command/text 过滤、过滤串 64 上限、开关重置、选中钳制、复制、空态），agent-ui 全量 870 passing（基线 862），`tsc --noEmit` 通过，`build:web` 通过。
- 目标：notify 瞬态命令结果（/usage /quality /compactions /diagnostics /delegation /hooks /memories /personality /retry /rollback /ps /voice /ide /editor /share /title /statusline /theme /thinking /raw /stash /init /snapshot /git-snapshots 等 ~25 项）可回看，不再"消失即灭"。
- 方案：
  - 新增 `state.commandOutputs: { id; command; text; ts; kind }[]`（环形上限 20 条）；新增 `ctx.pushCommandOutput(command, text)` 并迁移上述命令的结果写入（notify 保留用于非命令提示）。
  - 新增 `CommandOutputsPanel`（`AgentConsolePanels.ts`）：`/outputs` 命令 + 全局键位（建议 Ctrl+O）打开，↑↓/j/k 翻页、Esc 收起、`/` 过滤、Enter 复制原文。
  - 面板状态入 overlay 体系，TUI/browser 共用渲染。
- 锚点：`AgentConsoleCommandHandlers.ts`（上述命令处理器，坐标见 v12 1.1 表）、`AgentConsoleComponent.ts` notify 调用点、`AgentConsolePanels.ts`（新面板）、`AgentConsoleKeymap.ts`（新全局 action + 键位）。
- 自动测试：单元（环形上限、过滤、空态、复制）+ agent-ui 全量 + `tsc --noEmit` + `build:web`。
- Console 专项：PTY 验收 `/usage` 后 `Ctrl+O` 打开面板回看。
- 静态约束：同上。



**P262 · PTY 验收现状（2026-08-31）** `platform: agent-ui/src + acceptance/pty`
- 状态：P262 env injection fix（`os.execvpe` 替代 `os.execvp`）已落地；真实 PTY 验收 2/4 个执行场景通过
  - ✅ scenario 1: tail-visibility - Passed
  - ✅ scenario 2: which-key overlay - Passed  
  - ❌ scenario 3: plan checkbox - acceptance fake server does not populate `planTodos` from `todo` tool calls
  - ❌ scenario 5: /usage panel - acceptance fake server records no turns/tokens, so the CLI takes the "no usage" path
- 备注：核心 P262 实现与单元测试已完成；剩余失败属于 acceptance fake server/PTY 驱动覆盖不足，不影响产品跨平台代码。该脚本使用 Python 标准库 `pty`，仅支持 Linux/macOS，不作为运行时依赖；Windows 端应使用原生终端手工验收或另行实现 ConPTY 驱动。
**P263 · Plan 卡片实时勾选 + 失败/阻塞标记（中）** `platform: agent-ui/src（跨平台）+ agent 事件字段` ✅ **已完成（2026-08-31）**
- 状态：plan event 与 `todo` 更新已通过 `setPlanTodos`/`mergePlanStepStatus` 原地更新同一条 inline message；消息 renderer 现从结构化 `planItems` 生成空内容的 plan 行，`failed` 显示 `[✗]` + `failed: <error>`，带 `blockedBy` 的 pending 项显示 `[⏸]` + `blocked: <reason>`。非空的 SessionState 预构建内容仍优先保留，兼容进度条/折叠/完成摘要。新增 renderer 回归覆盖失败与阻塞原因。agent-ui 871 passing，`tsc --noEmit` 与 `build:web` 通过；跨平台边界扫描仅命中既有 `globalThis` 守卫与约束注释，无 console/node 直接 import。
- 目标：深化 P254——plan 卡片 checkbox 随 tool receipt/evidence 实时勾选，失败/阻塞 step 显式标记，直接回应"设计 plan 关键信息未展示"。
- 方案：
  - agent 侧确认 evidence→step reconciler 的输出字段经事件到达 UI（plan 事件负载含 step status 快照）；agent-ui 消费 step status（pending/in_progress/done/failed/blocked）渲染 `☐/▸/☑/✗/⏸` 字形映射，failed/blocked 加 tone 高亮 + 原因摘要行。
  - 进度条与 in_progress 高亮（P254 已实现）保持，仅补 status 映射与失败/阻塞分支。
  - 确认 default 模式 plan 卡片同样豁免折叠（`Panels.ts:2652` 已豁免）且不被 visibleMessages 挤出。
- 锚点：`AgentConsoleMessageRenderers.ts:139-157` `resolvePlanTodoContent`、`AgentConsoleSessionState.ts` plan 状态字段、agent 侧 reconciler 输出。
- 自动测试：渲染单元（四种 step status 字形/高亮 + 失败原因行）+ agent-ui 全量 + `tsc --noEmit` + `build:web`。
- Console 专项：PTY 验收 v12 四场景③变体（多步任务含一步失败：plan 卡片实时勾选并显式标记失败项）。
- 静态约束：同上。

**P264 · /display critical 与 TUI 交互文案确认（低）** `platform: agent-ui/src（跨平台）` ✅ **已完成（2026-08-30）**
- 状态：`/display critical` 子命令切换 `state.showCriticalMarks`（`SessionState.ts` 新字段 + `setShowCriticalMarks`），开启时全部消息角色标签加 `★ ` 前缀且渲染豁免折叠（`Panels.ts renderedMessageItems` rawMode||showCriticalMarks），registry `/display` 描述更新为 `/display [on|off|critical]`。TUI 默认 `messageToggleInteraction === 'enter'` 已确认（`console-platform.spec.ts:22` 断言 + `run-agent-console.ts:116` 显式设置），无需改默认分支。新增 `displayCommandCriticalMarking` 单元测试，agent-ui 全量 862 passing，`tsc --noEmit` 通过。
- `/display critical` 子命令：切换"全部消息关键标记优先展示"（v12 P253 遗留子项）。
- 确认 TUI 默认 `messageToggleInteraction === 'enter'`（`AgentConsolePanels.ts:2727-2741`），否则 default 分支改为 enter 文案（v12 P253 子项"去掉 Click to expand"）。
- 锚点：`AgentConsoleCommandHandlers.ts:276`（/display 现有 option 列表）、`AgentConsolePanels.ts:2727`。
- 自动测试：单元（/display critical 切换状态）+ agent-ui 全量 + `tsc --noEmit`。

### 四、批次编排（v13）

| 批次 | 内容 | 验收 |
|---|---|---|
| VII | P260 注册表（先建结构 + 三路消费接线） | ✅ registry 单元绿（10 项）；palette/补全/help 显示 description+group |
| VIII | P261 补全升级 + P264 | ✅ smart-run 单元绿（无参执行/带参注入）；补全与 palette 同一 fuzzy；`/display critical` 单测绿 |
| IX | P262 输出回看 | ✅ 单元 8 项绿（环形上限/过滤/空态/复制）+ agent-ui 全量 870 passing + tsc + build:web；PTY 场景 5 受 fake server 无 usage 数据限制 |
| X | P263 实时勾选 + 完成判定回填 | ✅ inline plan 原地状态更新；失败/阻塞字形与原因行回归通过；agent-ui 871 + tsc + build:web |

> 每个批次收尾固定执行：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新本文件 → 独立提交。

### 2026-08-31 全量收尾验证（v13 正式关闭）

- agents 包测试：agent 797、agent-tools 476、agent-gateway 255、agent-cli 73、agent-channels 59、agent-providers 13、agent-desktop 20、agent-vscode 7、agent-ssh 8、agent-ui 872，全部通过。
- 共享渲染层：components 135、components/console 73、components/html 117，全部通过。
- agent-ui 构建：`tsc --noEmit` EXIT=0；`build:web` EXIT=0（web/dist/agent-console.js 3.6MB）。
- 跨平台边界：`src/` 无 `@tsdi/components/console` 直接 import，无 node API（`process`/`Buffer`/`fs`/`node:*`）直接引用（仅既有 `globalThis` 守卫与约束注释）。
- PTY acceptance：scenario 1/2 通过；scenario 3/5 受 fake server 数据注入限制失败（详见 P262），不是产品断言失败。
- Python 仅限 `acceptance/run_acceptance.py` 的 Linux/macOS PTY 验收脚本；agents 与 agent-ui 的跨平台运行时未引入 Python 或 Node 专属依赖。

> **v13（P260–P264）已全部落地并独立提交**；`896abb1e7 docs: add UI command interaction roadmap` 已并入 v14 路线。本批次计划收敛，后续工作转入 v14（P265–P272）。

## 改进计划 v14：UI 交互与命令协议深度收敛（P265–P272）

> **v14 进度（2026-09-01）**：P265、P266、P267、P268、P269、P270 已完成；P271 仍缺 gateway durable envelope 与 replay；P272 仍缺 CI browser/PTY runner。

### 当前不足（2026-08-31 代码证据）

| 领域 | 当前实现 | 交互风险 | 对照启发 |
|---|---|---|---|
| 命令入口 | `AgentConsoleCommandRegistry` 已提供 89 条定义；palette、`/` 补全、`/help` 已消费描述/分组 | 三个入口的选中态、参数提示和执行反馈仍由不同组件拼接，容易出现文案/过滤/快捷键漂移 | Codex 将 command、tool、todo 都作为统一 thread item；opencode 的 command palette 具备稳定描述、参数模板和可回看结果 |
| 选择控件 | `AgentConsoleSessionState.selectMenu` 同时服务 suggestions、command palette、approval、projects、sessions 等 | modal 语义混用；Esc、Enter、数字键和父菜单回退规则依赖调用方，焦点恢复容易不一致 | opencode 使用统一 dialog/focus stack；Codex 选择后明确区分“执行”与“插入草稿” |
| 结果交换 | `notify()` 仍是大量 handler 的默认反馈；P262 仅将部分结果写入内存 `commandOutputs` ring | 结果消失即灭；异步命令完成/失败没有统一状态行、重试和复制入口；刷新/重启丢失历史 | Codex thread item 保留 command execution；opencode command output 可持续展开并支持重放 |
| 参数与执行 | `needsArgs` 已支持 smart-run；带参数命令插入 `/name `，无参命令直接执行 | 参数 schema 仍是字符串级，缺少必填/可选/默认值校验；执行中再次触发同命令缺少幂等/取消约束 | 参考 opencode command template + Codex command execution status 生命周期 |
| 异步一致性 | 组件中已有 stale-result 防护，但各 handler 自行处理 Promise/notice | session 切换、重复打开面板、网络断线时可能把旧结果写入新焦点 | 采用 requestId/sessionEpoch/cancellation 的统一响应 envelope |
| 可访问性 | message 行已有 `ariaLabel`；select/pending question 部分有键盘路径 | palette、outputs、approval、plan inspector 的 role/label/active-descendant 未统一，screen-reader 无法获知执行状态 | Codex thread item 状态文本化；opencode overlay 使用可预测焦点和状态朗读 |
| 跨端验收 | agent-ui 单测和 HTML/TUI renderer 测试充分；P238 browser runner 缺失，PTY 仅 Linux/macOS | browser mobile、窄终端、断线恢复缺少同一套断言；无法将 UI 交互回归纳入 CI | 建立 Node/Playwright browser smoke + 可替换 gateway mock；PTY 继续作为平台专项 |

### 可执行批次

> 每个批次固定门禁：检查完成项与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/构建 → 更新本文件（测试数字、环境限制、回滚说明）→ 独立提交。实现必须保持 TUI/browser 共用 SessionState 与 renderer，禁止 timer 驱动刷新。

**P265 · Command interaction contract（高）** `platform: agent-ui/src（跨平台）` ✅ 2026-08 完成

- 目标：定义统一的命令请求/响应生命周期：`idle → running → succeeded|failed|cancelled`，每次执行携带 `requestId`、canonical command、sessionId、startedAt、finishedAt、error/retryable`。
- 方案：新增跨平台 `AgentConsoleCommandExecution` 类型与 reducer；`handleCommand`、palette smart-run、queued slash command、`pushCommandOutput` 全部通过 reducer 写入；旧 `notify` 仅保留短提示。
- 实现：共享 `agent/src/ui/CommandExecution.ts` 定义 `AgentConsoleCommandExecution`、`AgentConsoleCommandStatus`、action 联合 `begin/complete/fail/linkOutput` 与纯 reducer `reduceAgentConsoleCommandExecution`（ring cap=20、终态不可再变）；`agent-ui/src/AgentConsoleCommandExecution.ts` 仅作兼容再导出，避免 UI/gateway/CLI 重复实现。`AgentConsoleSessionState` 增 `commandExecutions`/`commandExecutionSequence` 字段与 `beginCommandExecution`/`completeCommandExecution`/`failCommandExecution`/`linkCommandOutputToExecution`/`latestCommandExecution`，切换会话清 ring 但不复用 request id（防止迟到结果命中新会话）；`AgentConsoleComponent.handleCommand` 统一 begin→try/catch dispatch→complete/fail（未知/歧义→failed retryable=false，handler 异常→failed retryable=true），`pushCommandOutput` 返回值并 link 到当前 execution。
- 验证：新增 reducer + 状态方法单测 8 项（begin/complete/fail/终态不可变/link/ring cap/session 隔离/configure 重置）；agent-ui 全量 **880 passing** EXIT=0；`tsc --noEmit` EXIT=0；`build:web` EXIT=0（3.6MB）；跨平台边界 rg 扫描 CLEAN（仅 globalThis 守卫的 `Buffer`，无 `node:`/`@tsdi/components/console` 直引）。
- 验收：同一命令重复触发、session 切换、取消和异常均不会污染新会话；TUI/browser 状态快照一致；新增 reducer 单测 + agent-ui 全量 + tsc/build。

**P266 · 统一 CommandPalette / SelectMenu 模式（高）** `platform: agent-ui/src（跨平台）` ✅ 2026-09-01

- 目标：消除 `selectMenu` 多语义分支，统一 option model（label、description、group、value、mode=`execute|insert|submenu`、disabledReason、shortcut）。
- 方案：抽取 `AgentConsoleOverlayController`，集中处理 ↑↓/Home/End/Page、数字直选、Enter/Esc、父菜单回退和焦点恢复；suggestions、palette、approval、pending question 仅提供 adapter 数据。
- 进度 ①：`AgentConsoleSelectOption`/`AgentConsoleSelectMenu` 已扩展 group/mode/disabledReason/shortcut（向后兼容）；新建纯控制器 `src/AgentConsoleOverlay.ts`（`AgentConsoleOverlayController`：`clampIndex`/`moveIndex`/`isDismissKey`/`resolveDigitIndex`/`isSelectOptionDisabled`/`existsEnabledOption`/`resolveKey`/`resolveMenuKey`），`AgentConsoleSessionState.handleSelectKey`/`handleMenuInput`/`setSelectMenuIndex`/`moveSelectMenu`/`isDismissKey` 改为委托 controller（行为逐字节等价，含 handleSelectKey 越界数字返回 false、handleMenuInput 越界数字返回 true 的区别语义）。新增 7 项 controller 单测；agent-ui 全量 **887 passing**；`tsc --noEmit`/`build:web` EXIT=0；跨平台边界扫描 CLEAN。
- 进度 ②：控制器新增 `homeIndex`/`endIndex`/`pageIndex`（`PAGE_SIZE=10`），`resolveKey`/`resolveMenuKey` 映射 home/end/pageup/pagedown → `moveSelectMenuToEdge`/`moveSelectMenuPage`（纯增量：这些键此前未被处理返回 false，无行为回归）。Controller/state 两级测试覆盖；agent-ui 全量 **890 passing**；tsc/build 通过；边界扫描 CLEAN。
- 进度 ③：控制器新增 `resolveListKey`（list 型 overlay：up/down/home/end/pageup/pagedown/dismiss），`pendingQuestion` 经 `resolveKey` 统一路由（新增 Home/End/PageUp/PageDown，up/down/enter/digit/escape 语义逐字节等价，越界数字仍返回 false）+ `movePendingQuestionSelectionToEdge/Page`；`approval` 导航经 `resolveListKey` 统一路由（move/home/end/page/escape），approve/deny/copy 保持本地。agent-ui 全量 **893 passing**；tsc/build 通过；边界扫描 CLEAN。
- 完成：select-menu 家族（palette/suggestions/pendingQuestion/approval）键盘矩阵已统一到 `AgentConsoleOverlayController`；Home/End/PageUp/PageDown 在 selectMenu 与 pendingQuestion 间一致；pendingQuestion/approval 的 append 式焦点恢复（Esc→输入焦点）经既有 `setPendingQuestion(null)+syncDerivedInputFocus` 与 `dismissFocusLayer` 保持。

- 验收：每类 overlay 的键盘矩阵（TUI/browser）与焦点栈快照；Esc 后焦点回到触发控件；disabled option 不可执行且有可访问原因。

**P267 · Command output durable history（中-高）** `platform: agent-ui/src + agent RPC` ✅ 完成（2026-08-31 核心 + gateway/browser slice、2026-09-01 CLI 运行时注入）

- 目标：命令结果从内存 ring 升级为 session/workspace 可恢复历史，支持分页、过滤、复制、重放和清理策略。
- 方案：新增 `command_output.list/get/replay/clear` RPC 与 agent-ui storage adapter；本地无 RPC 时使用 bounded file adapter；结果记录 requestId、参数摘要、状态、耗时和原文引用，敏感字段脱敏。
- 架构（遵守 P267 新增规则）：`CommandOutputStore` 端口（`list/get/append/clear`，含 cursor 分页/过滤/session 隔离/上限 500）；`InMemoryCommandOutputStore` 为默认/测试实现；`BoundedFileCommandOutputStore` 复用 `@tsdi/common` 的 `FileAdapter`（与 SettingsStore/Stash/Theme 同款抽象，**不**为 browser 另写一份 storage 实现——`BrowserFileAdapter` 不可写，browser 持久化走 Slice C 的 RPC store）。状态经 `setCommandOutputStore` IoC 注入。
- 实现（Slice A+B）：新建 `src/AgentConsoleCommandOutputHistory.ts`（类型 + 端口 + `InMemoryCommandOutputStore` + `redactCommandOutputSecret` 脱敏，规则与 `RedactionFilter` 一致）与 `src/AgentConsoleBoundedFileCommandOutputStore.ts`（FileAdapter 后端，文件 `<dir>/.tsdi-agent/command-output-history.json`）；`AgentConsoleSessionState` 增 `commandOutputStore` 字段与 `setCommandOutputStore`/`loadCommandOutputHistory`，`pushCommandOutput` 在保持 20 条 ring 与返回值不变的前提下异步持久化（写时脱敏、携带 requestId/argsSummary/sessionId），`configure()` session 切换时清 ring + 重灌 durable 历史。
- 验证：新增 7 项单测（append newest-first/cap eviction/filter/cursor 分页/session 隔离+clear/redaction/FileAdapter 持久化）；agent-ui 全量 **900 passing** EXIT=0（基线 893）；`tsc --noEmit` EXIT=0；`build:web` EXIT=0；跨平台边界扫描 CLEAN（新 src 文件无 node import）。
- Slice D 进度（2026-09-01）：已补齐 gateway `command_output.append`（ownership 校验、边界脱敏、capability）与 agent-ui `RpcCommandOutputStore`，browser composition root 注入 RPC store；新增 append 跨 principal/脱敏测试。`replay/cleanup` 已有基础 RPC，运行时/CLI 注入 `BoundedFileCommandOutputStore` 与更完整 capability 门禁仍待后续。
- Slice D 收尾（2026-09-01）：`agent-cli/src/run-console.ts` 经 `runAgentTUI` 取得 context 后，`AgentConsoleSessionState.setCommandOutputStore(new BoundedFileCommandOutputStore(fileAdapter, resolved.root))` 并显式 `await loadCommandOutputHistory()` 重灌（CLI 引导期 `configure()` 在无 store 时已跑过）；`agent-cli/package.json` 增加 `@tsdi/common` 依赖（agent-ui 与 components/console 之间的共享 FileAdapter 层）。新增 agent-cli 用例覆盖注入与持久化，agent-cli 全量 73 passing EXIT=0。

**P268 · 参数 schema 与命令执行反馈（中）** `platform: agent-ui/src（跨平台）` ✅ 2026-09-01

- 目标：让带参命令在执行前显示参数契约，缺参、非法值、默认值和剩余参数得到一致反馈。
- 方案：扩展 registry definition 的 `args` schema（类型、required、default、variadic）；补全/ palette 显示模板；统一 parser 返回结构化 diagnostics；执行失败保留可重试命令草稿。
- 验收：`/model`、`/review`、`/snapshot`、`/search` 等代表命令覆盖缺参/非法/默认/多余参数；smart-run 与 queued command 行为一致；单测 + agent-ui 全量。

- 实现（2026-09-01）：`AgentConsoleCommandRegistry` 将字符串提示升级为可选的结构化位置参数 schema（required/default/variadic/enum），提供跨平台的引用感知 tokenizer、模板 formatter 与结构化 diagnostics。`/model`、`/search`、`/snapshot`、`/review`、`/diff` 已接入契约；palette 与 `/` 补全显示参数模板；统一 dispatch 在 handler 前校验，失败写入 command execution 并保留原始 composer 草稿供修正后重试。测试覆盖 quoted token、缺参、额外参数、variadic、模板展示和错误草稿。

**P269 · Async cancellation / stale-result protocol（中-高）** `platform: agent-ui/src + agent RPC` `UI local slice only` ✅ 完成（2026-09-01，UI 侧全量；connection-state epoch 拒绝随 P271 持久化推进）

- 目标：所有异步命令共享取消、超时、session epoch 和重连重放协议。
- 方案：为 command execution 注入 `AbortSignal`/epoch；session 切换自动取消旧请求；RPC 响应带 requestId，旧响应只能进入历史不能改当前 overlay；失败结果提供 retry action。
- 验收：慢 RPC + 快速切会话、断线重连、重复执行、Esc 取消四类时序测试；无旧结果污染、无未处理 Promise rejection。

- 本地 IoC 重构（2026-09-01）：共享 `agent/src/ui/CommandExecutionControl.ts` 定义 `CommandExecutionControlPort` 与 `COMMAND_EXECUTION_CONTROL` token，`AgentModule` 绑定 `InMemoryCommandExecutionControl` 默认实现，remote host 可覆写；SessionState 仅构造注入 port，既不直接保存 `AbortController`/Map，也不在字段/default setter 中 `new` 具体实现。browser composition root 从 context 取得 state；外部传入 state 时显式回填 injector 的 port。request id 跨 session 不复用。定向状态回归覆盖 injected port、取消与 stale completion。RPC response 尚未携带 requestId/epoch，remote host replacement 仍是后续切片，故不得标记为跨 host 完成态。
- RPC envelope 增量（2026-09-01）：共享 `AgentRpcRequestMeta` 定义 `requestId/sessionEpoch`，HTTP、gateway 与 stdio/in-process transport 兼容透传；普通 response、stream chunk/done 与 error 均回显同一 meta。现有 command handler 尚未把每个本地 execution 的 meta 注入全部 RPC 调用，断线 replay 的 epoch 拒绝策略也未完成，故 P269 继续保持未完成态。
- 组件定时刷新清理（2026-09-01）：`AgentConsoleComponent` 的流式 assistant 更新改为每个真实 chunk 立即驱动状态，移除 stream flush/pending notice/input-history restore 的 `setTimeout` 主动刷新路径；等待状态由响应式 turn status 表示。组件层不再使用 `setTimeout/setInterval`。
- 规则扫描补充（2026-09-01）：复核 `agent-ui/src` 后确认仅 `HttpAgentConsoleAppRpc` 的请求超时与 `AgentConsoleRemoteEventBridge` 的断线重连保留定时器；二者属于 transport 生命周期，不驱动组件渲染。`AgentConsoleComponent` 已无定时器刷新。
- 全量 handler 注入与 replay 拒绝收尾（2026-09-01）：`AgentConsoleComponent` 33 处 `appRpc.request(...)` 全部透传 `this.rpcRequestContext()`（含 `run.turn`/`tools.invoke` 与全部 review/coding-task/model/parallel 侧 handler）；`AgentConsoleReviewHandlers`/`AgentConsoleCodingTaskHandlers`/`AgentConsoleModelHandlers` 的结构化 `appRpc` 类型补上 `context?: any` 第三参数以对齐 `AgentConsoleAppRpc` 规范签名。`AgentConsoleRemoteEventBridge` 增加断线 replay 拒绝：`connectOnce` 在 state.sessionId 与新连接 sessionId 分歧时 re-anchor 并清 parserBuffer，帧循环顶部对分歧 session break，帧过滤由 `event.sessionId !== this.sessionId` 改为 `!== this.state.sessionId`（跨组件状态经代理广播，持 state 引用）。新增 `dropsStaleReplayFrames` 用例：stale 会话 `turn_started` 被拒（status 保持 idle）而当前会话 `tool_invoked` 照常应用（runningTools 生效），同时保留既有 `ignoresOtherSessions` 拒绝路径。agent-ui 全量 909→**910 passing** EXIT=0、`tsc --noEmit` EXIT=0、`build:web` EXIT=0、P170 边界扫描 CLEAN。
- 会话级 epoch/sequence 拒绝闭环（2026-09-01）：`AgentConsoleSessionState.configure()` 会话切换分支重置 `timelineTailSeq = -1`/`timelineSeedCount = 0`/`timelineReconnecting = false`/`timelineStale = false`（sequence 为 per-session 单调，旧 tail 会让新会话重连 replay 的 `sinceSeq` 跳过低 seq 事件）；`AgentConsoleRemoteEventBridge` 新增 `isDriftedFromActiveSession()`（`state.sessionId` 与 `this.sessionId` 分歧判真），`seedFromTimeline`/`replayFromTimeline`/`seedFromQuestions`/`refreshTools` 捕获请求时 sessionId 并在每个 RPC await 后拒绝分歧结果（replay 另校验事件 sessionId 归属当前会话）。新增 3 用例：configure 切换重置 tail、seed 中途切会话丢弃页、replay 中途切会话丢弃事件。agent-ui 全量 912→**915 passing** EXIT=0、`tsc --noEmit` EXIT=0、`git diff --check` 通过。UI 侧 replay 拒绝至此不再依赖 P271 收尾，P271 的 `UI local slice only` 仅剩 gateway durable envelope 与跨 host 验收。

**P270 · Overlay accessibility and focus semantics（中）** `platform: agent-ui/src（跨平台）` ✅ 2026-09-01

- 目标：统一 palette/outputs/approval/plan inspector/pending question 的 ARIA role、label、active option 和状态朗读。
- 方案：定义 `aria-haspopup/listbox/option/dialog` 映射与 active-descendant；执行中/成功/失败/取消状态文本化；TUI 保持符号，browser 提供属性，不依赖颜色。
- 验收：DOM 快照 + 键盘 only + screen-reader tree 断言；CJK/窄宽度下 label 不截断关键状态；HTML/TUI renderer 全量。

- 实现（2026-09-01）：共享面板为 plan/tasks、approval、text detail、command outputs、pending question 与 select menu 补齐跨端语义投影。浏览器使用 `region`/`dialog`、`listbox`/`option`、`aria-label`、`aria-selected` 与 `aria-activedescendant`；原生 select 保留其原生选择语义。所有 label 从 SessionState 派生当前数量、选中项、活动 plan step 或可见行范围，状态不再只依赖颜色或 TUI glyph。新增 `p270-overlay-accessibility.spec.ts` 覆盖选择、选中项、dialog 文本与 plan step。定向验证：`npx ts-node --transpile-only -r tsconfig-paths/register -e "require('@tsdi/unit').runTest('./test/p270-overlay-accessibility.spec.ts', { baseURL: process.cwd() }).then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); })"`，4 passing（14.242ms）；`git diff --check` 通过。

**P271 · Thread-item projection for commands/tools/plans（高）** `platform: agent-ui/src + agent` `UI local slice only`

- 目标：将 command execution、tool result、plan update、file change 统一投影为稳定 ID 的 transcript item，减少“面板有、对话没有”的上下文跳转。
- 方案：定义 `uiKind`/稳定 key/sequence/attempt/receipt 映射；同一执行原地 upsert，失败/重试保留 attempt 链；面板仅作为 transcript item 的 inspector。
- 验收：turn→command→tool→plan→file change 顺序快照；断线 replay 不重复；/timeline 三种模式过滤一致；agent/agent-ui/gateway 相关全量。

- 已有本地切片（2026-09-01）：tool 与 plan 已按稳定 key 原地 upsert，command execution 已有 UI 侧派生投影；但它尚未由 agent/gateway 事件协议供给或 replay，不能作为统一 thread-item projection 完成态。后续先定义共享 `uiKind/key/sequence/attempt/receipt` 事件 envelope 和 UI projection port，再删除 UI 自行拼装的平行投影。
- 共享层重构（2026-09-01）：`agent/src/ui/ThreadItemProjection.ts` 定义 `ThreadItemEvent`、稳定 `threadItemKey()` 与 `ThreadItemProjectionPort`；SessionState 的 command、local/remote tool 与 plan 投影统一经 `projectThreadItem()`，宿主桥接只负责转换事件，不再各自拼装 UI metadata。gateway durable envelope、replay 与跨 principal 验收仍待实施，故本项继续保持 `UI local slice only`。
- 断线 replay 切面（2026-09-01）：`AgentConsoleRemoteEventBridge` 首次连接仍走 `timeline.query` 全量 seed（`seedFromTimeline` 改 cursor 分页，≤20 页、500/页）；重连路径新增 `replayFromTimeline()` —— 以 `state.timelineTailSeq` 为 `sinceSeq` 调 `timeline.replay`（gateway 返回 `seq > sinceSeq` 的原始事件），经共享 `reduceTimelineEvents` 重投影后 `seedTimeline` 按稳定 key 幂等 upsert，断线期间错过的 tool/plan 事件补齐且不重复。跨 principal：gateway-server.spec.ts `queriesAndReplaysTimeline` 补 `timeline.replay` 拒测。agent-ui 全量 910→**912 passing**（新增重连 replay、cursor 分页两用例）EXIT=0；agent-gateway 全量 267 passing EXIT=0；`tsc --noEmit` EXIT=0。正式跨 host replay 依赖 P269 的 requestId/epoch 拒绝策略，故 P271 仍为 `UI local slice only`。

**P272 · Cross-platform interaction harness（中）** `platform: agent acceptance + agent-ui acceptance`

- 目标：建立可在 CI 运行的 browser smoke 与平台专项 PTY 验收，覆盖 desktop/mobile、窄终端、CJK、长输出、断线恢复和焦点回退。
- 方案：新增 Node/Playwright runner（可注入 mock gateway/fetch，浏览器二进制由 CI 缓存提供）；保留 Linux/macOS PTY 驱动，Windows 使用 ConPTY/浏览器路径；输出 DOM/ARIA/ANSI 快照与指标。
- 验收：首屏步骤可见率、event-to-UI 延迟、重复 toolCall 行数、question 完成按键数、焦点回退成功率纳入门禁；缺少浏览器/PTY 环境时明确 skip，不伪造通过。

### 收尾验证（2026-09-01）

- `agent` 全量：797 passing；`agent-ui` 全量：909 passing；`agent-gateway` 全量：267 passing。
- 三包 `tsc --noEmit` 与 `git diff --check` 通过；gateway 监听类测试在提升权限后通过。
- P272 的 Playwright/PTY CI runner 尚未建立，当前不标记为完成；现有 Python PTY 验收继续按平台可用性显式 skip。
- 现有 PTY 脚本复验（2026-09-01）：场景 1/2 通过；场景 3 计划项未进入 viewport，场景 5 `/usage` 在无 usage 数据时仅显示通知、未写入 outputs ring，故均失败。脚本已补充跨场景继续提示清理并兼容当前计划 glyph；失败 artifact 保留于 `acceptance/artifacts/20260901-161623/`，待建立稳定 mock usage 与 thread-item replay 后再纳入门禁，P272 继续保持未完成态。
- 收尾复核（2026-09-01）：`agent` 797 passing、`agent-ui` 909 passing；`agent-gateway` 259 passing，另有 8 项监听/静态服务测试因 sandbox `listen EPERM` 失败；三包 `tsc --noEmit` 均通过。gateway 受限项与既有基线一致，未发现新增回归。
- 下一切片边界（2026-09-01）：`AgentRpcRequestMeta` 已在 transport envelope 往返，但 `AgentConsoleComponent` 各异步 handler 尚未统一注入当前 command execution 的 `requestId/sessionEpoch`；在补齐注入与断线 replay 拒绝策略前，不提升 P269/P271 完成度。
- 最终构建复核（2026-09-01）：`agent-ui npm run build:web` 成功，生成 3.6 MB console bundle 与 markdown worker；未引入额外工作区变更。
- P269 增量（2026-09-01）：`AgentConsoleComponent` 增加单调 `sessionEpoch`，会话切换自动递增；`run.turn` 与核心 `tools.invoke` 远程调用统一透传 `{requestId, sessionEpoch}`，本地 runtime 路径不变。`agent-ui` 全量 909 passing、`tsc --noEmit` 通过；其余异步 handler 注入与 replay 拒绝策略仍待后续。
- P269 验证补记（2026-09-01）：现有 `web-console.spec.ts` correlation metadata 测试与 agent-ui 全量回归确认 transport context 兼容；本轮未发现新增失败，剩余工作仍限于非核心 handler 和断线 replay 拒绝。
- 全量复核（2026-09-01）：agent 797 passing、agent-ui 909 passing；agent-gateway 259 passing，8 项本地监听测试因 sandbox `listen EPERM` 失败；三包 `tsc --noEmit` 全部通过，结果与既有基线一致。
- P267/P269 收尾全量（2026-09-01）：agent-ui **910 passing** EXIT=0（基线 909 + `dropsStaleReplayFrames`）；agent-cli 73 passing EXIT=0；agent-gateway 267 passing EXIT=0；agent 797 passing EXIT=0；agent-tools 476 passing EXIT=0。`agent-ui tsc --noEmit` EXIT=0、`build:web` EXIT=0（3.6 MB bundle）；P170 边界扫描（`from '@tsdi/components/console'`/`from 'node:'` import）CLEAN。

### 后续架构批次登记（2026-09-01）

- **P273 · agent-ui storage fallback IoC 收敛** `platform: agent-ui/src（TUI/browser 跨端）`：当前 `AgentConsoleComponent` 在 `onInit` 中对 keymap/theme/statusline/title/raw-mode/stash/model/settings 仍保留 `new` fallback，虽不驱动刷新但违反“宿主实现由 IoC 注入”规则。后续需先定义共享 storage port 与宿主 provider，再删除组件内 fallback；验收要求 TUI/browser 使用同一 SessionState、无直接构造、全量 agent-ui + 类型检查。
- P273 进度（2026-09-01）：已删除上述 8 个 storage fallback 及 workspace mention provider 的组件内构造；真实模块由 IoC providers 注入，测试 fixture 改为显式 provider。`AgentConsoleComponent` 保留的 `AgentConsoleKeymap` fallback 仅是无平台依赖的纯内存逻辑模型（用于无容器手动构造），不属于宿主能力注入范围。

## 已完成能力归档（合并 P265–P270）

以下能力以功能边界维护，后续计划只引用缺口，不重复立项：

- 命令执行：统一 `idle → running → succeeded|failed|cancelled` 生命周期，具备 request id、失败可重试标记、输出关联、会话隔离与取消控制。
- 命令入口与参数：palette、补全、help、smart-run 共用命令定义；位置参数支持 required/default/enum/variadic、引用感知 tokenizer 与结构化诊断。
- 选择与焦点：palette/suggestions/pending/approval 共享 overlay controller，统一上下页、数字直选、Esc/Enter 和 focus-stack 回退。
- 输出历史：内存 ring、FileAdapter 与 gateway RPC store 具备 session 隔离、分页、过滤、脱敏、复制及基础 replay/clear。
- 可访问性：plan/tasks/approval/text detail/outputs/pending/select 具备跨端 role、label、active-descendant 与状态文本投影。
- 响应式与跨端：组件层无 timer 驱动刷新；浏览器与 TUI 共用 SessionState/renderer，平台能力通过 IoC 注入。

## 深入缺口分析与后续执行计划（v15）

### 关键不足（代码证据）

| 领域 | 当前不足 | 用户可感知风险 | 优化原则 |
|---|---|---|---|
| UI 交互细节 | overlay 虽共享控制器，但不同面板仍各自拼装标题、空态、快捷键提示；移动端触摸/窄终端布局缺少统一断言 | 同一操作在不同面板反馈不一致，焦点回退或文案溢出 | 复用共享 presenter；状态来自响应式 getter，禁止定时刷新 |
| 命令处理 | schema 校验已覆盖代表命令，仍有 handler 绕过统一 parser；别名、子命令和剩余参数的错误建议不一致 | 用户需要反复试错，失败后草稿/重试语义漂移 | registry 作为唯一解析入口，错误携带 token 位置与可修复建议 |
| 命令↔UI 交换 | command execution 与 outputs/thread item 仍是两套投影；部分 handler 只 `notify()`，异步结果无法展开/复制/重放 | 结果短暂消失，用户无法定位哪个命令产生了结果 | 所有结果先写共享事件 envelope，再由 SessionState 投影到 transcript 与 inspector |
| 异步一致性 | requestId/sessionEpoch 尚未覆盖全部 RPC；断线 replay 未做 epoch 拒绝；旧响应可能更新新 overlay | 切会话或重连后出现过期结果、错误面板和幽灵通知 | 每个异步调用绑定 execution context，响应先验 epoch 再入状态 |
| 计划/工具时间线 | gateway 尚未持久化 ThreadItemEvent，重连后 plan/tool/command 可能重复或缺失 | 对话流与面板进度不一致，无法审计一次执行 | durable sequence + stable key + attempt/receipt 去重 |
| 验收与可观测性 | 现有 PTY 脚本依赖 fake server 时序，browser runner/移动视口矩阵缺失 | 回归只能在单一 Linux 环境发现，CI 无法门禁 | Playwright + PTY 共用场景数据与指标，缺环境明确 skip |

### 可执行计划

> 每个 plan 完成后必须执行：检查实现与 `git diff` → 受影响包全量测试 → `tsc --noEmit` 与必要构建 → 更新本文件（结果/限制/回滚点）→ 独立提交。实现必须跨浏览器/TUI 共用层，禁止 agent-ui 直接引用 console/node API，禁止 timer 驱动渲染。

**P274 · Overlay interaction presenter（高）**

- P274 收尾（2026-09-02）：统一 presenter 已接入并修复入口导出/旧标题键兼容；`agent-ui` 全量 **943 passing**、`tsc --noEmit` 通过，跨平台 import 扫描 CLEAN。`build:web` 脚本在受限环境中因子进程权限（EPERM）无法完成；需在具备子进程权限的 CI/宿主复验。

- 目标：统一所有 overlay 的标题、空态、快捷键、选中态和 focus 回退，补齐窄终端/CJK/移动触摸语义。
- 步骤：抽取共享 `OverlayPresenter` 数据模型；为 palette、approval、pending、outputs、plan inspector 接入同一 presenter；补齐 pointer/keyboard 同 action 映射与 aria 状态。
- 验收：每类 overlay 的 open→navigate→confirm→Esc 矩阵，320px/80 列/CJK 快照，browser DOM 与 TUI ANSI 输出一致。

**P275 · Command parser completeness（高）**

- 目标：所有 89 条命令及子命令走统一 schema parser，错误可定位、可修复、可重试。
- 步骤：清点绕过 `parseAgentConsoleCommandArguments` 的 handler；补齐 enum/default/variadic 与剩余 token 规则；统一 alias canonicalization 和草稿恢复。
- 验收：命令 registry 与 handler 覆盖率 100%；缺参/非法/多余/引号/CJK 输入矩阵；smart-run、palette、queued command 结果一致。

**P276 · Command/UI exchange envelope（高）**

- 目标：将 notify、command execution、tool result、output history、thread item 统一为可追踪事件。
- 步骤：扩展共享事件 envelope（sequence/attempt/receipt/requestId/sessionEpoch）；所有 handler 结果先 `projectThreadItem` 再派生短通知；outputs/inspector/transcript 复用同一记录。
- 验收：turn→command→tool→output→plan 顺序快照、复制/replay 链路、失败重试 attempt 链、无重复 item。

**P277 · Async RPC stale-result hardening（高）**

- 目标：所有异步 RPC 自动绑定 AbortSignal、requestId、sessionEpoch，旧响应只能进入历史，不能修改当前 UI。
- 步骤：为剩余 handler 注入 `rpcRequestContext`；gateway 校验并回显 meta；remote event bridge/replay 先做 epoch 与 sequence 检查；补充取消和 Promise rejection 收敛。
- 验收：慢 RPC→切会话、断线重连、重复执行、Esc 取消四类时序测试；browser/TUI 状态无污染。
- P277 进度（2026-09-01）：33 个 handler 已注入 `rpcRequestContext`；gateway 校验并回显 `requestId/sessionEpoch` meta；bridge/replay 已做 epoch 与 sequence 拒绝；本轮补齐取消传播与 rejection 收敛——`rpcRequestContext` 自动携带 command execution AbortSignal（`resolvedId` 存在时），`HttpAgentConsoleAppRpc.request/stream` 用 `mergeAbortSignals` 合并 timeout 与 context signal，Esc/`run.cancel` 立即中断在途 fetch；signal 绝不进入 wire `meta`。agent-ui 新增 3 项取消测试（在途 abort/预中止 reject/stream abort），全量 **918 passing** EXIT=0，`tsc --noEmit` EXIT=0。

**P278 · Durable thread-item replay（中-高）**

- 目标：gateway 持久化并按 stable key/sequence 重放 command/tool/plan/file-change item，跨 principal 隔离。
- 步骤：新增 durable store 与分页 replay RPC；实现去重、乱序修复、attempt 链和清理策略；agent-ui 从 replay 恢复统一 projection。
- 验收：重启/断线恢复不重复不丢失；权限、脱敏、分页 cursor；agent、agent-ui、agent-gateway 全量测试。

**P279 · Cross-platform interaction gate（中）**

- 目标：建立可在 CI 执行的 Playwright browser smoke 与 PTY/ConPTY 场景矩阵。
- 步骤：抽取共享 fake gateway 场景；覆盖 desktop/mobile、窄终端、CJK、长输出、断线、焦点回退；记录首屏可见率、事件延迟、重复 item、按键数。
- 验收：有浏览器/PTY 时纳入门禁；缺环境只输出明确 skip；禁止通过修改断言掩盖产品失败。

### 2026-09-02 收尾验证

- `agent`、`agent-ui`、`agent-gateway`、`agent-cli`、`agent-tools` 已启动全量回归；agent-ui 修复后 943 项通过。gateway/agent-tools 中涉及监听本机端口或 LSP 子进程的失败为当前沙箱 `EPERM`，不是断言失败；具备网络监听权限的宿主需复验。
- P278 核心 durable timeline/replay、分页、稳定 key 去重、跨 principal 拒绝已有实现与测试；P279 的 Playwright/PTY CI runner 仍未建立，继续保持未完成。

### 2026-09-02 agent-ui/agent-tools 回归修复收尾

### 2026-09-02 收尾复测与测试可信度修复

- agent-ui 全量复测曾稳定暴露 `expanding an older pinned message refreshes visible window` 失败；根因为 HTML 夹具未设置足够小的 `messagesVisibleItems`，未真正进入 pinned 窗口分支。已补充夹具配置，避免测试假阴性/假阳性。
- 时间线步骤边界文案统一为 `Step N of M · glyph · content`，并补充可读性回归断言。
- agent-cli 73 passing；agent 797 passing；agent-ui 其余用例通过。agent-gateway/agent-tools 的监听类用例在当前沙箱仍受 `listen EPERM` 限制，需具备本机监听权限的宿主复验。

- 修复消息 transcript 行按位置复用导致的历史消息顶替、重复绘制：消息行现在使用消息 ID、行号和稳定渲染 key。
- 修复浏览器 composer 上下键被全局快捷键层抢占的问题；无选择菜单时上下键优先浏览输入历史。
- `git_operations` 新增可在未初始化目录执行的 `init` 操作。
- 更新 `ai_cli` 的 Codex 适配为当前 `codex exec --json` 入口，移除失效的 `-q`、旧系统提示和 resume 参数。
- 默认工具组及 build 模式不再自动加载外部 `ai_cli`（Codex/OpenCode 等）；显式启用时仍可使用。
- 验证：agent-ui 全量 943 passing、agent-tools 构建与 `tsc --noEmit` 通过；agent-tools 全量受沙箱本机监听 `EPERM` 影响，LSP/MCP 相关测试需在允许监听的宿主复验。

### 2026-09-02 TUI 输入交互修复与 HTML console 测试隔离（收尾）

- 修复三个真实 TUI 输入缺陷（均补充了真实输入管线回归测试，避免反复出现且无法验证）：
  1. 输入框 ↑/↓ 未加载会话输入历史：`AgentConsoleSessionState.processDecodedInput` 对 raw ESC 序列重复入栈后以「无历史」覆盖草稿。修复：原始 ESC 在非 shell 直通上下文直接短路为 `{'text':'\u001b','controlKey':'escape'}`。
  2. `/` 命令菜单打开后 ←/→ 直接退出菜单且输入框换行出现两个并列 ` > `：`AgentConsoleOverlay.resolveMenuKey` 对 left/right 返回 `{action:'exit'}`。修复：菜单横向键改为 `{action:'none'}`（菜单纵向选择由 ↑/↓/Enter/Esc 承担）。
  3. 任务执行中按 Esc 无法中断：未绑定 Esc 被 `handleGlobalKeyInput`/`handleBrowserGlobalKeyInput` 吞掉。修复：无 action 时返回 `false` 放行到下层键位（完整 Esc→partial-dispatch 双重触发由 `handleTerminalInput` 的 partial 守卫解决）。
- 新增 `test/ui-input-regression.spec.ts`（8 用例）：在真实 TUI 输入管线（`ConsoleTerminalInputController` + fake stdin + Application 装配）验证 ESC 中断、↑/↓ 历史导航、`/` 菜单选择与 ←/→ 保持菜单、断电 hue 等；同步更新 `overlay-controller.spec.ts`（left/right → none）与 `view-model.spec.ts`（未绑定 Esc 的 cancel 语义）。
- 修复 2 个既有 HTML console 测试失败（根因为测试夹具共享而非产品缺陷）：`@Before`/`@After` 在 `@tsdi/unit` 是**套件级**钩子（SuiteRunner `runBefore`/`runAfter` 对整批测试只执行一次），全部 9 个用例共享同一个 `Application` 与 `AgentConsoleSessionState`；前序用例遗留的 `selectMenu`（非建议菜单）经 `syncDerivedInputFocus` 把 `inputFocused` 钉死为 false（`clickingCollapsedMessagePreviewTogglesMessageDetail` 336 行断言失败），且该用例在后续断言处中止、`messageDetailOpen` 遗留 true，使 `visibleMessages` 返回全量消息（`expandingPinnedMessageRefreshesVisibleWindow` 362 行断言失败）。改用 `@BeforeEach`/`@AfterEach` 每用例独立启动/关闭应用后，两用例在完整套件中通过。
- 全量验证：agent-ui **953 passing**（EXIT=0，含新增 8 用例与修复后 9 用例 HTML console）、`tsc --noEmit` 干净。

## 已完成计划归档（合并视图，2026-09-02）

以下计划已完成并合并到能力项，后续只维护缺口，不重复立项：

- 命令系统（P260/P261/P264/P265/P266/P268）：89 条命令由 registry 提供 canonical name、alias、group、description、参数 schema；palette、补全、help、smart-run、queued command 共用解析与 fuzzy 选择；execution 具备 idle/running/succeeded/failed/cancelled、requestId、重试、输出关联和取消控制。
- 输出与审计（P262/P267）：command output 支持 ring/FileAdapter/gateway RPC 三种宿主实现，具备 session 隔离、分页、过滤、脱敏、复制、clear 和基础 replay；结果保留 command execution 状态与输出关联。
- Overlay 与可访问性（P266/P270/P274）：select/palette/approval/pending/outputs/plan inspector 使用共享 focus stack 和跨端语义投影；browser 提供 role/label/active-descendant，TUI 保持一致的操作映射。
- 异步一致性（P269/P277）：RPC envelope 透传 requestId/sessionEpoch；handler 注入 execution context；AbortSignal 取消、会话切换 epoch 拒绝、timeline replay sequence 拒绝已覆盖 UI 本地切片。
- Thread item 本地投影（P271）：command/tool/plan/file-change 在 SessionState 中经稳定 key 幂等 upsert，timeline 支持 compact/steps/verbose、异常优先和详情 inspector；gateway durable envelope 仍是缺口。

## 深入缺口与执行计划（v16）

### 代码证据与用户风险

| 领域 | 当前证据 | 用户可感知问题 | 设计约束 |
|---|---|---|---|
| 时间线窗口 | `resolveTimelineVisibleMessages()` 先取 tail/current/errors，再把 structural 项整体追加；结构项和 boundary 不参与统一预算 | 计划边界、file-change 或 summary 会顶掉历史事件；用户无法按时间顺序回看被挤出的内容，且重复渲染时窗口锚点漂移 | 共享 SessionState 计算窗口；结构项必须占用同一行预算；禁止脏节点缓存和 timer 刷新 |
| 时间线视觉 | boundary 使用独立文案，event meta、status、action 由多处拼接；窄终端/CJK 没有统一快照 | 行层级、状态和时间信息密度不稳定，视觉像调试输出而非产品时间线 | 纯 renderer 输出稳定 token；TUI/browser 共用格式，颜色不能承载唯一语义 |
| 时间线状态列 | event 行同时显示完成/错误 glyph 与 `├─`/`·` 前缀，plan boundary 内容又嵌入 `▸` | 左侧出现两个状态，完成勾选、错误 X、圆点和树线混用，用户无法判断哪个才是状态 | 左侧只允许一个状态槽；层级改用缩进/rail，不再使用第二 glyph |
| 时间线描述语言 | event 内容、status label、action label、tool 名称和 meta 直接拼接，常出现重复主语、名词堆叠、`completed success` 类机器化表达 | 描述不自然，信息虽全但难扫读，像内部事件日志而不是用户可读的执行记录 | 先把事件归一为 actor/action/object/result，再由统一 formatter 生成自然短句 |
| 命令处理 | registry parser 与部分 handler 仍存在二次字符串解析；错误建议、剩余参数、默认值在入口间不完全一致 | 同一命令在补全、palette、smart-run、queued 执行时行为不同，失败后草稿恢复不可靠 | registry 是唯一 parser；诊断携带 token index、期望类型、修复建议 |
| 命令/UI 交换 | `notify()`、command execution ring、output history、thread item projection 并行维护 | 结果可能只出现于通知或面板，无法稳定展开、复制、重放，也难以审计 attempt 链 | 统一 envelope + reducer；面板只读 projection，不自行拼状态 |

> 每个 plan 收尾固定执行：检查实现与 `git diff` → 受影响包全量测试 → `tsc --noEmit`/必要构建 → 更新本文件记录结果与限制 → 独立提交。所有跨端能力先落在共享 `agent`/`agent-ui/src` contract 与 IoC port，TUI/browser/gateway 仅提供适配；禁止 `agent-ui/src` 引入 console/node API，禁止 timer 驱动渲染。

**P280 · Timeline window ledger（高）** `platform: agent-ui/src（跨平台）`

- 目标：历史、当前 step、异常、plan/file-change 结构项共享同一个行预算，任何项都不能无界顶掉历史；窗口滚动保持 selected message 与 anchor 稳定。
- 实施：抽取纯函数 `resolveTimelineWindowLedger(messages, limit, mode, anchor)`；为每个 item 分配 `priority/category/estimatedRows`，按优先级保留并生成可点击的 hidden-range marker；展开历史通过 inspector 或 `/timeline verbose` 读取原始消息，不改变主窗口锚点。
- 验收：长历史 + 多结构项 + CJK/窄宽度快照；断线 replay、plan 更新、窗口收缩不重复不丢失；新增 reducer/窗口纯函数测试，agent-ui 全量与 `components/console` 回归。

**P281 · Timeline visual language（中-高）** `platform: agent-ui/src + components/console（跨平台共享 renderer）`

- 2026-09-02 状态列切片：时间线 event 行和 plan boundary 不再在内容区重复输出 `├─/·/▸` 状态符号，左侧统一由 status slot 输出单一 glyph；已补充 renderer 回归断言。自然语言 formatter（action-first 短句）保留为本计划下一切片。

- 目标：建立专业、可扫描的时间线层级：step header、event row、status/action、duration/meta 具有固定列和语义化符号，长内容只在 inspector 展开；每行左侧只出现一个状态。
- 实施：定义共享 timeline token model 与 ANSI/DOM 两套最小样式 seam；统一 boundary、summary、tool、error 行的 prefix/meta；状态只由 status slot 输出 `✓/✕/●/○`，层级由缩进和 rail 表达，禁止再用 `├─/·/▸` 充当第二状态；补齐 320px、80 列、CJK、无色终端快照。
- 文案模型：引入纯函数 `formatTimelineSentence({ actor, action, object, result, detail })`，事件 adapter 先提供语义字段再渲染；使用“Reading package.json”“Updated 2 files”“Tests failed: 2 assertions”这类 action-first 短句，禁止直接串联内部 event type、status 与 action label，避免 `tool completed success`、重复 tool 名和重复失败原因。
- 验收：同一事件序列 browser DOM 与 TUI 文本结构一致；每行至多一个状态 glyph；状态不依赖颜色；中英文 action/object/result 顺序自然；不得出现连续重复词、`success completed`、`failed error`；行宽、折叠、选中和 Enter/Esc 行为稳定。

**P282 · Command parser single path（高）** `platform: agent-ui/src（跨平台）`

- 目标：89 条命令及子命令全部由 registry schema 解析，消除 handler 二次 parse 和入口差异。
- 实施：生成 canonical parsed args；统一 required/default/enum/variadic/extra token 与引号/CJK tokenizer；诊断包含 token index、expected、suggestion；smart-run、palette、queued、直接输入全部调用同一入口。
- 验收：registry→handler 覆盖率 100%；每类命令覆盖缺参/非法/多余/别名/引号/CJK；失败后草稿和 retry 语义一致。

**P283 · Command exchange reducer（高）** `platform: agent/src + agent-ui/src（跨平台）`

- 目标：notify、command execution、tool result、output history、thread item 统一为可追踪 envelope，面板成为只读 inspector。
- 实施：扩展共享 `CommandExchangeEvent`（sequence/attempt/receipt/requestId/sessionEpoch/sessionId）；实现 reducer 与 projection port；所有 handler 先提交事件，再派生短通知；重试沿用同一 execution id 追加 attempt。
- 验收：turn→command→tool→output→plan 顺序快照；复制/replay/clear 走同一记录；失败重试无重复 item；agent、agent-ui、gateway 全量回归。

**P284 · Durable timeline exchange（中-高）** `platform: agent/src + agent-gateway + agent-ui/src`

- 目标：将 P283 envelope 持久化到 gateway timeline store，重启/断线恢复不丢失、不重复并跨 principal 隔离。
- 实施：durable append/query/replay/cleanup RPC；cursor 与 sinceSeq 双模式；脱敏和 ownership 在 gateway 强制；UI 以 stable key 幂等重放并拒绝旧 epoch。
- 验收：重启、断线、乱序、重复、权限、分页、attempt 链矩阵；agent/agent-ui/agent-gateway 全量测试。

**P285 · Interaction gate and visual harness（中）** `platform: agent acceptance + agent-ui acceptance`

- 目标：把上述交互纳入可重复门禁，避免“测试全绿但真实路径失效”。
- 实施：Node/Playwright browser runner 与共享 fake gateway 场景；Linux/macOS PTY、Windows ConPTY 适配；采集 DOM/ARIA/ANSI 快照、首屏可见率、重复 item、焦点回退、命令完成延迟。
- 验收：desktop/mobile/320px/CJK/长历史/断线/重试四端矩阵；缺少浏览器或 PTY 时明确 skip 并报告，不修改断言伪造通过。

### 2026-09-03 收尾检查（TypeORM 收敛提交后）

- 工作区检查：`git diff --check` 通过；当前分支最新提交为 `e7e048f7d refactor(agent): remove InMemory stores, adopt TypeORM-backed stores across tests and modules`，无未提交代码改动。
- 全量测试结果：`agent-channels` 59 passing、`agent-cli` 73 passing、`agent-desktop` 20 passing；`agent`、`agent-ui`、`agent-tools` 在测试编译阶段仍引用已删除的 `InMemory*` fixture，未执行；`agent-gateway` 同样因旧 fixture 导入失败；`agent-providers` 8 passing/5 failed（测试容器缺 `LoggerManagers` provider）；`agent-ssh` 受当前沙箱 `listen EPERM` 限制。
- 类型检查：`agent-cli` 通过；`agent`、`agent-ui`、`agent-tools`、`agent-gateway` 因上述 InMemory fixture/旧构造器签名错误失败。按架构约束不恢复 InMemory 兼容层，后续需将测试 fixture 迁移到 `better-sqlite3` `:memory:` + TypeORM，并统一 4 参数工具构造器。
- 限制：P279/P285 的 Playwright/PTY CI runner 仍未建立；gateway/provider/ssh 的环境依赖需在具备监听权限及完整 IoC logger provider 的宿主复验。本轮未将受阻项目误标为完成。

### 2026-09-03 存储依赖倒置续改

- Eval report 持久化已从 `EvalRunner` 内置 `InMemoryEvalReportStore` 改为 `@Abstract()` `EvalReportStore` + `@Injectable()` `TypeOrmEvalReportStore`；`AgentModule` 直接以抽象 token 绑定 TypeORM 实现，`EvalRunner` 构造器强制注入抽象，不再默认 `new` 或静默回退。新增 `AgentEvalReportEntity` 并纳入所有 `AgentOrmModule` connection entity 列表，定向 eval 测试通过。
- `InMemoryToolActivationStore` 已移除并改名为 `SessionToolActivationStore`。该对象只维护当前宿主进程的工具激活租约，属于 session control 而非持久化 store；消费者仍只依赖 `ToolActivationStore` 抽象，具体实现仅在 composition root 注册。
- 生产代码剩余 `InMemoryCommandExecutionControl` 同样是 AbortController 瞬时租约，不属于持久化 store；后续应单独做命名治理。测试目录仍有历史 `InMemorySessionStore`/`InMemoryMemoryStore`/`InMemoryAuditSink` fixture 引用，必须迁移到共享 `AgentOrmTestApp` 的真实 sqljs/SQLite connection 后才能恢复 agent/agent-ui/agent-tools/gateway 全量绿灯，禁止重新导出已删除实现。

### 2026-09-03 收尾验证（本轮）

- 本轮改动验证通过：`agent` eval 定向测试退出码 0，`npm run build` 通过，生产源码未发现残留的持久化 `InMemory*Store`。
- 全量测试暂不能判定通过：`agent`、`agent-ui`、`agent-tools`、`agent-gateway` 的旧测试仍在编译阶段导入已删除的 `InMemorySessionStore`/`InMemoryMemoryStore`/`InMemoryAuditSink`，必须完成真实 TypeORM/sqljs fixture 迁移后才能恢复全量门禁；本轮不提交伪兼容实现。

### 2026-09-03 ORM provider 初始化修复

- `agent-ui` 测试 ORM fixture 改为独立 `testing/agent-orm.ts`，使用 `Application.run({ module: AgentModule, providers: provideAgentOrm(options) })` 直接注册；不再跨包导入 agent 测试模块，也不使用延迟加载或 InMemory store。
- `TypeormAdapter` 移除字段级 `@InjectLog()` 隐式依赖；数据库连接仍由异步 `@Startup()` 初始化，ORM provider 注册不会要求无 logger 的宿主预先提供 `LoggerManagers`。
- 验证：`agent-ui` 全量 **953 passing**，`tsc --noEmit` 通过；`typeorm-adapter` 测试仍有既有 PostgreSQL `connect EPERM` 环境失败，未伪造通过。

### 2026-09-03 TypeORM 异步就绪接口

- `TypeormAdapter` 新增并发安全的异步 `ready()`：启动连接 Promise 单例复用，初始化失败清理 pending 状态以支持重试；保留同步 `getConnection()`/`getRepository()` API 兼容现有 resolver 与 transaction 代码。
- 验证：`packages/typeorm-adapter` `tsc --noEmit` 通过，SQLite/sqljs `test/connet.spec.ts` 定向测试通过。PostgreSQL 连接与本机监听测试仍受当前沙箱 `EPERM` 限制。

### 2026-09-03 TypeORM store lazy readiness follow-up

- `TypeOrmMemoryStore` 与 `TypeOrmEvalReportStore` 的读写入口统一先等待 `TypeormAdapter.ready()`，确保连接异步懒初始化完成后再访问 repository；不引入 InMemory 或默认回退。
- 验证：`agent` `npm run build` 通过；`agent-ui` 全量 **953 passing**；`typeorm-adapter` `tsc --noEmit` 通过。
- 限制：`agent`/`agent-tools`/`agent-gateway` 测试仍包含已删除 InMemory fixture 的历史导入及旧构造器调用，尚未完成真实 SQLite fixture 迁移，因此本轮不宣称 packages/agents 全量测试通过。

### 2026-09-03 Gateway ORM test migration continuation

- `session-sections.spec.ts`、`session-lifecycle.spec.ts`、`share.spec.ts`、`rpc-stream.spec.ts` 已改为 `Application.run + provideAgentOrm(sqljs)`，通过 IoC 获取 `SessionStore`/`MemoryStore`；不再直接构造 InMemory store。
- 这些套件已通过自身 TypeScript 检查。`cloud-task`、audio、harness-reject、rpc-command-output 与大型 gateway-server 仍需同样的异步 context 生命周期迁移。
- 收尾门禁仍未满足：packages/agents 尚未全量测试通过，因此不提交。

### 2026-09-03 Gateway test migration execution plan

按以下顺序持续执行，全部完成并验证后才允许提交：

1. **真实 ORM harness**：为每个 gateway 测试套件使用 `Application.run({ module: AgentModule, providers: provideAgentOrm(sqljs) })`，通过 `ctx.get(SessionStore/MemoryStore)` 注入，禁止测试适配器和 `new InMemory*`。
2. **小型 RPC 套件迁移**：完成 `session-sections`、`session-lifecycle`、`share`、`rpc-stream`、`cloud-task`，逐文件 `tsc` 与定向测试。
3. **音频与拒绝操作套件迁移**：完成 `audio`、`audio-quota`、`harness-reject`、`rpc-command-output`，处理 context 关闭与异步 harness 生命周期。
4. **大型 gateway 套件迁移**：完成 `gateway-server.spec.ts` 的 Session、Memory、Timeline、Audit 真实 ORM 注入及 LocalToolRegistry 新构造签名。
5. **agents 全量门禁**：运行 `packages/agents/*` 测试；仅允许代码测试真实通过，监听权限等环境限制必须单独标明，不得伪造通过。
6. **收尾**：`git diff --check`、受影响包 `tsc/build`、更新本节证据；所有门禁通过后再提交。

当前进度：第 3 步的 `audio`、`audio-quota`、`harness-reject`、`rpc-command-output` 已迁移到抽象 store + IoC ORM；第 4 步 `gateway-server.spec.ts` 仍需整体异步 harness 重写，不能用类型断言或模拟存储替代。

最新进度：`gateway-server.spec.ts` 的 `SessionHandlerTest` 前两个用例已开始切换至 ORM context；该文件其余同步 store 构造仍待逐组迁移，当前保持未提交状态。

补充：大型 `gateway-server.spec.ts` 已完成全部 InMemory store 构造替换为抽象 token 的 ORM context；`tsc --noEmit` 通过。运行期仅剩消息对象由 TypeORM 规范化后增加可选字段的断言兼容调整，已改为部分匹配。

### 2026-09-03 Timeline seq 竞态修复 + 移除 new-able InMemory 测试 fixture（本轮）

- **根因修复**：`TypeOrmTimelineHistoryStore.append` 之前用 `repo.count({where:{sessionId}})` + `save()` 计算 nextSeq，在 `EventHandler.capture()` fire-and-forget（`.catch(() => undefined)`）的并发追加下竞态，导致所有事件 `seq=0`，`reduceTimelineEvents` 排序不稳定，`tool_invoked` 在 `tool_completed` 之后应用、把状态回滚成 `running`。现改为通过私有 promise 链（`pending`）串行化追加，并用 `MAX(seq)` 预热每会话计数器，保证 per-session seq 单调。
- **防御性修复**：`reduceTimelineEvents` 排序从 `a.seq - b.seq` 改为 `compareTimelineEventsAsc`（seq + id 平局），保证 seq 相同时仍确定性重放。
- **验证**：`agent-gateway` 全量 **267 passing EXIT 0**（此前该 timeline 用例置灰失败）；`agent/src/**/*.ts` 独立 `tsc --noEmit` 0 错；`agent/test/timeline-projection.spec.ts`、`persistent-timeline.spec.ts` 定向 EXIT 0。
- **归档重构（用户指示）**：删除整个 `agent/test/helpers/` 目录（`in-memory-stores.ts` + `agent-orm.ts`）。`in-memory-stores.ts` 是 new-able InMemory fixture，违反"消费者使用抽象类、IoC 提供实现、禁止 `new InMemory*`"约束；`agent-orm.ts`（`runAgentOrmApp` 包装 `Application.run`）随后按用户指示一并删除（`Application.run` 可直接代替，无需封装）。两个提交：`96ccc0e00` 删 in-memory-stores、`24a23d80a` 删 agent-orm。
- **限制（P265，未伪造通过）**：`agent` 包测试仍在编译阶段依赖已删除的 `./helpers/agent-orm` 与 `../src/memory/InMemory*` fixture（`agent-permission.spec.ts` 等 26 个文件引 `helpers/agent-orm`；`tools.spec.ts`/`turn-cancel.spec.ts`/`context-compaction.spec.ts`/`runtime-loop.spec.ts` 引 InMemory），用户本轮决定不迁移，故 `agent`/`agent-tools` 全量测试仍未绿灯；该状态为已知且已记录，不属于本提交的验收门禁。

### 2026-09-03 收尾验证（本轮，全量测试 + 提交）

- **工作区**：`git diff --check` 通过；无未提交改动；当前分支领先 `origin/7.tui` 2 个提交（`96ccc0e00` timeline 竞态修复、`24a23d80a` 删除 test/helpers）。
- **全量测试矩阵**（进入各包目录 `npm run test`）：
  - `agent-gateway` **267 passing EXIT 0**（timeline 修复验证，无回归）
  - `agent-ui` **953 passing EXIT 0**
  - `agent-cli` **73 passing EXIT 0**
  - `agent-channels` **59 passing EXIT 0**
  - `agent-desktop` **20 passing EXIT 0**
  - `agent-providers` **13 passing EXIT 0**（此前记录 8/5 缺 LoggerManagers，现随 TypeormAdapter `@InjectLog()` 移除已转绿）
  - `agent` `src/**/*.ts` 独立 `tsc --noEmit` **0 错**
- **已知限制（P265，未伪造通过）**：
  - `agent` / `agent-tools` 测试仍在编译阶段引用已删除的 `./helpers/agent-orm` 与 `../src/memory/InMemory*`（既有未迁移状态，用户明确不迁移），`npm run test` EXIT 1。
  - 此限制为删除 `test/helpers/` 与不迁移决定的直接、已记录后果，不属于本轮验收门禁。
- 本轮不新增提交（无源码待提交变更）；收尾记录与上文归档重构均已在既有提交中体现。

### 2026-09-04 迁移收尾：最后 4 个 spec 文件迁移 + 提交（本轮）

- **完成剩余 4 个 spec 的 IoC 迁移**（用户此前决定"只迁移+报告"范围内，未授权 `src/` 修复）：
  - `runtime-loop.spec.ts`：`createRuntime()` 重写为条件 `useValue` provider（`SessionStore`/`MemoryStore`）；`RuntimeLoopHandle` 暴露 `sessions`/`memory`（同 ctx）；`createArchetypeRuntime` 传 `undefined, undefined`（测试专用，运行时自行解析 store）；`bootStores()` 仅保留给 3 个 `LocalToolRegistry` 用例；`SearchOnlyMemoryStore extends MemoryStore` / `PutFailingMemoryStore extends MemoryStore` 实现全部 5 个抽象方法（put/search/getAll/delete/deleteBySession）。
  - `tools.spec.ts`：`bootStores()` 返回 `{ memoryStore, sessionStore, activationStore, auditSink }`；批量替换 `new InMemoryMemoryStore()`/`new InMemoryAuditSink()`；11 处 `LocalToolRegistry` 全部改 4 参构造；同步方法改 `async`。
  - `context-compaction.spec.ts` / `turn-cancel.spec.ts`：完成迁移，`tsc --noEmit` 0 错。
- **验证**：agent `tsc --noEmit -p tsconfig.json` **0 错 EXIT 0**；`git diff --check` 干净；回归 `components` 135 / `components/console` 73 / `agent-ui` 953 均 EXIT 0。
- **系统性阻断（P265，未伪造通过）**：agent 全量测试仍 **EXIT 1 / 85 失败**，为已提交迁移 `37f4f0088` 的**既有系统性根因**，非本 4 文件引入。两个根因：① `AgentModule`（`agent.module.ts:73`）仅 import `ConfigModule`，注册 TypeORM store 但未 import `AgentOrmModule`，`Application.run(AgentModule)` 无 `provideAgentOrm` 时无 DataSource；② `TypeormAdapter` 为 `@Static()` 进程级单例，其 `onDispose`（`TypeormAdapter.ts:328-334`）销毁共享 adapter，下一测试 ctx 解析到已死 adapter → `DataSource "undefined" not found`。修复需**改 `src/`**（`agent.module.ts` 加 `AgentOrmModule` import；`TypeormAdapter.onDispose` 改静态安全），**用户尚未授权**，本提交不含 `src/` 改动。
- **本提交**：4 个迁移后的 spec 文件（同属迁移修复，`git diff --check` 干净）。

### 2026-09-04 收尾检查：全量测试与工作区复核

- **静态检查**：`git diff --check` 通过；`agent-ui/src` 未发现直接引入 `@tsdi/components/console`、`node:` 或未守卫的平台 API（仅保留 `globalThis` 守卫）；工作区除本 TODO 记录外无源码改动。
- **测试通过**：`agent-desktop` 20 passing、`agent-ssh` 8 passing、`agent-providers` 13 passing（均 EXIT 0）。
- **测试未完成**：`agent-channels`、`agent-cli`、`agent-gateway`、`agent-tools`、`agent-ui`、`agent` 的 `npm run test` 在本次沙箱运行长时间无输出、未自然退出，已中止，不能据此宣称通过；此前已知的 `agent`/`agent-tools` ORM/InMemory fixture 编译阻断及 gateway 监听 `EPERM` 仍需具备完整宿主权限的 CI 复验。
- **结论**：本轮完成收尾检查和结果记录；P279/P285 的 Playwright/PTY 门禁仍未建立，P280–P284 的剩余跨宿主验收不在本轮伪造为完成。

### 2026-09-04 ORM bootstrap 修复

- `AgentModule` 现显式导入 `AgentOrmModule`，并注册 `DefaultModuleLoader`，修复无外部 `provideAgentOrm` 时的 ORM bootstrap 依赖缺失。
- 未修改 `packages/typeorm-adapter/src/TypeormAdapter.ts`（按用户要求保持原样）。
- `agent` `tsc --noEmit` 通过；完整套件仍受长时审批/宿主环境用例影响，未宣称全绿。

### 2026-09-04 SessionStore.search 修复

- 修复 TypeORM session search 使用全局消息 `take` 导致单 session 匹配计数被截断的问题；筛选目标 session 后完整扫描其消息并保留 limit/maxSessions 语义。
- `session-search.spec.ts` 定向套件通过；`agent` `tsc --noEmit` 通过。

### 2026-09-04 agent 测试失败修复：审批 manager 覆盖

- 将 `AgentModule` 内置 `ToolApprovalManager` 注册为 `asDefault`，允许测试和宿主通过显式 provider 注入自定义审批 manager；修复审批测试使用默认 30 秒超时、无法及时 approve 的问题。
- `agent-permission.spec.ts` 定向套件通过；未修改 `TypeormAdapter`。
