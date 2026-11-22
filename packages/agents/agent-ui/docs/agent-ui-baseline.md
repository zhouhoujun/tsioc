# agent-ui 基线与预算（P0）

日期：2026-11-18。分支：`7.tui`。目的：在 P1–P4 逐阶段实施前，固定可复跑的测试入口、
性能数字与预算阈值，避免"用单测耗时/代码推测宣布优化"。

## 1. 阶段划分与验收

| 阶段 | 内容 | 验收载体 | 状态 |
| --- | --- | --- | --- |
| P0 | 基线、预算与回归入口（本文档） | 全量 gate + 1k 消息切换基线 | 本提交 |
| P1 | 弹窗契约（与输入区同宽、贴输入框）+ `/sessions`、`/projects` 细节 | console-renderer / dialog-regressions / p236 | 已完成（`55324b026`） |
| P2 | 响应式利用与性能（投影/过滤缓存、批量写入、热点 getter、A/B） | 1k 消息 A/B + agent-ui 全套 + components-bench | 进行中 |
| P3 | Web 设置页（同一 schema、components/common 组件） | DOM 设置页测试 + 刷新持久化 + Web build | 已完成 |
| P4 | 收尾（README/dialog matrix、全量 gate + DOM/TUI/预算） | 全量 gate 13/14 + bench 全绿（source-size 外部阻塞） | 已完成 |

## 2. 测试基线（2026-11-18，`4ef0f7a84` + P0 文档）

| 包 | 结果 |
| --- | --- |
| `@tsdi/components` | 191 passing |
| `@tsdi/components/common` | 122 passing |
| `@tsdi/components/console` | 171 passing |
| `@tsdi/components/html` | 146 passing |
| `@tsdi/agent-ui` | 2222 passing（2.4 min，含设置页 4 用例 + 侧栏 2 用例） |
| tsc `agent-ui` | 通过 |
| Web 生产包 | 通过 |

弹窗相关定向套件（console-renderer / dialog-regressions / session-picker / p236 /
vm-panels）：191 passing。

## 3. 性能基线（4 tab × 1000 消息，viewport 32 行）

`openSession(id, { background: true })` 完整切换（含 paint，`Date.now()` 采样 8 次）：

| 指标 | 实测 |
| --- | --- |
| p50 | 76–115 ms（多轮，负载 2.0–2.4） |
| p95 | 91–150 ms |
| state（禁用 paint）p50/p90 | 59–63 / 74–81 ms（A/B 交替，负载 2–4） |
| 单次整屏 paint | 25–56 ms |
| 历史逐页加载 | 98–138 ms |

预算（负载 `load average ≤ 3` 时）：

- 完整切换 p50 ≤ 120 ms，p95 ≤ 200 ms；
- state p50 ≤ 90 ms；
- 不允许新增"每次读取都执行"的缓存/遍历（响应式核心热路径纪律见 AGENTS.md）。

对照：P2 首个优化前同 harness p50 87–140 ms（尖峰 195 ms）；P2 后 76–115 ms（含负载波动）。
两次被否决的优化（`removeDeps` 三元组、console 样式快路径）记录在 `todo.md`。

## 4. source-size 预算

- `packages/agents/**`：单文件 ≤ 600 行，已超额文件只降不升；
- `packages/components/common/**`：≤ 700 行；
- 本次基线：agents 与 components/common 全部达标。
- P4 全量 gate（2026-11-18）：components ×4 / agent-ui / tsc / diff-check / web build /
  dom-gate / dom-gate-matrix / tui-gate / gate-regression 全部 PASS；`components-bench` 全部
  BENCH-OK（trigger 703ms ≤ 1500，v-for reorder 340ms ≤ 1000，viewchildren 186ms ≤ 800）。
- 已知外部阻塞（2026-11-18）：用户未提交的
  `packages/activities/src/visual/components/workflow-designer.component.ts`
  （1903 行 > 基线 1897）导致全量 gate 的 `source-size` 阶段失败；该文件不属于
  agent-ui 改动，**不得**通过调高基线或提交他人的工作来"修复"。

## 5. 复跑命令

```bash
# 单包
cd packages/agents/agent-ui && npm run test

# 完整 gate（workflow-designer 外部改动未清理时 source-size 会失败）
bash scripts/agents-gate.sh components components-common components-console \
  components-html agent-ui tsc-agent-ui source-size diff-check build-agent-ui-web

# 4 tab × 1000 消息切换（打印 p50/p95，frame 数断言）
cd packages/agents/agent-ui
cat > run-one.tmp.ts <<'EOF'
import { runTest } from '@tsdi/unit';
runTest(['./test/tab-switch-long-session.spec.ts'], { baseURL: __dirname })
    .catch((err: Error) => { console.error('RUNNER-FAIL', err); process.exit(1); });
EOF
npx ts-node --transpile-only -r tsconfig-paths/register run-one.tmp.ts
rm -f run-one.tmp.ts
```

## 6. 纪律

- 每阶段单独提交：测试、预算数字与文档同提交；
- 任何性能改动必须交替 A/B ≥3 轮（首次冷启动样本剔除），无收益立即回退；
- 不删除/降级既有用户功能；弹窗契约变更同步修测试，不放宽断言；
- 新增逻辑落新文件（<600 行）；触碰基线文件时同提交下调基线。

## 7. 测试运行方式（2026-11-20）

`npm run test` 现在按“重 spec 独立 + 其余按原序三等分”分 5 组并行（`unit.ts`），
并在内存不足时自动合并分组（1–5 组，阈值 1.2GB/worker）：

- 组：`console-renderer`、`session-tabs`、`remainder-1..3`（原序连续切片）。
  连续切片很重要：早前按耗时均衡的随机组合会让 DOM 相关文件以新顺序相遇，
  暴露 teardown 顺序假设（销毁视图的绑定在 teardown 中重跑）。
- 覆盖完整性：每组独立验证 + 汇总运行均为 2231 passing
  （109 + 11 + 743 + 598 + 770；含 3 个分组自检用例）；`test/test-groups.spec.ts`
  断言 1–5 组时每个 spec 恰好出现一次。
- 开关：`AGENT_UI_TEST_GROUPS=<1..5>` 强制组数，`AGENT_UI_TEST_SHARDS=1` 回到单进程；
  `npm run test:coverage`（`-c`）始终单进程以保证一份 coverage 报告。
- 实测（同一主机，负载有波动）：

| 方式 | 墙钟 | 说明 |
| --- | --- | --- |
| 单进程（基线） | 209s（低负载）/ 519s（多任务并发时） | 2231 passing |
| 5 组 | **120.2s**（6.5GB 可用）/ 144.3s（gate 当次） | 全部 5 组 green |
| 2 组合并 | 141.6s | 覆盖完整（2122 + 109） |

- 说明：并行收益受宿主机内存/负载影响很大。内存紧张时会自动退回更少分组，
  避免 5 个 ts-node 进程换页反而变慢。`AGENT_UI_TEST_GROUPS=1` 可复现旧行为。

## 9. 2026-11-20 更新（P2/P3 收尾）

测试基线（同一分支 `7.tui`，提交 `305753184` 之后）：

| 包 | 结果 |
| --- | --- |
| `@tsdi/agent` | 1102 passing |
| `@tsdi/agent-gateway` | 410 passing |
| `@tsdi/agent-tools` | 595 passing |
| `@tsdi/agent-ui` | **2359 passing**（2 组；含随机顺序） |
| tsc | agent / agent-ui / agent-gateway 通过 |
| source-size / diff-check / production-db-integrity | 通过 |

说明：

- 本次高负载（load average ~10）下仍选择 5 组；低负载时 4 组约 108s。
- ordered approval rules 拆分后 `ToolApprovalManager.ts` 从 626 行降到 551 行，新文件
  `tools/ApprovalStrategy.ts`（<600）承载规则求值。
  组数由可用内存自动决定，也可通过 `AGENT_UI_TEST_GROUPS=<1..5>` 强制。
- `source-size` 的外部阻塞（activities workflow-designer）已不再阻塞，当前全量通过。
- 投影缓存（按 transcript 复用 display 列表）微基准约 5%，已并入 P2；
  1k tab 切换仍是后续预算项，未宣称达到 ≤70ms 目标。
- P3 已完成：tab 键盘循环/恢复、`@file#Lx-Ly`、Web/PWA 通知、`/btw`、
  项目级 durable allow（`p` / `/permissions allow`）、会话级 `/undo`/`/redo`
  （恢复 prompt + 消息 + 文件改动；无 checkpoint 时回退文件级）。
- P3 已完成：ordered approval rules（action/resource，last match wins）。
- P3 已完成：shell 命令扫描器（opt-in `policy.approval.readOnlyShell`；`git status` / `ls` /
  `cat` 等只读命令跳过审批，管道/重定向/命令替换/未知命令/写标志仍 `ask`；显式对象规则优先；
  设置页 Permissions 段可开关，TUI 与 `settings.ui.set`（Web/attach）共用同一持久化字段）。
  字符串类别规则（如 `shell.exec`）仍可被扫描器放宽；需要强制询问某条命令时使用
  `{ category: 'sandbox', resource: '...', action: 'ask' }` 对象规则。
- P3 已完成：LSP 只读诊断面板 `/check <file...>`（别名 `/lsp`）：复用 `tools.invoke` 调用
  `lsp_diagnostics`，TUI 走本地 ToolRegistry、Web/attach 走 gateway；错误/警告按
  `file:line:col` 展示，缺失 server 返回安装提示，工具异常不会中断其它文件。
- P3 已完成：LSP formatter hook `/format <file...> [--check]`（别名 `/fmt`）：新增
  `lsp_format` 工具（`textDocument/formatting` + 文本编辑应用），默认写回、`--check` 仅预览；
  写入属于文件变更（审批类别 `fs`，`tools.invoke` 走 workspace trust）。
  注意：`/format` 由控制台直接调用工具，不进入 turn 文件快照；需要可回退时先 `/snapshot`，
  或在 turn 内由 agent 调用 `lsp_format`（支持 `captureFileSnapshot`）。
- P3 已完成：`/highlights` 发布说明浮层（`/whatsnew` 别名）；`highlightsSeenVersion` 记录确认，
  下次版本升级自动展示一次；设置页 General 段可关闭（`highlights`），关闭后 `/highlights` 仍可手动打开。
- P3 已完成：turn undo/redo 持久化：新增 `AgentTurnHistoryEntity`（每会话一行，turn 边界 +
  redo 消息 + 文件快照栈）；`TurnHistoryController` 按会话懒加载/串行写回，`/undo`、`/redo`
  与文件级撤销在进程重启后仍可用；删除会话时同步清理历史行。测试覆盖真实 sqljs 文件库
  关闭/重开后的 `undo` + `redo`。
- 已知限制：`/format` 等控制台直调工具仍不进入 turn 文件快照（先 `/snapshot` 可回退）。
- P2 部分完成：`/queue move <n> <m>` 支持排队 prompt 重排；`/queue manage` 打开交互面板
  （编辑 / 上移 / 下移 / 删除，TUI 与 Web 共用同一 select overlay），边界有提示；
  拖动/批量操作仍待补（优先排队已由 `Ctrl+X Enter` 覆盖，见下）。
- 队列优先级（opencode 对齐）：`Ctrl+X Enter` 把当前草稿插到待执行队列**最前面**，
  不打断正在运行的 turn（与 Enter/Tab 的追加排队区分）；仅在 turn 运行中且草稿非空时生效，
  空闲时该 chord 不消费按键。`decodeGlobalKey` 现在把 CR/LF 解码为 `enter`，
  便于在 leader chord 中表达 Enter。
- `/sessions` 对话框：使用共享 `DialogComponent`（`@tsdi/components/common/dialog`）渲染，
  按当前项目/workspace 作用域列出会话（标题 + 相对时间 + 当前/archived/pinned 徽标），
  输入即过滤（标题/id/workspace/project/summary），Enter 切换、Esc 关闭；`/sessions <query>`
  预先过滤。输入框 slash/mention/参数子菜单与 pending question/确认仍保持 menu 弹层；
  `/theme`、`/provider` 等简单选择保持选择菜单，不升级为 dialog。
- `/sessions` 分组（opencode 风格）：按 Today / Yesterday / Previous 7 days / Older 插入
  不可选中的标题行（方向键/Enter 自动跳过），过滤后仍按组展示；时间戳为秒时先归一化，
  缺失时间落入 Older。
- Remote Agent Center（只读 v0）：工作区 `settings.json` 的 `remotes`
  （`{ name, url, token? }`，最多 10 个、名称去重、仅 http(s)）由共享设置存储在
  TUI/Web/attach 间同步；`/remotes` 并发探测各 gateway 的 `session.list`（5s 超时），
  选择后展示会话标题/消息数/相对时间快照，不提供切换/创建/取消等写操作；
  `/remotes add|remove` 维护配置，`/remotes <name>` 直接查看；token 仅用于请求，
  不会出现在对话框或提示中（URL 内嵌凭据会被掩码）。配置了远程中心时，`/work` 末尾追加
  单条 **Remote centers (N)** 入口，直接打开 `/remotes`（不在 Work 中逐网关探测）；
  `/work remote` 显式并发探测各 gateway，把 `gateway → sessions` 合并成只读树，选择会话显示
  id/标题/消息数/相对时间的快照（最多每 gateway 20 个会话）；`/work all` 把本地 delegation
  行与远程 gateway 行合并到同一棵树（本地在前），本地行仍可打开会话，远程行打开只读快照。
- 跨会话消息（agent teams v0）：`/msg [--wake] <session> <text>`，目标可用完整 id 或唯一前缀；
  默认 **append-only**（以 user 角色写入目标会话，带 `metadata.kind=cross-session/fromSessionId`，
  下次 turn 可见），`--wake` 经 gateway 立即在目标会话启动 turn。gateway 新增
  Web 侧栏新增 **Teams** 按钮直接打开 `/msg list`；`/msg list` 打开跨会话消息只读快照（gateway `session.message.list` 仅扫描调用者拥有的最新
  60 个会话、默认 50 条、最多 200 条），`session.message.send` 负责投递
  （所有权校验、文本 ≤20k），本地无 gateway 时仅 append。功能为
  **opt-in**：工作区设置 `crossSessionMessages`（默认 off，可在 `/settings → Agents` 切换），
  关闭时 `/msg` 只提示开启方式；投递的消息在目标 transcript 中以 `↩ <来源会话> ·` 标记，
  不会与用户自己的输入混淆。
- 会话导入：`/import <path>` 读取 `/export json|jsonl` 文件并在新会话中重建 transcript；
  gateway `session.import` 重新生成 message id/sequence（不覆盖现有会话），限制 2000 条消息、
  单条 200KB，仅接受 user/assistant/system/tool；本地（无 gateway）走 `appendRaw` 同一路径。
  文件不可读、无消息、无文件访问能力时分别给出可诊断提示。
- 会话删除：`/delete [sessionId] [confirm]` 永久删除会话（transcript + 行数据）；默认弹出
  确认对话框，取消不执行；删除当前会话后自动切到下一个可用会话，运行中的当前 turn 会先拒绝。
  失败（如数据库锁定）以错误提示返回，不伪装成功。
- 分享/导出：`/export html [sessionId] [path]` 生成独立只读 HTML artifact
  （所有消息/工具文本转义、无脚本、`prefers-color-scheme` 适配、默认写入
  `.tsdi-agent/exports/`）。Web/attach 的 gateway 仍返回 json，HTML 在客户端由
  `result.messages` 本地渲染，因此 TUI 与 Web 输出一致；无本地 FileAdapter 时只显示
  文件名与字节数的预览卡片。
- AMS P0 补充：`/agents default [name]` 读取/设置新会话默认代理档案，持久化 `defaultArchetype`
  并在 TUI/Web/attach 启动时恢复到 `policy.defaultArchetype`。
- AMS P1.2 部分完成：`/permissions rules` 查看有序审批规则，`add <tool|category>` /
  `add <ask|allow|deny> <category> [resource]` / `remove <n>` / `clear confirm`；规则写入
  `policy.approval.requireApproval` 并持久化 `approvalRequireApproval`，审批策略通过 live
  provider 立即生效（无需重建 manager）；空列表自动回退默认规则，避免重启后静默放开审批。
  per-session override 已落地：`/permissions session [<level>]`（设置页 Permissions 段同名列）
  只对当前 tab 生效，不写 workspace `securityLevel`；切换 tab 时重新应用该 tab 的覆盖或 workspace
  默认值，且保留 tab 自己的 plan mode。`/permissions level` 仍写 workspace 默认并清除当前 tab 覆盖。
  覆盖保存在进程内 tab 状态（不跨重启）；需要跨重启时使用 `/permissions level` 写入 workspace 默认。
- AMS P1.2 补充：设置页 Permissions 段新增 **Approval rules** 行，可图形化删除单条规则或重置默认；
  `Add rule` 现在走两步菜单（ask/allow/deny → sandbox/fs/network/mcp/skill），直接写入有序规则并持久化；
  需要 `resource`（路径/命令/URL 模式）时仍用 `/permissions rules add <action> <category> [resource]`。
- AMS P1.2 补充：`/permissions inspect <tool> [resource]` 已同时展示有序规则的最终匹配
  （action / 规则序号 / 规则描述），与 `DefaultApprovalStrategy` 的 last-match-wins 一致。
- P4 文档收尾：README 命令表、CHANGELOG Unreleased、`docs/manual-test-checklist.md`
  （PTY + Chrome + 数据安全场景）已更新。
- AMS P1.1 部分完成：`/work spawn --worktree[=name] [--profile <name>] <goal>` 会先创建/复用
  managed worktree，并把路径作为 `spawn_agent.workspace` 传给 worker；**不会切换父会话 workspace**
  （`activate:false`），已存在的同名 worktree 会复用；裸 `--worktree` 打开现有 worktree 选择菜单
  （含新建）。`NestedAgentRunner` 在 worker turn 前调用 `setSessionWorkspace`。任务行新增只读
  **Worker report**（summary/diff/completed/next steps/risks/artifacts），attach 复用 open session。
- P4 Web 预算：`build:web` 现在写出 `web/dist/size-report.json`，并与
  `web-size-baseline.json` 比较；initial raw/gzip 超过 3%（且 ≥16 KiB gzip / ≥64 KiB raw）
  直接失败。当前基线 initial **1830.0 KiB / gzip 473.9 KiB**（strict 预算通过）。`AGENT_UI_WEB_BUDGET_STRICT=1`
  额外强制 initial gzip ≤700 KiB、最大 lazy chunk gzip ≤150 KiB（当前通过）。
  1k 切换 p50/p95 预算已落地为 opt-in：`AGENT_UI_SWITCH_BUDGET=1` 运行
  `tab-switch-long-session.spec.ts` 时强制 p50 ≤120ms、p95 ≤200ms（本次实测 83/95ms）；
  测试墙钟提供 `AGENT_UI_TEST_WALL_BUDGET=<seconds>`（超时失败）；分片内存阈值提供
  `AGENT_UI_TEST_MEMORY_BUDGET_MB=<MiB>`：每个 worker/单进程在退出前采样峰值 RSS，
  超预算直接使该 shard 失败（本次单进程峰值 1844 MiB；预算 1 MiB 时退出码 1，用例仍全绿）。
- 测试隔离（2026-11-22）：修复 `defaultAgentOptions` 单例被注入后原地写入导致跨文件泄漏
  （provider wizard/模型切换改写 `options.model`）。`AgentModule` 改为每应用 factory 克隆
  （`cloneAgentOptions`），console bootstrap 与 web mount 也克隆可变子对象；新增
  `AGENT_UI_TEST_RANDOM_SEED=<n>` 单进程随机顺序运行器（seed 7/99 均 **2359 passing**）。
- P2 overlay 预算（2026-11-21）：`tab-switch-long-session.spec.ts` 新增对话框开合测量
  （4×1000 消息，24 选项，实际绘制 12 行），并断言每帧 ≤1 次渲染。实测 open
  p50 **71ms** / p90 **82ms**、close p90 **39ms**；`AGENT_UI_DIALOG_BUDGET=1` 以
  ≤120ms 作回归门禁。**计划目标 p90 ≤40ms 仍未达成**：整屏录制/绘制（docked overlay +
  shared chrome）是主成本，会话状态层 batch 实测无收益（已回退），下一步需要 renderer
  级 overlay 隔离。
- P3 opencode 对齐（本轮）：阻塞式菜单过滤从子串改为 **fuzzy + 排序**
  （`AgentConsoleFuzzy.ts`：exact > prefix > 词首 > 子串 > 子序列，label 命中优先于
  description；同分保持原顺序），`/theme` 输入 `drk` 可命中 `Dark theme`，
  `/sessions <query>` 复用同一评分；零匹配时选择菜单/会话对话框显示
  `No matches for "<filter>"`（共享 `select-list` 新增 `emptyText`，en/zh 面板文案）。
- P2 opencode 对齐（本轮）：TUI **桌面通知**落地。`ConsoleTerminalSurfaceLifecycle`
  新增 `notifyTerminal`（OSC 9）/`ringTerminalBell`（BEL），`runAgentConsole` 用共享
  `ReactiveEffect` 监听审批/待回答问题/turn 完成，按 `tui.json` 的
  `attention.notifications` 与 `attentionSound` 触发；环境变量
  `TSDI_AGENT_TUI_NOTIFICATIONS=1` 可开启。通知文本会剥离控制字节，避免工具名/模型输出
  注入终端转义序列。
