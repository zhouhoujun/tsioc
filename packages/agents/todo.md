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

## P34 规划：对比 Codex / opencode 的差距清单与打磨计划（待办，未开始）

### 对比结论（2026-08 调研）

**已具备（与主流持平或超出）**：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 P28）、prompt cache 支持、上下文压缩 + turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计）、审批流（expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级，非 OS 级）、40+ 工具组（files/git/terminal/browser 轻量/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli 等）、MCP stdio client + server tool、skills 系统（本地注册表/目录/turn interceptor/激活提示）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation + dashboard digests）、gateway（JSON-RPC + HTTP + SSE + owner 鉴权 + InMemory/TypeOrm 持久化）、console TUI（~15 面板 / ~30 命令 / 主题 / workspace mentions / review hunk 折叠 + side-by-side）、CLI（chat/run 一次性/rpc-stdio/tools list + fast/strong 自适应配置）。

**对比 Codex（developers.openai.com/codex，CLI v0.14x）与 opencode（opencode.ai/docs）识别出的差距**，按下表分级：

### Tier 1（高价值，中量改动，建议优先）

1. ~~MCP 仅 stdio 单传输~~（现状：`agent-tools/mcp/StdioMcpClient` 只支持 spawn stdio；opencode 支持 local + remote(Streamable HTTP) + OAuth PKCE；Codex `mcp add` 支持 stdio 与 streamable HTTP）→ **待办**：`McpClient` 抽象增加 StreamableHttpMcpClient（tools/list、tools/call、resources、prompts 经 HTTP+SSE），配置模型支持 `url/headers/oauth`；远程 server 的 OAuth（发现授权端点 + PKCE + token 刷新，凭证存 `~/.tsdi-agent/mcp-credentials.json`）；CLI `mcp add/list/auth/logout` 命令族。
2. ~~无 OS 级沙箱~~（现状：`ToolSandboxPolicy` 是 capability 策略矩阵 + 审批默认值，命令实际直接在本机执行；Codex 用 Seatbelt/bwrap+seccomp/Landlock 内核级隔离，`codex sandbox` 辅助命令；opencode 依赖权限系统）→ **待办**（分两阶段）：阶段一：`terminal`/`process` 工具支持可选 `sandboxExec` 包装器（Linux 探测 `bwrap` 或 `unshare`，macOS 探测 `sandbox-exec`，Windows/WSL2 降级提示），配置 `sandboxMode: 'off'|'workspace'|'network-block'`；阶段二：`/permissions` 式运行时切换 + 只读模式。
3. ~~无 LSP 集成~~（现状：grep 全库无 lsp；opencode 自动为 LLM 加载 LSP，提供 definitions/references/diagnostics；Codex 靠 IDE 扩展）→ **待办**：`agent-tools/lsp/` 新工具组——`lsp_definition`/`lsp_references`/`lsp_diagnostics`/`lsp_symbols`（复用 opencode 同款 `lsp-tserver` 或 `vscode-languageserver-protocol` 做进程内 client，按文件扩展名惰性启动 server，`list` 不激活、调用时按需启动并回收）。
4. ~~无 AGENTS.md 约定与 /init~~（现状：项目上下文只有 workspace mentions / 手动 focusSummary；Codex 有 `/init` 生成 AGENTS.md、opencode 有 `/init` + 提交到 git）→ **待办**：runtime 启动时读取 `AGENTS.md`（项目根向上查找）作为 system prompt 项目上下文节；新增 `/init` 命令（分析项目结构 → 生成 AGENTS.md 草稿 → 写盘）；CLI/UI 均可触发。
5. ~~无文件级 undo/redo~~（现状：补偿/回滚只覆盖工具副作用（memory 等），写文件无快照；opencode 有 `/undo` `/redo` 可多次回退；Codex 靠 `codex apply` + git diff）→ **待办**：`filesystem_write` 工具（write/edit/move/copy/delete）接入文件快照栈——写前读原内容入 per-session undo 栈（限深如 50、上限大小如 5MB），`/undo` `/redo` 命令恢复/重放，UI 通知变更；与既有 compensation 通道并存（文件类走快照栈，其余走 compensate）。
6. ~~无只读 Plan agent 模式~~（现状：`definition.execution?.readOnly` 是工具级标志，无会话级 plan 模式；opencode 有 Plan 主 agent（Tab 切换，edit deny、bash ask）；Codex 有 read-only sandbox + `/permissions`）→ **待办**：会话级 `planMode` 状态（`/plan` 开关，`/status` 展示），plan 模式下写工具（filesystem_write/terminal/process/http_request 等）一律 deny（返回「plan mode」拒绝信息），读工具照常；UI 显示模式角标。

### Tier 2（中价值，按需）

7. ~~Playwright 级浏览器自动化~~（现状：`browser_open`/`text_browser` 是轻量文本浏览；Codex 有 Browser/Computer Use；opencode 有 playwright 技能）→ **待办**：`agent-tools/browser/` 增加可选 `playwright_browser` 工具（无头 Chromium navigate/click/type/screenshot/extract），作为 deferred 工具组随 `withBrowserAgentTools` 可选装配，不经审批不可激活。
8. ~~无会话分享/导出~~（opencode `/share` 生成分享链接；Codex 有会话存档/删除）→ **待办**：`/export` 命令导出会话 transcript（JSONL/JSON 格式，含消息/工具调用/元数据），gateway 增 `session.export` RPC + `GET /api/sessions/:id/export`（owner 鉴权）。
9. ~~无图像输入~~（Codex `-i` 附图像；opencode 拖拽图像入 prompt）→ **待办**：`AgentMessage`/`ModelRequest` 支持 content 图像段（base64 data-url），`RoutedModelAdapter` 透传给支持图像的多模态 provider；CLI `run --image <path>`；UI 无终端图像粘贴时至少支持 `/attach <path>` 命令。
10. ~~非交互 exec 缺 JSON 事件流~~（现状：`tsdi-agent run` 只返回最终文本；Codex `exec --json` 输出 JSONL：thread.started/turn.started/turn.completed/item.*/error）→ **待办**：`tsdi-agent run --json` 输出 JSONL 事件流（复用 gateway `EventHandler` 的 SSE 事件序列化），`--output-last-message` 兼容。
11. ~~无 usage 聚合视图~~（Codex `/usage` daily/weekly/cumulative）→ **待办**：gateway 复用 audit + turn-diagnostics token 数据新增 `GET /api/usage`（按天/周/累计 token + turn 数），UI `/usage` 命令 + dashboard 行。
12. ~~无用户可配置生命周期 hooks~~（opencode plugin hooks：chat.params/tool.execute.before/after/permission.ask；Claude Code PreToolUse/PostToolUse；现状框架只有内部 interceptor 管线）→ **待办**：`agent` 提供 hook 注册 API（`beforeTurn/afterTurn/beforeTool/afterTool/onApproval`），支持从配置加载 shell 命令 hook（镜像 Claude Code 的 `~/.tsdi-agent/hooks.json`），事件→子进程执行→stdout 注入上下文。

### Tier 3（大改动 / 远期，仅记录）

- 桌面/IDE/Web 多面（opencode desktop + IDE 扩展 + web console）——需新 UI 工程，暂不排期。
- GitHub/GitLab 应用集成（Codex GitHub Action、opencode GitHub 集成、隐藏自动化 agent）——依赖平台 OAuth。
- 多代理 v2（可配置子代理模型/reasoning/并发度、子任务加密）——现有 delegation 基础上扩展。
- 每命令级模型路由（opencode command 可指定 model）——现有 profile 路由是会话/worker 级，命令级是超集。
- 语音实时输入（Codex streaming realtime V3）——已有 TTS/STT 工具，但非实时双向。
- vim mode / keymap 定制（opencode）——TUI 输入层扩展。
- shell completion / doctor / update 命令族（Codex）——CLI 完善项。
- 远程会话（SSH 运行 opencode）——传输层新面。

### 建议执行顺序

1. Tier1-1 MCP 远程传输（生态缺口最大，改动集中在 agent-tools/mcp + CLI 命令族）
2. Tier1-4 AGENTS.md + /init（小而高频，体验提升直接）
3. Tier1-6 Plan 只读模式 + Tier1-2 沙箱阶段一（安全面，与既有 approval/policy 管线天然衔接）
4. Tier1-5 文件 undo/redo（与既有 compensation 通道并行设计）
5. Tier1-3 LSP 工具组（独立新包面，需选型 lsp client）
6. Tier2 按需（7 浏览器 / 8 导出 / 9 图像 / 10 JSON 事件 / 11 usage / 12 hooks）
