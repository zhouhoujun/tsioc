# OpenCode 对比分析与 agent 优化方案

日期：2026-11-23
对照源码：`~/workspace/opencode`，commit `bab0d0413f`（2026-11-22）
当前仓库：`packages/agents`，commit `d6578bab0`

> 目标不是把本仓库改写成 opencode，而是识别 opencode 2.3 在**会话执行模型、权限/快照、插件边界、协议与工程化**上的可借鉴点，在现有 IoC + TypeORM + 响应式 components 架构内做增量优化。

## 1. 执行摘要

当前 `packages/agents` 的功能广度已经接近甚至超过 opencode：多端 UI、OS 沙箱、workspace trust、LSP、审批规则、delegation、compaction recovery、PTY/DOM 门禁都是明显优势。真正的差距集中在五处结构性能力：

1. **会话工作模型**：我们的 queue/steer 主要在 UI 内存中；opencode 是持久化 inbox + step 边界 promotion + 执行 claim/resume。
2. **运行时与协议体量**：`DefaultAgentRuntime` 3505 行、`AppRpcServer` 3316 行、`AgentContextManager` 1996 行；opencode 用 session/runner/permission/tool 等服务拆分。
3. **数据库演进与并发**：我们生产库 `synchronize: true` 且无版本化 migration；turn lock 只在进程内，gateway 与 TUI 共用库时没有 DB 租约。
4. **通用权限与快照原语**：opencode 是 `{action, resource, effect}` wildcard 规则、content-addressed snapshot、message-level revert；我们仍以工具/分类规则、DB 内联文件快照为主。
5. **扩展与协议边界**：opencode 有 schema 生成的 HttpApi、typed plugin hooks、artifact provider；我们的 AppRpc method 列表/switch 手写，hooks 以命令为主。

建议顺序：**P0 数据/执行基础（migration + inbox + DB claim + runtime 拆解）→ P1 权限与回滚 → P2 artifacts/compaction/插件 → P3 协议与实时工具 → P4 性能/门禁**。不要先做 UI 或 provider 扩张。

## 2. 对照矩阵

| 维度 | 当前 `packages/agents` | opencode 2.3 | 判断 |
| --- | --- | --- | --- |
| 端与产品完整度 | TUI/DOM/Desktop/VS Code/SSH/channels 全栈 | TUI/web/desktop/Rust client | 我们更广 |
| 安全基线 | OS sandbox + workspace trust + approval | 规则 + 词法路径 + shell scanner，无 OS sandbox/trust | 我们更强，保留 |
| LSP | `lsp_diagnostics` / `lsp_format` / `/check` / `/format` | v2 已移除 LSP client | 我们更强 |
| 会话执行 | turn lock 内存队列，queue 在 UI 内存 | 持久 inbox + step 边界 steer + claim/resume | opencode 更强 |
| 会话存储 | TypeORM entities + `synchronize: true` | event-sourced + projector + 版本化 migration | opencode 更强 |
| Undo/revert | turn/file/git 三级，git step snapshot | shadow git tree + message-level revert stage/commit | opencode 更原子 |
| 权限 | category/name/resource + durable allow + scanner + session override | action/resource/effect wildcard + saved rules + unattended + corrected reply | opencode 更通用 |
| Snapshot | DB 内联 before/after + git stash commit | content-addressed shadow repo，per-path diff/restore | opencode 更省库、更细 |
| Artifacts | `/artifacts` 列表 | artifact provider + create/read/update/delete tools + URL | opencode 完整 |
| Compaction | 同步 summary + anchors + recoverDetail + quality | 后台 precompute + native window + per-model boundary | opencode 更成熟 |
| 工具扩展 | hooks + MCP/skills/plugins + 92 tools | typed tool transform + plugin hooks + Code Mode | opencode 更可扩展 |
| 协议 | 手写 JSON-RPC switch + 手写 capability 列表 | schema HttpApi + generated client + OpenAPI | opencode 更稳 |
| 实时工具 | 收完整响应后执行工具 | 工具调用随流到达即并发执行 | opencode 延迟更低 |
| 远程/机器 | gateway/attach/pairing/SSH/remote centers | Noise/iroh machine + Environment 抽象 | opencode 更通用；我们已够用 |
| 工程门禁 | source-size ratchet + PTY/DOM/metrics + DB integrity | lint-as-architecture + hermetic tests + storybook | 各有优势 |
| 测试体量 | agent-ui ~2396、agent ~1103、gateway ~412 | 1646 个 test 文件 | opencode 覆盖更细 |

## 3. 应保留的强项

- **OS 级沙箱 + workspace trust**：opencode 没有；不要为了“对齐”删掉。
- **共享 TUI/DOM 渲染与响应式约束**：一套 presenter/template，两端不漂移；opencode TUI 与 session-ui 是两套。
- **审批体系**：pending queue、durable allow、ordered rules、scanner、auto-review、per-session override、审计；继续演进而不是重写。
- **运行时韧性**：空响应重试、流式降级、tool pairing repair、falsification/verification、evidence ledger、token budget、loop detector、turn-aware context。
- **项目/线程/委派模型**：projectId/thread/role/fork/delegation 持久化，跨重启恢复；opencode 的 project/location 更偏“多机器”，我们更偏“多会话协作”。
- **工程纪律**：source-size ratchet、production-db-integrity、真实 PTY、DOM/TUI 指标基线；opencode 反而有大文件与 lint 复杂性问题。

## 4. 关键差距（按影响排序）

### G1. 会话工作模型仍是“进程内”

现状：
- `AgentConsoleQueuedPrompts` / `AgentConsoleRpcCommands` 的 queue 在 `Map` 内存中；重启丢失。
- `DefaultAgentRuntime.acquireSessionTurnLock` 是进程内 `Map`；gateway + in-process TUI 同库时没有 DB 级互斥。
- steer 只在 turn 之间：`submitView` 中断整个 turn；没有 opencode 的 step 边界 promotion（steer vs queued input）。

影响：崩溃/重连/多宿主会丢排队输入；长 turn 中 steer 粒度过粗；无法可靠恢复“正在执行”的 claim。

### G2. 数据库演进与并发基础不足

- `orm.module.ts` 生产/测试均 `synchronize: true`，没有 migration journal。新增 inbox/snapshot/artifact 实体前必须先补版本化迁移。
- `TypeOrmSessionStore.get()` 读取整段 transcript；搜索最多扫 2000 session；大库/长会话成本高。
- 没有 DB 级 session lease/lock，多进程写入存在交错风险。

### G3. 运行时与协议 god object

- `DefaultAgentRuntime.ts` 3505 行，`completeTurn` 与 `completeStreamingTurn` 两套近似 turn loop。
- `AppRpcServer.ts` 3316 行，单 switch ~150 method；`capabilities.ts` 手动维护 method union，测试靠手改 count（154）。
- `AgentContextManager.ts` 1996 行；`AgentConsoleComponent.ts` 1499（已顶到 ratchet 上限）。
- 结果：每次跨功能改动都要碰巨型文件，回归面大，新人难定位。

### G4. 权限规则不够通用

现状：`ApprovalRuleObject` 以 `category + names + resource + action` 为主；覆盖 sandbox/fs/network/mcp/skill。opencode 的规则直接作用于 `action`（tool name、`read`、`edit`、`external_directory`、`provider.use`…）+ `resource`，任意通配、last-match；支持 saved rules、unattended、reject feedback。

差距：
- 无法用同一条规则表达“允许 `read` 某目录但禁止 `edit` 某文件”这类跨工具资源策略；
- 没有“拒绝并说明原因，模型可继续修正”的 corrected reply；
- 没有无人在场（automation/background）时的显式 unattended ruleset。

### G5. Snapshot / revert 不够原子

- `FileSnapshotStore` 把 before/after 内容内联进 `AgentTurnHistoryEntity`（DB 体积随编辑增长）。
- `GitStepSnapshotStore` 依赖 git，整树 revert，非 git workspace 只有内存文件快照。
- 没有 opencode 的 message-level `revert.stage/clear/commit` 语义；`/undo` 仍是 turn/file 两级近似。

### G6. Artifacts 只有“列表”，没有“产物”

`/artifacts` 目前汇总文件改动与 worker report；opencode 有 `artifact_create/read/update/delete` 工具、local/web provider、稳定 URL 和 Web 页面。对于“把 run 产出发布成可交互页面”的场景，我们还缺一层。

### G7. Compaction 是同步、单层 summary

已有 anchors、tool-pair 修复、recoverDetail、quality score；但缺少：
- 接近阈值时的后台 summary precompute；
- provider-native compaction window 的存储与按模型重放；
- 溢出后的 shrink 阶梯与 cache 生命周期感知。

### G8. 插件/工具扩展是“命令 hook”，不是“工具变换”

`AgentHooks` 支持 before/afterTurn、before/afterTool（可改 input/deny）、approval、compaction，但：
- 不能在运行时 add/hide/rename tool（plugin 能力弱）；
- 没有 permission.evaluate / model.request / http.request / retry hook；
- 没有 per-plugin revision/config observer。

### G9. 流式工具延迟

`collectStreamingResponse` 收完整 response 后才 `handleModelResponse`/`executeTools`。opencode 在 tool-call 事件到达时即 fork 工具，模型继续输出后续内容；长工具调用场景首字节/完成时间更优。

### G10. 协议契约靠手写

`AGENT_APP_RPC_METHODS`、`capabilities.ts`、`AppRpcServer` switch、REST handlers 是多份手写列表；最近新增 `session.approval_rules.*` 时需要同步 method union/测试 count。opencode 用 schema group 生成 client/OpenAPI，天然防漂移。

### G11. 测试与构建

- PTY 用例在负载下偶发超时（本轮已出现一次，复跑通过）。
- `unit.ts` 分组按内存自适应，但全量仍受宿主影响。
- Web initial gzip ~537 KiB；ioc ESM cycle 阻止真正的 lazy chunks。
- 没有 opencode 的 storybook/headless TUI driver 那类视觉/交互回归设施。

## 5. 优化方案

### P0 — 数据与执行基础（2–3 周，最高优先）

**P0.1 版本化数据库迁移（已落地基础版 2026-11-23）**
- 新增 `agent/src/memory/migrations/`：
  - `MigrationRunner`：`migration` journal 表（id, appliedAt），事务内执行；
  - 基线迁移：从现有 16 个实体生成初始 schema；
  - 生产库 `synchronize:false`，测试仍可用 `synchronize:true` 或跑同一迁移；
  - 启动前只读检测 + 备份提示，禁止自动覆盖旧库。
- 状态：`AgentMigrationRunner` 已落地基线（新库建 schema、旧 synchronize 库保留数据并记基线、
  非 agent 库拒绝启动）；生产路径改为 `synchronize:false + initDb`，测试仍可显式 synchronize。
- 验收：旧库升级/关闭/重启数据完整；新增实体只通过 migration；生产库 integrity 门禁仍通过。

**P0.2 持久化 Session Inbox + DB turn claim（Inbox 基础版已落地 2026-11-23）**
- 新实体 `AgentSessionInboxEntity`：`sessionId, itemId, kind(user|steer|command), payload, state(queued|steering|consumed|cancelled), seq, createdAt`。
- 新 `SessionInboxController`（`agent/src/runtime`）：
  - `admit`（幂等，按 client message id）；
  - `promote(sessionId, 'steer'|'input')` 在 **step 边界**消费；
  - `list/cancel/update`；
  - 与 `AgentRuntime` 事件/`run.turn_stream` 集成。
- DB 级 turn lease：`AgentSessionEntity.activeTurnOwner/leaseUntil` 或独立 `AgentSessionLeaseEntity`；SQLite 事务内抢占；超时/进程死亡可恢复；兼容现有 `acquireSessionTurnLock`。
- UI：`/queue` 改为优先走 `session.inbox.*` RPC，内存 Map 仅作降级；TUI/DOM 一致。
- 状态：`AgentSessionInboxEntity` + `agent_migration 0002`、`session.inbox.get/replace` RPC、
  runtime/runtime store 透传、UI queue write-through 与打开会话时恢复已落地；
  DB 级 turn lease 已落地（`agent_session_lease` + heartbeat + ref-count，多进程互斥）；
  step 边界 steer promotion 已落地（`takeInboxItem` + loop 顶部 promote + `/steer <text>`）；
  queued user 仍在 turn 结束后由 UI drain（与 opencode 的 idle 边界一致）。
- 验收：queue 重启不丢；steer 在 step 边界生效；双进程同 session 只有一个执行者；AppRpc + TUI/DOM + PTY 回归。

**P0.3 运行时拆解（已完成 2026-11-24，行为不变）**
- 以现有 `TurnHistoryController` 为模板，新建：
  - `TurnLoopController`（统一 non-stream/stream 的 round 状态机）；
  - `TurnToolController`（parallel/sequential、approval、hooks、snapshot、compensation）；
  - `TurnContextController`（buildModelRequest/history/memory/system prompt）；
  - `TurnCompactionController`（maybeSummarize/compactNow/recoverDetail）；
  - `TurnRecoveryController`（empty-response、loop、termination、token budget）。
- `DefaultAgentRuntime` 只保留 facade/事件/公共 API，目标 < 1500 行；每步同提交下调 baseline。
- 验收：现有 1103 agent tests 全绿；无行为 diff；source-size 下降。
- 状态：目标已达成。新增 `TurnLoopController`（统一 non-stream/stream）、`TurnStreamCollector`、
  `TurnToolBatchController`、`TurnRequestController`、`TurnAssistantController`、`TurnTerminationController`、
  `TurnRecoveryController`、`TurnObservabilityController`、`SessionPostTurnController`、`SessionSnapshotController`、
  `PolicyResolutionController`、`HookController`、`SessionModeController`、`DelegationSessionController`、
  `SessionGoalController`、`WorkspaceRootController`、`TurnCompensationController` 等；
  `DefaultAgentRuntime` 从 3506 行降至 **1471 行**（baseline 同提交下调），agent 测试 **1124 passing**。

**P0.4 协议契约单一来源（新方法已落地 descriptor 2026-11-24）**
- 新 `agent-gateway/src/app-rpc/contracts.ts`：每 method 一个 descriptor `{params?, result?, capability?, handler}`；
- 由 descriptor 生成 `AGENT_APP_RPC_METHODS`/typed client/`capabilities`，`AppRpcServer` 用 handler map 调度；
- contract test 校验：每个 capability 有 handler、每个 handler 有 capability、REST/WS 关键面覆盖；
- 先覆盖新增方法，旧 switch 可逐步迁移。
- 验收：新增 method 不再需要手改 union/count；`app.capabilities` 与 dispatch 一致。
- 状态：新增 `app-rpc/rpc-contracts.ts`：`{ method, description, handler }` descriptor 注册表；
  `AGENT_RPC_CONTRACT_METHOD_IDS` 以字面量元组并入 `AGENT_APP_RPC_METHODS`（保持 typed client 收窄），
  `AppRpcServer.dispatch` 先查 contract 再走旧 switch；`permission.rules.list`、`artifact.list/get`
  已迁移，contract 测试校验 capability 唯一性/handler 行为。**剩余**：把旧 switch 方法逐步迁入 descriptor，
  并由 descriptor 生成 JSON Schema/OpenAPI/client 类型。

### P1 — 安全、权限与回滚（2–3 周）

**P1.1 Permission v3（核心已落地 2026-11-24；保留现有 UI/队列）**
- 新 `agent/src/permissions/PermissionEngine.ts`：
  - `Rule {action, resource, effect}`，`Wildcard.match`，last-match-wins；
  - 层：default → workspace → session → agent → saved；
  - 与现有 `ApprovalStrategy` 适配：category/name 规则编译成 action/resource；
  - `deny` 为 hard floor；保留 durable allow/scanner/auto-review。
- 动作覆盖：tool name + `read`/`edit`/`external_directory`/`shell`/`skill`/`mcp`/`provider.use`。
- 增加：reject 可带用户反馈（corrected error），无人在场 `Unattended` ruleset，`always` 保存到 `permission_saved`。
- UI：`/permissions inspect` 显示匹配规则/层；审批弹窗支持“拒绝并说明”。
- 验收：规则表驱动单测；TUI/Web 一致；现有 allow/deny 行为不回归；OS sandbox/trust 保留。
- 状态：`permissions/PermissionEngine.ts` 已落地（action+resource→effect、wildcard、五层、
  deny hard floor、legacy 规则编译、live workspace/session/saved 层）；`DefaultApprovalStrategy` 接入引擎；
  durable allow 即 saved 层；reject 支持 feedback 并写入工具错误；RPC `permission.rules.list` 返回规则与命中层；
  `/permissions inspect` 展示 V3 规则数量/命中。**剩余**：archetype allow/deny 编译到 agent 层（当前仍由 archetype 工具闸门执行）。
  审批弹窗“拒绝并说明”已落地：大写 `D`（或弹窗 “Deny with a note” 选项）把焦点交给 composer，
  Enter 提交时带 note 调用 `approval.reject(requestId, feedback)`，工具错误显示该说明，
  其余 pending approval 仍在时重新聚焦弹窗；空 Enter 等价于普通拒绝。
  `Unattended` ruleset 已落地：`policy.approval.unattended = 'deny' | 'allow'`，审批管理器在无人值守时
  立即返回并发布 completed 事件（不进入 pending）；`/permissions unattended [deny|allow|off]` 写入运行
  options 并持久化到 workspace `settings.json`（web/attach 经 `settings.ui.set`，本地 TUI 走同一设置存储）。

**P1.2 Snapshot v2 + message-level revert（非 git 路径已落地 2026-11-24）**
- 新 `ContentAddressedSnapshotStore`：
  - 优先 shadow git（复用 `GitStepSnapshotStore` 思路），非 git 用 manifest + 文件 hash；
  - 目录 `.tsdi-agent/snapshots/<project|session>/<id>/manifest.json`，content-addressed blobs；
  - `capture/diff/files/restore(paths)`；
  - assistant message 记录 `snapshot.start/end`；不再把大段 before/after 内联进 DB。
- RPC：`session.revert.stage/clear/commit`；`/undo` 映射 stage+restore prompt，`/redo` clear；保留现有 turn/file 语义作为降级。
- 验收：非 git workspace 可恢复；只恢复选定路径；数据库体积不随编辑线性增长；PTY/JSDOM 回归。
- 状态：新增 `ContentAddressedSnapshotStore`：内容按 hash 存于
  `<workspace>/.tsdi-agent/snapshots/blobs/<hash>`，每轮写
  `<snapshot session>/<message>.json` manifest（文件路径 + before/after hash，不再内联正文）；
  `SessionSnapshotController` 在 turn 结束提交 manifest，并在无 git / git 失败时把
  `list/diff/revert/unrevert` 回退到内容快照，复用现有 `session.git_snapshot.*` RPC 与 UI。
  **剩余**：`/undo` 映射到 stage+restore prompt。跨进程 last-revert 已落地：revert 时在
  `<workspace>/.tsdi-agent/snapshots/<session>/last-revert.json` 写 marker，`unrevert` 在新进程里
  从磁盘恢复目标 message id。
  三阶段 RPC 已落地：`session.revert.stage`（返回将恢复的文件列表，优先读 content manifest；支持
  `paths` 只选择部分文件）、`session.revert.clear`、`session.revert.commit`（应用已 stage 的
  message revert；带 `paths` 时走 content-addressed 局部恢复）。

### P2 — 产物、压缩与扩展（2–3 周）

**P2.1 Artifact v1（核心已落地 2026-11-24）**
- 新 `agent/src/artifacts/`：
  - `ArtifactProvider`（local 默认，后续 web）；
  - 文件存 `.tsdi-agent/artifacts/<id>/`，`manifest.json`（title/entry/files/mime）；
  - tools：`artifact_create/read/update/delete`（带 permission action `artifact`）；
  - gateway：`GET /artifacts/<id>`（鉴权/端口），RPC `artifact.list/get`；
  - Web 页面内嵌 iframe；TUI `/artifacts` 显示 URL/ID。
- 验收：agent 生成 HTML 产物并可打开/更新；权限/租户隔离；现有 `/artifacts` 列表兼容。
- 状态：`agent/src/artifacts/ArtifactStore.ts`（`.tsdi-agent/artifacts/<id>/manifest.json` + 文件，
  entry/mime/路径穿越校验）；`@tsdi/agent-tools` 新增 `artifact_create/read/update/delete` 工具并注册；
  runtime `listArtifacts/getArtifact`；RPC `artifact.list/get`（带 session 访问校验）；`/artifacts`
  展示已发布产物 ID。**剩余**：Web iframe 内嵌展示（HTTP 文件服务已落地：`GET /artifacts/:sessionId/:id/*path`，
带会话归属校验、`text/html` 等 MIME、nosniff 与 CSP sandbox；工具返回的 URL 已带 sessionId）。

**P2.2 Compaction v2（后台 precompute 已落地 2026-11-24）**
- 后台 precompute：接近阈值时启动 summary fiber，记录失败次数/有效期；下一 step 直接采用。
- native window：adapter 支持时保存 provider-native compaction；按 model 重放，避免跨模型污染。
- shrink 阶梯：overflow 后按比例缩小 keep/buffer；缓存前缀感知。
- 验收：长会话不阻塞；summary 质量/成本指标；overflow 恢复；现有 anchors/recoverDetail 不回归。
- 状态：turn 结束后若接近 compaction 阈值，`AgentContextManager.precomputeCompaction` 在后台启动
  compactable prefix 的 summary（不阻塞 turn）；压缩时仅当缓存 message ids 仍是当前 oldMessages 的
  **前缀**才复用，并只对新增 suffix 追加 summary（incremental），失败/过期自动回退完整 summary。
  现有 light/medium/deep 分级与 deep `aggressivePrune` 保留（shrink 阶梯基础）。
  **剩余**：provider-native compaction window、按比例的 keep/buffer shrink 调优。

**P2.3 工具变换与插件 hooks（工具变换已落地 2026-11-24）**
- 扩展 `AgentHooks` 域：`tool.execute.before/after`、`permission.evaluate`、`model.request/response/retry`、`config.observe`；
- `ToolRegistry.transform(editor)`：add/hide/rename/namespace，带 revision；session snapshot 与 prompt cache 兼容；
- 插件 manifest 声明 hooks/tools/config，支持 per-workspace enable/disable；保留 command/http/mcp 传输。
- 验收：插件可新增/隐藏工具；工具权限/审批仍生效；配置热更新不丢会话。
- 状态：`ToolRegistry.transform(editor)` 已落地（`add`/`hide`/`rename`/`namespace`，单调 `transformRevision`
  供 prompt cache/会话快照失效）；`LocalToolRegistry` 按 expose 名称生成定义，`invoke/activateTool/isToolActive`
  解析 expose→raw，默认无变换时行为不变。**剩余**：插件配置热更新（config.observe 已能观察模型配置）与跨进程插件工具注册表（`toolsAdd` 目前由代码插件提供）。
  插件 manifest 已落地：`AgentPluginManifest`（hooks/tools hide|rename|namespace/config）、`PluginRegistry`、
  `PluginController` 读取 `<workspace>/.tsdi-agent/plugins.json`、`plugin.list` / `plugin.set_enabled` RPC
  与 `/plugins [enable|disable <id>]`；启停会重建 hook manager 并重新应用工具变换。
  钩子域已落地：`tool.execute.before/after`、`permission.evaluate` 作为 beforeTool/afterTool/onApproval 别名，
  `model.request` / `model.response` 在每次模型调用前后触发（观察型，可写 transcript），
  `config.observe` 在运行时模型配置变更时触发；`model.retry` 仍未接入重试点。

### P3 — 实时执行与协议平台（2 周）

**P3.1 流式工具执行（live 启动已落地 2026-11-24）**
- 将 `collectStreamingResponse` 产出的完整 tool-call 交给 `LiveToolScheduler`：
  - 每个 call 独立 fiber/Promise，按 `toolCallId` 归并；
  - approval/parallel-safe/read-only 规则先判定；
  - 模型继续流式输出；完成事件按原序持久化；
  - 每 call 支持 cooperative cancel（AbortSignal）。
- 验收：长工具调用首完成时间下降；事件顺序/审批/取消无回归；PTY/SSE 测试。
- 状态：新增 `LiveToolScheduler`：流式响应中一旦收到完整 tool_call，就提前启动 **read-only 或
  parallel-safe** 调用（审批/取消仍走同一 preflight），批处理按原顺序 await 这些 promise 并持久化，
  顺序/审批语义不变；测试用一个先 yield tool_call、后放行 done 的 adapter 验证工具在 stream 结束前已执行。
  **剩余**：模型继续输出期间的完整 “fiber” 并发调度与事件乱序持久化策略（当前仍按批归并）。

**P3.2 协议生成/版本化（descriptor schema 已落地 2026-11-24）**
- 用 P0.4 descriptor 生成 JSON Schema/OpenAPI 与 typed client；加入 `protocolVersion` 与兼容性测试；
- SSE/WS 事件契约纳入同一 schema；客户端未知字段容错。
- 验收：client 与 server 方法集合一致；breaking change 由测试拦截。
- 状态：descriptor 增加 `paramsSchema`/`resultSchema`，`buildAgentRpcContractSchemas()` 生成
  `contractVersion: 1` 的 method → `{description, params, result}` 表，随 `app.capabilities`
  以 `contractSchemas` 下发（`protocolVersion` 保持 1 兼容）；contract 测试校验每个 schema、
  required 字段存在、typed client 方法集合一致，并覆盖未知字段前向兼容。**剩余**：由同一 descriptor
  生成 OpenAPI/JSON Schema 文件、旧 switch 方法迁入。

**P3.3 远程环境（Environment 抽象已落地 2026-11-24）**
- 借鉴 Environment 抽象，把 files/exec/shell 抽象为 local/remote；
- 复用现有 gateway/attach/SSH/remote centers，不引入 Noise/iroh 全套；
- 验收：一个会话可指定 remote workspace，工具/审批/快照语义一致。
- 状态：新增 `AgentEnvironment`（`local`/`remote`）与 `LocalEnvironment`（FileAdapter + child process）、
  `createRemoteEnvironment(transport)`；runtime 将 `options.environment`（默认本地 workspace）注入
  tool context，第三方/远程工具可直接使用。现有 ACP 远程 IO 仍走 `AgentIoPort`。
  内置工具：`read_file`/`write_file` 已通过 `AgentIoPort.remote` 走远程 IO；`terminal` 始终走
  `AgentIoPort.runCommand`；`list_dir` 在 `context.environment.kind === 'remote'` 时走 environment
  `list`；`mkdir`/`delete_file` 走 `mkdir`/`remove`；`copy_file` 走 read/write，`move_file`
  走 `rename`（无 rename 时 read/write/remove）。SSH transport 已落地
  （`createSshEnvironment`：cat/base64 写入/find/mkdir/mv/rm + exec 透传）。
  **剩余**：gateway/ACP 的 environment transport 对接（ACP 已用 `AgentIoPort`）。

### P4 — 性能、UI 与门禁（1–2 周）

- 打破 `@tsdi/ioc` ESM cycle，按 settings/review/LSP/voice 做真正 lazy chunks；initial gzip 目标 ≤500 KiB。
  - 状态（2026-11-24）：initial gzip 从 **558.5 → 483.0 KiB**，build-web 现在**无条件**执行
    ≤500 KiB / lazy chunk ≤150 KiB 预算（超限时提示“改为 lazy chunk，不要删除功能”）；
    `AgentConsoleDiagnosticsHost` 的 `/voice` 已改为动态 `import()`（voice 模块不再静态进入首屏 graph）；
    `@tsdi/ioc` 内部大量类型引用改为 `import type`，`InvocationFactory` 拆到独立模块，并在 web build
    中把 ioc 自身的 AOT helper 自引用（`@tsdi/ioc`）改写为相对 `metadata/precompiled`，消除了
    `ModuleRef extends Injector` 的首个求值顺序错误。**真正 code-splitting 仍被
    `components/html` 编译器模块的类继承求值顺序卡住**（splitting 冒烟测试在
    `HtmlTemplateParser`/`at extends yt` 处报 `Class extends value undefined`）。通过给 web build
    增加一个 `web/framework-entry.ts`（先导入 ioc/components/common/html）作为第二个 esbuild entry，
    让共享 chunk 按框架优先的顺序求值，`splitting:true` 已可安全启用：主入口首屏 gzip **477.5 KiB**，
    组件渲染器/html/json/xml 与 `/voice` 共 8 个 lazy chunk（最大 116.4 KiB gzip，≤150 KiB 预算）。
    `/voice` 仍由独立 ESM chunk 按需加载；TUI/测试通过 `installVoiceHandlers()` 注入。
- 状态（2026-11-24）：`PermissionEngine` 支持动态 layer provider，runtime 将当前 archetype 的
  `permissions.deny` 编译为 `agent` 层 deny 规则（hard floor，session/saved allow 不能绕过）；
  descriptor 生成 JSON Schema 文档 `buildAgentRpcJsonSchema()`，`GET /rpc-schema.json` 与
  OpenAPI 的 `x-rpc-contracts` 同步下发。
- 减少 `as any`/ctx bag：为 host factories 定义窄接口，逐步消除 147 处 `as any`。
- TUI storybook/headless frame capture：
  - 状态：新增 `test/tui-storybook.spec.ts`，用真实 TUI renderer 渲染 console，输出定宽 plain rows
    并断言关键内容/宽度，可在无终端环境审阅界面帧。把 PTY 超时用例改为可重试/隔离。
- 测试内存/墙钟预算写入 gate；source-size baseline 继续下降。
  - 状态：`scripts/test-budget-baseline.json` + `run_npm_test` 记录墙钟并超预算即失败
    （agent 900s / agent-ui 1200s / gateway·tools 600s 等，实测 gateway 63s），并用
    `/usr/bin/time -f '%M'` 采集峰值 RSS、按 `scripts/test-rss-budget-mb.json` 超限失败；
    source-size baseline 已随各次拆解持续下调。

## 6. 快速收益（1–3 天/项）

1. **协议覆盖测试**：扫描 capability 与 handler，先不加功能也能防新增 method 漂移。
2. **DB migration 骨架**：先只读比对 schema，不切换 `synchronize`，为 P0.1 铺路。
3. **Agent 自管理工具**：`session_rename/move`、`worktree_create/list/remove`、`models_search`、MCP resources/events（复用现有 RPC/命令），可直接提升 agent 自主性。
4. **Message-level revert 原型**：现有 `GitStepSnapshotStore` + `SessionStore.truncateMessages` 已具备 80% 能力。
5. **`/artifacts` 增强**：`--json`/复制路径/导出静态 HTML，先不等 provider。

## 7. 不建议做

- 不把 IoC/TypeORM 替换为 Effect/Drizzle/Bun；迁移成本远大于收益。
- 不删除 OS sandbox/workspace trust/LSP 去“对齐” opencode。
- 不为了 plugin 热更新引入全量 Effect Layer/RcMap 生命周期模型；用现有 IoC + revision 注册表即可。
- 不在没有真实 TUI/流式 A/B 的情况下改 `reactive.ts`/`effect.ts` 热路径。
- 不重写协议 transport；先统一 contract 来源。

## 8. 验收与门禁

每个阶段必须满足：

- 新逻辑落新文件（<600 行）；触碰 baseline 文件同提交下调；
- `agent`/`agent-tools`/`agent-gateway`/`agent-ui` 相关包全量测试 + tsc；
- 真实边界：AppRpc stream、TypeORM migration、TUI/DOM、PTY、生产库完整性；
- 性能改动（streaming tools、compaction、snapshot）必须有真实长会话/1k 消息 A/B；
- 不删除/降级现有功能；弹窗/命令契约变更同步修测试；
- `git diff --check`、source-size、metrics regression 全绿。

## 9. 推荐顺序（一张表）

| 顺序 | 项 | 价值 | 风险 | 依赖 |
| --- | --- | --- | --- | --- |
| 1 | DB migrations | 防数据损坏 | 中 | 无 |
| 2 | Session inbox + DB lease | 恢复/steer/多进程 | 高 | migrations |
| 3 | Runtime 拆解 | 可维护性 | 中 | 无 |
| 4 | Permission v3 | 安全表达力 | 中 | 无 |
| 5 | Snapshot v2 + revert | 回滚可靠性 | 高 | migrations |
| 6 | Artifact v1 | 产物发布 | 中 | migrations |
| 7 | Compaction v2 | 长会话成本 | 中 | runtime 拆解 |
| 8 | Plugin/tool transform | 扩展性 | 中 | runtime 拆解 |
| 9 | Streaming tools | 延迟 | 高 | runtime 拆解 |
| 10 | Protocol codegen | 漂移/客户端 | 中 | P0.4 |
| 11 | Lazy chunks/UI polish | 首屏/体验 | 低 | ioc cycle |

## 10. 结论

当前 agent 的竞争力在“**完整产品 + 安全 + 多端 + 韧性**”，opencode 的竞争力在“**持久执行语义 + 通用原语 + 可扩展协议**”。最划算的路线不是追新架构，而是先把我们已有的强项（IoC、TypeORM、响应式 UI、审批/沙箱）补上三个基础能力：**版本化数据、持久 inbox/lease、运行时拆解**；随后用通用 permission/snapshot/artifact 原语替换局部补丁。这样既能吸收 opencode 的结构优势，又不会破坏当前已经验证过的 TUI/DOM/PTY 行为。
