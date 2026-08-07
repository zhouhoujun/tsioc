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

## P21 打磨（已完成）

1. ~~compaction history stats 聚合（镜像 summary quality stats 面）~~ → 已完成：P20 补齐了 compaction 历史查询面，但缺少按会话聚合的统计视图。本次补齐：
   - **store**（`@tsdi/agent`）：新增 `CompactionHistoryAggregate` 接口（sessionId/recordCount/compactedCount/prunedCount/avgCompressionRatio/totalTokensBefore/totalTokensAfter/totalTokensSaved/timeRange）与共享 reduce `aggregateCompactionHistory(records, sessionId?)`——按 session 分组、汇总 token 总量、平均压缩比保留一位小数、按 `sessionId` 排序；`CompactionHistoryStore` 新增抽象 `aggregate(sessionId?)`，`InMemoryCompactionHistoryStore` / `DefaultCompactionHistoryStore` / `TypeOrmCompactionHistoryStore` 三实现均补齐。
   - **RPC**（`@tsdi/agent-gateway`）：新增 `compaction_history.stats` 方法 `getCompactionHistoryStats`——`sessionId` 可选（传入时经 `ensureSessionAccess` 做 owner 校验）；无 store 时返回空 `aggregates`；响应 9 字段（sessionId/recordCount/compactedCount/prunedCount/avgCompressionRatio/totalTokensBefore/totalTokensAfter/totalTokensSaved/timeRange）；capabilities 声明。
   - **HTTP**（`@tsdi/agent-gateway`）：`CompactionHistoryHandler` 新增 `GET /api/compaction-history/stats`，`sessionId` 可选、提供时校验 owner。
   - **UI service**（`@tsdi/agent-ui`）：`AgentConsoleSessionService.getCompactionHistoryStats(sessionId?, context?)`。
   - **UI 组件**：`formatCompactionHistoryAggregate` 一行摘要（`${id} · ${count} compaction(s) · ${compacted} triggered · saved ${tokens} tokens · avg ${ratio}%`，id 超 16 字符截断 14 + `…`）；`refreshCompactionDigest()` 挂入 `refreshTurnArtifacts` 的 `Promise.allSettled` 并在 `onInit` 启动时与 quality digest 并列加载；dashboard 新增 compaction 行（`dashboardCompactionLabel`）。
   - 测试：agent +3（aggregateGroupsBySession / aggregateScopesToSession / inMemoryAggregates / typeOrmAggregates），gateway +5（compactionHistoryStatsThroughRpc / rejectsForeignCompactionHistoryStatsThroughRpc / compactionHistoryStatsWithoutStore / HTTP stats 跨会话聚合 / HTTP foreign 403），view-model +2（refreshTurnArtifactsLoadsCompactionDigest / refreshTurnArtifactsClearsCompactionDigestWhenEmpty）——后者依赖 `AppRpcStub.compactionHistoryAggregates` 与 `SessionServiceStub.getCompactionHistoryStats` override（走 rpcRef）。

全量回归：agent 324、agent-gateway 103、agent-ui 213 passing；四包 tsc 干净。

## P22 打磨（已完成）

1. ~~compaction history trend（镜像 summary quality trend 面）~~ → 已完成：P21 补了聚合统计，但缺少跨时间的趋势视图，无法观察压缩比/token 节省随会话演进的形态。本次补齐：
   - **store**（`@tsdi/agent`）：新增 `CompactionHistoryTrendPoint` 接口（sessionId/bucketStart/recordCount/compactedCount/prunedCount/avgCompressionRatio/totalTokensBefore/totalTokensAfter/totalTokensSaved）与共享 builder `buildCompactionHistoryTrend(records, options?)`——按 session 分桶（默认桶宽 24h、上限 30 桶，均可覆盖）、桶内汇总 token 总量、平均压缩比保留一位小数、按 `sessionId` + `bucketStart` 排序、截尾到 `maxBuckets`（上限 90）；`CompactionHistoryStore` 新增抽象 `trend(sessionId?, options?)`，三实现均补齐（TypeOrm 先查后映射复用共享 builder）。
   - **RPC**（`@tsdi/agent-gateway`）：新增 `compaction_history.trend` 方法 `getCompactionHistoryTrend`——`sessionId` 可选（传入时经 `ensureSessionAccess` 做 owner 校验）；无 store 时返回空 `trend`；`bucketSize`/`maxBuckets` 解析并钳制（`maxBuckets` ∈ [1, 90]）；响应 9 字段；capabilities 声明。
   - **HTTP**（`@tsdi/agent-gateway`）：`CompactionHistoryHandler` 新增 `GET /api/compaction-history/trend`，`sessionId` 可选、提供时校验 owner。
   - **UI service**（`@tsdi/agent-ui`）：`AgentConsoleSessionService.getCompactionHistoryTrend(sessionId?, options?, context?)`。
   - **UI 组件**：`parseCompactionHistoryTrendArgs`（sessionId、`Nd` 天桶或毫秒数、maxBuckets）；`openCompactionHistoryTrend` 按 session 分组渲染 8 级 sparkline（`avgCompressionRatio` 映射 `▁▂▃▄▅▆▇█`）+ 日期范围 + 节省 token + 平均压缩比，空趋势给提示；`/compactions trend` 命令分支；commandHints +1。
   - 测试：agent +5（trendBucketsByTimePerSession / trendHonorsBucketSizeAndCap / trendScopesToSession / inMemoryTrends / typeOrmTrends），gateway +5（compactionHistoryTrendThroughRpc 含 capabilities / rejectsForeignCompactionHistoryTrendThroughRpc / compactionHistoryTrendWithoutStore / HTTP trend 2 天桶 / HTTP foreign 403），view-model +3（sparkline 渲染与汇总 / 参数透传 2d→毫秒桶 / 空趋势提示）——依赖 `AppRpcStub.compactionHistoryTrend` 与 `SessionServiceStub.getCompactionHistoryTrend` override。

全量回归：agent 329、agent-gateway 108、agent-ui 216 passing；三包 tsc 干净。

## P23 打磨（已完成）

1. ~~turn diagnostics 补 RPC 面 + UI `/diagnostics` 命令~~ → 已完成：P9 只暴露了 HTTP 路由（`TurnDiagnosticsHandler`），RPC 面无方法、控制台无命令。本次补齐（镜像 P20/P12 的 compaction history / summary quality 消费面模式）：
   - **RPC**（`@tsdi/agent-gateway`）：`AppRpcServer` 注入 `@Optional() turnDiagnostics?: TurnDiagnosticsStore | null`（构造第 13 参，位于 `compactionHistory` 之后）；capabilities 增 `turn_diagnostics.list` / `turn_diagnostics.stats`；`listTurnDiagnostics`——`sessionId` 必填且经 `ensureSessionAccess` 做 owner 校验，`limit` clamp `[0,200]` 默认 200，响应记录 view 字段（含 compressionRatio / compactionLevel / promptCache 透传）；`getTurnDiagnosticsStats`——`sessionId` 可选（传入时校验 owner，无参数时经 `owners.listOwned(sessionIds, principalId)` 收敛到本主会话再聚合，杜绝跨会话泄漏，与 HTTP stats 同语义）；无 store 时返回 `{ records: [] }` / `{ aggregate: null }`。
   - **UI service**（`@tsdi/agent-ui`）：`AgentConsoleSessionService.listTurnDiagnostics(sessionId, options?, context?)` 与 `getTurnDiagnosticsStats(sessionId?, context?)`（经 appRpc 请求，无 RPC 时降级空数组 / null）。
   - **UI 命令**：`/diagnostics [sessionId]`——无 sessionId 时经 stats RPC 拉取全会话聚合；`formatTurnDiagnosticsAggregate` 输出一行摘要（`${id} · ${n} turns · empty ${rate}% · repeated ${rate}% · clarif ${rate}% · ${n} compact(s) · saved ${tokens} tokens · 日期范围`，id 超 16 字符截断 14 + `…`，`all sessions` 作为无 sessionId 时的 id）；空统计给可读提示（有/无 sessionId 两种文案）；commandHints 增 `/diagnostics` 条目（state 数组 + help 菜单）。
   - 测试：gateway +5（turnDiagnosticsStatsThroughRpc 含 capabilities 与字段断言 / rejectsForeignTurnDiagnosticsThroughRpc / turnDiagnosticsStatsScopesToOwnedSessions / turnDiagnosticsWithoutStore / turnDiagnosticsListThroughRpc），view-model +2（diagnosticsCommandShowsAggregateThroughRpc / diagnosticsCommandReportsEmptyStats）——依赖 `AppRpcStub.turnDiagnosticsAggregate`/`turnDiagnosticsRecords` 与 `SessionServiceStub.getTurnDiagnosticsStats`/`listTurnDiagnostics` override（走 rpcRef）。

全量回归：agent 329、agent-gateway 113、agent-ui 218 passing；三包 tsc 干净。（agent-ui 全量首次运行 `componentResolvesWorkspaceMentionSuggestionsFromAppFileAdapter` 偶发失败，连续两次复跑均 218 passing，为既有异步 file-adapter 测试的 flaky，与本次改动无关。）

## P24 打磨（已完成）

1. ~~turn diagnostics 补趋势视图（镜像 P22 compaction history trend 面）~~ → 已完成：P23 补了 list + stats，但缺少跨时间的趋势视图，无法观察 token 节省与压缩活动随会话演进的形态。本次补齐：
   - **store**（`@tsdi/agent`）：新增 `TurnDiagnosticsTrendPoint` 接口（sessionId/bucketStart/recordCount/emptyResponseCount/repeatedClarificationCount/followUpRecoveryCount/compactionCount/totalTokenSavings/avgCompressionRatio）与共享 builder `buildTurnDiagnosticsTrend(records, options?)`——按 session 分桶（默认桶宽 24h、上限 30 桶，均可覆盖）、桶内汇总计数与 token 节省、平均压缩比只对携带 compressionRatio 的记录求值保留一位小数、按 `sessionId` + `bucketStart` 排序、截尾到 `maxBuckets`（上限 90）；`TurnDiagnosticsStore` 新增抽象 `trend(sessionIds?: string[], options?)`（接受 sessionIds 数组，与 `aggregate` 签名一致），InMemory / TypeOrm（`In` 过滤后复用共享 builder）/ Default 三实现均补齐。
   - **RPC**（`@tsdi/agent-gateway`）：新增 `turn_diagnostics.trend` 方法 `getTurnDiagnosticsTrend`——`sessionId` 可选（传入时经 `ensureSessionAccess` 做 owner 校验，无参数时经 `owners.listOwned(sessionIds, principalId)` 收敛到本主会话）；`bucketSize` 解析 >0、`maxBuckets` clamp [1,90]；无 store 时返回空 `trend`；响应 9 字段 view（`toTurnDiagnosticsTrendView`）；capabilities 声明。
   - **HTTP**（`@tsdi/agent-gateway`）：`TurnDiagnosticsHandler` 新增 `GET /api/turn-diagnostics/trend`，`sessionId` 可选、提供时校验 owner，bucketSize/maxBuckets 同 RPC 语义（`/^\d+$/` 正则校验正整数）。
   - **UI service**（`@tsdi/agent-ui`）：`AgentConsoleSessionService.getTurnDiagnosticsTrend(sessionId?, options?, context?)`（经 appRpc 请求 `turn_diagnostics.trend`，无 RPC 时降级空数组）。
   - **UI 命令**：`/diagnostics trend [sessionId] [bucketSize] [maxBuckets]`——`parseTurnDiagnosticsTrendArgs` 委托 `parseCompactionHistoryTrendArgs`（同一 token 文法：sessionId、`Nd` 天桶或毫秒数、maxBuckets）；`openTurnDiagnosticsTrend` 按 session 分组渲染 8 级 sparkline（`totalTokenSavings` 按 session 内最大桶归一化映射 `▁▂▃▄▅▆▇█`）+ 桶数/日期范围 + turn 总数 + 节省 token 总量，空趋势给提示；help 菜单补 `/diagnostics trend` 条目。
   - 测试：agent +5（trendBucketsByTimePerSession / trendHonorsBucketSizeAndCap / trendScopesToSessionIds / inMemoryTrends / typeOrmTrends），gateway +4（turnDiagnosticsTrendThroughRpc 含 capabilities / rejectsForeignTurnDiagnosticsTrendThroughRpc / turnDiagnosticsTrendScopesToOwnedSessions / turnDiagnosticsTrendWithoutStore），view-model +2（diagnosticsTrendCommandRendersSparklineThroughRpc 断言 `▅█` 与 `7 turns`/`saved 3K tokens` / diagnosticsTrendCommandReportsEmptyTrend 透传 sessionId）——依赖 `AppRpcStub.turnDiagnosticsTrend` 与 `SessionServiceStub.getTurnDiagnosticsTrend` override。
   - 说明：sparkline 指标选 `totalTokenSavings`（每条记录必有、不为 undefined 拉低），而非 `avgCompressionRatio`（可选字段，多数无压缩的 turn 不带值）。

全量回归：agent 334、agent-gateway 117、agent-ui 220 passing；三包 tsc 干净。

## P25 打磨（已完成）

1. ~~turn diagnostics 接入常驻 dashboard（镜像 P16/P21 的 quality / compaction digest 模式）~~ → 已完成：P23/P24 补了 RPC 与命令面，但 dashboard 面板只展示 quality 与 compaction 两行观测。本次补齐：
   - **state**（`@tsdi/agent-ui`）：`AgentConsoleSessionState` 新增 `turnDiagnosticsDigest` 字段 + `setTurnDiagnosticsDigest(digest)` setter（带 notify，与 `setCompactionDigest` 并列）。
   - **组件**：新增 `refreshTurnDiagnosticsDigest()`——无 sessionService 清空；经 `getTurnDiagnosticsStats()` RPC 拉全会话聚合，复用 `formatTurnDiagnosticsAggregate` 写入 state（`all sessions · N turns · empty X% · ...`），空/异常清空；挂入 `onInit`（与 quality/compaction digest 并列）与 `refreshTurnArtifacts` 的 `Promise.allSettled`（turn 完成后随面板数据一并刷新）。
   - **dashboard 面板**：`AgentConsolePanels` 模板新增 `diagnostics · <digest>` 行（quality/compaction 行之后），`dashboardTurnDiagnosticsLabel` getter 仅在 `shouldShow` 且 digest 非空时输出。
   - 测试：console-renderer.spec.ts +2（有 digest 渲染 diagnostics 行、无 digest 省略）；view-model.spec.ts +2（onInit 经 RPC 拉取 digest、空数据清空旧 digest）。注意：onInit 新增的 digest 拉取会产生无 sessionId 的 `turn_diagnostics.stats` 调用，P23 既有测试 `diagnosticsCommandReportsEmptyStats` 的 `find` 首匹配断言改为匹配带 sessionId 的调用。

全量回归：agent 334、agent-gateway 117、agent-ui 224 passing；三包 tsc 干净。

## P26 打磨（已完成）

1. ~~`/diagnostics list` 记录列表视图（镜像 P14 `/quality list` 可浏览 select 菜单模式）~~ → 已完成：P23 补了 `turn_diagnostics.list` RPC 与 `listTurnDiagnostics` service 方法，但 UI 命令面从未消费 list（`/diagnostics` 只用 stats、`/diagnostics trend` 用 trend）。本次补齐：
   - **组件**：新增 `openTurnDiagnosticsList(sessionId?)`——无参数时回退 `state.sessionId`（与 `/compactions` 的 P20 语义一致，gateway RPC 的 list 要求 sessionId 必填，无 session 时提示 `Run /diagnostics list <sessionId>.`）；经 `listTurnDiagnostics(resolvedSessionId)` 拉记录，渲染为可浏览 select 菜单（title `Turn diagnostics records (<sessionId>)`，hint `N records`）。
   - **option builder**：`buildTurnDiagnosticsRecordOption`——label `{sessionId} · {本地化时间}`，description 日期 + `N compact(s)` + `saved N tokens` + repeated/clarif 标记，detail 全字段（Record/Session/Created/Empty response retries/Repeated clarification/Final clarification/Context rewritten/Follow-up recoveries/Compactions/Token savings/Compression ratio/Compaction level/Prompt cache）。
   - **命令分支**：`/diagnostics` case 增 `list` / `list <sessionId>` 分支（trend 分支之后、stats 分支之前）；help 菜单补 `/diagnostics list` 条目。
   - 测试：view-model +3（diagnosticsListCommandOpensRecordSelectorThroughRpc 含 limit/sessionId 断言与 label/description/detail 渲染 / diagnosticsListCommandUsesCurrentSession 无参回退当前会话 / diagnosticsListCommandReportsEmptyRecords 空提示）——依赖 `AppRpcStub.turnDiagnosticsRecords` 与既有 `turn_diagnostics.list` 分支。

全量回归：agent 334、agent-gateway 117、agent-ui 227 passing；三包 tsc 干净。

## P27 打磨（已完成）

1. ~~delegation graph 持久化 + 跨会话 lineage/tree 观测（闭合 multi-agent-delegation-architecture.md 的 delegation 持久化 gap）~~ → 已完成：主任务→子代理会话的父子边（parentSessionId, childSessionId）持久化落库，并提供 HTTP/RPC/UI 三面查询。本次交付：
   - **store 家族**（`@tsdi/agent`，镜像 turn-diagnostics 的 store 模式）：
     - `DelegationGraphStore.ts` 抽象契约：`append` / `markClosed`（幂等，首个 active 边优先，`cancelled` 不被后续 `failed` 覆盖）/ `children` / `ancestors` / `tree` / `list`；共享构建器 `buildDelegationTree`（status/depth 过滤、子级按 createdAt+id 排序、环安全——回边整体剪除，不渲染桩节点）与 `buildDelegationLineage`（向上走到根，环保护，新边在前）。
     - `InMemoryDelegationGraphStore`：不可变快照 + metadata 深拷贝（append 与 cloneRecord 双保险），children 按 createdAt+id 排序（与 TypeOrm 查询一致）。
     - `TypeOrmDelegationGraphStore`：经 `TypeormAdapter` repo 读写 `AgentDelegationEdgeEntity`（uuid PK、bigint 时间戳、simple-json metadata），`In(statuses)` 过滤，tree/lineage 全表拉取后走共享 builder，list 双边 OR where。
     - `DefaultDelegationGraphStore`：`tryGetAdapter()` 探测有无 `TypeormAdapter` 透明切换（镜像 `DefaultTurnDiagnosticsStore`）。
     - 实体：`memory/entities.ts` 新增 `AgentDelegationEdgeEntity`；`orm.module.ts` 实体数组注册；`agent.module.ts` 注册 provider（useExisting + asDefault）；`src/index.ts` 导出 4 个 store。
   - **runtime 集成**：`AgentRuntime` 抽象基类 `registerChildSession(parent, child, metadata?)` / `unregisterChildSession(parent, child, status?)` 签名更新；`DefaultAgentRuntime` `@Optional` 注入 delegationGraph（无 provider 时透明降级为 no-op 语义，不破坏既有流程）——`registerChildSession` → `recordDelegationEdge`（append，kind `nested`）、`unregisterChildSession` → `closeDelegationEdge`（markClosed，默认 `completed`）、`cancelChildTurns` → markClosed(`cancelled`)；`lightweight-agent-runner.ts` `runSingle` register 传 metadata（kind/goal/toolsets/model/maxTurns），finally unregister 传 `succeeded ? 'completed' : 'failed'`。
   - **gateway**（`@tsdi/agent-gateway`）：
     - 新建 `api/DelegationHandler.ts`：4 条 HTTP 路由 `GET /api/delegation/{tree,lineage,children,list}`，`SessionOwnerStore.isOwner` 鉴权，`parseStatus`/`parseDepth`/`parseLimit` 参数校验（类型守卫，无 `as any`）；模块注册（providers+exports），不接线 GatewayBootstrap（与 CompactionHistory/TurnDiagnostics/SummaryQuality/Audit handler 一致的模块注册模式）。
     - `AppRpcServer` 新增 `delegation.tree/lineage/children/list` 4 个 RPC：capabilities + dispatch case + `parseDelegationStatus` + `toDelegationEdgeView`/`toDelegationTreeView` 视图映射；`getDelegationList` 无 sessionId 时经 `SessionOwnerStore.listOwned` 按 principal 过滤防越权。
   - **UI**（`@tsdi/agent-ui`）：
     - `AgentConsoleSessionService` 新增 `getDelegationTree` / `getDelegationLineage` / `getDelegationChildren` / `listDelegationEdges`。
     - `AgentConsoleComponent` 新增 `/delegation` 命令（`tree` / `lineage` / `list` 子命令）：`openDelegationTree(sessionId?, status?, depth?)`、`openDelegationLineage(sessionId?)`、`openDelegationList(sessionId?)`；格式化 `formatDelegationEdge`（`parent ⇢ child · kind · status · 时间 · goal`）、`formatDelegationTree`（`└─/├─` 递归缩进）、`pickDelegationGoal`（metadata.goal 40 字符截断）、`shortenSessionId`（18+…）；help 补 3 条。
     - `AgentConsoleSessionState` commandHints 补 `/delegation`。
   - 测试：`agent/test/delegation-graph.spec.ts` 14 用例——InMemory（append 生成 id/快照不可变/markClosed 幂等首胜/children 过滤排序/ancestors 环保护/tree 层级/tree status+depth 过滤/list 双边范围）+ 共享 builder（树环安全、lineage 停根）+ TypeOrm（持久化重载关闭、树与谱系）+ AgentModule DI（无 ORM 回退 InMemory、有 ORM 解析 durable store）。
   - 修复：InMemory `children` 缺 createdAt 排序（补 sort，与 TypeOrm 一致）；共享树 builder 首次环实现只剪子孙不剪回边（改为 `nextVisited.has(child)` 时整体跳过该边）。

全量回归：agent 348（334+14）、agent-gateway 117、agent-ui 227 passing；三包 tsc 干净。

## P28 已完成：worker-class → model 路由策略

1. ~~multi-agent-delegation-architecture.md「Current Gaps」最后一项：no policy layer yet for routing different worker classes to different models~~ → 已完成，采用**显式会话模型 profile**（`ModelRequest.profile`），优先级高于 complexity/routes 匹配：
   - **model 层**（`@tsdi/agent`）：
     - `ModelRequest` 新增 `profile?: string`：调用方显式指定模型 profile，跳过 complexity 估算与 route 匹配。
     - `RoutedModelAdapter.selectAdapter` 在 `matchRoute` 之前解析 `request.profile`：`resolveExplicitProfile` 从 `options.profiles` 取配置（trim 后查找，缺失抛 `` `Unknown model profile 'X'.` ``，镜像既有 route.profile 报错文案），成功后 `mergeConfigs(topLevel, profile)` 合并出最终配置，`metadata.routing.profile` 记录命中。
   - **runtime**（`@tsdi/agent`）：
     - `AgentRuntime` 抽象基类新增 `setSessionModelProfile(sessionId, profileName)` / `clearSessionModelProfile(sessionId)`（no-op 默认，JSDoc 注明 delegation 用途）。
     - `DefaultAgentRuntime` 实现：`sessionModelProfiles` Map 记录会话级 profile，`prepareModelRequest` 命中时注入 `request.profile`（与 signal 一起，所有 complete/stream/重试/follow-up 路径统一生效）。
   - **策略配置**（`@tsdi/agent-tools`）：
     - `AgentToolsOptions.delegation.workerModelProfiles?: Record<string, string>`：worker-class → profile 名映射（`spawn_agent` / `llm_task`）；`defaultAgentToolsOptions.delegation = {}`，`mergeAgentToolsOptions` 对 workerModelProfiles 逐键深合并。
     - `NestedAgentRunRequest.workerClass?: string`；`DelegatingSpawnAgentAdapter.spawn/spawnParallel` 传 `workerClass: 'spawn_agent'`、`DelegatingLlmTaskAdapter.execute` 传 `workerClass: 'llm_task'`。
     - `LightweightAgentRunner` 构造经 `@Optional() @Inject(AGENT_TOOLS_OPTIONS)` 注入 options；`runSingle` 按 `request.workerClass ?? 'spawn_agent'` 查映射，命中则在 turn 前 `setSessionModelProfile`、finally `clearSessionModelProfile`（与 toolset filter 生命周期一致）。
   - 测试：`agent/test/model-provider.spec.ts` +2（显式 profile 跳过 complexity 路由、未知 profile 报错）；`agent/test/turn-diagnostics.spec.ts` +1（runtime 注入/清除会话 profile，捕获 adapter 收到的 request.profile）；`agent-tools/test/tools.spec.ts` +3（workerClass 命中 set/clear、未映射不调用、无 workerClass 不调用）。
   - 文档：本条目；架构文档「Current Gaps」删除 policy gap，新增「Worker Model Routing Policy (P28)」段 + Implementation Anchors 补充。

全量回归：agent 351（348+3）、agent-gateway 117、agent-ui 227 passing；三包 tsc 干净。

## P29 已完成：review 面板 hunk 级语义折叠

1. ~~review-panel-architecture.md「Current Gaps」：No semantic diff folding beyond unified diff sections~~ → 已完成，采用 **hunk 级折叠**（`@@` 头粒度）：
   - **hunk 模型**（`@tsdi/agent-ui`）：
     - 新增 `AgentConsoleReviewHunk` 接口（header/context/startIndex/endIndex/additions/deletions）。
     - `parseReviewHunks(section)` 按 `@@` 头把 section.lines 切分为 hunks，逐行累计 `+`/`-` 计数（排除 `+++`/`---` 标记）；`resolveReviewHunkContext` 从第二个 `@@` 后提取函数/类上下文标签。
   - **折叠状态**：
     - `selectedReviewHunkIndex`（`{`/`}` 跳跃与 `f` 切换的目标，group/file 切换时重置为 0）。
     - `foldedReviewHunks: Set<string>`，键 `groupKey:path#hunkIndex` —— 跨 group/file 切换与任务重开存活，`clearReview()` 清空。
     - `toggleReviewHunkFold()` 折叠/展开当前 hunk 并夹紧滚动。
   - **渲染**：`renderReviewPatchLines(section, groupKey)` 顺序遍历 hunks——section 头（diff --git/index/---/+++）只在首 hunk 前渲染；展开 hunk 渲染正文；折叠 hunk 只渲染 `@@` 头 + 摘要行（`⋯ folded hunk +N -M · context (f expand)`，不走 additions 过滤、折叠时仍可见）；无 hunk 的 section 回退原 `filterReviewPatchLines`。
   - **键盘**：`handleFocusKey` review 分支新增 `case 'f'`（toggleReviewHunkFold）；`jumpReviewHunk` 重写为基于 `selectedReviewHunkIndex` 循环跳跃 + 定位渲染后 hunk 头（`diff --git` 行之后数 `@@`）滚动到视口；`reviewDetailHint` 默认串补 `{ } hunk jump   f fold hunk`。
   - 测试：`view-model.spec.ts` +1（`reviewDetailFoldsAndExpandsHunks`——折叠隐藏 hunk 正文保留头与摘要、additions 过滤下摘要仍可见、展开恢复、切文件重置 hunk index）；`console-renderer.spec.ts` +1（渲染折叠摘要行、hunk 头在视口、折叠体不出现）。
   - 文档：本条目；`review-panel-architecture.md`「Current Gaps」删除折叠项与已实现的 risk scoring / annotation 持久化两项（commit `ab49719cb`/`120deaf89` 早已实现），仅剩 side-by-side；新增「Hunk Folding」节 + State Mapping hunk scope + Keyboard `{`/`}`/`f` + Implementation Anchors 补实现锚点。

全量回归：agent-ui 229（227+2）passing；tsc 干净。

## P29 已完成：review 面板 side-by-side patch 渲染（关闭最后一项 Current Gap）

1. ~~review-panel-architecture.md「Current Gaps」：No side-by-side patch rendering in TUI~~ → 已完成（`@tsdi/agent-ui`）：
   - **状态**：`reviewSideBySide`（`s` 键切换，`clearReview()` 随 patch filter 一起重置；`toggleReviewSideBySide()` 切换并夹紧滚动）。
   - **渲染**：`renderReviewPatchLines` 在 side-by-side 开启时委托 `renderReviewPatchSideBySide`（保留 hunk 折叠/过滤/跳跃语义——折叠 hunk 仍渲染摘要行）；hunk 内连续 `-`/`+` 行按位置配对成 `old │ new` 行（`buildSideBySidePatchRows` 按 run 对齐列宽，上下文行双列同现）；`@@` 头与 `diff --git`/`---`/`+++` 元数据保持整行；长行复用既有横向滚动（`reviewDetailColumnScroll`/`reviewDetailMaxColumn`）。
   - **键盘**：`handleFocusKey` review 分支新增 `case 's'`；`reviewDetailHint` 补 `s side-by-side`。
   - 测试：`view-model.spec.ts` +1（`reviewDetailTogglesSideBySide`——unified 无 `│`、sxs 去前缀对齐、additions 过滤下旧列留空、折叠摘要仍可见、`s` 复位）；`console-renderer.spec.ts` +1（渲染 `old first │ new first` 配对行、前缀行不出现）。
   - 文档：本条目；`review-panel-architecture.md`「Current Gaps」置为 none（全部闭合）、新增「Side-by-Side Rendering」节 + Keyboard `s` + Implementation Anchors 补实现锚点。

全量回归：agent-ui 231（229+2）passing；tsc 干净。

## P30 已完成：thread 派生索引 + originThreadId 分支链接（关闭 project-session-thread-architecture.md 最后一项 Next Step）

1. ~~project-session-thread-architecture.md「Next Step」：project-aware metadata + derived grouping（AGENT-M4-STORE 映射项）~~ → 已完成，采用**派生 thread 索引**（不新增 store schema，按会话元数据惰性分组，符合 Storage Implications 的分阶段上线）：
   - **store 层**（`@tsdi/agent`，镜像 `deriveProjectIndexes` 模式）：
     - `SessionStore.deriveThreadIndexes(states)` 共享纯构建器：按 thread key 分桶（`primaryThreadId`，缺失回退 `session:<id>` 保证遗留会话可见），代表项=最新活跃会话；输出 `AgentThreadIndex`（threadId/projectId/workspace/title/rootRequest/status/stage/originThreadId/currentSessionId/sessionIds/createdAt/updatedAt/lastActiveAt）。
     - 代表项元数据取最新活跃会话；`status`/`stage` 由代表项 `sessionRole` 推导（`review`→`completed`/`review`，`worker`→`implementation`，`branch`→`discovery`）。
     - `sessionIds` 按 lastActiveAt desc 再 id asc；threads 按 lastActiveAt desc 再 threadId asc。
     - `SessionStore.listThreads()` 默认契约返回 `[]`；`InMemorySessionStore`/`TypeOrmSessionStore` 实现（`AgentState`/entity 往返 `originThreadId`，持久化重载后可重建索引）。
   - **网关**（`@tsdi/agent-gateway`）：
     - `SessionHandler.listSessionInfos` 补 `originThreadId` 映射；新增 `groupThreadInfos(infos)` 基于 owner 过滤后的 `SessionInfo` 重建线程分组；暴露 `GET /api/sessions/threads`（HTTP）与 `session.list_threads`（JSON-RPC capability + dispatch）。
   - **UI**（`@tsdi/agent-ui`）：
     - `AgentConsoleSessionService.listThreads()` 优先网关 RPC，回退 `store.listThreads()`（再回退客户端 `groupThreadChoices` 分组）；`toChoice`/`listSessions` 补 originThreadId。
     - 新增 `/threads` 命令（镜像 `/projects`：线程列表 → 线程内会话列表 → openSession）；`threads`/`threadsFocused` 会话状态，复用焦点层/Escape 处理。
   - **测试**：
     - `agent/test/session.spec.ts` +4（originThreadId 分桶、`session:` 回退、最新活跃代表项+review→completed 映射、活跃排序）；`persistent-session.spec.ts` +1（TypeOrm originThreadId 往返 + listThreads）。
     - `agent-gateway/test/gateway-server.spec.ts` +1（`GET /api/sessions/threads` 路由分组断言）；`agent-ui/test/view-model.spec.ts` +1（service 线程分组 + 兜底排序）。
     - 修复：`deriveThreadIndexes` 桶初始化器 `createdAt` 哨兵 `0` → `Number.MAX_SAFE_INTEGER`（否则 min-clamp 恒得 0）；3 处测试确定性修正（store 排序用例 append 顺序、gateway 线程用例 owner 移入 Date.now mock 窗口、UI 线程用例 chat-c 活跃度调整）。
   - 文档：本条目；`project-session-thread-architecture.md` 新增「Thread Index (P30)」节 + Implementation Anchors 补充 + 「Next Step」改为已闭合说明与未来选项。

全量回归：agent 356（351+5）、agent-gateway 118（117+1）、agent-ui 232（231+1）passing；三包 tsc 干净。

## P31 已完成：spawn 自动标注 worker 会话（关闭 project-session-thread-architecture.md Future option：auto-classify sessionRole/originThreadId）

1. ~~project-session-thread-architecture.md Future options：auto-classify `sessionRole`/`originThreadId` from spawn/rollback runtime signals instead of explicit metadata only~~ → 已完成（`@tsdi/agent`）：
   - **运行时**（`DefaultAgentRuntime`）：
     - `registerChildSession` 在记录 delegation 边后新增 `annotateChildSession(parentSessionId, childSessionId, metadata)`——框架级收口点，所有 spawn 路径（LightweightAgentRunner / coding-task / 直接调用）统一生效。
     - `annotateChildSession`（fire-and-forget，错误吞掉，标注永不阻断委派流）：子会话标注 `sessionRole: 'worker'`（注册为 child 即子代理）；`originThreadId` = 父会话 `primaryThreadId`，缺失回退父 session id；`focusSummary` 缺省取委派 `goal`（thread 标题来源）；读改写保留既有显式字段；子会话已有显式非 worker role 时跳过。
   - **无顺序风险**：`InMemorySessionStore`/`TypeOrmSessionStore` 的 `setProjectMetadata` 均会自动建会话，标注可先于子会话首个 turn 触发；派生线程索引随之呈现 worker 线程（stage `implementation`、originThreadId 已链接）无需任何显式 metadata。
   - 测试：`agent/test/turn-cancel.spec.ts` +4（父线程→origin 链接 + focusSummary；无线程父会话→回退 session id；显式非 worker role 完整保留；既有 worker 补 origin 且 projectId/focusSummary 保留）。新增 `waitForState` 异步轮询 helper。
   - 文档：本条目；`project-session-thread-architecture.md` 新增「Worker Session Auto-Classification (P31)」节 + Future options 移除 auto-classify 项 + Next Step 更新；顺手修正 P30 节一处路径笔误（`packages/agents/agents/agent-gateway` → `packages/agents/agent-gateway`）。

全量回归：agent 360（356+4）、agent-gateway 118（118+0）、agent-ui 232（232+0）passing；三包 tsc 干净。

## P32 已完成：worker 线程完成态写回（unregister 时按边终态标注，/threads 反映完成/失败 worker）

1. 新增会话终态字段 `threadStatus`（nullable），边关闭时按 delegation 结果写回，派生线程索引据此呈现 `completed` / `blocked` / `abandoned`：
   - **store 层**（`@tsdi/agent`）：
     - `AgentSessionProjectMetadata` / `AgentThreadSource` / `AgentState` / `AgentSessionEntity` 新增 `threadStatus` 列；`InMemorySessionStore`/`TypeOrmSessionStore` 的 `get` + `setProjectMetadata` 往返。
     - `deriveThreadIndexes` 状态映射：`input.threadStatus ??`（role 推导 `review`→`completed`，否则 `active`）；`stage` 仍由 `sessionRole` 推导。
   - **运行时**（`DefaultAgentRuntime`）：
     - 新增 `annotateChildThreadStatus(childSessionId, status)`（fire-and-forget + 吞错，与 P31 标注同模式）：`completed`→`completed`、`failed`→`blocked`、`cancelled`→`abandoned`。
     - `unregisterChildSession(parent, child, status)` 与 `cancelChildTurns` 关闭边后调用。
     - 提取共享 `mergeProjectMetadata(sessionId, patch)` 读改写助手（`annotateChildSession` 同步重构复用）：仅补缺口，显式 `threadStatus` 优先——与 P31 显式字段语义一致。
   - **网关**（`@tsdi/agent-gateway`）：`SessionInfo.threadStatus` 契约字段；`listSessionInfos` 透传；`groupThreadInfos` 状态取 `representative.threadStatus ??`（role 推导回退）。
   - **UI**（`@tsdi/agent-ui`）：`AgentConsoleSessionChoice.threadStatus`；`listSessions`/`listProjects`/`listThreads` RPC 映射 + `toChoice` 透传；`groupThreadChoices` 状态取代表项 `threadStatus`（索引路径经 `thread.status` 已透传）。
   - **测试**：
     - `agent/test/turn-cancel.spec.ts` +4（默认 completed、failed→blocked、cancelled→abandoned、显式终态保留）。
     - `agent/test/session.spec.ts` +2（显式状态→线程 status 映射、缺省回退 role 推导）；`persistent-session.spec.ts` +1（TypeOrm threadStatus 往返 + 派生索引）。
     - `agent-gateway/test/gateway-server.spec.ts` +1（worker 终态线程分组 + session 透传）；`agent-ui/test/view-model.spec.ts` +2（store 索引路径 + 无索引 choice 分组兜底；同步修正 `WorkspaceSessionStoreStub.listThreads` 推导加入 threadStatus 以镜像真实 store）。
   - 文档：本条目；`project-session-thread-architecture.md` 新增「Worker Thread Terminal Status (P32)」节 + Next Step 更新。

全量回归：agent 367（360+7）、agent-gateway 119（118+1）、agent-ui 234（232+2）passing；三包 tsc 干净。

## P33 已完成：thread 级工件聚合（/threadplan + /threadreview，按 originThreadId/primaryThreadId 归并）

1. 在既有持久化 seam 上实现 thread 级 todo/review 聚合——无需先做索引持久化，直接按 `originThreadId`/`primaryThreadId` 归并（`@tsdi/agent-ui`）：
   - **线程归并解析**（`AgentConsoleComponent`）：
     - `resolveThreadKeyForSession(session, sessions, visited)` 沿谱系求线程键：`primaryThreadId`（直接成员）→ `originThreadId`（worker 链接：已加载则递归解析 origin 会话键，否则按线程 id 处理）→ `session:<id>`（单飞）；visited 集合防环。
     - `resolveThreadSessionsFor` / `resolveThreadSessionIdsFor` 镜像 project 级解析器：与锚点共享线程键的全部会话（含 `originThreadId` 链接的 worker 与 worker-of-worker 链）。
     - `originThreadId` 进入控制台会话模型（`AgentConsoleSessionItem`），`refreshSessions` / `flattenProjectSessions` 两条桥接透传。
   - **聚合核心**（与 project 路径共享）：
     - 从 `refreshTodoPlan` 抽取 `mergeTodoPlanForSessions(sessionId, sessions)`；`refreshTodoPlan`（project 作用域）与 `refreshThreadTodoPlan`（thread 作用域）均委托之并标注 `planScope`（`'project'`/`'thread'`）。
     - `loadThreadCodingTasks` 复用既有 `loadCodingTasks(sessionId, sessionIds)` 核心（线程解析 id）。
   - **UI 面**：
     - `/threadplan`：合并 thread 作用域 plan todos + coding tasks 并聚焦 tasks 面板；plan 摘要 thread 作用域下追加 `· thread` 后缀。
     - `/threadreview`：coding-task review 选择器限定当前线程（`selectCodingTask` 增加可选 `sessionIds`）。
     - 两命令注册进 `commandHints` 与 `/help`。
   - **测试**：`view-model.spec.ts` +6（线程谱系分组、单飞会话回退、thread todo 合并含去重/活跃投影/异线程排除、thread coding-task 聚合、`/threadplan`、`/threadreview`）；`console-renderer.spec.ts` +1（`· thread` 作用域后缀）。
   - 文档：本条目；`project-session-thread-architecture.md` 新增「Thread-Level Artifact Aggregation (P33)」节 + Next Step 更新（关闭 thread 级聚合 future option）。

全量回归：agent 367（367+0）、agent-gateway 119（119+0）、agent-ui 241（234+7）passing；三包 tsc 干净。

## P34 规划：对比 Codex / opencode 的差距清单与打磨计划（Tier1/Tier2 已完成；Tier3 远期仅记录）

### 对比结论（2026-08 调研）

**已具备（与主流持平或超出）**：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 P28）、prompt cache 支持、上下文压缩 + turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计）、审批流（expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级，非 OS 级）、40+ 工具组（files/git/terminal/browser 轻量/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli 等）、MCP stdio client + server tool、skills 系统（本地注册表/目录/turn interceptor/激活提示）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation + dashboard digests）、gateway（JSON-RPC + HTTP + SSE + owner 鉴权 + InMemory/TypeOrm 持久化）、console TUI（~15 面板 / ~30 命令 / 主题 / workspace mentions / review hunk 折叠 + side-by-side）、CLI（chat/run 一次性/rpc-stdio/tools list + fast/strong 自适应配置）。

**对比 Codex（developers.openai.com/codex，CLI v0.14x）与 opencode（opencode.ai/docs）识别出的差距**，按下表分级：

### Tier 1（高价值，中量改动，建议优先）

1. ~~MCP 仅 stdio 单传输~~（现状：`agent-tools/mcp/StdioMcpClient` 只支持 spawn stdio；opencode 支持 local + remote(Streamable HTTP) + OAuth PKCE；Codex `mcp add` 支持 stdio 与 streamable HTTP）→ **已完成**：`McpClient` 抽象增加 StreamableHttpMcpClient（tools/list、tools/call、resources、prompts 经 HTTP+SSE，`Mcp-Session-Id` 复用 + cursor 分页 + 401 时单次 OAuth 重试）；配置模型支持 `url/headers/oauth`；远程 server 的 OAuth（RFC 8414 发现 + PKCE + device flow + token 刷新，凭证存 `~/.tsdi-agent/mcp-credentials.json`）；CLI `mcp add/list/auth/logout/remove` 命令族 + settings `mcp` 节接通；新增 `test/mcp-http.spec.ts` 12 用例，agent-tools 205 / agent-cli 26 全绿。
2. ~~无 OS 级沙箱~~（现状：`ToolSandboxPolicy` 是 capability 策略矩阵 + 审批默认值，命令实际直接在本机执行；Codex 用 Seatbelt/bwrap+seccomp/Landlock 内核级隔离，`codex sandbox` 辅助命令；opencode 依赖权限系统）→ **已完成**：阶段一提供 `agent/src/harness/sandbox-exec.ts`——`SandboxMode`（`'off'|'workspace'|'network-block'`）、`SandboxExecTool`（`bwrap`→`unshare`→`sandbox-exec` 按平台探测，`detectSandboxExecTool` 可注入 probe）、`buildSandboxExecCommand`（bwrap `--ro-bind / + --bind workspace + --tmpfs /tmp + --unshare-pid/ipc/uts`，network-block 加 `--unshare-all --unshare-net`；unshare `--net` / `--map-root-user --fork --pid --kill-child --mount`；sandbox-exec `-p` profile `(deny file-write*)` + workspace/tmp 子路径 + `(deny network*)`）、Windows/WSL2 降级提示；`SandboxPolicy.osSandbox?: SandboxMode`；`OsSandboxExecutor`（默认 `SandboxExecutor` provider，policy `osSandbox` 优先于 `AgentOptions.sandbox.mode`，命令串经 `sh -c` 包装，无工具/off 时降级 NodeChildProcess 行为）；`ToolExecutionCoordinator.invokeWithTimeout` 在 osSandbox 开启且 input 含 `command` 时路由到 executor；agent `AgentOptions.sandbox.mode` + agent-tools `AgentToolsSandboxOptions.mode` 配置。阶段二打通会话级运行时切换：`AgentRuntime.setSessionSandboxMode/getSessionSandboxMode` + `DefaultAgentRuntime.sessionSandboxModes` 覆盖 receipt 中的 `sandboxPolicy.osSandbox`；gateway RPC 新增 `session.sandbox_mode.set/get`；agent-ui 新增 `/permissions [readonly on|off] | [sandbox default|off|workspace|network-block]`，并将 `/status` 扩展为同时展示 plan(read-only) 与 sandbox 模式。测试：agent 新增 session sandbox receipt 覆盖断言；gateway 新增 sandbox_mode RPC set/get + foreign 403；agent-ui 新增本地 / RPC `/permissions` 命令与状态展示断言。全量回归：agent 424、agent-tools 219、agent-gateway 133、agent-ui 261、agent-cli 30 passing，`agent` / `agent-gateway` / `agent-ui` / `agent-channels` / `agent-providers` `tsc --noEmit` clean。
3. ~~无 LSP 集成~~（现状：grep 全库无 lsp；opencode 自动为 LLM 加载 LSP，提供 definitions/references/diagnostics；Codex 靠 IDE 扩展）→ **已完成**：`agent-tools/lsp/` 新工具组（零依赖，自研 stdio JSON-RPC + Content-Length 帧 client，不引入 vscode-languageserver-protocol）——`LspClient`（initialize/initialized 握手、能力跟踪、`textDocument/definition|references|documentSymbol|diagnostic`、`publishDiagnostics` 按 uri 缓存、shutdown/exit 优雅关闭）；`LspServerManager`（按文件扩展名惰性启动 server、进程级复用、`dispose` 统一回收）；4 个工具 `lsp_definition`/`lsp_references`/`lsp_diagnostics`/`lsp_symbols`（readOnly + toolset 'lsp'，deferred 激活，`tool_search` 不激活；无对应扩展名 server 时返回 `available:false` + 配置提示；diagnostics 优先 pull、无能力时回退 publishDiagnostics 缓存）；配置 `agentTools({ lsp: { servers: { '.ts': { command: 'typescript-language-server', args: ['--stdio'] } } } })`；`ToolSandboxPolicy` 增加 `lsp → readonly_fs` capability。测试：`agent-tools/test/lsp.spec.ts` 9 条（内嵌 mock LSP server：握手/能力/definitions/references/symbols/diagnostics/按扩展名惰性/未配置提示）；agent-tools 217 全绿。
4. ~~无 AGENTS.md 约定与 /init~~（现状：项目上下文只有 workspace mentions / 手动 focusSummary；Codex 有 `/init` 生成 AGENTS.md、opencode 有 `/init` + 提交到 git）→ **已完成**：`@tsdi/agent` 新增 `project/agents-doc.ts`（`findAgentsDoc`/`findProjectRoot`/`readAgentsDoc`，自 cwd 向上查找、遇 home/root 停止）与 `ProjectContextSection`（priority 20，注入 `## Project Context` 到 system prompt，mtime 缓存、缺文件跳过，`setProjectRoot` 可钉住根）；`project/init-agents-doc.ts` 提供 `analyzeProjectStructure`/`buildAgentsMdDraft`/`initAgentsDoc`（写入最近 `.git` 根、`--force` 覆盖）；agent-ui `/init` 命令 + help + commandHints。测试：agent `agents-doc.spec.ts` 8 条；agent 375 / agent-ui 241 全绿（`f854c919e`）。
5. ~~无文件级 undo/redo~~（现状：补偿/回滚只覆盖工具副作用（memory 等），写文件无快照；opencode 有 `/undo` `/redo` 可多次回退；Codex 靠 `codex apply` + git diff）→ **已完成**：`agent/src/harness/FileSnapshotStore.ts`（per-session undo/redo 栈，`push` 清 redo 分支、`undo`/`redo` 双栈迁移、`list`/`listRedo`/`clear`，限深 50 + 总字节 5MB 逐出最旧）；`AgentTool` 新增 `captureFileSnapshot?(input, context)` 钩子（与 `captureCompensation` 并存——文件类走快照栈、其余走 compensate）；`AgentRuntime` 新增 `undoFileChange`/`redoFileChange`/`listFileSnapshots` 抽象方法；`DefaultAgentRuntime` 在 invoke 前捕获 `{filePath, before}`、成功后回读 `after` 入栈，`undo` 恢复 before（null 则删除文件）、`redo` 重放 after，`fileSnapshotStore` 经 IoC 注入（module 注册）；agent-tools 5 个文件工具（write/edit/delete/move/copy）实现 `captureFileSnapshot`（move/copy 捕获目标路径）；gateway `session.undo_file`/`session.redo_file` RPC（`ensureSessionAccess`）；agent-ui `/undo` `/redo` 命令（本地 runtime / RPC 双路径 + commandHints/help）。测试：agent `file-undo.spec.ts` 8 条（栈语义/限深/限量/运行时还原与重放）、agent-tools 快照捕获 3 条、agent-ui 3 条、gateway RPC 2 条。另修复 gateway-server.spec 结构 bug：`AppRpcHandlerTest` 缺失 `@Suite`（其 2 条既有测试 + Tier1-6 的 2 条 plan-mode RPC 测试此前从未运行，现已全部运行）。agent 410 / agent-tools 208 / agent-ui 249 / gateway 125 全绿。
6. ~~无只读 Plan agent 模式~~（现状：`definition.execution?.readOnly` 是工具级标志，无会话级 plan 模式；opencode 有 Plan 主 agent（Tab 切换，edit deny、bash ask）；Codex 有 read-only sandbox + `/permissions`）→ **已完成**：会话级 `planMode` 状态（`AgentRuntime.setPlanMode`/`isPlanMode`，`DefaultAgentRuntime.sessionPlanModes` 按会话隔离）；`performToolInvocation` 在定义解析后、激活前 deny 非 `execution.readOnly` 工具（返回 `skipped` + 「plan mode」拒绝信息并回传模型）；system prompt 追加 `## Session mode` PLAN MODE 提示；gateway `session.plan_mode.set/get` RPC（`ensureSessionAccess` 鉴权）；agent-ui `/plan`（on/off/不带参切换）+ `/status` 命令、输入行 `· plan` 角标。测试：agent `plan-mode.spec.ts` 6 条；agent 381 / agent-ui 246 / gateway 119 全绿 + 三包 tsc clean（待提交）。

### Tier 2（中价值，按需）

7. ~~Playwright 级浏览器自动化~~（现状：`browser_open`/`text_browser` 是轻量文本浏览；Codex 有 Browser/Computer Use；opencode 有 playwright 技能）→ **已完成**：`agent-tools/browser/` 新增 adapter-driven `playwright_browser` 工具与 `PlaywrightBrowserAdapter` 契约，标准化 `navigate` / `click` / `type` / `screenshot` / `extract` 五类动作（`url` / `selector` / `text` / `wait_until` / `timeout_ms` / `format` / `quality` / `extract` / `attribute` 校验），抽取结果按 `maxExtractChars` 截断；`AgentToolsOptions.browser` 新增 `adapter` / `defaultTimeoutMs` / `maxExtractChars` 配置，module/provider 注入链、`browser` 分组 export、`withBrowserAgentTools()`、capability bundle metadata 全部接通；`@tsdi/agent` 默认审批策略与 `defaultAgentOptions.tools.requireApproval` 增补 `playwright_browser`，浏览器自动化执行默认进入审批面。测试：agent-tools 新增工具委派/缺 adapter/分组导出断言，agent 新增默认审批覆盖断言；全量回归：agent 423、agent-tools 219、agent-gateway 131、agent-ui 259、agent-cli 30 passing，`agent` / `agent-tools` / `agent-channels` / `agent-providers` `tsc --noEmit` clean。
8. ~~无会话分享/导出~~（opencode `/share` 生成分享链接；Codex 有会话存档/删除）→ **已完成**：`/export` 命令导出会话 transcript（`json` / `jsonl`，含 session 元数据、messages、toolCalls）；`AgentConsoleSessionService.exportSession()` 统一本地 / RPC 导出模型；gateway 新增 `session.export` RPC + `GET /api/sessions/:id/export`（owner 鉴权，`Content-Disposition` 下载头）；UI `/export [json|jsonl] [sessionId] [path]` 默认写入 `<workspace>/.tsdi-agent/exports/`，无可写 `FileAdapter` 时回退只读预览。测试：agent-gateway 新增 RPC/HTTP/403 覆盖，agent-ui 新增落盘与预览回退覆盖。
9. ~~无图像输入~~（Codex `-i` 附图像；opencode 拖拽图像入 prompt）→ **已完成**：`@tsdi/agent` 为 `AgentMessage` 增加跨平台 `parts` 结构（`text` / `image`，data-url），`DefaultAgentRuntime`/`AgentTurnInput`/gateway RPC 透传结构化输入且保持纯文本调用兼容；`RoutedModelAdapter` 基于结构化文本段做复杂度/route 提取；`OpenAICompatibleModelAdapter` 映射多模态 content array，`AnthropicModelAdapter` 映射 base64 image block。`@tsdi/agent-cli` 新增 `run -i|--image <path>`（可重复）并在 Node 边缘层读取文件转 data-url；`@tsdi/agent-ui` 新增 `/attach <path>` 与待发送附件状态，提交时透传给本地 runtime / RPC，消息渲染补充附件摘要。测试：agent `model-provider.spec.ts` +3，agent-cli `cli.spec.ts` +1，agent-ui `view-model.spec.ts` +2；回归：agent 422、agent-ui 259、agent-cli 30、agent-gateway 131、agent-tools 217 passing，`agent-channels` / `agent-providers` `tsc --noEmit` clean。
10. ~~非交互 exec 缺 JSON 事件流~~（现状：`tsdi-agent run` 只返回最终文本；Codex `exec --json` 输出 JSONL：thread.started/turn.started/turn.completed/item.*/error）→ **已完成**：`tsdi-agent run --json` 输出 JSONL 事件流（复用 gateway `EventHandler` 的 SSE 事件序列化），`--output-last-message` 兼容；新增 CLI 事件流测试。
11. ~~无 usage 聚合视图~~（Codex `/usage` daily/weekly/cumulative）→ **已完成**：gateway 新增 `GET /api/usage`（按天/周/累计 token + turn 数），`usage.stats` RPC，UI `/usage` 命令 + dashboard 行；数据复用 session 消息 `metadata.usage` + turn-diagnostics 记录。
12. ~~无用户可配置生命周期 hooks~~（opencode plugin hooks：chat.params/tool.execute.before/after/permission.ask；Claude Code PreToolUse/PostToolUse；现状框架只有内部 interceptor 管线）→ **已完成**：`@tsdi/agent` 新增纯运行时 hooks 基础设施（`hooks/AgentHooks.ts`：`beforeTurn` / `afterTurn` / `beforeTool` / `afterTool` / `onApproval` 五阶段、`AgentHookManager`、跨平台默认 `NoopAgentHookCommandExecutor`），`DefaultAgentRuntime` 在 turn / approval / tool 生命周期执行 hooks，并把 hook `stdout` 以 `system` hook message 注入会话上下文；`@tsdi/agent-cli` 新增 `NodeAgentHookCommandExecutor`，仅在 Node 边缘层经懒加载 spawn 执行 shell hook，`resolveCliConfig()` 从 `~/.tsdi-agent/hooks.json` 读配置并合入 `AgentOptions.hooks`，浏览器环境保持 no-op，不在 `agent` 核心直接绑定 Node。

### Tier 3（大改动 / 远期，仅记录）

- 桌面/IDE/Web 多面（opencode desktop + IDE 扩展 + web console）——需新 UI 工程，暂不排期。
- GitHub/GitLab 应用集成（Codex GitHub Action、opencode GitHub 集成、隐藏自动化 agent）——依赖平台 OAuth。
- 多代理 v2（可配置子代理模型/reasoning/并发度、子任务加密）——现有 delegation 基础上扩展。
- ~~每命令级模型路由（opencode command 可指定 model）——现有 profile 路由是会话/worker 级，命令级是超集。~~ → **已完成**：`AgentTurnInput` / `AgentRuntime.runTurn` / `runStreamingTurn` 增加可选 `profile`，`DefaultAgentRuntime.prepareModelRequest()` 让 turn 级显式 profile 优先于 session 级 profile 且仅影响当前一次请求；gateway `run.turn` / `run.turn_stream` 与 `ChatWebSocket` 透传 `profile`；agent-ui 新增 `/model once <profile>`，把 profile 排队到下一次 submit 后自动清空，不污染会话默认模型。测试：agent `turn profile overrides session model profile for that request only`、gateway JSON-RPC/stream/WebSocket 透传、agent-ui `/model once` 两条；全量回归：agent 425、agent-tools 219、agent-gateway 133、agent-ui 263、agent-cli 30 passing，`agent` / `agent-gateway` / `agent-ui` / `agent-channels` / `agent-providers` `tsc --noEmit` clean。
- 语音实时输入（Codex streaming realtime V3）——已有 TTS/STT 工具，但非实时双向。
- vim mode / keymap 定制（opencode）——TUI 输入层扩展。
- shell completion / doctor / update 命令族（Codex）——CLI 完善项；**phase 1 已完成 doctor，phase 2 已完成 completion，phase 3 已完成 update phase 1，phase 4 已完成 update check，phase 5 已完成 update status safety**：`tsdi-agent doctor [--json]` 输出本地环境、workspace/root/settings/provider/hooks/skills/MCP 配置与缺口诊断（缺 workspace、缺 API key、缺 skill root、invalid MCP transport 等），`tsdi-agent completion [bash|zsh|fish]` 生成静态 shell completion 脚本，`tsdi-agent update [--manager <name>] [--target <tag>] [--check] [--registry <url>] [--yes]` 生成或执行包管理器升级命令，并可先检查 registry 中的目标版本（默认只打印计划，不自动联网/改写安装；`--check --yes` 且已是最新、当前版本更高、或 registry 元数据里找不到目标时直接跳过安装）。同时把 `tools list` 整理为真实子命令树，并补齐 `normalizeCliArgv()` 对 `doctor` / `project` / `completion` / `update` 顶层命令识别。测试：agent-cli 45 passing；全量回归：agent 425、agent-tools 219、agent-gateway 133、agent-ui 263、agent-cli 45 passing，`agent` / `agent-tools` / `agent-gateway` / `agent-ui` / `agent-cli` / `agent-channels` / `agent-providers` `tsc --noEmit` clean。
- 远程会话（SSH 运行 opencode）——传输层新面。

### 建议执行顺序

1. ~~Tier1-1 MCP 远程传输~~（已完成，2026-08：agent-tools/mcp Streamable HTTP + OAuth + CLI `mcp` 命令族，205+26 测试全绿）
2. ~~Tier1-4 AGENTS.md + /init~~（已完成，2026-08：`ProjectContextSection` system prompt 注入 + `/init` 命令，agent 375 / agent-ui 241 全绿）
3. ~~Tier1-6 Plan 只读模式~~（已完成，2026-08：会话级 `planMode` + `/plan` `/status` + gateway RPC + system prompt 提示，agent 381 / agent-ui 246 / gateway 119 全绿）+ ~~Tier1-2 沙箱阶段一~~（已完成，2026-08：`sandbox-exec.ts` + `OsSandboxExecutor` + `sandboxMode` 配置 + coordinator 路由，agent 402 / agent-tools 205 全绿）
4. ~~Tier1-5 文件 undo/redo~~（已完成，2026-08：`FileSnapshotStore` 快照栈 + `captureFileSnapshot` 钩子 + `/undo` `/redo` + gateway RPC，agent 410 / agent-tools 208 / agent-ui 249 / gateway 125 全绿）
5. ~~Tier1-3 LSP 工具组~~（已完成，2026-08：`agent-tools/lsp/` 零依赖 LSP client + `LspServerManager` 惰性启动 + 4 个 lsp_* 工具，agent-tools 217 全绿）
6. ~~Tier2 按需~~（7 浏览器 / 8 导出 / 9 图像 / 10 JSON 事件 / 11 usage / 12 hooks 均已完成，见上）

## P35 规划：剩余点状差距 + Self-Harness 化 Harness（2026-08-03 调研，已完成，见 P36-P41）

### 对比结论（2026-08-03 第二轮）

P34 Tier1/Tier2 全部落地后，与 Codex / opencode 的能力差已从「结构性」转为「点状」。本轮重新对照 Codex CLI（developers.openai.com/codex，v0.14x）与 opencode（opencode.ai/docs），并引入 VeriLoop Coder-E1 的 Self-Harness（HF `veriloop-lab/veriloop-coder-e1` / `tsinghua-sigs-robot-lab/veriloop-coder-e1`；arXiv 2606.09498v1「Self-Harness: Harnesses That Improve Themselves」，基座 Qwen3.6-27B + 窄域 PEFT + 可拆卸 Surface Host Adapter）作为 Harness 优化参照：

- **A 面（剩余点状差距）**：`apply_patch` 统一补丁工具、审批自动评审（Codex `approvals_reviewer=auto_review`）、granular approval 类别 + 网络目的地规则、doom-loop 恢复、per-agent 权限矩阵、JS 函数插件（opencode plugin hook）、formatter。
- **B 面（结构性机会）**：现有 turn 循环骨架已具备 80% 的循证螺旋要素（receipts / AuditSink / TurnDiagnosticsStore / FileSnapshotStore / ToolLoopDetector / ToolExecutionCoordinator / experience distiller），缺的是**结构化证据模型 + 验证门 + 失败模式挖掘 + 可拆卸 harness profile**——这正是 Self-Harness「证据 → 证伪 → 探索 → 修复，验证通过才进下一轮」的运行时对偶（模型权重/PEFT 开源、编排私有，我们做的是编排侧）。

### Theme A 剩余点状差距（每项：现状 → 落地 → 断言）

1. **A1 apply_patch 统一补丁工具**（Codex/opencode 均有；现状 `agent-tools/files/edit-file.tool.ts` 仅 oldString/newString 精确替换，无统一 diff 语义）— ✅ 已完成（2026-08，见建议执行顺序第 2 项）
   - 落地：新增 `agent-tools/files/apply-patch.tool.ts`——minidiff 解析器（`*** Begin Patch` / `*** Add File` / `*** Update File` / `*** Delete File` / `*** Move to` / 上下文 hunk），复用 `./path-policy` 的 workspace 根/symlink 校验与 `captureFileSnapshot`（走既有 undo/redo 栈）；`execution.sideEffect + requiresSequential`，授权同 `edit_file`。
   - 断言：单文件多 hunk、Add/Delete/Move、上下文不唯一失败、符号链接拒绝、`/undo` 还原。
2. **A2 审批自动评审**（Codex `approvals_reviewer=auto_review`：评审 agent 只审需审批的动作）— ✅ 已完成（见 P37）
   - 落地：`agent/src/tools/ToolApprovalManager.ts` 增加可选 `ApprovalReviewer`（建议 approve/deny/needs-human，评审依据 = 工具定义 + 输入 + 会话证据 receipts/audit）；`DefaultApprovalStrategy` 增加 `autoReview` 选项；评审失败回退人工。
   - 断言：评审放行免人工、评审拒绝不进审批面、评审异常回退。
3. **A3 granular approval 类别 + 网络目的地规则**（Codex granular：sandbox/rules/mcp_elicitations/request_permissions/skill_approval；`network_proxy` 目的地约束）— ✅ 已完成（见 P37）
   - 落地：`AgentOptions.tools.requireApproval` 增加对象形态 `{ category: 'sandbox'|'network'|'mcp'|'skill', names?, mode: 'ask'|'auto-deny' }`（字符串形态向后兼容）；`sandbox mode='network-block'` 时支持放行目的地清单（近似 network_proxy）。
   - 断言：分类 auto-deny、字符串兼容、放行清单生效。
4. **A4 doom-loop 恢复**（opencode `doom_loop` permission：疑似卡住时注入恢复 prompt；现状 `ToolLoopDetector` 只 break 跳过）— ✅ 已完成（见 P36）
   - 落地：`DefaultAgentRuntime.completeTurn` 在 loopDetector block/break 或连续 falsify（见 B2）时注入 `LOOP_RECOVERY_SYSTEM_PROMPT`（要求换策略或声明受阻），复用 `buildEmptyResponseRetryRequest` 的注入路径。
   - 断言：循环 3 次注入恢复提示、模型改策略继续、仍循环则终止。
5. **A5 per-agent 权限矩阵**（opencode agent frontmatter `permission`：edit/bash/… allow|ask|deny + `steps`）— ✅ 已完成（见 P39）
   - 落地：`AgentTurnInput` 增加可选 `agent?: { permissions: Record<string, 'allow'|'ask'|'deny'>, maxSteps?: number }`；`performToolInvocation` 定义解析后按工具名/组匹配权限（ask 落入既有审批面）；gateway `run.turn`/`run.turn_stream` 透传。
   - 断言：deny 拒绝、ask 进审批、allow 直过、未匹配继承会话级。
6. **A6 JS 函数插件**（opencode plugin `tool.execute.before/after`；现状 `AgentHooks` 仅 shell 命令、浏览器 no-op）— ✅ 已完成（2026-08-04，见 P39）
   - 落地：`hooks/AgentHooks.ts` 增加函数式钩子（beforeTurn/afterTurn/beforeTool/afterTool/onApproval 的 `AgentHookFunction`，返回 `Partial<AgentHookExecutionResult>`，`beforeTool` 可返回 `input` 重写工具输入），`AgentHookManager` 静态收集（`AgentHooksOptions.functions`）+ 动态注册/卸载（`registerFunction`/`unregisterFunction`），`run()` 函数钩子先于 shell 钩子、异常归一为 error 结果不阻断；executor 缺省时函数钩子仍可用（浏览器场景）。
   - 落地：`AgentRuntime` 增加 `registerHookFunction`/`unregisterHookFunction` 默认空实现；`DefaultAgentRuntime` 委托 hookManager；`runTurnHooks` 改为返回函数钩子结果，`performToolInvocation` 在 beforeTool 钩子后应用 `input` 重写（重算 inputSummary/receipt，A5 权限检查顺序不变）。
   - 验证：`test/function-hooks.spec.ts` 7 项通过（静态重写/先于 shell/转录/动态注册卸载/异常不阻断/无 executor 可用/重写进 receipt）；agent 包全量 498 passing（491 基线 + 7）；五包回归 agent 498 / agent-tools 240 / agent-gateway 139 / agent-ui 263 / agent-cli 49，全部 `tsc --noEmit` clean。
   - 断言：函数钩子可改写 tool input、afterTool 读 receipt、异常不阻断主流程。
7. **A7 formatter**（opencode `formatter` 配置，`$FILE` 占位）— ✅ 已完成（见 P39）
   - 落地：`AgentOptions.format?: { command, extensions, env }`；写文件工具（write/edit/apply_patch）成功后可选调用，失败仅告警。
   - 断言：扩展名命中、失败回退、不改变既有内容语义。

### Theme B Self-Harness 化 Harness（循证螺旋）

现有骨架映射（已具备）：receipts（`AgentToolExecutionReceipt`）→ 证据来源；`AuditSink` / `TurnDiagnosticsStore` / `SummaryQualityStore` / `CompactionHistoryStore` / `DelegationGraphStore` → 证据存储；`FileSnapshotStore` → before/after 证据；`ToolLoopDetector` → 初级证伪；`ToolExecutionCoordinator`（schema 校验/限流/输出守卫/沙箱）→ 执行治理；experience distiller / memory → 跨会话证据复用。缺的：**结构化证据模型 + 验证门 + 失败模式挖掘 + harness profile**。

1. **B1 证据账本 `agent/src/harness/EvidenceLedger.ts`**（地基）— ✅ **已完成（2026-08-03）**
   - 每个工具调用归一为 `{ id, turnId, toolName, inputSummary, status, exitCode?, outputSummary, durationMs, falsified?, falsificationReason? }`；turn 结束时聚合进 `TurnDiagnosticsStore`（新增 `evidence` 段，向后兼容）。
   - 落地：`EvidenceLedger`（record/snapshot，turnId 自动生成）+ `TurnDiagnosticsRecord.evidence?` + InMemory/TypeOrm 持久化（entity 新增 `evidence` simple-json 列）+ `DefaultAgentRuntime`（turnContext.evidenceLedger 于 `processTurn`/`runStreamingTurn` 创建；`invokeSingleTool`/`executeToolsParallel` 两调用点记录 final receipt，parallel rejected 分支合成 error 证据；`recordTurnDiagnostics` 附 snapshot）。
   - 验证：`test/evidence-ledger.spec.ts` 7 项通过（单元聚合/不可变快照/InMemory 往返/TypeOrm 持久化/运行时混合工具串行+并行/模块装配）；agent 包全量 432 passing；五包回归 agent 432 / agent-tools 219 / agent-gateway 133 / agent-ui 263 / agent-cli 45，全部 `tsc --noEmit` clean。
   - 断言：条目与 receipt 一致、falsified 透传、聚合可查。
2. **B2 验证门 `VerificationGate`**（核心：只有通过验证的修正才进下一轮）— ✅ 已完成（见 P36）
   - `completeTurn` 每轮结束执行：结构化证伪检查（a）terminal 非零 exit / `lsp_diagnostics` error / `execute_code` 失败；（b）声明-行为不一致——`FileSnapshotStore` before/after 对比模型声称写入 vs 实际 diff；（c）loopDetector 触发。
   - falsified → 注入 `FALSIFICATION_REPAIR_PROMPT`（证据摘要 + 定向修复要求）+ `recordFalsification`；连续 falsify 轮次单独计数 `maxRepairRounds`，不占用正常 `maxToolRounds`。
   - 断言：失败输出→下轮收到修复提示；修复通过→正常继续；连续失败→终止给失败摘要；既有 turn 测试语义不变。
3. **B3 失败模式挖掘 `WeaknessMiner`**（对应 Self-Harness Weakness Mining：聚类执行轨迹发现失败模式）— ✅ 已完成（见 P38）
   - 输入 `TurnDiagnosticsStore` + `AuditSink`（跨会话，可限 workspace/session）；输出 Top 失败工具 / 错误签名聚类 / 失败轮次率 / falsified 分布，每条附「建议」= 命中现有 harness 策略的候选（如高频失败工具 → 建议加入 requireApproval）。
   - 面：`tsdi-agent harness audit [--json]`（agent-cli）+ agent-ui `/harness audit`。
   - 断言：合成轨迹聚类正确、空库返回空、CLI JSON 形状稳定。
4. **B4 Harness Profile**（对应 Surface Host Adapter 的运行时对偶：可拆卸、版本化、可回滚）— ✅ 已完成（见 P38）
   - 把治理配置（requireApproval、sandbox、maxRepairRounds、falsification 阈值、granular 类别、formatter）快照为版本化 `HarnessProfile` JSON，`AgentOptions.harnessProfile` 引用；`tsdi-agent harness profile list/apply/diff` + agent-ui `/harness profile`；升级默认 profile =「提案」，跑全量回归 = Proposal Validation（与 Self-Harness 三阶段一致）。
   - 断言：profile 序列化往返、apply 生效（如 requireApproval 变化）、diff 可读、默认 profile 兼容旧配置。
5. **B5 循证摘要**（`LLMSessionSummarizer` 注入「本轮证据」段；`SummaryQualityStore` 增加 `evidenceCoverage` 指标 = 摘要提及的成功/失败工具占比）— ✅ 已完成（见 P41）
- 断言：注入后摘要含证据、evidenceCoverage 计算正确、质量分仍可解释。
6. **B6 不确定性校准路由**（对应 PEFT 适配器之一 uncertainty-calibrated routing）— ✅ 已完成（见 P40）
- `RoutedModelAdapter.routes` 增加 `when.falsifyRateGt` 条件（消费 ledger 聚合：高 falsify 率 → 切强 profile 或声明低置信）。
- 断言：高失败轨迹→路由切换、无 ledger 时跳过。

### 建议执行顺序

1. **B1 证据账本**（B 面地基，对既有 receipt 路径零破坏）— ✅ 已完成
2. **A1 apply_patch**（工具面最高频差距）— ✅ 已完成（2026-08：`agent-tools/files/apply-patch.tool.ts` + 注册 + 多文件快照 undo/redo）
3. **A4 doom-loop 恢复** + **B2 验证门**（核心机制，直接对应 Self-Harness 循环）— ✅ 已完成（见 P36）
4. **A2 审批自动评审** / **A3 granular + 网络规则**（审批面加固，可与 B 并行）— ✅ 已完成（见 P37）
5. **B3 失败模式挖掘** ✅（见 P38） + **B4 Harness Profile** ✅（见 P38，让「优化 Harness」本身进入循证循环）
6. **A5 per-agent 权限** / **A6 JS 插件** / **A7 formatter**（按需）— ✅ 全部已完成（见 P39）
7. **B5 循证摘要**（让压缩质量反映工具结果保真度）— ✅ 已完成（见 P41）
8. **B6 不确定性校准路由**（对应 PEFT uncertainty-calibrated routing）— ✅ 已完成（见 P40）

### 回归口径

每项完成后包内测试 + 全量回归（agent / agent-tools / agent-gateway / agent-ui / agent-cli），`tsc --noEmit` clean；B 项必须保证既有 turn 行为测试（turn-loop / tool-execution / plan-mode / sandbox / undo-redo）语义不变。

## P36 打磨（已完成）：A4 doom-loop 恢复 + B2 验证门

1. ~~A4 doom-loop 恢复 + B2 验证门~~ → 已完成，贯穿 `completeTurn` / `completeStreamingTurn` 两条路径（`@tsdi/agent`）：
   - **VerificationGate**（新 `src/harness/VerificationGate.ts`）：结构化证伪检查——(a) 本轮证据中 `status === 'error'` 或非零 `exitCode`（terminal / lsp_diagnostics / execute_code 失败统一走 error 证据）；(b) 声明-行为不一致——写工具（`DEFAULT_VERIFICATION_WRITE_TOOLS`：write/edit/apply_patch/move/copy/delete/mkdir）调用后 `before === after`（实际无 diff）→ 本轮标记。`verify(ledger, startIndex, writeHints)` 只检查 `startIndex` 之后的新证据，前轮失败不重复判定。
   - **记录**：`EvidenceLedger` 新增 `entriesFrom(startIndex)`（只读切片）与 `markFalsified(entryIds, reason)`（`recordFalsification`，snapshot 的 falsifiedCount/falsified 标志落库）；`AgentTurnDiagnostics` 新增可选 `loopRecoveryCount` / `falsificationCount`，经 `recordTurnDiagnostics` 写进 record.metadata（不扩 entity schema）。
   - **运行时**：`TurnExecutionContext.recovery` 承载 `loopPending / loopInjections / repairPending / repairInjections / consecutiveFalsifications / totalFalsifications / falsifiedEvidence / writeHints / terminated / terminationMessage`；`performToolInvocation` 在 `loopDetector.record` detected 时置 `loopPending`，写工具成功但内容未变时收集 `writeHints`；`runVerificationGate` 每轮工具执行后跑 gate（falsified → markFalsified + 计数 + 置 repairPending，`consecutiveFalsifications >= maxRepairRounds` 时置 terminated）；`resolveRecoveryTermination` 在每轮开头处理终止（B2 failure summary 或 A4 循环阻塞声明）；`maybeInjectRecoveryPrompt` 复用 `buildEmptyResponseRetryRequest` 的 system 前置注入路径——`loopPending` → `LOOP_RECOVERY_SYSTEM_PROMPT`（要求换策略或声明受阻），`repairPending` → `FALSIFICATION_REPAIR_PROMPT`（含证据摘要 + 定向修复要求，`consecutiveFalsifications >= 2` 时升级为 loop recovery 提示）。
   - **配置**：`AgentOptions` 新增 `maxRepairRounds`（默认 2）、`maxLoopRecoveries`（默认 3）、`verificationWriteTools`（可覆盖默认写工具集）；修复轮不触发普通 `maxToolRounds` 限制语义（A4/B2 各自提前终止，既有 round-limit 路径保持）。
   - **测试**：新 `test/verification-gate.spec.ts` 10 条——gate 单元（error 证据当前轮判定 + startIndex 隔离、无 diff 写提示、markFalsified）、A4（循环 3 次注入后阻塞终止、诊断 loopRecoveryCount 落库、模型收到提示后改策略正常完成、streaming 循环终止）、B2（失败→下轮修复提示→连续失败终止 failure summary、修复通过后正常继续且失败证据 falsified=true、maxRepairRounds=3 时连续失败升级为 loop recovery 提示后终止）。
   - 文档：本条目；建议执行顺序第 3 项标记完成。
   - 回归说明：`ToolLoopDetector.record` 每次工具调用记录两次（invoke 前 + 执行后），block 检测比单次记录早一轮——A4 测试适配器按此节奏编写；agent-tools 2 条 `filesystem_write` 分组断言（`apply_patch` 注册遗留）随本次一并修正。

全量回归：agent 442（432+10）、agent-tools 233（231+2 修正）、agent-gateway 133、agent-ui 263 passing；agent-cli 44 passing（1 条 `update check reads latest version from registry metadata` 因本机 npm registry 配置为 npmmirror 镜像导致硬编码 npmjs.org 断言失败，属环境差异，与本次改动无关）；agent / agent-tools / agent-gateway / agent-ui / agent-channels / agent-providers `tsc --noEmit` clean。

## P37 打磨（已完成）：A2 审批自动评审 + A3 granular 类别 + 网络目的地放行

1. ~~A2 审批自动评审 + A3 granular approval 类别 + 网络目的地规则~~ → 已完成（`@tsdi/agent`）：
   - **A2 ApprovalReviewer 自动评审**（`src/tools/ToolApprovalManager.ts`）：
     - 新契约 `ApprovalReviewer`（`review(ctx)` 返回 `'approve' | 'deny' | 'needs-human'` 或 `{ action, reason? }`）+ 注入 token `AgentApprovalReviewer`（构造末尾 `@Optional @Inject` 注入，无则跳过）。
     - `ApprovalManagerOptions.autoReview?: boolean` 与 `ApprovalStrategy.autoReview?: boolean` 双开关（options 优先）；开启且注入 reviewer 时 `checkApproval` 先跑 `runAutoReview`：approve/deny 直接 publish `AgentApprovalRequested`+`AgentApprovalCompleted` 事件、写审计（`reviewed: 'auto'` + reviewReason）、不进 pending 面；`needs-human` / reviewer 抛异常 → 回退人工 pending 流程。默认关闭，行为零破坏。
   - **A3 granular 规则形态**：
     - `ApprovalRule = string | ApprovalRuleObject`；对象形态 `{ category: 'sandbox'|'network'|'mcp'|'skill', names?, mode?: 'ask'|'auto-deny' }`；字符串形态（含 `*` 通配）完全向后兼容。
     - `APPROVAL_CATEGORY_DEFINITIONS` + `classifyApprovalCategory(toolName)`（network: web_/http_/browser_ 前缀 + 显式名单；mcp: `mcp.`/`mcp_`；skill: `skill.`/`skill_`；sandbox: terminal/process.*/bash 等显式名单；固定顺序去重）。
     - `DefaultApprovalStrategy` 重构：规则表从 `Set<string>` 改为 `ApprovalRule[]`（保留默认阻止名单），`requires` 支持 category 规则（names 过滤可选），新增 `autoDenies`（`mode: 'auto-deny'` 命中 → `checkApproval` 直接 DENIED + 事件 + 审计，等同既有 `autoDeny` 路径）。
   - **A3 网络目的地放行**：`AgentSandboxOptions.networkAllowlist?: string[]`（hostname / URL 前缀）+ `sandbox-exec.ts` 新增 `commandReferencesAllowlistedDestination(commandLine, allowlist)`；`OsSandboxExecutor.execute` 在 `mode==='network-block'` 且命令命中放行清单时降级为 `'workspace'`（仍限写 workspace，近似 network_proxy 目的地约束）。
   - **配置接线**：`AgentToolOptions.requireApproval?: ApprovalRule[]`（字符串兼容）+ `approvalAutoReview?: boolean`；`DefaultAgentRuntime.resolveApprovalManager` 透传 `autoReview`。
   - **测试**：`test/tools.spec.ts` +8——A2（reviewer approve 免人工、deny 不进审批面、needs-human 回退 pending、reviewer 异常回退、未开启时 reviewer 被忽略）；A3（granular category 仅命中匹配工具、auto-deny 模式、`classifyApprovalCategory` 名称/前缀/未命中）。
   - 文档：本条目；建议执行顺序第 4 项标记完成。

全量回归：agent 450（442+8）、agent-tools 233、agent-gateway 133、agent-ui 263 passing；agent-cli 44 passing（1 条环境失败同 P36 说明，npm 镜像差异，与本次无关）；agent / agent-tools / agent-gateway / agent-ui / agent-channels / agent-providers `tsc --noEmit` clean。

## P38 打磨（已完成）：B3 失败模式挖掘 + B4 Harness Profile

1. ~~B3 失败模式挖掘 `WeaknessMiner`~~ → 已完成（`@tsdi/agent` + gateway + UI + CLI）：
   - **核心**（新 `src/harness/WeaknessMiner.ts`，导出 `HarnessAuditScope` / `HarnessFailureToolStat` / `HarnessErrorCluster` / `HarnessFalsifiedStat` / `HarnessAuditSuggestion` / `HarnessAuditReport` / `normalizeErrorSignature` / `mineWeaknesses` / `WeaknessMiner`）：
     - `mineWeaknesses(records, auditRecords?, options?)` 纯函数：`TurnDiagnosticsRecord.evidence`（B1 证据账本）为权威工具级来源；无 evidence 的 legacy 记录由 `AuditSink` 兜底映射成同形状条目。作用域（sessionIds / since / topN / failureRateThreshold / minFailures）在纯函数内生效。
     - 输出：Top 失败工具（`failureRate` 保留一位小数，只含 failures>0）、错误签名聚类（`normalizeErrorSignature`：错误码 `E[A-Z0-9]{2,}` / `ERR_` 优先，否则首行小写截断 80）、失败轮次率（含 ≥1 失败 entry 的 turn 占比）、falsified 分布（B2）、建议（高频失败 shell 工具 → `approval`；非 shell 高频失败 → `tool`；falsified≥minFailures → `verification`；网络错误签名聚类 → `sandbox` + networkAllowlist 候选）。
     - `WeaknessMiner` @Injectable：`@Optional` 注入 `TurnDiagnosticsStore` + `AuditSink`，`mine()` 读库后按 sessionIds 过滤再调纯函数；注册进 `agent.module.ts` providers。
   - **gateway**：`AppRpcServer` 注入 `WeaknessMiner`，新 RPC `harness.audit`（白名单 + capabilities）+ `runHarnessAudit`：显式 sessionId → `ensureSessionAccess` 后单会话挖掘；无 sessionId → `owners.listOwned` 过滤到主体会话。`--session` 语义与 `turn_diagnostics.stats` 一致。
   - **agent-ui**：`AgentConsoleSessionService.runHarnessAudit(sessionId?, options?)`；`AgentConsoleComponent` 新 `/harness audit [sessionId]`（`openHarnessAudit` 渲染 scope/turns/fail-turn/tools/clusters/falsified/suggestions 多行）+ `/help` 菜单项 + `commandHints` 注册 `/harness`。
   - **agent-cli**：`TOP_LEVEL_COMMANDS` 加 `harness`；新 `src/harness-command.ts`：`runAgentHarnessAudit` 经 `runAgentApplication` 建 ctx 后 `ctx.get(WeaknessMiner).mine({ sessionIds: options.session ? [options.session] : undefined })`，`--json` 输出或 `formatHarnessAuditReport` 人类可读（含长 sessionId 截断）。
   - **测试**：agent `test/weakness-miner.spec.ts` 9 条（签名归一化、evidence 聚类、approval/verification 建议、空输入、audit 兜底、session/since 作用域、服务级读库）；gateway `gateway-server.spec.ts` +3（owned 会话作用域 + capabilities、foreign 拒绝 -32003、无 miner 返回 null）；agent-cli `cli.spec.ts` +2（argv 归一化、报告格式化）。既有 turn 行为测试语义不变。
   - 文档：本条目；建议执行顺序第 5 项前段标记完成（B4 同项待完成）。

2. ~~B4 Harness Profile（版本化治理快照 + CLI/UI/RPC）~~ → 已完成（`@tsdi/agent` + gateway + UI + CLI）：
   - **核心**（新 `src/harness/HarnessProfile.ts`，导出 `HarnessProfile` / `HARNESS_PROFILE_VERSION` / `HARNESS_PROFILE_FIELDS` / `deriveGranularCategories` / `snapshotHarnessProfile` / `applyHarnessProfile` / `diffHarnessProfiles` / `serializeHarnessProfile` / `parseHarnessProfile` / `createDefaultHarnessProfile` / `getBuiltinHarnessProfiles` / `resolveHarnessProfile` / `applyHarnessProfileReference`）：
     - `HarnessProfile { name, version, requireApproval?, sandbox?, maxRepairRounds?, maxLoopRecoveries?, verificationWriteTools?, granularCategories?, formatter? }`，`version = 1`，`HARNESS_PROFILE_FIELDS` 固定字段序（diff/序列化稳定）。
     - `snapshotHarnessProfile(options, name)` 从 AgentOptions 抓 governance 快照；`applyHarnessProfile(profile)` 产出 partial 覆盖层；`diffHarnessProfiles` 逐字段 JSON 比较输出 `field: a → b` 行；`serialize/parse` 校验 name/version（畸形拒绝）；`createDefaultHarnessProfile` = 旧默认治理快照；`getBuiltinHarnessProfiles()` 惰性构建 `{default, strict}`（避免 options ↔ profile 循环导入在模块初始化期读 `defaultAgentOptions`）；`strict` = network 分类审批 `{category:'network', mode:'ask'}` + `sandbox network-block` + `maxRepairRounds 1` + `maxLoopRecoveries 2` + `DEFAULT_VERIFICATION_WRITE_TOOLS` + granular `['network','sandbox']`；`resolveHarnessProfile`（string 查内置 / 对象直通 / 未知名或畸形 → undefined）。
     - `AgentOptions.harnessProfile?: string | HarnessProfile`（verificationWriteTools 之后）；`mergeAgentOptions` 先 `resolveHarnessProfile(options.harnessProfile)` → `applyHarnessProfile` 覆盖层铺底，再铺显式 options（default → profile → explicit 三层合并，显式优先，`tools`/`sandbox` 子对象逐层合并）。`src/index.ts` 导出。
   - **gateway**：`AppRpcServer` 白名单 + capabilities 新增 `harness.profile.list` / `harness.profile.current` / `harness.profile.diff`：list 返回内置 profiles + 当前引用；current 解析引用（string → 内置 / 否则 live 快照）；diff 支持内置名或 `current`，未知名返回 `{ error }`。
   - **agent-ui**：`AgentConsoleSessionService.listHarnessProfiles / currentHarnessProfile / diffHarnessProfiles`；`AgentConsoleComponent` 新 `/harness profile [list|current|diff <from> <to>]`（`openHarnessProfile` 渲染 profiles/approval 规则/sandbox/diff 多行）+ `/help` 菜单项 + `commandHints` 注册 `/harness profile`。
   - **agent-cli**：`src/harness-command.ts` 新增 `runAgentHarnessProfileList`（纯注册表，不启 runtime）/ `runAgentHarnessProfileCurrent` / `runAgentHarnessProfileDiff`（经 `runAgentApplication` 建 ctx 后读 `AGENT_OPTIONS` merge 快照）+ `formatHarnessProfileList / formatHarnessProfileCurrent / formatHarnessProfileDiff`；cli.ts 注册 `harness profile` / `harness profile:list` / `harness profile:current` / `harness profile:diff <from> [to]`；settings.json 新增 `harness.profile` 键（`AgentRootSettings.harness`），`resolveCliConfig` 透出 `harnessProfile`，`runAgentPrompt` / `runAgentStreaming` 的 agentOptions 注入 `harnessProfile`（CLI 侧持久化引用）。
   - **测试**：agent `test/harness-profile.spec.ts` 12 条（序列化往返、畸形拒绝、默认 profile = 旧默认、strict apply 生效、显式 options 优先、内联对象、未知名回退、diff 可读、内置解析、granular 派生、无 profile 不变）；gateway `gateway-server.spec.ts` +3（list + capabilities、current 解析 options 引用、diff + 未知名错误）；agent-cli `cli.spec.ts` +2（list/current 格式化、diff 格式化）。既有 turn 行为测试语义不变。
   - 文档：本条目；建议执行顺序第 5 项后段标记完成（B4 已完成）。

全量回归：agent 471（459+12）、agent-tools 233、agent-gateway 139（136+3）、agent-ui 263 passing；agent-cli 48 passing（1 条环境失败同 P36/P37 说明，npm 镜像差异，与本次无关）；agent / agent-tools / agent-gateway / agent-ui / agent-channels / agent-providers `tsc --noEmit` clean。

## P39 打磨（已完成）：A5 per-agent 权限 + A6 JS 函数插件 + A7 formatter

1. ~~A5 per-agent 权限矩阵~~ → 已完成（`@tsdi/agent`）：
   - 落地：`AgentTurnInput` 增加可选 `agent?: { permissions?: Record<string, 'allow'|'ask'|'deny'>, maxSteps?: number }`；`DefaultAgentRuntime.performToolInvocation` 定义解析后按工具名/组匹配权限（`deny` 拒绝、`ask` 落入既有审批面、`allow` 直过、未匹配继承会话级）；gateway `run.turn` / `run.turn_stream` 透传。
   - 验证：`test/agent-permission.spec.ts` 7 项通过。
2. ~~A6 JS 函数插件~~ → 已完成（`@tsdi/agent`）：
   - 落地：`hooks/AgentHooks.ts` 增加函数式钩子（beforeTurn/afterTurn/beforeTool/afterTool/onApproval 的 `AgentHookFunction`，返回 `Partial<AgentHookExecutionResult>`，`beforeTool` 可返回 `input` 重写工具输入），`AgentHookManager` 静态收集（`AgentHooksOptions.functions`）+ 动态注册/卸载（`registerFunction`/`unregisterFunction`），`run()` 函数钩子先于 shell 钩子、异常归一为 error 结果不阻断；executor 缺省时函数钩子仍可用（浏览器场景）。
   - 落地：`AgentRuntime` 增加 `registerHookFunction`/`unregisterHookFunction` 默认空实现；`DefaultAgentRuntime` 委托 hookManager；`runTurnHooks` 改为返回函数钩子结果，`performToolInvocation` 在 beforeTool 钩子后应用 `input` 重写（重算 inputSummary/receipt，A5 权限检查顺序不变）。
   - 验证：`test/function-hooks.spec.ts` 7 项通过。
3. ~~A7 formatter~~ → 已完成（`@tsdi/agent` + `agent-tools`）：
   - 落地：`AgentOptions.format` 三工具桥接 + settings 配置（见前轮 formatter 全套）。
   - 验证：`agent-tools/test/formatter.spec.ts` 7 项 + `agent/test/harness-profile.spec.ts` 13 项通过。
   - 文档：本条目；建议执行顺序第 6 项标记完成。

全量回归（含性能修复：agent-ui 测试耗时 3.157min → 1.168min）：agent 498（491+7 function-hooks）、agent-tools 240（233+7 formatter）、agent-gateway 139、agent-ui 263、agent-cli 49（较 P38 修正 1 条 registry 环境差异）passing；agent / agent-tools / agent-gateway / agent-ui / agent-cli `tsc --noEmit` clean。既有 turn 行为测试（turn-loop / tool-execution / plan-mode / sandbox / undo-redo）语义不变。

## P40 打磨（已完成）：B6 不确定性校准路由

1. ~~B6 不确定性校准路由~~ → 已完成（`@tsdi/agent`）：
   - **契约**：`AgentModelRouteWhen.falsifyRateGt?: number`（0-1 阈值，严格大于才命中）；`ModelRequest.falsifyRate?: number`（本轮 falsify 率，无工具证据时为 undefined）。
   - **运行时注入**：`DefaultAgentRuntime` 新增 `computeTurnFalsifyRate(turnContext)`——`evidenceLedger.entriesFrom(0)` 中非 skipped 条目里 `falsified === true` 占比；无 ledger / 空账本 / 无 measured 条目 → undefined。`prepareModelRequest` 增加第 4 参 `falsifyRate`，非 null 时写入 `request.falsifyRate`；`completeTurn` / `completeStreamingTurn` 的每轮模型请求与终局请求均注入当前值（falsify 率随修复推进累计，成功修复后回落）。
   - **路由**：`RoutedModelAdapter.selectAdapter` 读取 `request.falsifyRate` 并透传 selection/metadata；`routeMatches` 新增 `falsifyRateGt` 判定（`falsifyRate == null || falsifyRate <= threshold` → 不命中；无 ledger 证据永不命中）；metadata.routing 附带 `falsifyRate`。
   - **顺带修复（预存在 bug）**：`resolveRouteConfig` 对「仅引用 profile 名、无内联配置」的 route（README 文档形态，如 `{ when, profile: 'strong' }`）失效——`pickConfig(route)` 返回全 undefined 字段对象，`mergeConfigs` 展开时把已合并的 provider/model 覆盖成 undefined，`!provider && !model` 判 null 后回落默认配置。修复：`pickConfig` 剔除 undefined 字段（有值字段行为不变，既有 hermes/内联配置路由测试不受影响）。该 bug 自 `85a8181ef`（route delegation worker classes to model profiles）引入。
   - **测试**：agent `test/model-provider.spec.ts` +3（`falsifyRateGt` 高于阈值 → 切 strong profile 且 metadata 带 falsifyRate、低于阈值跳过、无 ledger 证据跳过）；`test/turn-diagnostics.spec.ts` +2（runtime 在 falsified 工具轮后的下个请求注入 `falsifyRate > 0`、新 turn 空账本重置为 undefined；无工具证据的 turn 不设 falsifyRate）。
   - 文档：本条目；建议执行顺序第 8 项标记完成。

全量回归：agent 504（含 B6 新增 5 条）、agent-tools 240、agent-gateway 140、agent-ui 269 passing + 1 条预存在 fold-panel 渲染失败（`togglesPanelSummaryAndDetailThroughHtmlRenderer`，git stash 基线双跑确认与本次无关）、agent-cli 49 passing；agent `tsc --noEmit` clean。既有 turn 行为测试（turn-loop / tool-execution / plan-mode / sandbox / undo-redo）语义不变。

## P41 打磨（已完成）：B5 循证摘要

1. ~~B5 循证摘要~~ → 已完成（`@tsdi/agent`，commit `c09bc7f93`）：
   - **契约**：`SessionSummarizer.summarize(messages, evidence?: ToolEvidenceEntry[])` 增加可选证据参数；`DefaultAgentRuntime.maybeSummarize(sessionId, evidence?)` 在 `run()` / `runStreaming()` 两条路径把 `turnContext.evidenceLedger?.entriesFrom(0)` 传入（仅触发 summaryThreshold 压缩时）。
   - **LLM/fallback 注入**：`LLMSessionSummarizer` 把「本轮证据」段拼进模型 prompt（success/error/falsified 分工具列出，来自 B1 证据账本）；无模型时的 fallback 摘要同样反映失败工具，压缩内容不再丢失工具结果保真度。
   - **evidenceCoverage 指标**：`SummaryQualityScorer` 新增 `computeEvidenceCoverage(summary, evidence)` = 摘要中提及的工具名占（非 skipped）证据条目的比例（0-100）；`SummaryQualityStore` 的记录/聚合/趋势均携带 `evidenceCoverage`（只统计有 evidence 的 measured 记录）；`TypeOrmSummaryQualityStore` 经 metadata 往返持久化。
   - **测试**：`test/summary-quality.spec.ts` 新增 `Evidence coverage metric` Suite 10 条（无证据→undefined、全 skipped→undefined、提及比例、部分提及、分母排除 skipped、全未提及→0、聚合只算 measured、typeorm metadata 往返、有证据且提及→记录、无证据→不设）；`test/context-compaction.spec.ts` +2（fallback 反映 ledger 失败工具、evidence 传入模型 prompt）。
   - 文档：本条目；建议执行顺序第 7 项标记完成。
   - 说明：B5 实现先行（早于 P39/P40 提交），todo.md 记录滞后，本次补录。

验证：`summary-quality.spec.ts` 31 passing（含 Evidence coverage metric Suite）、`context-compaction.spec.ts` 85 passing；agent 全量 504 passing（当前基线，含 B6 5 条）；`tsc --noEmit` clean。

## P42 规划：多代理 v2（per-spawn 模型 / reasoning / 并发度 + 子任务加密）

1. **A-per-spawn 模型覆盖（profile）**：
   - 契约：`SpawnAgentInput.profile?: string`、`NestedAgentRunRequest.profile?: string`；`spawn_agent` / `parallel_spawn`（per-task）/ `orchestrate`（per-task）schema 增加 `profile`。
   - 落地：`LightweightAgentRunner.runSingle` 显式 `request.profile` 优先 → `runtime.runTurn(sessionId, prompt, undefined, undefined, profile)`（turn 级覆盖，不改会话级 `sessionModelProfiles`）；否则回退 workerClass → `workerModelProfiles`（既有路径）；delegation metadata 记录所选 profile。
   - 验证：`agent-tools/test/delegation-v2.spec.ts` 断言显式 profile 优先于 workerModelProfiles / 会话默认。
2. **A-per-spawn reasoning 覆盖**：
   - 契约：`AgentTurnAgentConfig.reasoning?: boolean`（复用既有 `agent` 透传面，gateway `run.turn` 免改签名即获得 RPC 透传）；`ModelRequest.reasoning?: boolean`。
   - 落地：`prepareModelRequest` 增加第 5 参 `reasoning?`（`falsifyRate` 之后），非 null 写入 `request.reasoning`；`completeTurn` / `completeStreamingTurn` 从 `turnContext.agent?.reasoning` 传入；adapter 侧：`AnthropicModelAdapter` 当 `request.reasoning` 时 `body.thinking = { type: 'enabled', budget_tokens: thinkingBudget || 2048 }`（保留既有 `options.thinkingBudget > 0` 自动开启），`OpenAICompatibleModelAdapter` 当 `request.reasoning` 时 `body.reasoning_effort = 'high'`。
   - 验证：agent `test/model-provider.spec.ts` +2（anthropic body.thinking / openai reasoning_effort）；gateway `run.turn` agent.reasoning 透传。
3. **A-并发度上限**：
   - 契约：`AgentToolsDelegationOptions.concurrency?: number`（默认 undefined = 不限，保持既有行为）；`NestedAgentRunRequest.concurrency?: number`；`parallel_spawn` input 增加 `concurrency?: number`。
   - 落地：`nested-agent-runner.ts` 导出有界并发工具 `runWithConcurrency<T>(items, limit, fn)`；`NestedAgentRunner.runParallel` 与 `LightweightAgentRunner.runParallel` 均按 `limit = request.concurrency ?? options.delegation.concurrency ?? Infinity` 分片调度（orchestrate 各 phase 经 `adapter.spawnParallel` → runner.runParallel 自动受控）。
   - 验证：`delegation-v2.spec.ts` 用假 runtime 记录并发水位，断言 `concurrency=2` 下 4 任务峰值 ≤ 2 且结果全量返回。
4. **A-子任务加密**：
   - 契约：`AgentToolsDelegationOptions.encryption?: { key?: string; keyEnv?: string }`（AES-256-GCM）；`SpawnAgentInput.secrets?: Record<string, string>`（spawn/parallel/orchestrate 均支持）。
   - 落地：新增 `agent-tools/src/delegation/crypto.ts` — `createDelegationCipher(key)`：SHA-256 派生 32 字节密钥，随机 12 字节 IV + 16 字节 auth tag，base64 `iv.tag.ciphertext`；`sealRecord(record, sensitiveKeys)` 对 delegation metadata 的 goal/context/secrets 加密落盘、明文移除；`LightweightAgentRunner.runSingle` 解密 secrets 后以 `## Secrets` 段注入子代理 prompt（仅内存，不进 metadata / 日志）；未配置 key → 明文透传（零行为变化）。
   - 验证：`delegation-v2.spec.ts` — 加解密往返、篡改 → 抛错、同明文两次密文不同（随机 IV）、metadata 无明文、child prompt 含解密 secrets、无 key 时 metadata 明文不变。

实现顺序：agent 侧（AgentTurnInput/ModelRequest/adapters/prepareModelRequest）→ agent-tools 侧（options/crypto/runner/工具 schema）→ gateway 透传 → 测试 → 五包全量回归 + agent `tsc --noEmit` → todo.md 收尾 + 提交。

## P42 打磨（已完成）：多代理 v2

1. ~~A-per-spawn 模型覆盖（profile）~~ → 已完成（`@tsdi/agent-tools`，本次提交）：
   - 契约落地：`SpawnAgentInput.profile?`、`NestedAgentRunRequest.profile?`；`spawn_agent` / `parallel_spawn`（per-task）/ `orchestrate`（per-task）schema 增加 `profile`；`resolveWorkerModelProfile` 改为 `request.profile ?? workerModelProfile`（显式 profile 短路 worker-class 映射）。
   - 落地：`LightweightAgentRunner.runSingle` 显式 `request.profile` 优先 → turn 级 `runTurn(..., profile)` 覆盖（不写会话级 `sessionModelProfiles`，无需清理）；否则回退 workerClass → `workerModelProfiles`（既有路径，try/finally 清理保留）。
   - 测试：`agent-tools/test/delegation-v2.spec.ts` — `explicitProfileOverridesWorkerProfile`（显式 profile 走 turn 级且不触碰 setSessionModelProfile）、`workerProfileStillApplies`（无显式 profile 时 worker-class 映射仍生效）。
2. ~~A-per-spawn reasoning 覆盖~~ → 已完成（`@tsdi/agent`，本次提交）：
   - 契约落地：`AgentTurnAgentConfig.reasoning?: boolean`（复用既有 `agent` 透传面，gateway `run.turn` 签名不变即获得 RPC 透传）、`ModelRequest.reasoning?: boolean`。
   - 落地：`prepareModelRequest(sessionId, request, profile?, falsifyRate?, reasoning?)` 第 5 参，8 处调用均传 `turnContext.agent?.reasoning`；`AnthropicModelAdapter` 当 `request.reasoning === true` 时 `body.thinking = { type: 'enabled', budget_tokens: thinkingBudget || 2048 }`（保留 `options.thinkingBudget > 0` 自动开启）；`OpenAICompatibleModelAdapter` 当 `request.reasoning === true` 时 `body.reasoning_effort = 'high'` 且丢弃 `temperature`（reasoning 模型拒绝 temperature）。
   - 测试：`agent/test/model-provider.spec.ts` +2（anthropic body.thinking 默认 budget 2048 / openai reasoning_effort=high 且无 temperature）。
3. ~~A-并发度上限~~ → 已完成（`@tsdi/agent-tools`，本次提交）：
   - 契约落地：`AgentToolsDelegationOptions.concurrency?`（默认 undefined = 不限）；`NestedAgentRunRequest.concurrency?`；`parallel_spawn` input 增加 `concurrency?`。
   - 落地：`nested-agent-runner.ts` 导出 `runWithConcurrency<T>(items, limit, fn)`（`limit` 无/≤0/≥len → 不设限直跑，返回顺序保持的 `PromiseSettledResult[]`）；`NestedAgentRunner.runParallel`（取 `requests[0].concurrency`）与 `LightweightAgentRunner.runParallel`（`request.concurrency ?? options.delegation.concurrency`）均按 limit 分片。
   - 测试：`delegation-v2.spec.ts` — `concurrencyBounded`（峰值 ≤ 2 且顺序保持）、`concurrencyUnbounded`（undefined/超大 limit 不限）、`parallelBatchConcurrency`（4 任务 concurrency=2 峰值 ≤ 2 全量返回）。
4. ~~A-子任务加密~~ → 已完成（`@tsdi/agent-tools`，本次提交）：
   - 契约落地：`AgentToolsDelegationOptions.encryption?: { key?: string; keyEnv?: string }`；`SpawnAgentInput.secrets?: Record<string, string>`（spawn/parallel/orchestrate/llm-task 均支持）。
   - 落地：新增 `src/delegation/crypto.ts` — `createDelegationCipher(key)`（SHA-256 派生 32B 密钥，AES-256-GCM，随机 12B IV + 16B auth tag，base64 `iv.tag.ciphertext` 格式）、`resolveDelegationCipherKey(encryption)`（key → keyEnv → undefined）；`LightweightAgentRunner.runSingle` 解密 secrets 后以 `## Secrets` 段注入子代理 prompt（仅内存）；delegation metadata 加密落盘（有 cipher 时 goal 存密文 + `sealed: true` + per-secret 密文；无 cipher 时 metadata 仅存 basePrompt、secrets 一律不进明文 metadata）。
   - 测试：`delegation-v2.spec.ts` — 往返/篡改抛错/随机 IV/错 key 拒绝/key 解析优先级/secrets 注入 prompt 且 metadata 无明文/有 cipher 时 metadata 全密文可解密/无 key 明文透传。

验证：`agent-tools/test/delegation-v2.spec.ts` 14 passing（新增）、`agent/test/model-provider.spec.ts` 29 passing（+2）；全量回归：agent 506、agent-tools 254、agent-gateway 140、agent-cli 49 passing；agent-ui 269 passing + 1 条预存在 fold-panel 渲染失败（`togglesPanelSummaryAndDetailThroughHtmlRenderer`，git stash 基线双跑确认与本次无关）；agent/agent-tools/agent-gateway/agent-ui/agent-cli `tsc --noEmit` 全部 clean。既有 spawn/parallel/orchestrate 行为（无 profile/reasoning/secrets/concurrency 时）零变化。

## P43 规划：vim mode / keymap 定制（agent-ui TUI 输入层）

1. **输入模式状态**（`AgentConsoleSessionState`）：
   - 契约：`vimMode: boolean`（默认 false，零行为变化）、`inputMode: 'insert' | 'normal'`（默认 insert）、`vimBindings: Record<string, string>`（自定义覆盖表，会话级内存态）；`AgentConsoleOptions.vimMode?: boolean` 提供配置默认。
   - 落地：`setVimMode` / `setInputMode` / `setVimBinding` / `unsetVimBinding` / `resetVimBindings`；`effectiveVimBindings` getter = `{ ...VIM_DEFAULT_BINDINGS, ...vimBindings }`；`handleVimKey(key)`（normal 模式拦截，含 `dd` pending 序列）与 `applyVimAction(action)`（insert-mode/insert-start/insert-after/insert-end/newline-below/newline-above/history-prev/history-next/cursor-left/cursor-right/cursor-start/cursor-end/delete-char/delete-line/exit-insert，复用既有 `moveInputCursor`/`setInput`/`navigateInputHistory`）。
2. **纯函数模块** `src/AgentConsoleVim.ts`（对齐 `AgentConsoleSuggestions.ts` 模式）：
   - `VIM_DEFAULT_BINDINGS`（i/I/a/A/o/O/j/k/h/l/0/$/x/dd）、`VIM_ACTION_NAMES` 与 `VIM_ACTION_LABELS`（供 `/keymap list` 展示）、`resolveConsoleVimKey(key, bindings, pending)` 返回 `{ action, pending }`。
3. **输入拦截两条路径**：
   - HTML textarea 路径（`AgentConsoleInputPanelComponent.onKeydown`）：normal 模式映射键 preventDefault + 执行动作；未映射可打印键 preventDefault（vim normal 不输入文本）；insert 模式 Escape → 回 normal。
   - 终端解码路径（`AgentConsoleComponent.handleTerminalInput`）：normal 模式单字符拦截走 `handleVimKey`；insert 模式 Escape（`controlKey === 'escape'` 或 `rawText === '\u001b'`）→ 回 normal；控制键（箭头/home/end）保持既有 draftNavigation 行为。
4. **模式角标**：`inputPrompt` getter 追加 ` · vim ${inputMode}`（planMode 角标并存）。
5. **命令**：`/vim [on|off]`（toggle 会话 vimMode，纯 UI 态，不走 runtime RPC）；`/keymap [list] | [set <key> <action>] | [unset <key>] | [reset]`（action 名经 `VIM_ACTION_NAMES` 校验，非法即提示用法）；`commandHints` 与 `/help` 菜单登记两项。
6. **测试**：`view-model.spec.ts` 新增 vim Suite（normal 拦截先于文本插入 / insert 透传 / Escape 回 normal / h/l/0/$/x/dd/j/k 动作 / 自定义 keymap 覆盖默认 / unset 恢复 / reset 清空 / list 展示 / `/vim` 命令 toggle / handleTerminalInput 拦截）；`html-console.spec.ts` +1（inputPrompt 含 vim 模式角标）。

实现顺序：AgentConsoleVim.ts → SessionState → Panels → Component → 测试 → agent-ui 全量回归 + `tsc --noEmit` → todo.md 收尾 + 提交。

## P43 打磨（已完成）：vim mode / keymap 定制

1. ~~输入模式状态~~ → 已完成（`@tsdi/agent-ui`，本次提交）：
   - 契约落地：`vimMode: boolean`（默认 false，零行为变化）、`inputMode: 'insert' | 'normal'`（默认 insert）、`vimBindings: Record<string, string>`（自定义覆盖表，会话级内存态）、`vimPendingKey`（`dd` 序列 pending）；`AgentConsoleOptions.vimMode?: boolean` 配置默认，`defaultAgentConsoleOptions` 与 `setConsoleOptions` 同步。
   - 方法族：`setVimMode`（关时强制回 insert + 清 pending）/ `setInputMode`（非 vim 态恒为 insert）/ `setVimBinding` / `unsetVimBinding`（删覆盖 → 默认键位回归）/ `resetVimBindings`（清覆盖表）/ `effectiveVimBindings` getter = `{ ...VIM_DEFAULT_BINDINGS, ...vimBindings }`；`handleVimKey(key)`（normal 拦截，`dd` pending 序列，broken pending 重置丢弃）与 `applyVimAction(action)`（15 个动作，复用既有 `moveInputCursor`/`setInputCursor`/`moveInputCursorToEdge`/`setInput`/`navigateInputHistory`）。
2. ~~纯函数模块~~ → 已完成：`src/AgentConsoleVim.ts` — `ConsoleInputMode`/`ConsoleVimAction`/`ConsoleVimKeyResolution` 类型、`VIM_DEFAULT_BINDINGS`（i/I/a/A/o/O/j/k/h/l/0/$/x/d）、`VIM_PENDING_PREFIX_KEYS`（d）、`VIM_ACTION_NAMES`/`VIM_ACTION_LABELS`、`isConsoleVimAction`、`resolveConsoleVimKey(key, bindings, pending)`。
3. ~~输入拦截两条路径~~ → 已完成：
   - HTML textarea（`AgentConsoleInputPanelComponent.onKeydown`）：vimMode 开启时 insert Escape → 回 normal；normal 模式对非 Ctrl/Cmd/Alt 组合键全部 preventDefault + `handleVimKey`（未映射键同样吞掉，normal 不输入文本；Ctrl+C/X/V 等浏览器快捷键保留）。
   - 终端解码（`AgentConsoleComponent.handleTerminalInput`）：`isAnyFocusActive()` 为假且 normal 模式时，非控制字符单键/粘贴串走 `handleVimKey`，`controlKey === 'return'` 直接吞掉（normal 不提交）；箭头/home/end 保持既有 draftNavigation；insert 模式 Escape 在 `processDecodedInput` 的 plain-escape 分支（focus 层处理之后）转 normal，无 vim 时既有 `handleEscapeKey` 行为不变。
4. ~~模式角标~~ → 已完成：`inputPrompt` getter 以 badges 数组追加 ` · plan` / ` · vim insert|normal`（可并存）。
5. ~~命令~~ → 已完成：`/vim [on|off]`（纯 UI 态 toggle，不走 runtime RPC）；`/keymap [list] | [set <key> <action>] | [unset <key>] | [reset]`（action 经 `VIM_ACTION_NAMES` 校验，非法提示可用动作列表）；`commandHints` 与 `/help` 菜单登记两项。
6. ~~测试~~ → 已完成：`view-model.spec.ts` 新增 18 条 vim 用例（默认关闭不拦截 / h l 0 $ x 动作 / dd pending 序列 / broken pending 重置 / k j 历史导航 / insert 透传 / I A o O 光标定位 / 终端 Escape 回 normal（含无 vim 时既有行为保持）/ inputPrompt 角标（含 plan 并存）/ keymap 覆盖-unset-reset / 非法 action 拒绝 / `/vim` toggle / `/keymap` set-list-unset-reset / handleTerminalInput normal 拦截 / insert 透传 / Escape 切换 / 箭头保留 + Enter 吞掉）；`html-console.spec.ts` +1（textarea `prompt` 属性含 vim 角标）。

验证：agent-ui 全量 288 passing + 1 条预存在失败（`togglesPanelSummaryAndDetailThroughHtmlRenderer`，渲染为占位字符与 vim 无关）；`view-model.spec.ts` 230 passing（+18）、`html-console.spec.ts` 6 passing + 1 预存在失败（+1）；`tsc --noEmit` clean。既有输入行为（vim 关闭时）零变化。

## P44 规划：远程会话 SSH（两阶段交付）

**阶段一（核心 + 工具）**：
1. **新建共享包 `@tsdi/agent-ssh`**（`packages/agents/agent-ssh/`，仿 agent-channels 结构；`@tsdi/agent` 零依赖核心不引入 ssh2，agent-ui 不依赖 agent-tools，故 SSH 原语独立成包）：
   - 依赖：`ssh2`（纯 JS，自带 MockServer 可测）+ `@tsdi/agent`、`@tsdi/ioc`。
   - `src/ssh-config.ts`：`SshHostConfig`（id、host、port=22、username、auth: keyPath|privateKey|password、knownHosts: 'strict'|'accept-new'|'off'、readyTimeoutMs、keepaliveIntervalMs、connectTimeoutMs）；`SshAuthResolver`（keyPath 从 `~/.ssh/*` 读取、env 引用展开）。
   - `src/ssh-client.ts`：`SshClient` 薄 Promise 封装（connect 含 host key 校验、exec(command) → {stdout,stderr,exitCode}、shell({term,cols,rows}) → 可读写流、sftp put/get、tcpip forwardOut 本地端口转发、disconnect、isConnected、事件转 Promise）。
   - `src/ssh-manager.ts`：`SshConnectionManager`（按 host id 注册表、会话级复用、`disposeAll`、`list`）。
   - `src/agent-ssh.module.ts` + `provider.ts` + `index.ts` + `taskfile.ts` + `unit.ts` + `package.json`（Apache-2.0）。
2. **agent-tools 新 `ssh/` 工具包**（对齐 terminal 工具模式）：
   - `SshExecTool`（远程执行命令，复用 sandbox 命令策略）、`SshPutTool`/`SshGetTool`（sftp 双向传输，受 workspace 文件策略约束）、`SshTunnelTool`（本地端口转发 start/stop 生命周期）。
   - `AgentToolsOptions.ssh`：`{ hosts?: Record<string, SshHostConfig>, allowlist?: string[]（host id 或 host:port 白名单）, defaultTimeoutMs, maxTimeoutMs }`；`AgentToolsSshOptions` 接口并入 options.ts。
   - provider.ts：toolItems 增 `ssh_exec`/`ssh_get`/`ssh_put`/`ssh_tunnel`、toolGroups.ssh、`withSshAgentTools()`、deferredActivationBundles += 'ssh'、withDefaultAgentTools 纳入、index.ts 导出、README 安全矩阵补行。
   - 安全：deferred 激活 + `requiredPrincipals: ['local-system']` + `allowLocalAnonymous: true`；knownHosts 默认 'accept-new'（strict 可配）；白名单为空即禁连。
3. **测试**（ssh2 MockServer，无需真实 SSH）：`agent-ssh/test/ssh-client.spec.ts`（connect/exec/shell/sftp/host-key/auth 失败/超时/dispose）+ `agent-tools/test/ssh-tools.spec.ts`（四工具 + sandbox 命令策略 + 白名单拒绝 + 未配置 host 提示）。

**阶段二（agent-ui 交互式远程 shell）**：
4. agent-ui 依赖 `@tsdi/agent-ssh`（`SshClient`/`SshConnectionManager` 复用）：
   - `/ssh` 命令族：`/ssh connect <hostId|user@host> [port]`、`/ssh disconnect [id]`、`/ssh list`、`/ssh forward <localPort> <hostId> <remotePort>`。
   - 交互 shell 模式：`AgentConsoleComponent` 增加 `sshShell` 会话态——激活时 `handleTerminalInput` 原始字节直通远端 PTY 流（跳过 processDecodedInput），远端 stdout 按行回显（pushActivity 'ssh' kind 或专用输出区），`Ctrl+]` 或 `/ssh detach` 脱离回 prompt 而连接保留。
   - 面板角标：inputPrompt 追加 ` · ssh <host>`。
5. **测试**：agent-ui `view-model.spec.ts` + `html-console.spec.ts`（注入 mock SshClient：connect/list/disconnect/forward 命令、shell 字节转发、detach、命令注入校验、无连接时提示）。

实现顺序：agent-ssh 包 → agent-tools ssh 工具 → 测试阶段一 → agent-ui /ssh → 测试阶段二 → 回归（agent-ssh/agent-tools/agent-ui tsc + 全量测试）→ todo.md 收尾 + 提交。

## P44 打磨（已完成）：远程会话 SSH

**阶段一（agent-ssh 包）**：
1. `@tsdi/agent-ssh` 包：`ssh-config.ts`（SshHostConfig/SshAuthResolver/knownHosts: strict|accept-new|off）、`ssh-client.ts`（SshClient：connect/exec/shell/sftpPut/sftpGet/forwardOut/disconnect/isConnected）、`ssh-manager.ts`（SshConnectionManager：按 host id 注册表/连接复用/disposeAll/list）、`agent-ssh.module.ts` + `provider.ts`（`provideSsh()`、`AGENT_SSH_OPTIONS` token）+ `index.ts` + `taskfile.ts` + `unit.ts` + `package.json`。
2. agent-tools `ssh/` 工具包：`SshExecTool`/`SshPutTool`/`SshGetTool`/`SshTunnelTool` + `SshOptions` 并入 options.ts；provider.ts 注册 `ssh_exec`/`ssh_put`/`ssh_get`/`ssh_tunnel` + toolGroups.ssh + `withSshAgentTools()` + deferredActivationBundles + withDefaultAgentTools + index 导出 + README 安全矩阵与 SSH 配置段。
3. 测试：agent-ssh 8 passing（MockServer：connect/exec/shell/host-key/allowlist/manager）；agent-tools ssh-tools.spec.ts 5 passing + 全量 259 passing。

**阶段二（agent-ui 交互式远程 shell）**：
4. `/ssh` 命令族：`list`/`connect`/`disconnect`/`forward`/`shell`（help 菜单 + commandHints '/ssh'）；`AgentConsoleComponent` 注入 `@Optional() SshConnectionManager`（构造末位，兼容位置参数构造）；配置接线 settings.json `ssh` 段 → AgentRootSettings → AgentCliResolvedConfig → `AGENT_SSH_OPTIONS` provider（run-console.ts）+ AgentUiResolvedConfig.ssh。
5. 交互 shell 模式：`/ssh shell <host>` 打开远端 PTY（xterm-256color + 终端尺寸），`handleTerminalInput` 在 shell 激活时字节直通（跳过 processDecodedInput），`Ctrl+]`（0x1d）detach 或远端关闭自动退出，退出后 `resetTerminalRenderState()` 整屏复位；`ConsoleTerminalSurfaceAccessor` 新增可选 API `writeRawTerminalData`/`resetTerminalRenderState`/`getTerminalSize`（ConsoleTerminalSurfaceLifecycleService 实现，console 包基线验证零回归）；面板角标 inputPrompt 追加 ` · ssh <host>`。
6. 测试：ssh-command.spec.ts 12 passing（命令族）；ssh-shell.spec.ts 11 passing（shell 会话/字节转发/detach/自动退出/拒绝重入/失败路径）；agent-cli cli.spec.ts +2（ssh 配置解析）。

**回归**（全部通过；失败项均为预存，经 git stash 基线对照验证与本改动无关）：
- agent-ssh 8 passing；agent-tools 259 passing；agent-cli 51 passing；agent-ui 311 passing 1 failed（`toggles panel summary and detail through html renderer` 预存）；components/console 69 passing 2 failed（`toggles panel summary and detail through tui renderer`、`returns stripped rendered text...` 预存）。
- 四包 tsc clean（agent-ssh/agent-tools/agent-cli/agent-ui；console 经 agent-ui tsc 路径别名覆盖类型检查）。

## P45 规划：session 固定/重命名/快照（pin / rename / snapshot）

差距来源：Codex CLI 0.144+ 提供持久化 session 名（persisted session names）、pin、fork/snapshot；当前 console 仅 `/new`、`/session <id>`（openSession）、`/sessions`、`/clear`，session 列表无固定/命名/快照能力。本轮补 pin/rename/snapshot 三层。

1. **agent 契约（`@tsdi/agent`）**：
   - `AgentState` 增 `title?: string`（用户命名，持久化）、`pinned?: boolean`（固定置顶）。
   - `SessionStore` 抽象增 `setTitle(sessionId, title?)`、`setPinned(sessionId, pinned)`、`snapshot(sessionId, label?) → string`（返回 snapshotId）、`listSnapshots(sessionId) → AgentSessionSnapshotInfo[]`、`restoreSnapshot(sessionId, snapshotId)`、`deleteSnapshot(sessionId, snapshotId)`；新增 `AgentSessionSnapshotInfo`（snapshotId、label、messageCount、createdAt、summary）。
   - `InMemorySessionStore`：title/pinned 落 state；snapshots 用 `Map<sessionId, Map<snapshotId, {label, messages, summary, createdAt}>>`（消息数组浅拷贝引用快照，restore 时替换 state.messages 引用）。
   - `TypeOrmSessionStore`：`AgentSessionEntity` 增 `title`/`pinned` 列（`text` / `boolean default false`）；快照持久化新实体 `AgentSessionSnapshotEntity`（sessionId、snapshotId、label、summary、messageCount、createdAt）。
2. **gateway（`@tsdi/agent-gateway`）**：
   - `SessionInfo` 契约增 `title?`、`pinned?`；`listSessionInfos` 填充并按 pinned 优先排序（pinned 置顶，组内再按活跃度）。
   - HTTP：`PUT /api/sessions/:id/title`、`PUT /api/sessions/:id/pin`、`POST /api/sessions/:id/snapshots`、`GET /api/sessions/:id/snapshots`、`POST /api/sessions/:id/snapshots/:snapshotId/restore`、`DELETE /api/sessions/:id/snapshots/:snapshotId`。
   - RPC：`session.title.set`、`session.pin.set`、`session.snapshot.create`、`session.snapshot.list`、`session.snapshot.restore`、`session.snapshot.delete` + capabilities 登记。
3. **agent-ui**：
   - `AgentConsoleSessionItem` 增 `title?`、`pinned?`；`AgentConsoleSessionService` 增 `setSessionTitle` / `setSessionPinned` / `createSnapshot` / `listSnapshots` / `restoreSnapshot` / `deleteSnapshot`（走 RPC）。
   - 命令：`/session rename <id> <title>`、`/session pin [id]`、`/session unpin [id]`、`/session snapshot [id] [label]`、`/session snapshots [id]`、`/session restore <id> <snapshotId>`、`/session snapshot-delete <id> <snapshotId>`；`/sessions` 面板 label 优先 title、pinned 显示 📌 角标；commandHints 与 `/help` 菜单登记。
4. **测试**：
   - agent `session.spec.ts`：title/pin 持久化 + snapshot 创建/列表/恢复/删除（InMemory）；`persistent-session.spec.ts` 补 TypeOrm 同套（entity 往返）。
   - gateway `gateway-server.spec.ts`：HTTP title/pin/snapshot 路由 + RPC `session.*` 方法 + pinned 排序。
   - agent-ui `view-model.spec.ts`：rename/pin/unpin/snapshot/restore/snapshot-delete 命令 + 列表 label 优先 title + 📌 角标。

实现顺序：agent（契约 → InMemory → TypeOrm entity）→ gateway（SessionInfo → HTTP → RPC）→ agent-ui（state/service → 命令）→ 测试 → 回归（agent/agent-gateway/agent-ui tsc + 全量测试）→ todo.md 收尾 + 提交。

## P45 打磨（已完成）：session 固定/重命名/快照

1. ~~会话元数据与快照契约~~ → 已完成：`AgentState` / `SessionStore` 增加 `title`、`pinned` 及 snapshot CRUD；InMemory 与 TypeORM 实现均支持持久化、恢复和删除。
2. ~~gateway HTTP / RPC~~ → 已完成：session title/pin/snapshot 全套 HTTP 路由与 `session.title.set`、`session.pin.set`、`session.snapshot.*` RPC，并按 pinned 优先排序会话列表。
3. ~~agent-ui 命令与展示~~ → 已完成：`/title`、`/pin`、`/unpin`、`/snapshot`、`/snapshots` 命令，列表展示标题与固定标记，支持快照恢复/删除。
4. ~~测试与回归~~ → 已完成：agent 518、agent-gateway 148、agent-ui 312 passing；session/persistent-session、gateway HTTP/RPC、console 命令及既有 SSH、vim、dashboard 行为全量通过。

## P46 打磨（已完成）：回归修复收尾

1. ~~agent-ui 1 处失败~~ → 已完成：`ssh-shell.spec.ts` 重复 `dispatchMouse` 定义（107 行与 123 行同名函数，TS2393），删除 107 行重复块后保留 view-model.spec.ts 改名后的 stub，312 passing。
2. ~~agent-tools 挂起~~ → 已完成：`ssh-tools.spec.ts` 三个用例只在 finally 里 `mock.server.close()`，未关闭 SshConnectionManager 持有的存活连接（8 个 active socket handle）导致进程不退出；修复为 try 外声明 manager + finally 先 `await manager.disposeAll()` 再关 server，259 passing EXIT:0。
3. ~~agent-cli registry 断言~~ → 已完成：`cli.spec.ts` update-check 用例断言受本机 `npm_config_registry`（npmmirror）影响，改为显式传 `registry: 'https://registry.npmjs.org'`，51 passing。
4. 提交：`9c2e6af30 test(agents): fix agent-cli/tools/ui test regressions`（4 文件 +10/-10）。至此 todo.md 全部条目 P0–P46 收尾，agents 各子包测试全绿。

## P47 打磨（已完成）：实时双向语音输入

1. ~~实时语音输入（麦克风采集 → STT → 注入 turn → 回复 TTS → 回放）~~ → 已完成，音频管线贯通 agent / gateway / agent-ui 三层（提交 `e20855bb5`，16 文件 +1476/-6）：
   - **agent**（`@tsdi/agent`）：新增 `AudioCaptureAdapter` 抽象（`@Abstract()`，`format` / `isAvailable` / `missingComponents` / `start(events, options?)` / `stop()` / `cancel()` + `AudioCaptureSessionEvents` / `AudioCaptureAdapterOptions`），`src/audio/index.ts` + `src/index.ts` 导出。
   - **gateway**（`@tsdi/agent-gateway`）：
     - `audio/audio-adapters.ts`：`StreamingTranscriptionAdapter`（`feedAudio` / `endAudio` / `cancelAudio`，format `pcm16k`|`wav`）与 `StreamingTtsAdapter`（`synthesizeStream`，format 含 `mp3`）+ `AgentGatewayAudioOptions`（voice / speed / language / maxBufferedBytes 默认 10 MiB）。
     - `audio/AudioSessionHandler.ts`（`@Injectable`，注入 `AgentRuntime` + `@Optional()` 双适配器 + options）：`isAvailable` / `missingComponents` / `createSessionState` / `startSession` / `feedAudio`（缓冲 + 防御性上限自动 end）/ `endSession`（STT → `runTurn` → TTS 流式回传，事件 `onAudioChunk` / `onTranscribed` / `onReply` / `onError`）/ `cancelSession`。模块 providers + exports 注册，`index.ts` 导出。
     - `ws/ChatWebSocket.ts`：音频通道——二进制帧（opcode 0x02）喂入音频会话（帧缓冲上限提升至 1 MiB），JSON 控制消息 `{ type: 'audio', action: 'start'|'end'|'cancel'|'status' }` 管理生命周期，合成音频以二进制帧回传，`audio-transcribed` / `audio-reply` / `audio-error` / `audio-status` 事件消息；`close` 时 cancel 会话。
     - `app-rpc/AppRpcServer.ts`：注入 `@Optional() audio?: AudioSessionHandler | null`；capabilities 增 5 方法；`audio.status` / `audio.start` / `audio.feed`（base64 chunk） / `audio.end` / `audio.cancel`，per-session 状态 map `audioStatesBySession`（keyed by sessionId），cancel 幂等（取消后删除状态），status/其余方法经 `ensureSessionAccess` 做 owner 校验；无 handler 时 status 返回 `{ available: false, missing: [...], active: false }`、start 返回 `{ ok: false, error: 'audio unavailable:...' }`。
   - **agent-ui**（`@tsdi/agent-ui`）：`AgentConsoleSessionService` 新增 `getVoiceStatus` / `startVoiceSession` / `feedVoiceAudio`（`Buffer.from(chunk).toString('base64')`）/ `endVoiceSession` / `cancelVoiceSession`（RPC 优先，无 RPC 优雅降级）；`AgentConsoleComponent` 新增 `/voice start|stop|cancel|status` 命令族（`handleVoiceCommand`，取 `state.sessionId`，start 提示说话、stop 输出 Transcribed/Reply、cancel 幂等提示、status 显示 available/active/buffered + missing 组件 + usage）；`AgentConsoleSessionState.commandHints` 白名单补 `/voice`（否则 `handleCommand` 的 whitelist 检查拦截报 `Unknown command`）。
   - 测试：gateway 新增音频 RPC 8 条（`gateway-server.spec.ts` 无 handler 降级 / start·feed·end 全流程 base64 / 未 start 拒绝 / chunk 参数校验 `-32602` / cancel 幂等 / foreign `-32003` / 缺 sessionId `-32602`）+ WebSocket 音频通道 13 条（`audio.spec.ts`）；agent-ui view-model 新增 8 条（status 可用性 / active+buffered / missing 降级 / start / stop 转写+回复 / cancel / 无会话提示 / 无 RPC 降级），`AppRpcStub` 增 `audio.*` 分支 + `audioStatesBySession` + `audioStatusOverride`，`SessionServiceStub` 增 5 个 voice* override（rpcRef 转发）。
   - 全量回归：agent 518 / agent-gateway 169 / agent-ui 320 passing；agent、agent-gateway、agent-ui tsc 干净。
   - 后续已收口：`AudioCaptureAdapter` 的 Node / browser 实现位于 `platform-server/common` 与 `platform-browser/common`；WebSocket 音频帧配额由后续提交 `51b447dcd` 补齐。

## P48 打磨（已完成）：平台音频采集接入 console voice 管线

1. ~~`AudioCaptureAdapter` 生产实现未接入 `/voice`~~ → 已完成（`@tsdi/agent-ui`）：
   - `AgentConsoleComponent` 可选注入 `@tsdi/common` 的 `AudioCaptureAdapter`，因此 CLI 的 `ServerCommonModule` 自动使用 `NodeAudioCaptureAdapter`，browser 运行时自动使用 `MediaRecorderAudioCaptureAdapter`，不重复实现平台采集。
   - `/voice start` 在 gateway `audio.start` 成功后启动本地采集；采集 chunk 经串行队列调用 `audio.feed`，避免异步帧乱序。未注入 adapter 时保留外部客户端自行 feed 的兼容行为。
   - `/voice stop` 先停止采集并等待已排队 chunk 全部上传，再调用 `audio.end`，修复尾帧丢失竞态；`/voice cancel` 与 component destroy 会取消平台采集并清理本地状态。
   - adapter 不可用或启动失败时自动回滚 gateway audio session；采集/上传错误通过 console notice 呈现并取消远端会话。
2. ~~P47 遗留的 WebSocket 音频配额~~ → 已由 `51b447dcd` 完成：`AudioFrameQuota` 覆盖单帧大小、会话累计字节和滑动窗口帧率限制；session owner ACL 在 WebSocket upgrade 的 `resolveSessionId` 中沿用 `SessionOwnerStore.canResume`。
3. 测试：agent-ui 新增 3 条（平台 chunk 在 `audio.end` 前上传、采集不可用回滚、cancel 中止采集），全量 323 passing；agent-ui `tsc --noEmit` clean。

## P49 打磨（已完成）：音频输入格式协商

1. ~~browser `webm` / Node `pcm16k` 音频未经协商直接送入 STT~~ → 已完成（agent-gateway + agent-ui）：
   - `StreamingTranscriptionAdapter.format` 扩展为 `pcm16k | wav | webm`；`AudioSessionHandler.startSession(state, inputFormat?)` 在激活会话前校验 capture 格式与 STT 接受格式，失败时返回明确的 accepted format 且不保存活动会话。未传格式的旧客户端继续采用 adapter 默认格式。
   - RPC `audio.start` 接受并校验 `format`，非法枚举返回 `-32602`，不兼容格式返回 `{ ok: false, format, error }`；WebSocket audio start 控制消息同步支持相同协商与错误响应。
   - `AgentConsoleSessionService.startVoiceSession` 透传格式；`AgentConsoleComponent` 从平台 `AudioCaptureAdapter.format` 读取实际格式。因此 browser `webm` 不再被静默送入只接受 PCM 的 STT，Node `pcm16k` 路径保持直通。
2. 测试：gateway 新增 handler / RPC / WebSocket 格式协商 3 条，agent-ui 平台采集测试增加 format 透传断言。全量 agent-gateway 183、agent-ui 323 passing；两包 `tsc --noEmit` clean。

## P50 打磨（已完成）：RPC TTS 回程与音频会话归属修正

1. ~~RPC `audio.end` 未消费 TTS 音频~~ → 已完成：`AppRpcServer.endAudioSession` 注册 `onAudioChunk`，响应新增 `audio: { format, chunks, totalBytes, truncated }`，chunk 使用 base64 编码；因此 RPC console 路径会真实执行 `StreamingTtsAdapter.synthesizeStream`，不再只有文字 reply。
2. ~~RPC 音频响应缺少体积边界~~ → 已完成：`AgentGatewayAudioOptions.maxResponseAudioBytes`（默认 10 MiB）限制单次 RPC 响应收集的合成音频；超出后停止收集并返回 `truncated: true`，WebSocket 原有二进制流式回传不受影响。
3. ~~缓冲上限自动 end 丢失 session 归属~~ → 已完成：`AudioSessionHandler.feedAudio` 接受 owning `sessionId`，RPC / WebSocket 调用均透传；达到 `maxBufferedBytes` 自动转写时继续写入原会话，不再创建 `audio-{timestamp}` 临时会话。RPC end 后同时移除 per-session audio state。
4. 测试：handler 自动 end 断言原 sessionId；RPC 全流程断言 TTS 被调用、格式/音频 chunk/字节数；新增响应 cap 截断测试。agent-gateway 全量 184 passing，`tsc --noEmit` clean。

## P51 打磨（已完成）：平台音频播放与 console 双向闭环

1. ~~RPC 返回 TTS 音频但 console 不播放~~ → 已完成：`@tsdi/common` 新增 `AudioPlaybackAdapter` / `AudioPlaybackOptions` / `AudioPlaybackFormat`；`AgentConsoleComponent` 可选注入播放器，`/voice stop` 解码 base64 音频并播放，播放不可用/失败时保留文字转写与 reply 并追加提示，component destroy 时停止播放。
2. **Node 实现**：`NodeAudioPlaybackAdapter` 探测 `aplay` / `ffplay` / `play`（允许显式 command/args）；为规避当前 Node 24 + ts-node 8 子进程 pipe 基线异常，使用权限 `0600` 的临时音频文件传给播放器，结束后强制清理；PCM 传入 16 kHz/mono/S16_LE 参数。注册到 `ServerCommonModule`。
3. **browser 实现**：`BrowserAudioPlaybackAdapter` 使用 Blob + object URL + Audio，stop 时 pause 并 revoke URL；注册到 `BrowserCommonModule`。
4. 测试：platform-browser 5 passing（capture 3 + playback 2）；platform-server 新增 playback 2 条均通过（P52 后全量 19 passing）；agent-ui 新增播放成功/不可用 2 条，全量 325 passing，agent-ui `tsc --noEmit` clean。platform 根级 `tsc` 仍被既有 activities API 漂移阻断，与本次 common/audio 改动无关。

## P52 打磨（已完成）：Node capture 子进程流兼容性修复

1. ~~Node 24 + ts-node 8 下录音子进程 stdout 丢失~~ → 已完成：`NodeAudioCaptureAdapter` 每次 capture 创建私有临时目录与 `0600` PCM 文件，内置 `arecord` / `sox` / `ffmpeg` 直接写文件，adapter 每 20ms 增量读取新增字节并触发 `onChunk`；关闭时最后 drain，stop/cancel/error 后统一删除临时目录。
2. **自定义命令兼容**：新增 `TSDI_AUDIO_OUTPUT` 环境变量供命令写入采集数据，同时保留原 stdout 监听，不破坏已有自定义 capture 命令。测试脚本改走输出文件，覆盖持续采集、cancel、自然结束、非零退出与 double start。
3. 验证：platform-server 全量 19 passing（P51 时的 3 条 capture 失败全部恢复），临时文件 playback 与 capture 两条路径均通过；根级 `tsc` 的既有 activities API 漂移仍不在本轮范围内。

## P53 打磨（已完成）：探索式修复循环（Exploration-aware repair loop）

1. ~~修复循环只呈现最后一轮失败证据，无跨轮探索上下文~~ → 已完成（`@tsdi/agent`）：
   - 新增纯函数模块 `src/harness/RepairExploration.ts`：`FalsificationAttempt` 类型（round / entries / signatures / reasons）、`buildAttemptSignature`（toolName + 规范化 inputSummary 的重复检测签名）、`buildRepairPrompt`（累计渲染全部被证伪尝试，带编号、逐轮明细、"repeated attempt" 标注、按工具去重的 rejected 计数，以及重复次数警告）、`buildExplorationGuidancePrompt`（升级用探索指令，枚举已尝试且被拒的路径 + 4 类策略：diagnose first / different tool / different path / declare blocked）。`src/index.ts` 导出。
   - `TurnRecoveryState` 新增 `attemptHistory`（append-only，永不被覆盖）与 `repeatAttempts`；`runVerificationGate` 每轮生成签名、检测与历史重复的尝试并累计，随后 push 当前轮快照。
   - `maybeInjectRecoveryPrompt`：普通修复注入 `buildRepairPrompt`（累计）；`consecutiveFalsifications >= 2` 升级为 `buildExplorationGuidancePrompt`（替代原先泛化的 `LOOP_RECOVERY_SYSTEM_PROMPT`，该常量保留给 A4 doom-loop 场景）。
   - `AgentTurnDiagnostics` 新增可选 `repairRoundsUsed` / `repeatedAttemptCount`，经 `recordTurnDiagnostics` 写入 `TurnDiagnosticsRecord.metadata`；`buildFalsificationSummaryMessage` 改为按尝试编号累计列出 + 重复尝试提示。
2. 测试：`verification-gate.spec.ts` 新增 P53 纯函数套件 4 条（签名规范化、累计修复 prompt 含重复标注、空历史 fallback、探索指令枚举策略）+ 运行时 3 条（跨尝试累计 prompt、重复标注、diagnostics 持久化），并更新升级用例断言为探索指令。agent 全量 525 passing，`tsc --noEmit` clean。

## P54 打磨（已完成）：跨会话修复经验复用（Cross-turn repair hint reuse）

1. ~~被证伪且最终修复的签名未持久化，未来 turn 会从头重新探索~~ → 已完成（`@tsdi/agent`）：
   - `src/harness/RepairExploration.ts` 新增 `ResolvedRepairHint`（signature / sessionId / resolvedAt）与 `collectResolvedRepairHints(records, signatures)`：按 `createdAt` 倒序扫描 `TurnDiagnosticsRecord`，仅当 metadata 带 `repairResolved: true` 且 `falsifiedSignatures` 命中当前签名时产出 hint（按签名去重、新者优先）。`buildRepairPrompt` 经 `RepairPromptOptions.resolvedHints`、`buildExplorationGuidancePrompt` 经新参数接收 hints，渲染 "Prior success from an earlier turn" 段；无 hints 时完全省略。`export *` 自动覆盖新符号。
   - `DefaultAgentRuntime`：`TurnRecoveryState` 新增 `repairHints`；`runVerificationGate` 在该 turn 首次证伪（`attemptHistory.length === 1`）时经 `loadResolvedRepairHints` 从 `turnDiagnosticsStore.list(sessionId, { limit: 50 })` 加载并存入 recovery；`maybeInjectRecoveryPrompt` 将 hints 传入两个 prompt；`recordTurnDiagnostics` 新增 `recovery` 参数，持久化 `repairResolved`（有证伪且未 terminated）与去重后的 `falsifiedSignatures`（2 个调用点同步更新）。
2. 测试：`verification-gate.spec.ts` 新增 P54 纯函数套件 5 条（仅命中已解决签名、跳过无关签名、两个 prompt 渲染 hint 段、空 hints 省略）+ 运行时 2 条（turn 1 修复成功后 turn 2 同签名提示 "Prior success"；未解决签名不产生 hint，`repairResolved` 断言）。agent 全量 532 passing，`tsc --noEmit` clean。

## P55 打磨（已完成）：修复配方持久化与具体修法复用（Repair recipe reuse）

1. ~~P54 hint 只告知「修好过」，不含具体修法~~ → 已完成（`@tsdi/agent`）：
   - `src/harness/RepairExploration.ts`：`ResolvedRepairHint` 新增可选 `fixes?: RepairFix[]`（`RepairFix = { toolName, inputSummary? }`）；`collectResolvedRepairHints` 从记录 metadata 的 `repairRecipes`（`[{ signature, fixes }]`）中按签名取回修复配方，无配方（旧记录）时 hint 退化为仅签名；`appendResolvedHints` 渲染 `retry with Tool "..." (input "...")` 具体修法，并新增 `MAX_RESOLVED_HINTS_RENDERED = 4` 渲染封顶。
   - `DefaultAgentRuntime`：`TurnRecoveryState` 新增 `repairRecipes`（`TurnRepairRecipe[]`）；`runVerificationGate` 在证伪连击后首次通过验证门的那一轮（`!result.falsified && attemptHistory.length > 0 && consecutiveFalsifications > 0`，仅捕获首个修复，`repairRecipes.length === 0` 守卫），用 `evidenceLedger.entriesFrom(startIndex)` 将本轮工具调用绑定到最近一次被证伪尝试的每个签名；`buildRepairRecipes` 生成配方；`recordTurnDiagnostics` 在 metadata 非空时持久化 `repairRecipes`。
2. 测试：`verification-gate.spec.ts` P54 套件扩展 4 条（recipes 解析为 fixes、无配方 hint 无 fixes、prompt 渲染具体修法、hint 渲染封顶），跨 turn 运行时用例追加配方持久化与 `retry with Tool "echo"` 断言。agent 全量 536 passing，`tsc --noEmit` clean。
