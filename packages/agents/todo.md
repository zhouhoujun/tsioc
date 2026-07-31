# Agents 后续打磨清单

## 结论

主干能力已齐。此前列出的 P0 语义问题已在 `9c8459fcc`（Fix agents orchestration semantics）及后续 commit 中修复并有测试覆盖；P1 的归属口径、标注持久化、代表项选择也已基本统一。剩余主要是 P2 的持久化边界、跨会话聚合视图与 dashboard 补强，以及少量运行时行为修正。

## 已经完成（含验证依据）

- 上下文压缩与状态展示
- `parallel_spawn` / `orchestrate` 的基础 DAG 编排
- Diff Review UI 的主流程
- `/projects`、`/toolruns` 等面板入口
- review 标注的 best-effort 记忆恢复

### P0（已修复 + 测试覆盖）

- `DefaultApprovalAdapter` 匹配逻辑已修正：`pendingRequests(sessionId)` 按 `sessionId` 过滤，`cancelRequest(toolName, sessionId)` 按 `toolName + sessionId` 匹配。测试：`default approval adapter scopes requests by session`（agent-tools `tools.spec.ts`）。
- `/api/sessions/running` 已是真 running 语义：`SessionHandler` 用 `activeSessionIds` 跟踪 `AgentTurnStartedEvent` / `AgentTurnCompletedEvent` / `AgentErrorEvent`。测试：`lists only actively running sessions`（agent-gateway `gateway-server.spec.ts`，62 passing）。
- `orchestrate` 已真正消费 `maxTurns`（透传进 `SpawnAgentInput`），依赖失败有严格 skip 语义（`status !== 'completed'` → `skipped` + 原因）。测试：`orchestrate skips dependent tasks after failure and forwards maxTurns`、`lightweight agent runner continues until report or maxTurns`。

### P1（已基本统一）

- project/thread 归属模型已统一：`SessionStore`（抽象 + InMemory + TypeOrm）、`SessionInfo` 契约、UI `AgentConsoleSessionService`、CLI `cli.ts` 使用同一组字段（`projectKey / projectId / primaryThreadId / sessionRole / rootRequest / focusSummary`）与同一解析优先级。
- review annotation 已按 session memory 持久化：`AppRpcServer` 提供 `review_annotations.save/load`，`runtime.putMemory(..., 'session')` 落库，并按 appRpc 实例隔离易变缓存。
- 代表项选择已按活跃度对齐：项目索引、CLI 项目标签、console 分组统一按 `lastActiveAt` / 最新活跃 session 排序。

## 还需要继续打磨

### P2

- `todo` 持久化注入链已验证并修复：`TodoStore` 构造改为 `@Optional() @Inject(MemoryStore)`（抽象 token 不能靠 `design:paramtypes` 类型注入，resolver.ts 对 abstract 类型直接 UNRESOLVED，必须显式 `@Inject`，与 `LocalToolRegistry` 的 `@Optional() @Inject(ToolActivationStore)` 模式一致）；`agent.module.ts` 的 `{ provide: MemoryStore, useExisting: DefaultMemoryStore }` 补上 `asDefault: true`（默认提供语义，同文件 SandboxExecutor/AgentMemoryRetriever/AgentRuntime 一致）。行为验证：容器装配后 `TodoTool.store === 容器 TodoStore`、`memoryStore` 注入 `DefaultMemoryStore`、`invoke` 后 `agent.todo.plan` 落 memory、新 `TodoStore(memory)` 可回读。全量回归：agent 245 / agent-tools 184 / agent-gateway 62 / agent-ui 183 / agent-cli 26 passing。
- `/projects` 和 `/search` 还能继续补跨会话聚合视图（当前搜索只覆盖已加载 session 的元数据，未覆盖消息内容）→ 已完成：`SessionStore.search` 抽象实现按消息内容检索（`InMemorySessionStore`/`TypeOrmSessionStore`），gateway `session.search` RPC（`AppRpcServer`，按 principalId 过滤）+ UI `searchSessionContent` 兜底，含 `session-search.spec.ts` 测试（`17db3315b`）。
- dashboard 的任务历史、取消、统计和实时刷新还能继续补强（实时刷新已由 `notify()` 覆盖；统计已加 dashboard 的 `runs/ok/fail/success%/avg` 行；缺取消运行中工具的运行时机制 —— 需在设计层面引入 turn 循环的中断/abort 信号）→ 已实现：`AgentRuntime.cancelTurn` + `ModelRequest.signal` + gateway `run.cancel` + UI `/cancel`，含 `turn-cancel.spec.ts` 测试。
- `/api/sessions/running` 的 `onError` 清理路径已复核：`AgentErrorEvent` 处理器同样执行 `activeSessionIds.delete(sessionId)`，错误中断不会残留 running 状态。

### 运行时行为

- ~~`LightweightAgentRunner` 未显式传 `maxTurns` 时默认只跑 1 轮，与工具 schema 声明的 `default: 10` 不一致~~ → 已修复：默认 10（`DEFAULT_MAX_TURNS`），新增回归测试 `lightweight agent runner defaults to documented turn budget when maxTurns is not provided`。

## 建议顺序

1. ~~验证 `todo` 持久化的生产注入链（`agent-tools.module.ts` / provider 装配）~~ → 已完成：`@Inject(MemoryStore)` + `asDefault: true`，全量回归通过
2. ~~`/search` 跨会话聚合（含消息内容检索）~~ → 已完成：agent 侧 `SessionStore.search` 按消息内容检索 + gateway `session.search` RPC + UI 兜底（`17db3315b`）
3. ~~dashboard 补强：运行中工具的取消（需先设计运行时 abort 机制）~~ → 已完成：turn 级取消贯穿 runtime / gateway / UI（`1f3e3873e`）
4. ~~需要时再做 `/toolruns` 面板（当前 `showToolRunsPanel` 为 `false`，列表入口在 `/toolruns` 命令）~~ → 已完成：`showToolRunsPanel` 改为 `state.toolRunsFocused`；`/toolruns` 命令镜像 `/tools` 打开面板；面板模板渲染摘要 + 窗口化列表（选中 `›` 标记）+ 选中 run 详情；state 新增 `selectedToolRunIndex` + 移动/首页/末页方法 + `toolRunsFocused` 键盘分支（up/down/pageup/pagedown/home/end/copy/esc）；`upsertToolRun` clamp 选中索引；`toolRunsHint` option；console-renderer 测试 185 passing

## 新一轮打磨（已完成）

### P3 运行时语义修正

1. ~~会话删除残留 memory~~ → 已完成：`MemoryStore.deleteBySession(sessionId)` 抽象 + `InMemoryMemoryStore` / `TypeOrmMemoryStore` / `DefaultMemoryStore` 实现（只删 session 作用域，保留 global 共享记录）；`AppRpcServer.deleteSession` 与 `SessionHandler` DELETE `/api/sessions/:id` 均先 `sessions.delete` + `owners.unbind` 后 `memory.deleteBySession`。测试：agent `persistent-memory.spec.ts`（`deleteBySession removes session-scoped records but keeps global ones`）、agent-gateway `session delete route removes session-scoped memory records`。
2. ~~`TypeOrmSessionStore.search` 与抽象契约漂移~~ → 已完成：按 `maxSessions`（默认 200）先取最近活跃 session 再扫描其消息（`In` 操作符），结果补 `summary` / `workspace`，`updatedAt` 取 session 活跃时间而非消息时间。测试：agent `persistent-session.spec.ts`（`searches message content across sessions honoring maxSessions and returning metadata`）。
3. ~~取消 turn 残留 pending approval~~ → 已完成：`ApprovalDecision.CANCELLED` + `ToolApprovalManager.cancelBySession(sessionId)`（清 timer、resolve CANCELLED、发 `AgentApprovalFailedEvent`）；`DefaultAgentRuntime.cancelTurn` 先 `cancelBySession` 再 abort；`performToolInvocation` 对 CANCELLED / 已 abort 走 skip 路径。测试：agent `turn-cancel.spec.ts`（`cancelTurn drops pending approval requests for the session`）。
4. ~~父 turn 取消不级联子代理~~ → 已完成：`AgentRuntime.registerChildSession/unregisterChildSession`（默认 no-op）+ `DefaultAgentRuntime` 的 `sessionChildSessions` 注册表与 `cancelChildTurns` 递归级联；`LightweightAgentRunner.runSingle` 有 `parentSessionId` 时注册子 session、`finally` 注销。测试：agent `turn-cancel.spec.ts`（cascade / unregister 两条）、agent-tools `tools.spec.ts`（register/unregister 正常与错误路径）。

### P3 网关远程审批面

5. ~~审批流未暴露给网关/远程客户端~~ → 已完成三面打通：
   - **RPC**：`approval.list`（按 session + principalId 过滤）/ `approval.approve` / `approval.reject`；`app.capabilities` 补方法声明；`AppRpcServer` 注入 `@Optional() ToolApprovalManager`。
   - **SSE / turn_stream**：`EventHandler` 转发 `approval_requested / approval_completed / approval_failed`；`describeStreamEvent` 增加 approval 三种事件（含 `approvalId` 透传），RPC 流式客户端可实时感知。
   - **HTTP**：新 `ApprovalHandler` 提供 `GET /api/approvals`、`POST /api/approvals/:id/approve|reject`（owner 校验），注册进 `AgentGatewayModule` / `GatewayBootstrap` / `index.ts`。
   - **UI**：`AgentConsoleSessionService.listApprovals/decideApproval`（RPC 优先）；component 的 `refreshPendingApprovals / applyApprovalDecision / getPendingApprovals` 统一本地管理器与 RPC 两条路径；`/approvals`、`/approve`、`/deny` 命令与审批面板在无本地 `ToolApprovalManager` 时走 RPC。
   - 测试：agent-gateway 新增 approval.list / approve / SSE 转发 / HTTP 路由 / 非 owner 403 共 5 条；agent-ui 新增 RPC 模式下 `/approvals`、`/approve`、刷新 3 条。

全量回归：agent 257 / agent-tools 186 / agent-gateway 68 / agent-ui 188 / agent-cli 26 passing；agent-channels、agent-providers tsc 干净。
