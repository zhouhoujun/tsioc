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

## P4 打磨（已完成）

1. ~~`run.cancel` 幂等 + 空闲取消~~ → 已完成：`AppRpcServer.cancelTurn` 先 `sessions.has(sessionId)`，未知/空闲会话直接返回 `{ sessionId, cancelled: false }`；`SessionHandler` 新增 `onTurnCancelled`（`track()` + `activeSessionIds.delete()`），取消后 session 不再残留 running 状态。测试：gateway `run.cancel is idempotent for unknown and inactive sessions`、`cancelled turns are removed from running sessions`。
2. ~~审批面安全收口 + expiresAt~~ → 已完成：`ApprovalHandler` GET `/api/approvals` 无 sessionId 时用 `owners.listOwned` 过滤（消除跨会话泄漏，对齐 RPC `approval.list`）；`ToolApprovalManager` 的 `ApprovalRequest`/`ApprovalRequestView` 增加 `expiresAt`（`createRequest` 内 `createdAt + timeoutMs` 派生），`AgentApprovalRequestedEvent` 载荷追加 optional `createdAt/expiresAt`，UI bridge/component 透出并显示到期时间。测试：gateway `approval list scopes by ownership`、UI fixture 更新。
3. ~~审批决策审计落库~~ → 已完成：`ToolApprovalManager` 注入 `@Optional() AuditSink`，approve / reject / autoDeny / timeout / cancel 决策统一走 `recordApprovalAudit`（`toolCallId: 'approval:' + id`，`metadata.kind: 'approval'`，approved→success / denied→skipped / timeout/cancelled→error）。测试：agent tools `approval decisions written to audit sink`。
4. ~~跨会话聚合统计 /api/stats~~ → 已完成：新 `StatsHandler` 提供 `GET /api/stats`（sessionId 参数→owner 校验，无参数→按 principal 聚合全部 owned session 的审计记录），输出 runs/ok/fail/skipped/successRate/avgDurationMs/sessions/timeRange/byTool/byKind（approval vs execution）。开发期修复 avg-duration 统计与 byTool/byKind 分组 map 变异两个 bug。测试：gateway `stats aggregates audit records scoped to owned sessions`、`stats route forbids other sessions`。
5. ~~工具补偿/回滚 phase 1~~ → 已完成：`AgentTool` 契约新增可选 `captureCompensation(input, context)` / `compensate(captured, context)`；`DefaultAgentRuntime` 在工具执行前捕获快照、成功入栈（coordinator 与直接调用两条路径），`cancelTurn` / `cancelChildTurns` / turn 错误路径按 LIFO 触发 `compensate`（单条失败不阻断剩余回滚）；内置 `MemoryPutTool` 提供删除本次新增记录的参考实现（保留已存在记录）。测试：agent `turn-cancel.spec.ts`（取消回滚、错误回滚、逆序回滚 3 条）、`tools.spec.ts`（memory.put 补偿只删新增记录）。

全量回归：agent 262 / agent-tools 186 / agent-gateway 73 / agent-ui 188 / agent-cli 26 passing；agent-channels、agent-providers tsc 干净。

## P5 打磨（已完成）

1. ~~工具补偿 phase 2：agent-tools 写工具接入~~ → 已完成：`memory.delete` / `memory.forget` / `memory.purge` / `memory.put` 四个写工具实现 `captureCompensation` / `compensate`（put 只删除本次新增记录；delete/forget/purge 恢复被删记录），经 `@tsdi/agent-tools` 测试 `tools.spec.ts` 验证。测试：agent-tools 新增 4 条。
2. ~~回滚信息透出~~ → 已完成：`AgentRuntime.cancelTurn` 返回类型升级为 `CancelTurnResult { cancelled, compensated, toolCallIds }`（抽象方法默认 `{ cancelled: false, compensated: 0, toolCallIds: [] }`）；新增 `AgentCompensationEvent(source, sessionId, reason: 'cancelled' | 'error', compensated, toolCallIds)`，`DefaultAgentRuntime.rollbackTurnCompensations(sessionId, reason)` 在补偿数 > 0 时发布事件；网关 RPC `run.cancel` 返回 `{ sessionId, cancelled, compensated, toolCallIds }`（未知会话幂等）；SSE 新增 `compensation` 事件类型（`EventHandler.onCompensation`）；UI 本地事件桥绑定 `AgentCompensationEvent` 透出 `rollback` 活动（「Rolled back N side-effecting tool call(s)」），RPC 流式客户端经 `consumeStreamEventChunk` 同样透出。测试：agent `turn-cancel.spec.ts` 断言升级为结果对象并新增取消/错误两条补偿事件断言；gateway 新增 `compensation events forwarded through SSE`；agent-ui view-model 新增 5 条。
3. ~~StatsHandler 补维度~~ → 已完成：`GET /api/stats` 聚合新增 `bySession`、`byDay`（UTC 日期分桶）与 `errors`（top 10，`{ toolName, error, count, lastAt }`，次数降序、同次数按 lastAt 升序）。测试：gateway 扩展 stats 聚合断言 + 新增 `stats errors ordered and capped`、`stats buckets by day`。
4. ~~审批面残余收口~~ → 已完成：`ToolApprovalManager.getPending()` 按 `createdAt` 升序返回（FIFO，网关 `approval.list` / UI 审批面板一致）；新增私有 `sweepExpired()` 防御性超时——`checkApproval` 与 `getPending` 入口先清扫已过 `expiresAt` 的 pending 请求（clearTimeout + resolve TIMEOUT + 发布 `AgentApprovalFailedEvent`），即使定时器因事件循环阻塞未触发也不会永久悬挂或占用 pending 上限。测试：agent 新增 `approval pending list is ordered oldest first`、`approval manager defensively sweeps requests that expired while the loop was blocked`。

全量回归：agent 264 / agent-tools 190 / agent-gateway 76 / agent-ui 193 / agent-cli 26 passing；agent-channels、agent-providers tsc 干净。

## P6 打磨（已完成）

1. ~~M5 可观测事件全链路透传（runtime → SSE → RPC → UI）~~ → 已完成：
   - **gateway 转发**：`EventHandler` 新增 `AgentContextPreparedEvent` / `AgentTurnDiagnosticsEvent` 两个 @OnEvent 处理器，SSE 发布 `context_prepared` / `turn_diagnostics`（载荷带 sessionId + report/diagnostics 原文），位于补偿事件处理器之后。
   - **RPC 描述**：`AppRpcServer.describeStreamEvent` 新增 `compensation`（label rollback / success）、`context_prepared`（label model）、`turn_diagnostics`（label state）分支与 `describeContextPreparedEvent` / `describeTurnDiagnosticsEvent` 助手（无统计数据时给兜底文案）；`toStreamEventChunk` 透传 `data.report` / `data.diagnostics` / `data.compensated` 结构化字段。
   - **UI 消费**：`AgentConsoleComponent.consumeStreamEventChunk` 对 `context_prepared` 结构化呈现（`Context {strategy}: {beforeTokens}→{afterTokens}` 活动 + `setContextPreparation`），对 `turn_diagnostics` 呈现（`Turn diagnostics: {n} compaction(s), {tokens} tokens saved`）；两类事件在 RPC 流缺失结构化数据时均回退到描述文案。
   - 测试：gateway 新增 SSE 转发 2 条 + RPC 流 1 条（`streams context prepared and turn diagnostics events through rpc stream`）；agent-ui view-model 新增 2 条（结构化呈现 + 描述文案回退）。
2. ~~M5 沙箱兼容性矩阵回归~~ → 已完成：新建 `agent/test/sandbox-compat.spec.ts`（Suite 'Sandbox compatibility matrix'，18 条测试）固化 toolset→capability 映射（12 项）、各能力默认策略（readonly_fs / workspace_write 为 null；process_exec / vcs_exec 为 process 隔离 + 全网络 + 受限 env + 资源上限；network_fetch 出站受限；gui_capture 禁网；code_exec 最强策略 `process` 隔离 + 禁网 + 写路径 + 禁密钥）、execution hints 推断与显式覆盖、sandbox state 标志、策略解析优先级、`withSandboxWorkingDirectory`、env 过滤、命令名提取、`assertSandboxCommand` 拦截、workspace 显式优先。
3. ~~README control-plane matrix 状态刷新~~ → 已完成：`agent/README.md` 两行更新——`Tool compensation / rollback` → `Implemented`（`src/runtime/DefaultAgentRuntime.ts` + `src/tools/AgentTool.ts` 的 compensate 钩子）；sandbox 行改为「policy hooks + capability defaults（`src/harness/ToolSandboxPolicy.ts`），无通用沙箱运行时」的准确描述。

全量回归：agent 282 / agent-tools 190 / agent-gateway 79 / agent-ui 195 / agent-cli 26 passing；agent-channels、agent-providers tsc 干净。

## P7 打磨（已完成）

1. ~~M5-RUNTIME-3 收尾：prompt cache provider support / applied policy 接入可观测链~~ → 已完成：模型适配器原本就在响应 `metadata.promptCache` 构建 `PromptCacheRuntimeMetadata`（provider / supported / applied / appliedStrategy / appliedScopes / 缓存 token 观测），但 runtime 从未消费，导致 provider 缓存支持度在 SSE / RPC / UI 全程不可见。本次打通：
   - **agent**：`AgentTurnDiagnostics` 新增可选 `promptCache?: PromptCacheRuntimeMetadata`；`DefaultAgentRuntime` 新增 `capturePromptCacheDiagnostics`，在 `handleModelResponse`（直接回答路径）与两条 turn 的 finalResponse 路径（`completeTurn` / `completeStreamingTurn`）把最终响应的 promptCache 元数据写入 diagnostics。
   - **gateway**：`describeTurnDiagnosticsEvent` 在压缩摘要基础上追加 `prompt cache {supported} ({applied}[, N cached tokens])`（无压缩且无缓存活动时给「no compaction or prompt cache activity」兜底）；`toStreamEventChunk` 随 diagnostics 透传结构化 promptCache 字段。
   - **UI**：`consumeStreamEventChunk` 的 `turn_diagnostics` 处理器按结构化的压缩 + prompt cache 摘要拼接活动文案，缺结构化数据时回退描述内容。
   - 测试：agent `runtime-loop.spec.ts` 新增 `turn diagnostics carry prompt cache provider metadata from the final response`（断言 diagnostics.promptCache 完整透传）；gateway RPC 流测试扩展 diagnostics 载荷与 `content` 断言（`prompt cache partial (applied, 512 cached tokens)`）+ 结构化字段断言；agent-ui view-model 测试扩展 `prompt cache partial (applied, 512 cached tokens)` 活动断言。

全量回归：agent 283 / agent-tools 190 / agent-gateway 79 / agent-ui 195 / agent-cli 26 passing；agent-channels、agent-providers tsc 干净。

## P8 打磨（已完成）

1. ~~context-compaction 架构文档「Current Gaps」第 5 项：持久化 compaction-history store~~ → 已完成，镜像 AuditSink 家族模式：
   - **agent**：新增 `CompactionHistoryStore` 抽象类 + `CompactionHistoryRecord` 接口（strategy / compactionTriggered / level / summaryInserted / before·after message & token 计数 / compacted / preserved / recent / pruned / toolMessagesCompacted / compressionRatio / cumulativeTokenSavings / createdAt / metadata）+ `InMemoryCompactionHistoryStore`（不可变快照、session 过滤、limit/offset）+ `TypeOrmCompactionHistoryStore`（`AgentCompactionHistoryEntity` 持久化，limit 默认 200）+ `DefaultCompactionHistoryStore`（注册 `TypeormAdapter` 时透明切持久化，否则回退 InMemory，同 `DefaultAuditSink`）。`AgentOrmModule` entities 注册追加 entity；`AgentModule` providers 注册三实现 + `{ provide: CompactionHistoryStore, useExisting: DefaultCompactionHistoryStore }`；index 导出。`DefaultAgentRuntime` 新增 `@Optional() compactionHistoryStore` 注入，`recordCompactionHistory` 在 `publishContextPreparedEvent` 后写入——仅当本次准备实际修改了历史（`strategy !== 'unchanged' || toolMessagesCompacted > 0`）才落库，写入失败不阻断 turn。
   - **gateway**：新增 `CompactionHistoryHandler`（镜像 `AuditHandler`）——`GET /api/compaction-history?sessionId=&level=&limit=`，owner 鉴权（403）、缺 sessionId 400、limit 解析上限 200、level 过滤，模块 providers + exports 注册。
   - 测试：agent 新增 `compaction-history.spec.ts` 7 条（in-memory 不可变快照 / session 过滤与 limit / typeorm 持久化重载 / 模块无 ORM 回退 / 有 ORM 持久化 / runtime 压缩时落库 / runtime 未修改历史不落库）；gateway 新增 3 条（level 过滤列表 / 403 非 owner / 400 缺 sessionId）。

全量回归：agent 290 / agent-tools 190 / agent-gateway 82 / agent-ui 195 / agent-cli 26 passing；agent-channels、agent-providers tsc 干净。

## P9 打磨（已完成）

1. ~~context-compaction 架构文档「Current Gaps」：aggregated empty-response-rate / repeated-question-rate metric~~ → 已完成，镜像 CompactionHistoryStore 家族模式：
   - **agent**：新增 `TurnDiagnosticsStore` 抽象类 + `TurnDiagnosticsRecord`（扁平快照 `AgentTurnDiagnostics` 全字段 + promptCache）+ `TurnDiagnosticsAggregate`（totalTurns / emptyResponseCount·Rate / repeatedClarificationCount·Rate / finalClarificationCount·Rate / followUpRecoveryCount·Rate / compactionCount / totalTokenSavings / timeRange，比率保留 1 位小数）+ 共享 `aggregateTurnDiagnostics` 归约函数（InMemory 与 TypeORM 行为一致）；`InMemoryTurnDiagnosticsStore` / `TypeOrmTurnDiagnosticsStore`（`AgentTurnDiagnosticsEntity` 持久化，`aggregate` 按 sessionIds `In` 过滤）/ `DefaultTurnDiagnosticsStore`（注册 `TypeormAdapter` 时透明切持久化，否则回退 InMemory）。`AgentOrmModule` entities 注册追加 entity；`AgentModule` providers 注册三实现 + `{ provide: TurnDiagnosticsStore, useExisting: DefaultTurnDiagnosticsStore }`；index 导出。`DefaultAgentRuntime` 新增 `@Optional() turnDiagnosticsStore` 注入（构造第 15 参），`recordTurnDiagnostics` 在 `runTurn` / `runStreamingTurn` 的 `publishTurnDiagnosticsEvent` 后为每个完成的 turn 落库，写入失败不阻断 turn。
   - **gateway**：新增 `TurnDiagnosticsHandler` 双 route——`GET /api/turn-diagnostics?sessionId=&limit=`（列表，owner 鉴权 403 / 缺 sessionId 400 / limit 上限 200）与 `GET /api/turn-diagnostics/stats?sessionId=`（单 session 聚合经 owner 校验；无 sessionId 时经 `SessionOwnerStore.listOwned` 收敛到 principal 的 owned sessions 再聚合，杜绝跨会话泄漏）。模块 providers + exports 注册。
   - 测试：agent 新增 `turn-diagnostics.spec.ts` 7 条（in-memory promptCache 不可变快照 / 过滤分页 / 多 session 聚合与比率与 timeRange / typeorm 持久化+重载+聚合 / 模块无 ORM 回退 / 有 ORM 持久化 / runtime 每 turn 落库 2 条）；gateway 新增 5 条（列表 / 403 / 400 / 单 session 聚合 / 无 sessionId 聚合 owned sessions）。

全量回归：agent 297 / agent-gateway 87 passing；agent、agent-gateway tsc 干净。

## P10 打磨（已完成）

1. ~~context-compaction 架构文档「Current Gaps」：modified files vs mentioned files 语义区分~~ → 已完成，保持五字段输出契约不变，`Files:` 行内部分类：
   - **prompt 契约**：`COMPACTION_SYSTEM_PROMPT` 第 3) 点与 Files 行指示更新——列出 `modified: a, b | mentioned: c, d`，区分已编辑文件与仅提及/读取的文件。
   - **fallback 提取**：`resolveFiles` 重写为基于新增 `resolveFileChanges`（返回 `{ modified, mentioned }`）的格式化输出；新增 `isWriteOperation` 启发式——tool 消息按工具名强信号正则（`write`/`write_file`/`edit`/`edit_file`/`apply_patch`/`create_file`/`delete_file`/`rename_file`/`move_file`/`update_file`/`save_file`/`remove_file`/`add_file`/`touch`/`mkdir`/`rm`）判定写操作；assistant 消息按 `metadata.toolCalls` 工具名或文本过去式动词（`created|modified|updated|deleted|wrote|edited|fixed|patched|added|removed|renamed|moved|saved`）判定；写操作消息的路径归 `modified`，其余归 `mentioned`（去重 + 总上限 6 保持）。归一化层对 LLM 输出原样保留其标注。
   - 测试：`context-compaction.spec.ts` 新增 2 条——fallback 下 `write_file`/`read_file` 与 assistant 陈述文本的 modified/mentioned 分流断言（含「modified 不泄漏进 mentioned」负向断言）、LLM 结构化输出保留 `modified: ... | mentioned: ...` 标注。
   - 文档：架构文档「Summary Schema」补充 Files 行语义说明；「Current Gaps」列表删除已闭合 4 项（compaction-history / empty-response-rate / repeated-question-rate / modified-vs-mentioned），仅剩 provider-specific summary quality scoring。

全量回归：agent 299 / agent-gateway 87 passing；agent、agent-gateway、agent-channels、agent-providers tsc 干净。

## P11 打磨（已完成）

1. ~~context-compaction 架构文档「Current Gaps」最后一项：provider-specific summary quality scoring~~ → 已完成，采用**确定性结构化评分**（可测、不引入主观标准），摘要有两条路径共用同一 scorer：
   - **scorer**：新增 `SummaryQualityScorer.ts`——`scoreSummaryQuality(summary, { fallbackUsed?, summaryLength? })` 输出 `SummaryQualityScore`（total / fieldCompleteness / annotationQuality / lengthBalance / truncationScore / fallbackUsed / missingFields / summaryLength）。规则：五字段（Goal/Decisions/Files/Errors/Open state）每缺 1 个 -20；Files 行同时含 `modified:` 与 `mentioned:` 标注 100、仅其一 50、无 0；字段值 <15 字符 -10、>250 字符 -5；summary 长度 ≥2000/≥1500/≥1000 分别降为 30/60/85；总分 = 0.4×完整率 + 0.2×注解 + 0.2×长度 + 0.2×截断（round），fallback 生成再 ×0.7。空 summary 全 0。
   - **store 家族**：`SummaryQualityStore` 抽象（append / list({provider, limit, offset}) / aggregate(provider?)）+ `SummaryQualityRecord` + `SummaryQualityAggregate`（recordCount / avg·min·maxTotal / 各维度平均 / fallbackRate / timeRange）+ 共享 `aggregateSummaryQuality`；`InMemorySummaryQualityStore`（不可变快照）/ `TypeOrmSummaryQualityStore`（新 entity `AgentSummaryQualityEntity`，注册进 `orm.module.ts`）/ `DefaultSummaryQualityStore`（`ApplicationContext` 探测 `TypeormAdapter` 透明切换）。`AgentModule` providers 三实现 + `{ provide: SummaryQualityStore, useExisting: DefaultSummaryQualityStore }`；index 导出。
   - **provider 字段**：`ModelAdapter` 新增 `readonly provider?: string`（Echo='echo' / Anthropic='anthropic' / OpenAI 构造时由 `options.provider` 归一化 / Routed 由 `options.provider + baseUrl` 经 `normalizeProvider`）。注意 `AgentModelOptions.model` 是 string——provider 取自顶层字段，getter 覆盖基类属性会触发 TS2611，统一改为构造时初始化属性。
   - **集成**：`LLMSessionSummarizer.summarize()` 两条路径（model / naiveFallback）共用 `recordQuality`——`provider` 取 `modelAdapter?.provider ?? 'unknown'`，异步 `store.append(...).catch(() => undefined)` 不阻断主流程。
   - **gateway**：新增 `SummaryQualityHandler` 双 route——`GET /api/summary-quality?provider=&limit=`（列表，limit 上限 200）与 `GET /api/summary-quality/stats?provider=`（聚合）；无 session 概念故不做 owner 鉴权；module providers + exports 注册。
   - 测试：agent 新增 `summary-quality.spec.ts` 15 条（scorer 7：满分/缺字段/无标注/fallback 降权/空 summary/单标注半价/超长截断；store 5：in-memory 快照+过滤分页 / 聚合分组+timeRange / typeorm 持久化+重载+聚合 / 模块无 ORM 回退 / 有 ORM 持久化；summarizer 集成 3：有 store 落库含 provider / fallback 标记 / 无 store 不抛错）；gateway 新增 3 条（列表过滤 / 全量列表 / stats 聚合）。
   - 文档：架构文档新增「Summary Quality Scoring」章节（评分维度 + store 家族 + gateway API）；「Current Gaps」清空（None tracked），Implementation Anchors 补充 scorer/store 与两个新 spec。

全量回归：agent 314 / agent-gateway 90 passing；agent、agent-gateway、agent-channels、agent-providers tsc 干净。

## P12 打磨（已完成）

1. ~~summary quality 观测闭环：gateway RPC + 控制台 /quality 命令~~ → 已完成，P11 只暴露了 HTTP 路由，UI/CLI 无任何消费者。本次把观测数据接入交互面：
   - **gateway RPC**：`AppRpcServer` 注入 `@Optional() summaryQuality?: SummaryQualityStore | null`（构造第 11 参，位置参数构造不受影响）；capabilities methods 增 `summary_quality.list` / `summary_quality.stats`；dispatch 增两个 case；`listSummaryQuality`（provider 精确过滤 + limit 解析 `Number()` clamp [0,200] 默认 200、记录映射 13 字段 view、无 store 返回 `{ records: [] }`）与 `getSummaryQualityStats`（可选 provider → `aggregate(provider)`，无 store 返回 `{ aggregates: [] }`）。
   - **agent-ui**：`AgentConsoleSessionService` 新增 `listSummaryQuality(options?)` / `getSummaryQualityStats(provider?)`（经 appRpc 请求，无 RPC 时降级空数组）；`AgentConsoleComponent` 新增 `/quality [provider]` 命令（turn 进行中拦截、经 RPC 取聚合、逐条输出 `{provider} · {count} summary records · avg {total} · fallback {rate}% · {dateRange}`，空数据给可读提示），登记进 `/help` 菜单与 `commandHints`。
   - 测试：gateway 新增 2 条（`lists and aggregates summary quality through json-rpc`：provider+limit 过滤、capabilities 声明、view 字段；`summary quality rpc returns empty payloads when no store is configured`）；agent-ui 新增 2 条（`quality command shows summary quality aggregates through rpc`、`quality command reports empty stats when nothing recorded`），`SessionServiceStub`/`AppRpcStub` 补充 `summary_quality.list`/`summary_quality.stats` 桩。
   - 说明：EchoModelAdapter 无 `model` 字段（`resolveModelName` 对 echo provider 返回 undefined）——RPC/UI 输出中 model 为 null，属已知小缺口，留待后续。

全量回归：agent 314 / agent-gateway 90 / agent-ui 197 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P13 打磨（已完成）

1. ~~echo provider 的 model 名称缺口~~ → 已完成：`EchoModelAdapter` 之前只有 `provider = 'echo'` 没有 `model` 字段，`LLMSessionSummarizer.resolveModelName()`（`adapter?.options?.model || adapter?.model`）对 echo 适配器返回 undefined，导致 `summary_quality.list` 输出中 model 为 null。补上 `readonly model = 'echo'`。测试：`summary-quality.spec.ts` 集成测试新增 `records[0].model === 'echo'` 断言。
   - CLI 面复核结论：`tsdi-agent chat` 委托给 agent-ui（已支持 `/quality` 命令），`tsdi-agent rpc-stdio` 走 `StdioAppRpcServer`（复用 `AppRpcServer` 的 `summary_quality.list`/`summary_quality.stats` capabilities）——CLI 交互面无需新增消费者，闭环在 P12 已覆盖。

全量回归：agent 314 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P14 打磨（已完成）

1. ~~/quality 命令补全记录列表视图 + 修复多聚合覆盖 bug~~ → 已完成：
   - **列表视图**：`/quality list [provider]` 经 `summary_quality.list` RPC（limit 200）拉取记录，渲染为可浏览 select 菜单（label `provider · model · total`，description 维度评分 + fallback 标记，detail 全字段含 createdAt 本地化时间）。
   - **bug 修复**：P12 的 `/quality` 聚合输出用循环 `notify()` 逐条覆盖 notice（单行渲染），多 provider 时只剩最后一条；改为 `aggregates.map(...).join(' | ')` 单条 notice。
   - 测试：agent-ui view-model 新增 3 条——`quality list command opens record selector through rpc`（launch-then-cancel select 模式 + limit/provider 断言）、`quality list command reports empty records`、`quality aggregates join multiple providers into a single notice`。

全量回归：agent 314 / agent-ui 200 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P15 打磨（已完成）

1. ~~summary quality 补时间趋势视图~~ → 已完成：
   - **agent 侧归约**：`buildSummaryQualityTrend(records, { provider?, bucketSize?, maxBuckets? })` 按天（默认 24h 桶）分桶各 provider 的质量记录，输出 `{ provider, bucketStart, recordCount, avgTotal, minTotal, maxTotal, ...维度均值, fallbackRate }`，只保留最近 `maxBuckets`（默认 30，上限 90）个非空桶，与 `aggregateSummaryQuality` 同构。单测 +3。
   - **gateway RPC**：`summary_quality.trend`（capabilities + dispatch + `getSummaryQualityTrend` handler，limit clamp [0,500]、bucketSize/maxBuckets 校验），gateway 单测 +1（含无 store 空载荷分支）。gateway 91 passing。
   - **console**：`/quality trend [provider]` 渲染 8 级 sparkline（`▁▂▃▄▅▆▇█`，avgTotal 0-100 映射），每 provider 一行：`provider ▃▅▇ (Nd · 日期区间 · avg X.X · fb Y%)`，多 provider 用 ` | ` 连接（单条 notice，不触发覆盖 bug）；无数据时提示。UI 单测 +2（sparkline 渲染 + 空趋势），含 `SessionServiceStub.getSummaryQualityTrend` override（否则落入基类走 null appRpc 返回空）。
   - 帮助文案更新：`/quality` 描述改为 `quality stats / list / trend by provider`。

全量回归：agent 317 / agent-gateway 91 / agent-ui 202 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P16 打磨（已完成）

1. ~~summary quality 接入常驻 dashboard~~ → 已完成：quality 观测从命令面（`/quality` 系列）扩展到常驻 dashboard 面板：
   - **state**：`AgentConsoleSessionState` 新增 `summaryQualityDigest` 字段 + `setSummaryQualityDigest(digest)`（带 notify）。
   - **组件**：新增 `refreshSummaryQualityDigest()`（无 sessionService 清空；经 `getSummaryQualityStats()` RPC 拉全量聚合，复用 `formatSummaryQualityAggregate` 以 ` | ` 连接写入 state；空/异常清空），挂入 `onInit` 与 `refreshTurnArtifacts`（turn 完成后随面板数据一并刷新）。
   - **dashboard 面板**：`AgentConsoleDashboardPanelComponent` 新增 `quality · <digest>` 行（stats 与 detail 之间），`dashboardQualityLabel` 仅在 `shouldShow` 且 digest 非空时输出。
   - 测试：console-renderer.spec.ts +2（有 digest 渲染 quality 行、无 digest 省略）；view-model.spec.ts +2（onInit/refreshTurnArtifacts 经 RPC 拉取 digest、空数据清空旧 digest）。

全量回归：agent-ui 206 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P17 打磨（已完成）

1. ~~HTTP 面补齐 summary quality trend 路由~~ → 已完成：P15 只给 RPC 加了 `summary_quality.trend`，HTTP 面（`SummaryQualityHandler`）停留在 list + stats。本次对齐：
   - **handler**：`SummaryQualityHandler` 新增 `GET /api/summary-quality/trend` 路由（provider 精确过滤；limit clamp [0,500] 默认 500；bucketSize 仅接受正整数；maxBuckets clamp [1,90]），复用 `buildSummaryQualityTrend`（`@tsdi/agent`）归约，输出 11 字段 trend point view（同 RPC 映射）。HTTP 与 RPC 参数语义一致。
   - 测试：gateway `SummaryQualityHandlerTest` +2——provider+maxBuckets 分桶断言（深seek 两桶 avgTotal/fallbackRate/维度均值）、无过滤时跨 provider 输出。

全量回归：agent 317 / agent-gateway 93 / agent-ui 206 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P18 打磨（已完成）

1. ~~`/quality trend` 命令面支持粒度参数~~ → 已完成：RPC/HTTP 已支持 `bucketSize`/`maxBuckets`，但命令面 `openSummaryQualityTrend(provider?)` 只传 provider。本次补齐：
   - **组件**：`openSummaryQualityTrend(provider?, bucketSize?, maxBuckets?)` 透传三参；新增 `parseSummaryQualityTrendArgs`——解析 `/quality trend [provider] [bucketSize] [maxBuckets]`，`bucketSize` 支持 `Nd`（天数→毫秒）或纯毫秒数字，非法/非正 token 忽略为 undefined；命令分支接入。
   - **帮助**：commandHints 新增 `/quality trend [provider] [bucketSize] [maxBuckets]` 条目。
   - 测试：view-model +3——`7d`/`60` 透传断言、纯毫秒 bucketSize、`0d abc` 非法 token 忽略。

全量回归：agent-ui 209 passing；agent、agent-gateway、agent-ui、agent-providers tsc 干净。

## P19 打磨（已完成）

1. ~~quality 消费面支持按 model 过滤~~ → 已完成：`model` 字段（P13 落库）此前只能展示不能过滤，本次贯通 store → RPC → HTTP 三面：
   - **store**（`@tsdi/agent`）：`SummaryQualityStore.list({ provider, model, limit })`、`aggregate(provider, model)`、`aggregateSummaryQuality(records, provider, model)`、`buildSummaryQualityTrend(records, { provider, model, ... })` 全部支持 model 过滤；InMemory/TypeORM/Default 三实现透传。
   - **RPC**：`summary_quality.list` / `.stats` / `.trend` 解析 `model` 参数。
   - **HTTP**：`/api/summary-quality`、`/api/summary-quality/stats`、`/api/summary-quality/trend` 解析 `model` query 参数。
   - 控制台 `/quality` 保持 provider-only（聚合视图本就按 provider 分组，不做模型级命令）。
   - 测试：agent +3（aggregate scopes to model / in-memory filters by model / trend filters by model），gateway +2（RPC model 过滤、HTTP trend model 过滤）。

全量回归：agent 320、agent-gateway 95、agent-ui 209 passing；四包 tsc 干净。

## P20 打磨（已完成）

1. ~~compaction history 补 RPC 面 + UI `/compactions` 命令~~ → 已完成：HTTP 已有 compaction 历史查询（`CompactionHistoryHandler`），但 RPC 面无方法、控制台无命令。本次补齐：
   - **RPC**（`@tsdi/agent-gateway`）：新增 `compaction_history.list` 方法 `listCompactionHistory`——`sessionId` 必填且经 `ensureSessionAccess` 做 owner 校验，支持 `level` 过滤与 `limit` clamp `[0,200]`；响应 18 字段（id/sessionId/strategy/compactionTriggered/level/summaryInserted/beforeMessageCount/afterMessageCount/beforeTokens/afterTokens/compactedMessageCount/preservedAnchorCount/recentMessageCount/prunedMessageCount/toolMessagesCompacted/compressionRatio/cumulativeTokenSavings/createdAt/metadata）；capabilities 声明；`AppRpcServer` 构造第 12 参注入 `@Optional() compactionHistory?: CompactionHistoryStore | null`。
   - **UI service**（`@tsdi/agent-ui`）：`AgentConsoleSessionService.listCompactionHistory(sessionId, options?, context?)`。
   - **UI 命令**：`/compactions [sessionId]`——默认取当前 `state.sessionId`，无 session 时提示；空记录提示；`formatCompactionHistoryRecord` 输出一行摘要，如 `compacted · L3 · 312→224 msgs (88) · 84k→41k tokens (-51%) · saved 43k total`；commandHints 新增 `/compactions [sessionId]` 条目。
   - 测试：gateway +3（listsCompactionHistoryThroughRpc / rejectsForeignCompactionHistoryThroughRpc / compactionHistoryWithoutStore），view-model +2（compactionsCommandListsHistory / compactionsCommandReportsEmptyHistory）——后者依赖 `SessionServiceStub.listCompactionHistory` override（走 rpcRef）与 `AppRpcStub.compactionHistoryRecords` 示例数据。

全量回归：agent 320、agent-gateway 98、agent-ui 211 passing；四包 tsc 干净。
