# Agent Management System (AMS) — 现状分析与优化方案

> 目标：把当前分散在 sessions / projects / threads / jobs / tasks / tool-runs / delegation 的“agent 运行态”收口成一套 TUI 与浏览器一致的 **Agent Center（Agents / Work / Inbox）**，并补齐 agent profile、permissions、background workers、checkpoints 等管理能力。
>
> 参考基线（2026-11）：
> - OpenCode v2.3.0（2026-11-13）：primary/subagent agent 档案、permissions V2 有序规则 + durable allow、background subagents default、Session Tree、verbosity、session 管理（archive/delete/export/import/fork）、command palette、desktop 最近会话侧栏。
> - Claude Code 2.1.325（2026-11-13）：subagents / agent view（`claude agents`）/ agent teams / projects / dynamic workflows、`/tasks`、`/workflows`、cross-session messaging、checkpoints（Esc Esc rewind）、permission modes、SubagentStart/Stop hooks、Worktree per session/subagent、Artifacts。
> - OpenAI Codex CLI（2026 文档）：`codex agents` agent command center、approval modes（untrusted/on-request/never）+ sandbox presets、auto-review 审批代理、execpolicy、resume/fork/archive/delete、remote app-server（`--remote`）、`codex queue`、插件市场。

---

## 1. 结论摘要

**当前 agent-ui 已是“成熟的单会话工作台”，但还不是“agent 管理系统”。**

- 单会话能力（timeline、工具生命周期、plan/todos、review、approval、question、jobs、窗口布局、命令对话框、Web/TUI 双端）完成度高，且有强验证体系（29 阶段 gate、PTY、DOM/TUI、2081 agent-ui 测试）。
- 运行态数据其实已经齐全：session roles/threads、delegation edges、background tasks、scheduled tasks、coding-task checkpoints、archetype profiles、approval manager、gateway/attach。
- 缺的是**统一入口、统一状态投影、统一操作面**：
  1. 没有 agent profile 的 UI（`/archetype` 只输出一条 notice）；
  2. 没有 Agent Center（跨会话/子 agent/后台任务的“一张屏”）；
  3. 没有 Inbox（approval / question / blocked / failed / idle report 的待办中心）；
  4. 没有 background worker 的 spawn/attach/cancel/worktree 闭环；
  5. permissions 只有 workspace 级 securityLevel，缺有序规则、per-session override、durable always-allow 的审阅面；
  6. 缺 session 级 checkpoints/rewind（只有 coding-task metadata 里的 checkpoint）；
  7. Web 端只有 header 的会话下拉 + 新建，没有 agent/session 总览。
- 建议以 **P0 Agents + Inbox + 只读 Agent Center** 起步，复用现有 archetype/delegation/background task 数据；P1 做 background workers + permissions v2 + checkpoints；P2 再做 messaging/teams、remote 聚合、queue/verbosity。

---

## 2. 现状评估（基于代码）

### 2.1 架构优点

| 维度 | 现状 | 证据 |
|---|---|---|
| 响应式数据驱动 | 属性 set → effect → 绑定重跑，业务不手动刷新 | `components/src/reactive.ts`、`impl/effect.ts` |
| Renderer-neutral | 业务在 agent-ui；TUI/Web 只做渲染适配 | `components/common` + `components/console` + `components/html`；`agent-ui/console`、`agent-ui/web-console` |
| 双端一致 | 同一模板/状态；Web 用 DOM renderer，TUI 用 console renderer | `AgentConsoleComponent`（1499 行，已达 <1500 目标） |
| 会话/项目数据 | session 有 `projectId/primaryThreadId/originThreadId/sessionRole`；delegation edge 持久化 | `agent/src/memory/entities.ts`、`SessionStore.ts`、`DelegationGraphStore.ts` |
| Agent 档案基础 | `AgentArchetype`：mode（primary/subagent）、prompt、model、readOnly、allow/deny/writePaths；内置 build/plan/review；按 session 切换 | `agent/src/archetype/AgentArchetype.ts`、`DefaultAgentRuntime.ts`（`getSessionArchetype/listArchetypes/setSessionArchetype`） |
| 后台工作 | `AgentBackgroundTaskEntity`、`AgentScheduledTaskEntity`；`/ps`、`/jobs` 面板；可 hydrate 历史 | `entities.ts`、`AgentConsoleBackgroundTaskCommands.ts`、`AgentConsoleScheduledTaskHandlers.ts` |
| 审批/问答 | 持久 approval manager、focus stack、question queue、`a/A/d/Esc` 双端即时生效 | `AgentConsoleApprovalPanel.ts`、`AgentConsoleQuestionState.ts`、`AgentConsoleInputPanel.ts` |
| 命令对话框 | 声明式 route 表（id/path/group/kind/alias）+ `/dialog` 选择器 + `/help` 入口 + Web `?dialog=` + type-to-filter + 滚轮/PageUp | `AgentConsoleDialogRoutes.ts`、`AgentConsoleDialogCommands.ts`、`docs/dialog-matrix.md` |
| 远程/双端 | `serve` Gateway + Web 控制台 + `attach` TUI + 配对二维码 + PWA | `agent-cli` serve/attach、`agent-gateway`、`web/header.js` |
| 验证体系 | 29 阶段 gate；PTY 12 场景；DOM/TUI gate；2081 agent-ui 测试 | `scripts/agents-gate.sh`、`acceptance/run_acceptance.py` |

### 2.2 已有但“只差一个 UI”的资产

| 资产 | 已有实现 | 缺口 |
|---|---|---|
| Agent profiles | archetype（name/desc/mode/model/prompt/allow/deny/writePaths/readOnly） | 无 `/agents` 选择器、无 composer badge、无 per-agent reasoning/effort、无自定义文件加载面 |
| Work graph | `AgentDelegationEdgeEntity`、thread/project 关系、coding tasks、background tasks | 无统一树形投影；子 agent 无 attach/cancel/状态徽标 |
| Attention | approvals、pending questions、failed/blocked tasks、scheduled jobs | 无统一 Inbox/未读计数/跳转 |
| Permissions | `securityLevel`（read-only/ask/auto/full）、approval manager、always-allow（仅本会话 auto-approve） | 无有序规则（action/resource/effect）、无 per-session override、无 durable allow 的查看/撤销 |
| Checkpoints | coding-task metadata 的 checkpoint（available/applied/invalidated） | 无 session 级自动快照 + `/rewind` + Esc Esc |
| Queue/steer | turn 中 Enter 排队、`ui.steerMode` | 无队列管理面板（重排/取消/优先） |
| Remote | `serve`/`attach`/pairing | 无跨 gateway 的 Agent Center 聚合 |

### 2.3 与最新竞品对比

| 能力 | 我们 | OpenCode 2.3 | Claude Code 2026 | Codex 2026 | 差距判断 |
|---|---|---|---|---|---|
| Agent profiles（primary/subagent） | archetype（仅命令切换） | ✅ `/agents`、Shift+Tab、markdown 定义、per-agent permissions/model | ✅ subagent 定义、@-mention、agent teams 复用 | ✅ profiles/plugins | **高**：数据有，交互面缺失 |
| Agent Center（一张屏管理） | ❌ | ✅ Session Tree / 最近会话；desktop 侧栏 | ✅ `claude agents` agent view | ✅ `codex agents` command center | **高** |
| Background subagents | 部分（delegation/background tasks） | ✅ 默认后台、idle report、并发 | ✅ subagents + agent view + cross-session messaging | ✅ app-server/remote + queue | **高** |
| Inbox / needs-input | ❌（approval/question 仅当前屏） | 部分（权限/flags） | ✅ agent view 标“需要你” | ✅ approvals 队列 | **高** |
| Permissions 规则化 | 仅 level + 会话内 auto | ✅ ordered rules + durable allow + per-session mode | ✅ modes + 分层 settings | ✅ approval policy + sandbox + auto-review | **高** |
| Checkpoints/rewind | 仅 coding task | ✅（undo/redo；opencode） | ✅ Esc Esc rewind | 部分（rollout fork/resume） | **中高** |
| Session 管理 | ✅ tabs/new/resume/fork/archive/delete/rename/export/import | ✅ archive/delete/export/import/fork、tabs、recent | ✅ projects/threads/remote | ✅ resume/fork/archive/delete/remote | **中**（我们已有，缺总览） |
| Transcript verbosity | 视窗折叠长输出 | ✅ low/medium/high + 活动行 | ✅ | ✅ | **中** |
| Queue/steer | 有队列 + 可选 steer | ✅ Enter steer / queue 快捷 | ✅ queue/steer | ✅ `codex queue` | **中**（缺管理面） |
| Cross-session messaging / teams | ❌ | ✅（PR/实验） | ✅（实验） | 部分 | **低优先**（生态能力） |
| Worktree 隔离 | `/worktree` 命令 | ✅ 每 session/subagent | ✅ 每 session/subagent/`/batch` | ✅ `--worktree` | **中** |
| Remote 多端 | ✅ serve/attach/pairing | ✅ server URL | ✅ remote control/cloud | ✅ `--remote` ws/unix | **中**（聚合面缺） |

### 2.4 主要问题（按影响排序）

1. **心智模型缺失**：用户要分别理解 sessions、threads、projects、jobs、tasks、tool-runs、delegation；没有一个“我现在有哪些 agent、它们在哪、谁需要我”的视图。
2. **Agent 不可见**：当前 session 由哪个 profile（build/plan/review/自定义）驱动、用什么 model/effort、有哪些权限，输入区没有稳定标识；`/archetype` 只有文本 notice。
3. **后台工作不可操作**：`/ps`、`/jobs` 能看到列表，但不能从 UI 创建/取消/attach/分配 worktree；delegation 树只在 `/delegation` 文本里。
4. **待办不可聚合**：approval/question 是当前会话的模态层；切到别的 tab 就看不到“另一个 agent 在等我批准”。
5. **权限不可解释**：securityLevel 是粗粒度级别；用户无法查看“为什么这条命令被允许/拒绝”，也无法保存/撤销项目级 durable allow。
6. **不可回退到“编辑前”**：git snapshots 是显式操作；Claude 的 Esc Esc checkpoint 是高频安全网。
7. **Web 端信息密度低**：只有顶部会话下拉；缺少侧栏、未读、子 agent 状态，移动端也难总览。

---

## 3. 设计目标与原则

### 3.1 目标

- **一个心智模型**：Agent Center = Agents（档案）+ Work（运行中的 worker/session）+ Inbox（需要用户处理的事）。
- **运行态可解释**：每个 session/worker 显示 profile、model/effort、权限模式、worktree、父/子关系、耗时、最后动作。
- **操作闭环**：从 Center 直接切换、创建、取消、attach、批准/拒绝、打开 worktree、rewind。
- **双端一致**：TUI 用 overlay/panel，Web 用 sidebar/overlay；共享状态与命令；同一 URL/deep-link 语义。
- **安全默认**：权限 fail-closed；durable allow 必须显式创建、可审阅、可撤销；绝不把 secrets 写入 UI 状态。
- **不删功能**：现有命令、布局、面板、快捷键全部保留；新能力通过新增 route/命令接入。

### 3.2 非目标（本方案不做）

- 不做云端多租户调度（只做本地/已 attach gateway 的聚合）。
- 不复制竞品品牌/配色；只参考信息架构与交互原则。
- 不在没有 ESM splitting 的前提下宣称“网络按需加载”。
- 不引入 slot/children 级组件框架重构（当前模板只支持属性投影）。

---

## 4. 目标信息架构

```
Agent Center
├── Agents        档案：build / plan / review / 自定义（mode、model、effort、permissions、skills）
├── Work          运行态：当前 session tabs + 子 agent/workers + background tasks + scheduled jobs
└── Inbox         待办：approvals / questions / blocked / failed / idle reports / queued prompts
```

- **Session tabs**：保持现有“每个 tab = 完整 TUI”的契约；tab 上增加 agent 徽标、状态点、未读/待办计数；父/子 agent 仍各自一个 tab，但可在 Work 中以树形折叠。
- **Composer 状态行**：`agent: build · model · effort · permissions mode · worktree`（不塞进 prompt）。
- **TUI**：`/agents` 打开 Agents；`/work`（或 `/center`）打开 Work；`/inbox` 打开 Inbox；三者共用 dialog 路由与 type-to-filter。
- **Web**：桌面左侧 sidebar（Agents/Sessions/Inbox 三段，可折叠），移动端抽屉；header 保留会话下拉 + Inbox badge + agent badge；URL 状态可分享。

---

## 5. 核心模型

### 5.1 AgentProfile（扩展现有 AgentArchetype）

```ts
interface AgentProfile {
  id: string;                 // build / plan / review / reviewer
  name: string;
  description?: string;
  mode: 'primary' | 'subagent' | 'all';
  prompt?: string;
  model?: { profile?: string; id?: string; reasoningEffort?: string };
  permissions: PermissionRule[];       // 有序，last match wins
  tools?: { allow?: string[]; deny?: string[] };
  skills?: string[];
  display?: { color?: string; icon?: string };
  source: 'builtin' | 'user' | 'project' | 'plugin';
}
```

- 复用 `AgentArchetype` 字段，新增 `permissions` 有序规则、`model.reasoningEffort`、`skills`、`display`、`source`。
- 加载顺序：builtin → user (`~/.tsdi-agent/agents/*.md`) → project (`.tsdi-agent/agents/*.md`) → settings 覆盖；同名覆盖。
- 当前 session 的 profile 持久化（已有 `getSessionArchetype/setSessionArchetype` 可扩展），并在 bootstrap/attach 恢复。

### 5.2 AgentRun / Worker

```ts
interface AgentRun {
  sessionId: string;
  profile: string;
  parentSessionId?: string;
  role: 'main' | 'branch' | 'review' | 'worker';
  status: 'idle' | 'running' | 'waiting-input' | 'blocked' | 'failed' | 'done';
  worktree?: string;
  startedAt: number;
  lastActivityAt: number;
  lastReport?: string;
  budget?: { used: number; limit: number };
}
```

- 数据源：`SessionStore`（role/thread/project）、`AgentDelegationEdgeEntity`、`AgentBackgroundTaskEntity`、`AgentScheduledTaskEntity`、runtime 状态。
- 投影层：`AgentConsoleWorkGraph`（纯函数，可单测），TUI/Web 共用。

### 5.3 AttentionItem

```ts
interface AttentionItem {
  id: string;
  kind: 'approval' | 'question' | 'blocked' | 'failed' | 'idle-report' | 'queued';
  sessionId: string;
  severity: 'info' | 'warn' | 'error';
  title: string;
  createdAt: number;
  sourceRef?: string;   // approvalId / questionId / taskId / messageId
  resolvedAt?: number;
}
```

- 派生自现有状态（`pendingApprovals`、`pendingQuestionQueue`、coding tasks、background tasks、delegation reports、queued prompts），不做第二套事实源。
- 跨 tab/session 聚合在 host 层（本地 + attach gateway 的会话列表），事件驱动更新，禁止定时器轮询。

### 5.4 PermissionRule

```ts
interface PermissionRule {
  action: string;    // shell / edit / read / subagent / skill / webfetch / question ...
  resource: string;  // 命令前缀、路径 glob、agent id、URL、query
  effect: 'allow' | 'ask' | 'deny';
  scope: 'global' | 'workspace' | 'agent' | 'session';
  agent?: string;
  origin: 'config' | 'user' | 'always-allow';
  createdAt?: number;
}
```

- 求值：scope 由宽到窄、agent 规则追加；**最后匹配优先**；无匹配默认 `ask`（fail-closed）。
- `always-allow` 只在用户显式点击/按键后写入 workspace 配置；提供列出/撤销；永远不能覆盖显式 `deny`。

### 5.5 SessionCheckpoint

```ts
interface SessionCheckpoint {
  id: string;
  sessionId: string;
  turnId?: string;
  messageId?: string;
  files: Array<{ path: string; beforeRef: string; afterRef?: string }>;
  createdAt: number;
  appliedAt?: number;
  invalidatedAt?: number;
}
```

- 在编辑类工具执行前自动记录（与现有 coding-task checkpoint 元数据共用实现）；`/rewind` 选择、预览 diff、恢复；Esc Esc 打开最近 checkpoint 的确认。

---

## 6. 分阶段方案

### P0 —“看得见”（1–2 个迭代，低风险）

**目标**：不改运行时语义，先把 profile 与运行态聚合展示出来。

**已完成（2026-11 首片）**
- `AgentProfile` 视图：`/agents`（route 可后续登记）列出 build/plan/review 与自定义 archetype（mode/model/description、当前 `●` 标记），Enter 切换；`/agents <name>` 直切；`/agents default [name]` 读取/设置新会话默认档案（持久化 `defaultArchetype`）；`/archetype` 保留别名。
- `session.archetype.list` RPC（gateway）返回 profile 元数据；不可用时回退 runtime `listArchetypes()`。
- composer **meta 行**增加 `agent <name>` 徽标（不塞进 prompt，保持 plan/vim/queued 徽标现状）；session 打开/切换/重载通过 `session.archetype.get` 恢复。
- 验证：JSDOM/单测 + 真实 Chrome（`/agents` 选择 plan 后徽标更新，刷新后保持 `agent plan`）。
- `/work` 工作树首片：纯投影 `buildWorkRows`（delegation tree + background tasks + session 元数据），层级缩进/状态符号/任务行；Enter 打开所属会话；无树时显示当前会话；route `work` 已登记（dialog 目录自动收录）。真实 Chrome：`/work` 显示当前会话行与 `running` 状态。
- `/inbox` 首片：从 `approval.list`（跨会话）、`pendingQuestionQueue`、失败后台任务、失败/阻塞 coding task、排队 prompt 派生 `InboxItem[]`；严重度排序；Enter 打开所属会话并对审批聚焦；空态 toast；route `inbox` 已登记。单测覆盖派生/跳转/空态；真实 Chrome 验证空态文案。
- Web sidebar v0：左侧 `Agent center`（Agents 当前 profile、Sessions 最近列表、Work/Inbox 按钮）；桌面 ≥1080px 常驻并让 console 右移，窄屏为抽屉；«/» 折叠展开；tab 条与 agent meta 变化触发微任务刷新（无定时器）。真实 Chrome：console x 从 270（开）到 150（收），Inbox 按钮打开待办。
- Web sidebar v1（检索 + 设置）：项目 finder（搜索标签/路径，路径折叠为目录名，显示会话数，选中后限定会话范围）+ 会话 finder（标题/id/workspace/project 即时过滤、Today/Yesterday/Previous 7 days/Older/Undated 分组、↑/↓/Enter/Esc、零匹配 `Search all messages`）；底部 Settings 打开 `/settings`，`+` 新建会话；⌘K/Ctrl+K 聚焦 finder；点击会话与 tab 一致地原地切换（保留查询/项目过滤，URL `?session=` 同步）。附带修复浏览器每次挂载由 `app.state` 新建空会话的问题。
- 注意力徽标：meta 行 `! N`（当前会话 approvals + questions + queued，`v-show` 零值隐藏）；sidebar Work/Inbox 显示跨会话计数（`approval.list` + 失败/运行中后台任务 + 当前问答/排队），在挂载、tab 变化、窗口重新可见与命令执行后刷新（无轮询）。


1. **Agents 面（TUI + Web）**
   - 扩展 archetype 为 AgentProfile（新增可选字段，向后兼容）。
   - `/agents` 选择器（dialog route `agents`，kind=select）：列表显示 name/mode/model/permissions 摘要/来源；Enter 切换当前 session；`d` 设为默认；`/agents <id>` 直接切换。
   - 保留 `/archetype` 为别名。
   - Composer status/meta 行显示 `agent: <id>`；Shift+Tab 循环 primary profiles（可配置）。
   - 新增路由：`agents`、`agent`（当前 profile 详情）、`inbox`。
   - i18n 中英文案；`/help` 分组与 command palette 自动收录。
   - 验收：TUI/Web 都能切换并持久化；重启/attach 恢复；`agent` 徽标与 runtime 一致。

2. **Agent Center v0（只读聚合）**
   - 新增纯投影 `AgentConsoleWorkGraph`：从 sessions + delegation edges + background tasks + scheduled jobs + coding tasks 生成 `AgentRun[]`（含 parent 链、状态、耗时、worktree）。
   - TUI `/work`（route `work`，kind=panel/select）：树形/缩进列表，Enter 切换 tab，`x` 取消 background task，`a` attach（本地 tab）。
   - Web sidebar v0：Agents / Sessions / Work 三段只读列表；点击切换会话；状态点/未读。
   - 验收：本地 12 个场景 + 一个 delegation 场景；断线/重连后状态不丢；无轮询。

3. **Inbox v1**
   - 派生 `AttentionItem[]`：approval/question/failed/blocked/idle-report/queued。
   - TUI `/inbox`：列表 + 跳转（切换 tab 并聚焦对应 approval/question）；数字/Enter 处理。
   - Tab/footer 未读计数；Web header badge + sidebar Inbox 段。
   - 验收：跨 tab 的 approval/question 可见可跳；处理后计数归零；不改变现有审批按键语义。

4. **测试/门禁**
   - 纯函数投影单测；JSDOM sidebar/inbox；PTY 场景（`/agents` 切换、`/inbox` 跳转）。
   - `agents-gate` 全绿；source-size 不增长（新逻辑放在新 controller/模块，不进 Component）。

### P1 —“管得住”（2–3 个迭代）

1. **Background workers 闭环**
   - `◐` `/work spawn --worktree[=name]` 已创建/复用 managed worktree 并通过 `spawn_agent.workspace`
     传给 worker（`activate:false`，不切换父会话；同名 worktree 复用；裸 flag 打开选择菜单）；
     任务行已提供只读 worker report 与 open/attach session。
   - `agent.worker.spawn`：从 `/work` 选择 profile + prompt + worktree 选项创建子 session/worker；写 delegation edge/background task。
   - 状态实时（SSE/事件驱动）：queued/running/waiting-input/done/failed；idle report 作为 Inbox 项 + 父 session 消息。
   - 操作：attach（新 tab/现有 tab）、cancel、retry、open worktree、查看报告。
   - 预算/深度限制（对齐 opencode `task_budget`/`level_limit`，默认关闭）。
   - Worktree 选项：`none | new | reuse`；子 agent 默认 new（可配置）。
   - 验收：并发 3 个 worker 在 TUI/Web 都能看到；取消/重试正确；重启后恢复列表；不阻塞主 turn。

2. **Permissions v2**
   - Rule store（workspace 配置 + agent 级追加）；求值器复用/对齐 runtime 现有 gate。
   - `◐` `/permissions rules` 已支持列出/新增（字符串或 `ask|allow|deny <category> [resource]`）/删除/重置；
     持久化 `approvalRequireApproval`，审批策略 live 生效。设置页 Permissions 段可图形化删除/重置；
     新增规则仍走命令，per-session override 待补。
   - durable always-allow：审批弹窗 `A` = 本会话；新增 `s`/“保存为项目规则”选择，写入 workspace 并可在 rules 中撤销；明确提示范围。
   - “为什么允许/拒绝”解释行（匹配到的 rule + 作用域）：`◐` `inspect` 已展示有序规则最终匹配。
   - 验收：`deny` 永远不可被 always-allow 覆盖；规则求值有单测表；TUI/Web 一致；旧 securityLevel 自动映射。

3. **Checkpoints / Rewind**
   - 编辑类工具执行前自动 checkpoint（与 coding-task 元数据共用）；`/rewind [n]` 列表 + diff 预览 + 恢复；Esc Esc 打开最近 checkpoint 确认。
   - 恢复只影响文件，不改变 transcript；保留 applied/invalidated 状态；跨 resume 可用。
   - 验收：真实 PTY + JSDOM；恢复后文件内容/状态正确；失败可回滚；不覆盖用户未保存改动（冲突提示）。

### P2 —“协同”（3+ 个迭代，实验）

1. **Queue / steer 管理面**：`/queue move <n> <m>` 与 `/queue manage` 交互面板已支持重排/编辑/删除；
   `Ctrl+X Enter` 已提供“插到队首”的优先级（不打断 turn）；Mod+Enter steer 与 Web 拖动/批量操作仍待补。
2. **Cross-session messaging / agent teams（opt-in）**：共享任务列表 + 消息；权限 `session.message`；TUI/Web 消息面板；默认关闭。
3. **Remote 聚合**：Agent Center 读取多个 gateway（本地 + attach）；只读优先，再开放 spawn/cancel；URL/配对复用。
4. **Verbosity & 活动摘要**：low/medium/high；一次 run 的工具/thought 合并为可折叠活动行（参考 opencode v2.3），默认 low。
5. **Artifacts**：会话产出发布为可交互页面（Web），TUI 提供链接/打开。

---

## 7. TUI 设计要点

- **入口**：`/agents`、`/work`、`/inbox` 都是 dialog route；`/dialog` 目录与 `/help dialogs` 自动出现；`Ctrl+P` 可直达。
- **布局**：overlay 贴输入框上方（现有 Dialog Stack 契约）；Work 树超长时窗口化（`1-12/N`），不压缩 transcript。
- **键盘**：
  - `/agents`：↑↓/Home/End/PgUp/PgDn、Enter 切换、`d` 设默认、`/` 或直接键入过滤、Esc 返回。
  - `/work`：Enter attach、`x` cancel、`r` retry、`w` worktree、`p` 父级、`/` 过滤；`n` 新建 worker。
  - `/inbox`：Enter 跳转/处理，`a/d` 审批，数字选择 question，Esc 返回。
- **状态点**：running `●`、waiting-input `?`、blocked `!`、failed `✗`、done `✓`；颜色沿用主题 token，不硬编码。
- **tab 条**：agent 图标/颜色 + 未读点；父/子 tab 可通过 Work 树跳转；关闭 tab 仍丢弃 UI 快照。
- **通知**：沿用 toast + status rail；Inbox 计数进入 statusline；不新增定时器。

## 8. Web 设计要点

- **桌面布局**：左侧 sidebar（可折叠，宽度记忆）：
  - Agents：当前/可用 profile，点击切换；显示 mode/model。
  - Sessions：最近会话（标题 + 相对时间 + 状态点），支持 pin/搜索（复用现有会话搜索）。
  - Work：运行中 workers/background tasks，状态 + 操作。
  - Inbox：待办列表，点击跳转。
- **移动端**：sidebar 变抽屉；header 保留会话下拉 + Inbox badge + agent badge。
- **URL**：`?session=` 现有；新增 `?agent=<id>`、`?view=work|inbox`、`?dialog=agents`；刷新/分享可恢复。
- **实时性**：复用 SSE + reactive state；focus/visibilitychange 只触发一次主动刷新（禁用轮询）。
- **主题**：sidebar/inbox 使用 console theme 变量；light/solarized/high-contrast 全量覆盖；`data-theme` 镜像保持。
- **PWA**：shell 预缓存；work/inbox 数据 network-first。

## 9. 数据与 API 变更

### 9.1 持久化

- 扩展 `AgentSessionEntity`：`agentProfile`（string）、`permissionMode`（string）、`checkpointSeq`（number）。
- 新表（或复用 metadata JSON，按成本选择）：
  - `AgentWorkerEntity`（或复用 `AgentBackgroundTaskEntity` + delegation edge）
  - `AgentAttentionEntity`（可派生则不落库，仅持久化已读/已处理状态）
  - `AgentCheckpointEntity`
  - `AgentPermissionRuleEntity`（或 workspace 配置文件）
- 迁移必须兼容旧库：新增列 nullable/默认值；启动/关闭后旧 session/message 完整保留；禁止删库迁移（AGENTS §8）。

### 9.2 RPC / 命令

| API | 说明 |
|---|---|
| `agent.profile.list/get/setDefault` | profile 目录与默认 |
| `session.agent.set` | 切换当前 session profile（复用 `session.archetype.set` 别名） |
| `agent.worker.list/spawn/cancel/attach/retry` | 后台 worker 生命周期 |
| `attention.list/resolve/markRead` | Inbox |
| `permissions.rules.list/upsert/remove` / `session.permissions.mode.set` | 规则与模式 |
| `checkpoint.list/restore` | 回退 |
| `session.message.send`（P2） | 跨会话消息 |

- 所有新命令注册到 `COMMAND_HANDLERS`（注册表，不扩 `switch`）；dialog 路由表新增 id；i18n en/zh 同步；`/help` 分组与 palette 自动收录。

## 10. 风险与护栏

| 风险 | 护栏 |
|---|---|
| `AgentConsoleComponent` 膨胀 | 新逻辑放 `AgentConsoleAgentCenter*` / `AgentConsoleInbox*` / `AgentConsoleWorkGraph` 模块；Component 只做 facade；source-size 基线只降不升 |
| 双端分叉 | 业务/状态放 agent-ui；DOM/sidebar 布局放 `components/html` 或 web 适配层；TUI/Web 共享投影与命令 |
| 权限绕过 | 求值 fail-closed；durable allow 显式确认、可撤销、不可覆盖 deny；审计日志（谁在何时批准） |
| 数据安全 | 新表迁移可回滚；不记录 secrets；导出/分享做 redact（复用现有机制） |
| 轮询/性能 | Inbox/Work 由状态与事件派生；禁止定时器；列表虚拟化/窗口化 |
| 功能回归 | 不删除现有命令/面板；TUI 快捷键与 Web 键盘契约保持不变；每阶段跑全量 gate + PTY |
| 竞品差异 | 只参考信息架构与交互原则，不复制品牌/配色/文案 |

## 11. 验证与验收

每阶段必须包含：

- **单元**：WorkGraph 投影、权限求值表、attention 派生、checkpoint 状态机。
- **JSDOM**：sidebar/inbox/agents 切换、跨 tab attention 跳转、权限规则表单。
- **真实 PTY**：`/agents` 切换并恢复、`/work` attach/cancel、`/inbox` 跳转、Esc Esc rewind（新增 acceptance 场景 13+）。
- **真实 Chrome**：`?agent=`/`?view=inbox` 深链、sidebar 响应式、无轮询（Performance/Network 面板确认）。
- **门禁**：`RUN_PTY=1 bash scripts/agents-gate.sh` 全绿；`check-source-size` 不新增超限文件；`git diff --check`；生产库完整性。
- **数据**：旧 DB 升级/重启后 session/message/memory/规则完整保留；迁移幂等。

## 12. 交付顺序（建议）

```
P0.1 AgentProfile + /agents + badge            (1 迭代)
P0.2 WorkGraph 投影 + /work 只读 + Web sidebar (1 迭代)
P0.3 Inbox v1 + 跨 tab 跳转 + badge            (1 迭代)
P1.1 Background workers spawn/attach/cancel    (1–2 迭代)
P1.2 Permissions v2 + durable allow + 解释     (1–2 迭代)
P1.3 Checkpoints / rewind                      (1 迭代)
P2.1 Queue/steer 面板                          (1 迭代)
P2.2 Remote Agent Center 聚合                  (1–2 迭代)
P2.3 Cross-session messaging / teams (opt-in)  (实验)
P2.4 Verbosity / activity summary / artifacts  (1 迭代)
```

## 13. 待确认问题

1. profile 定义文件格式：优先 Markdown frontmatter（对齐 opencode/Claude）还是 JSON？建议 Markdown + settings 覆盖。
2. Work 的“子 agent”是否一律新 tab，还是允许“同 tab 内嵌套视图”？建议默认新 tab，Work 树提供跳转（保持“每 tab 完整 TUI”契约）。
3. durable allow 的默认范围：workspace 还是 project？建议 workspace（与输入历史/权限边界一致），并提供 project 覆盖。
4. Checkpoint 存储：文件快照 vs git object；建议复用现有 coding-task checkpoint 实现，避免第二套。
5. Remote 聚合的首版范围：只读列表 vs 可操作；建议先只读。

---

### 附：本轮已具备的“快速胜利”清单

- 已有 archetype runtime API：只需 UI 面即可上线 `/agents`。
- 已有 delegation edge / background task / scheduled task 持久化：Work 投影无需新表即可 v0。
- 已有 approval/question 状态与 focus stack：Inbox 派生无需改审批语义。
- 已有 dialog route registry 与 type-to-filter：三个新入口（agents/work/inbox）按现有模式注册即可。
- 已有 `serve`/`attach`/pairing：Web sidebar 与远程聚合可复用现有 RPC。
