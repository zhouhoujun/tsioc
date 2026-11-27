# 微服务框架优化设计（性能 / 稳定性 / 健壮性 / 易用性）

> 基线：`7.tui`（2026-11）。行号基于当前工作区，若后续改动请以符号名为准。
> 本文只做设计，不改变现有行为；所有"建议"均标注了改动点与验收标准。
> 2026-11 现状复核（已落地能力、当前仍存在的 P0/P1、下一阶段路线）见 [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md)。

## 执行进度（2026-11-13）

已完成并落到测试的 P0 批次：

- `matchTransport` 修复（协议过滤）。
- `multiOrder` 改为稳定优先级排序（越小越外层，同值按注册顺序）。
- 路由级 `filters → guards → interceptors` 真正执行（返回 403）。
- 客户端统一 `ServiceError`（`code/status/body`），HTTP 非 2xx 默认抛错，支持 `throwOnError:false`。
- Gateway 上游 5xx/429 计入熔断与 `gateway_errors_total`，新增 `circuitBreaker.failureStatuses`。
- Gateway 路由改为 segment-aware 前缀匹配 + 最长/最具体优先，新增 `routeMatching: 'legacy'` 兼容开关。
- `/health` DOWN 返回 503，indicator 并行 + `timeout` + `includeDetails`。
- `ConfigModule.withOptions/withEnv/withFile` 真正生效；默认值分层、数组替换、watch 去重。
- `useJson` / `useCookie` 选项接线；signed cookie（HMAC + keys）；`useAuth(false)` 不再注册空策略。
- `useTransfers` 保留 transport 默认 transfer。
- HTTP client 透传 `requestOpts`；`HttpServOptions.timeout` 映射到 `requestTimeout`。
- 客户端 discovery + load balance 真正可用：`EndpointResolver` 解析 → endpoint 写入请求上下文 → HTTP backend 改写目标地址；RR/random/weighted/least 策略。
- Discovery selector：每服务独立 RR、使用 `endpoint.weight`、`healthCheck` 不再复活 DOWN / 不再刷新 TTL。

第二批（客户端韧性 / 流式 / 追踪）：

- HTTP keep-alive Agent 由 `ClientConfig.pool` 驱动（maxSockets/idleTimeout），并在 client shutdown 时销毁。
- Retry：`maxElapsed`、jitter、`retryOnMethods`、`retryOnStatuses`、`retryBudget`（滚动窗口），interceptor 传入 request 以判定幂等。
- Gateway 流式转发：`route.stream` 与 `text/event-stream` 自动走 `Readable.fromWeb`，跳过缓存/改写/压缩/webhook。
- Gateway header 卫生：剥离 hop-by-hop、修正 `content-length`、补 `x-forwarded-proto/host`；新增 `maxBodyBytes`（413）。
- Tracing：`AsyncLocalStorage` 隔离并发 span，finish 恢复父 span；W3C `traceparent` 解析/注入，保留旧 `x-trace-*`。

第三批（Gateway 配置事务化）：

- 新增 `GatewayConfigService`：validation → diff → single atomic swap → version bump → audit/history。
- 支持 `expectedVersion` 乐观锁（409）、`dryRun`、`mergeRoutes`、`routes:null` 删除、最近 20 个版本回滚。
- 校验覆盖 path/service/targetUrl/timeout/methods/重复路由、规则 id/when/action/priority。
- 配置变更按 diff 失效响应缓存/轮询/熔断状态；规则-only 变更不清路由缓存。
- `GatewayLifecycle` 的远程配置改为走事务 apply：非法配置只记录审计，不替换在线表。
- Admin 新增 `GET /config`、`GET /config/history`、`POST /config/apply`、`POST /config/rollback`；`PUT /routes` 与规则 apply 统一走事务服务。

第四批（Gateway 缓存正确性）：

- 默认不缓存携带 `Authorization`/`Cookie` 的请求；`cache.allowAuth` 开启后按凭据哈希隔离。
- 支持 `cache.vary` 参与 key；`cache.maxEntries` / `cache.maxBytes` 有界 LRU（刷新命中顺序、过期清理）。
- 命中返回 `x-gateway-cache: HIT` 与 `Age`；带 `set-cookie`、`no-store`、`private` 的响应不缓存。
- 配置 apply 时按 diff 失效缓存/轮询/熔断状态。

第五批（真实 Gateway E2E）：

- 真实 upstream + 真实 gateway 进程验证：header 卫生、SSE 首块提前到达、5xx 熔断、认证缓存隔离、配置热更/回滚。
- 发现并记录：undici 会自动补 `connection: keep-alive`，hop-by-hop 验证使用 `proxy-authorization` 等客户端头。

第六批（指标治理）：

- `MetricsRegistry` 支持 `latencyBuckets`、`maxSeriesPerMetric`；超出上限的标签序列被丢弃并可用 `getDroppedSeries()` 诊断。
- `MetricsModule.withOptions` 的 prefix/defaultLabels/buckets/maxSeries 真正注入 registry（此前只有 `useMetrics` 生效）。
- Metrics interceptor 使用路由模板并归一化数字/UUID 段，移除 query，避免原始 URL 高基数。
- `/metrics` 返回 Prometheus 规范 content-type；新增 `MetricsExporter` 抽象与 OTLP/HTTP JSON 导出器（counter/gauge/histogram）。

第七批（Admin 配置 UI）：

- 路由页显示 `v{version}`；Apply 携带 `expectedVersion`，冲突显示可操作错误。
- `Preview` 调用 `POST /config/apply {dryRun:true}`，弹窗展示 routes/rules/options diff。
- `History` 列出最近版本与 diff 摘要，可一键 rollback；回滚后刷新状态栏。
- 生产 bundle 实测 v1 版本、diff 弹窗、历史回滚。

第八批（DI 驱动启动收口）：

- `createServiceTransportFeature` / HTTP transport factory 注册 `SERVICE_CONFIGS` 并挂载 `config.transportFeature`。
- `createClientTransportFeature` / HTTP client factory 挂载 `config.transportFeature`。
- `provideServiceFromDi` / `provideClientFromDi` 不再依赖测试里手工构造的 config，可直接从真实 transport feature 重建服务/客户端。

第九批（gRPC 收口）：

- Server 使用 `@grpc/proto-loader` 加载 proto，按 `serviceName` 注册 unary handler；方法通过 `@Handle('/pkg.Service/Method', Transport.gRPC)` 路由。
- Client 使用 proto 生成 service client；backend 直接发起 unary RPC，不再依赖 socket/json packet framing。
- 支持 `protoPath` / `packageName` / `serviceName`，无 protoPath 时保持旧的“仅启动”兼容行为。
- 新增真实 server/client unary RPC E2E。

第十批（包依赖与发布收口）：

- 所有 microservices 包的 `@tsdi/*` source imports 补齐到 `dependencies`（25 个包）。
- 移除跨包 `src/` 深引用：gateway → barrel（http-microservice/client/tracing）、http/mqtt → `@tsdi/client`。
- 统一 `@tsdi/http` 为真实包名 `@tsdi/http-microservice`。
- 新增 `scripts/check-package-deps.mjs` 并接入 `agents-gate.sh` 的 `package-deps` stage，阻止 monorepo-only 依赖再次出现。

第十一批（客户端观测）：

- `AbstractClient` 自动记录 `client_requests_total`、`client_request_duration_ms`、`client_errors_total`（error_type）。
- 客户端请求创建 CLIENT span，注入 W3C traceparent 到出站 headers；失败记录 span error。
- 路径按数字/UUID 归一化，避免客户端指标高基数。

第十二批（Gateway 共享状态）：

- 新增 `GatewayStateStore` SPI：缓存、熔断状态、HMAC nonce。
- `InMemoryGatewayStateStore`（显式装配/测试）与 `RedisGatewayStateStore`（多副本，PX TTL + `SET NX PX` 原子 nonce）。
- GatewayRuntime 支持注入 store：跨实例共享缓存/熔断/重放保护；未注入时保持原有进程内行为。
- `GatewayOptions.stateStore` 可直接传 store 实例；`createRedisGatewayStateStore(url)` 懒加载 ioredis。
- 限流：固定窗口 `limit + windowMs` 在注入 store 时走共享原子计数（Redis Lua INCR/PEXPIRE）；quota/throttle 仍回退本地 `ApiRateLimiter`。
- 舱壁仍为进程内状态（并发隔离天然按实例）。

第十四批（契约驱动客户端）：

- 新增 `createContractClient`（operationId → 方法映射、path/query/body 约定）。
- 新增 `validateContractValue`，支持 request/response 运行期校验。
- 新增 `createFetchContractTransport`（baseUrl/headers/timeout/非 2xx 错误）。
- 新增 `generateClient` + CLI `--client`，生成类型化接口与工厂。
- `createHttpContractTransport`：contract client 复用 `HttpClient` 的 discovery/LB/retry/circuit/metrics/tracing。
- contract 包新增 root `index.ts`，修复 package 级别 `@tsdi/microservice-contract` 解析。

第十六批（发现/探测韧性）：

- `EndpointResolver` 注册中心失败时返回最后缓存（stale）并进入指数退避；无缓存返回空集而不是抛错。
- 失败/恢复重置与 `getLastError(service)` 诊断。
- Gateway health probe 增加 in-flight guard，且单个服务发现失败不阻断其它服务探测。

第十七批（独立 client feature 完整性）：

- `withHttpTransport` 自身注册 `BodySerializeStrategy`、`TimeoutStrategy`、`ResponseFactory`（此前只有 `HttpModule` 提供）。
- 不引入 `HttpModule` 也能使用 `withTimeout`、body serializer 和统一超时/错误响应。
- 新增独立 transport 的 timeout 回归测试。

第十八批（gRPC deadline/metadata）：

- Client 支持 `deadlineMs` 默认值与每请求 `timeout`，通过 grpc-js 4-arg unary call 设置 deadline。
- 请求 headers 映射为 gRPC metadata，服务端 `MessageAuthInterceptor`/`@Inject(REQUEST)` 可读取。
- 新增 metadata 传播与 deadline exceeded（code 4）E2E。

第十九批（故障注入与 soak）：

- Gateway E2E：慢 upstream + route timeout → 504。
- Gateway E2E：50 并发请求全部 200，无挂起。
- HTTP E2E 重新启用并验证：`withTimeout` 客户端超时、服务端 route timeout 504、路由限流 200/429。

第二十批（Consul 注册中心）：

- 新增 `ConsulServiceDiscovery`：agent register/deregister、health 发现、query、getServices、healthCheck。
- 支持 ACL token、datacenter、health check 注册、watch 短轮询与快照去重。
- `useConsulDiscovery({url, token, ...})` 可直接传给 `useGateway({discovery})`。

第二十一批（Kubernetes 注册中心）：

- 新增 `KubernetesServiceDiscovery`：EndpointSlice 发现、Service 列表、query/healthCheck/watch 轮询。
- 只读取 ready 的 EndpointSlice 地址，忽略 not-ready/terminating。
- 支持 namespace、bearer token、labelSelector、注入 fetch；工作负载注册为只读（由 K8s 控制器管理）。
- `useKubernetesDiscovery(options)` 可直接接入 Gateway discovery。

第二十二批（Nacos 注册中心）：

- 新增 `NacosServiceDiscovery`：v1 instance 注册/下线、实例列表发现、服务列表、query/healthCheck/watch。
- 支持 namespace/group、username/password 登录 token、accessToken、metadata/tags/weight 映射。
- `useNacosDiscovery(options)` 可直接接入 Gateway discovery。

第二十三批（Eureka 注册中心）：

- 新增 `EurekaServiceDiscovery`：注册/心跳续约/下线、应用实例发现、应用列表、query/healthCheck/watch。
- 支持 UP/DOWN 状态、metadata/tags/version/port 映射、可配置续约与心跳间隔。
- `useEurekaDiscovery(options)` 可直接接入 Gateway discovery。

第二十四批（舱壁可观测性）：

- `GatewayBulkheadSnapshot` 增加 limit/maxQueue/rejected/timeouts。
- Runtime 输出 `gateway_bulkhead_active/queued/limit` gauge 与 rejected/timeout 计数。
- 队列等待超时与快速拒绝分别计数，便于容量规划。

第二十五批（contract + registry）：

- 新增 `createRegistryContractTransport`：EndpointResolver 解析 service → endpoint baseUrl → HttpClient contract call。
- 保留 HttpClient 的 retry/timeout/metrics/tracing；无 endpoint 返回 ContractHttpError(503)。

第二十六批（自适应并发）：

- Bulkhead 新增 `adaptive` / `initialConcurrent` / `minConcurrent`。
- 队列满/排队超时按 AIMD 收缩 limit（x0.8，至少 min）。
- 连续 3 次低占用释放后 limit +1（不超过 maxConcurrent），在压力下保持稳定。

第二十七批（Admin 舱壁视图）：

- Diagnostics 增加 bulkhead adaptive 标记。
- Overview Runtime 卡片展示 Bulkhead active / queued / adaptive 数量。
- 生产 bundle 更新。

第二十八批（Gateway + Discovery 集成）：

- E2E 中 Gateway 同时装配 `ServiceDiscovery` + `DefaultEndpointResolver`。
- 新增无 `targetUrl` 的路由，运行时注册 endpoint，通过 resolver 发现并转发到真实 upstream。

第二十九批（gRPC server streaming）：

- Server 支持 `returns (stream T)`：订阅 handler Observable，逐条 `call.write`，完成 `call.end`。
- Client 新增 `serverStream(pattern, options)`，按 data/end/error 事件输出 Observable。
- 支持 deadline/metadata；客户端流/双向流仍明确报错。

第三十批（共享 Store 双实例 E2E）：

- 两个独立 Gateway 进程共享 `InMemoryGatewayStateStore`。
- 验证固定窗口限流跨实例生效（A/B 共 2 次，第 3 次 429）。
- 验证响应缓存跨实例命中（A 写入，B 返回 `x-gateway-cache: HIT`）。

第三十一批（字段级 config diff）：

- `GatewayConfigDiff.routes/rules.changedFields` 记录变化字段（top-level key）。
- Admin dry-run/history diff 展示 `~ route · enabled, timeout`。

第三十二批（gRPC client streaming）：

- Server 支持 `rpc Upload (stream Req) returns (Res)`：收集 data 后调用一次 handler。
- Client 新增 `clientStream(pattern, values[])`，逐条 write 后 end，回调返回单响应。
- bidi 仍明确报错。

第三十三批（gRPC bidi streaming）：

- Server 支持双向流：把入站 data 转成 AsyncIterable，handler 返回 Observable 后逐条写回。
- Client 新增 `bidiStream(pattern, values[])`，写完后 end，响应按 data/end/error 输出。
- gRPC unary / server-stream / client-stream / bidi 全部可运行。

第三十四批（路由 SLO）：

- Runtime 记录每路由 requests/errors/totalMs/延迟桶。
- Diagnostics 输出 `routes: [{requests, errors, avgMs, p95Ms, p99Ms}]`。
- 成功响应与错误路径统一记账；配置变更时清空旧路由统计。

第三十五批（Admin 路由 SLO）：

- Overview 新增 Route SLO 卡片，展示 Top 5 路由 requests/errors/p95。
- 与 diagnostics.routes 数据源一致，无流量时显示空状态。

第三十六批（diff old/new）：

- `GatewayConfigDiff.routes/rules.changedValues` 记录字段 before/after。
- Admin diff 展示 `enabled: true → false`，长值截断。

第三十七批（发布 payload）：

- 25 个 microservices 包新增 `files` 白名单，只发布 index/src/README。
- 新增 `scripts/verify-package-publish.mjs`：npm pack 校验入口文件、无 test 泄漏、metadata 完整。
- 接入 `agents-gate.sh` 的 `package-publish` stage；admin/contract 补 root `index.ts`。

第三十八批（contract 校验缓存）：

- 新增 `ContractValidator`：schema 编译一次并 WeakMap 缓存，重复调用复用闭包。
- `createContractClient` 每个实例复用一个 validator；request/response 校验不再每次重建。
- `validateContractValue` 保留为便捷包装。

第三十九批（策略字段 diff）：

- route/rule 字段差异递归展开（最多 3 层），数组保持原子比较。
- `rateLimit.limit`、`cache.enabled` 等策略字段可单独展示 before/after。

第四十批（发布流程）：

- 新增 `scripts/prepare-package-publish.mjs <package-dir>`：构建 → 生成 dist package.json（main/types/files）→ README → `npm pack` 校验。
- 已用 gateway 实测：`packages/dist/gateway` 产出 `index.js/index.d.ts` 与可发布 tarball。

第四十一批（注册中心故障注入）：

- Consul/Nacos/Eureka 适配器新增 5xx 故障测试。
- 错误保留 registry、状态码和 body，EndpointResolver 可在上层做 stale-cache/退避降级。

第四十二批（gRPC 流背压）：

- Server stream/bidi 使用有界写入队列，尊重 `call.write()` 的 false 与 `drain`。
- Client `clientStream`/`bidiStream` 使用 `writeStreamValues`，避免大消息一次性写爆缓冲区。
- 新增背压单元测试（false → drain → 继续写 → end）。

第四十三批（SLO 告警）：

- Route/options 新增 `slo: {errorRateThreshold, p95ThresholdMs}`。
- 路由统计输出 errorRate/alert/violations，阈值跨越时 `gateway_slo_violations_total` +1。
- Admin Route SLO 行显示 SLO 告警标记。

第四十四批（contract 全局校验）：

- 新增 `configureContractValidation(mode)` / `getContractValidationMode()`。
- 默认 none，可按环境/启动配置全局开启 request/response/both；单 client 仍可覆盖。

第四十五批（Tracing 装配 + OTLP + 真实 Redis）：

- 新增 `useTracing(options, exporters...)` service feature（interceptor multiOrder -850），无需手工装配 `TracingModule`。
- 新增 `OtlpHttpTraceExporter`：OTLP/HTTP JSON spans（resource/kind/status/attributes/events/时间戳）。
- 使用运行中的 Redis 补真实集成测试：缓存/熔断/nonce/固定窗口跨 store 实例、GatewayRuntime 共享状态。

第四十六批（发布 dry-run）：

- 新增 `scripts/publish-dry-run.mjs` 与 `npm run publish:dry-run`：逐包 build → dist manifest → pack → `npm publish --dry-run`。
- `npm run publish:prepare <pkg>` 可准备单包发布目录。
- gateway 实测 dry-run 通过（25 files，197.6 kB unpacked）。

第四十七批（gRPC 取消传播）：

- 新增 Forever server-stream 用例：客户端 unsubscribe → 服务端 `cancelled` → handler teardown。
- 验证 Observable teardown 只执行一次，且不残留 interval。

第四十八批（Admin SLO 编辑）：

- 路由编辑器新增 SLO 错误率/ p95 阈值字段。
- 前端校验 0-1、>0，保存后进入 staged route 并可在详情 JSON 查看。

第五十批（SLO 告警历史）：

- Runtime 保留最近 20 条 SLO 告警（route/时间/errorRate/p95/阈值），每条路由保留 10 条。
- Diagnostics 输出 alerts；Admin 新增 SLO Alerts 卡片。

第五十四批（gRPC client-stream 取消）：

- `clientStream` 支持 `Observable` 输入，并可在未 complete 时取消。
- 服务端在 `end` 后延后一拍检查 `cancelled`，避免 grpc-js 的 end→cancelled 顺序导致误执行 handler。
- 新增取消不触发 handler 的 E2E。

第五十五批（gRPC bidi 取消）：

- `bidiStream` 支持 Observable 输入与 unsubscribe 取消。
- 服务端 bidi handler teardown 在客户端取消时执行，停止 AsyncIterable 消费。

第五十六批（发布门禁）：

- `agents-gate.sh` 新增 `publish-dry-run` stage，读取 `PUBLISH_DRY_RUN_PACKAGES`。
- 未设置时显式 SKIP；设置后执行逐包 build → pack → npm publish --dry-run。

第五十七批（SLO CSV）：

- Admin SLO Alerts 支持 JSON / CSV 导出（key/timestamp/iso/errorRate/p95/阈值）。
- CSV 做引号转义，文件名 gateway-slo-alerts.csv。

第六十一批（发布分片）：

- `publish-dry-run.mjs` 支持 `--shard=N/M` 与 `--list`。
- gate 支持 `PUBLISH_DRY_RUN_SHARD`，便于 CI 并行分片构建/发布校验。
- Admin bundle 已按当前 code-editor 版本重建。

第六十二批（真实 Broker 验证）：

- Docker 环境实测 Kafka 73、NATS 54、AMQP 55、MQTT 81、Redis 73 passing。
- gRPC client-stream cancel 竞态增加 5ms 取消宽限，连续 3 次回归稳定。

第五十八批（tracing feature 组合）：

- 验证 `useFeatures({ extraFeatures: [useTracing(...)] })` 可装配 tracing interceptor。
- 保持 @tsdi/service 不反向依赖 @tsdi/tracing。

第六十三批（Gateway observability 拆分）：

- 新增 `gateway.types.ts`（`GatewayForwardMeta/Result`、`GatewayErrorType`、`classifyGatewayError`）。
- 新增 `gateway.observability.ts`：trace scope、error tag、route outcome/metrics/access log。
- `GatewayInterceptor` 从 2062 行降到约 1791 行，只保留编排。
- 新增 `observability.spec.ts` 10 个模块级测试；gateway 110、admin 63 passing。

第六十四批（Gateway auth 拆分）：

- 新增 `gateway.http.ts`：header/host/client ip/prefix/claim/CIDR 纯函数。
- 新增 `gateway.auth.ts`：JWT、API key、HMAC 签名、claims 与 IP ACL。
- `GatewayInterceptor` 降至约 1567 行；observability 复用共享 HTTP helpers。
- 新增 `auth.spec.ts` 6 个模块级测试；gateway 116、admin 63 passing。

第六十五批（Gateway response 拆分）：

- 新增 `gateway.response.ts`：响应改写、response cache/etag、压缩、fallback/mock 与最终写回。
- `GatewayInterceptor` 降至约 1331 行，`sendResponse` 只做转发。
- 新增 `response.spec.ts` 9 个模块级测试；gateway 125 passing。

第六十六批（Gateway rate limit 拆分）：

- 新增 `gateway.rate-limit.ts`：路由/全局限流、共享状态窗口与 `rateLimitError`。
- `GatewayInterceptor` 降至约 1258 行，销毁时统一释放 limiter。
- 新增 `rate-limit.spec.ts` 6 个模块级测试；gateway 131 passing。

第六十七批（Gateway upstream 拆分）：

- 新增 `gateway.upstream.ts`：retry/failover、endpoint 发现与选择、HTTP/微服务转发、聚合、bulkhead 记账与 webhook。
- `GatewayInterceptor` 降至约 436 行，仅保留匹配、preview、路由解析与 HTTP pool 生命周期。
- 新增 `upstream.spec.ts` 9 个模块级测试；gateway 140 passing。

第六十八批（Admin 纯函数拆分）：

- 新增 `admin/web/admin.state.pure.ts`：告警时间、SLO CSV、config diff、路由校验与方法 key。
- `admin.state.ts` 从 1343 行降到约 1255 行，页面行为不变。
- 新增 `admin-state-pure.spec.ts` 6 个测试；admin 69 passing。

第六十九批（Admin config controller）：

- 新增 `admin/web/admin.config.controller.ts`：config 预览、历史、rollback 与 diff 摘要。
- `admin.state.ts` 降至约 1191 行；控制器直接写 reactive host，绑定行为不变。
- 回归：admin 69 passing。

第七十批（Admin routes controller）：

- 新增 `admin/web/admin.routes.controller.ts`：路由列表操作、编辑器字段、校验、applyRoutes。
- `admin.state.ts` 降至约 1059 行，保留模板箭头处理器作为薄委托。
- 回归：admin 69 passing。

第七十一批（Admin rules controller）：

- 新增 `admin/web/admin.rules.controller.ts`：规则工作流列表/复制/应用/删除与 match 测试。
- `admin.state.ts` 降至约 969 行，reload 仍复用同一 `loadRuleWorkflows` 委托。
- 回归：admin 69 passing。

第七十二批（Admin transfer + diagnostics controller）：

- 新增 `admin/web/admin.routes-transfer.controller.ts`：路由详情 JSON、导入/导出、reset。
- 新增 `admin/web/admin.diagnostics.controller.ts`：diagnostics/services 加载与 SLO JSON/CSV 导出。
- 新增 `admin/web/admin.download.ts` 统一浏览器下载。
- `admin.state.ts` 降至约 839 行；回归 admin 69 passing。

第七十三批（Gate 覆盖 admin 与类型回归）：

- `scripts/agents-gate.sh` 新增 `ms-admin` stage 并加入 ALL_STAGES。
- 修正新测试在非 transpile-only 下的类型错误（options 需 `as any`、expect 泛型、Error.headers）。
- `npm run test`（gateway）140 passing；gate `ms-gateway ms-admin ms-tsc` PASS。

第七十四批（metrics 秒单位双发 + HTTP 测试隔离）：

- 新增 `metrics/src/timing.ts` 的 `recordDuration`：`*_ms` 同时输出 `*_seconds`。
- http latency、client、gateway 三处延迟指标接入双发。
- `in-flight-drain.spec.ts` 使用 `agent: false`，避免 Node keep-alive 复用已关闭 server 的 socket。
- 回归：metrics 57、client 88、gateway 140、http 默认 50 / 全量 199。

第七十五批（defineService + OpenAPI JSON）：

- 新增 `service/src/define.ts`：`defineService({ transport, controllers, providers })` 与 `describeService` capabilities。
- swagger 在 `/{prefix}/openapi.json` 输出 OpenAPI 文档，供前端直接消费。
- 回归：service 85、swagger 11。

第七十六批（契约兼容检查）：

- 新增 `contract/src/compat.ts`：模型/字段删除、类型变更、必填化、enum 值删除、路由删除/请求响应模型变更均报 breaking。
- 新增 `assertCompatible` 与 `ContractCompatibilityError`，提示迁移建议。
- CLI 支持 `--compat <previous.json>`，breaking 变化 exit 1。
- 回归：contract 23 passing。

第七十七批（可运行示例 + examples gate）：

- 新增 `examples/http-quickstart.ts`（defineService + HTTP + health + drain）与 `examples/smoke.ts`。
- gate 新增 `ms-examples` stage 与 ALL_STAGES，真实启动 3215 端口验证 `/hello`、`/health/readiness`、关闭。
- `ExecptionLogger` 的 Logger 改为 nullable，避免未导入 LoggerModule 时请求直接 500。
- 回归：service 85；gate ms-examples PASS。

第七十八批（admin doctor 端点）：

- `GET /api/gateway-admin/doctor` 汇总路由、发现、熔断与 SLO 告警检查，返回 ok/warn。
- `curl` 即可做本地体检，后续可被 CLI 直接消费。
- 回归：admin 72 passing。

第七十九批（每包 README）：

- 21 个缺失 README 的微服务包补齐说明：用途、安装、典型注册方式、选项位置与测试命令。
- npm pack 后文档完整；`package-publish` gate PASS。

第八十批（broker auth 头合并 + E2E 隔离）：

- NATS/Kafka/AMQP 的 normalize 合并 payload headers 与 broker headers，避免实际无 broker header 时丢弃 `authorization`。
- Kafka `ServiceError` 归一后更新大内容错误断言；不同 spec 使用独立 consumer group / 唯一 auth topic。
- MQTT fake client 支持 `publish(topic, payload, options, callback)` 签名。
- `MS_BROKER_PROFILE=1 ms-brokers` PASS：Kafka 81、NATS 59、AMQP 63、MQTT 87、Redis 73。

第八十一批（Admin 视图/壳层拆分）：

- 新增 `admin.view.controller.ts`（派生视图/统计）、`admin.menu.controller.ts`（语言/主题菜单）、`admin.shell.controller.ts`（初始化/路由/跳转/登录重定向）。
- 公开接口类型移到 `admin.types.ts` 并由 `admin.state.ts` 继续 re-export。
- `admin.state.ts` 从 839 行降到 593 行，低于 600 行目标；admin 72 passing。

第八十二批（soak 稳定性门禁）：

- 新增 `examples/soak.ts`：预热后固定并发压测，GC 后校验 heap 增长、句柄回落与失败数；RSS 默认只报告，可显式设限。
- gate 新增 opt-in `ms-soak` stage（`MS_SOAK_PROFILE=1`；nightly 可用 `MS_SOAK_MS=1800000`）。
- 30s 实测：37,942 请求、0 失败、heap -1MB、句柄回落到 2。

第八十三批（指标低基数回归）：

- 新增 `metrics/test/label-cardinality.spec.ts`：route pattern 优先、UUID/数字段归一、query 去除、超长截断。
- gateway 增加默认 label 集合断言（不含 endpoint/error_type）。
- 回归：metrics 61、gateway 141。

第八十四批（admin doctor CLI）：

- 新增 `admin/src/doctor.ts`：`npm run doctor -- --url http://127.0.0.1:3000 [--token ...] [--json]`。
- 复用 `/api/gateway-admin/doctor`；401/5xx 给出可操作错误，warn 状态 exit 1。
- 回归：admin 76 passing。

第八十五批（admin routes CLI）：

- 新增 `admin/src/routes-cli.ts`：`npm run routes -- --url ... [--token] [--json]`，输出 path/methods/target/flags 表。
- 复用 `/api/gateway-admin/state`；401/5xx 可操作错误。
- 回归：admin 81 passing。

第八十六批（Gateway 实例故障恢复）：

- 新增 `gateway/test/chaos-recovery.spec.ts`：两个真实 HTTP 实例，kill 一个后网关在 <30s 内全部切到存活实例。
- 断言 dead endpoint 的 per-endpoint circuit 打开，后续请求保持健康且 <5s。
- 回归：gateway 142 passing。

第八十七批（Gateway webhook 模块）：

- 新增 `gateway.webhook.ts`：超时、有限重试、可选 SSRF host allowlist（支持 `*.domain`）。
- `gateway.upstream.ts` 不再内联 webhook，改为注入 `GatewayWebhook`。
- 新增 `webhook.spec.ts` 6 个测试；gateway 148 passing。

第八十八批（Event loop lag 指标）：

- 新增 `EventLoopLagGauge`：采样 p99/max（秒），timer unref，destroy 时释放 histogram。
- `useMetrics` / `MetricsModule` 默认启用，`includeEventLoopLag:false` 可关闭。
- 回归：metrics 63 passing。

第八十九批（webhook SSRF 加固）：

- allowlist 模式下仅允许 http/https，并设置 `redirect:'manual'`，防止 3xx 跳转到内网地址绕过白名单。
- `webhook.spec.ts` 增加协议/重定向断言；gateway 149 passing。

第九十批（Consumer 指标）：

- `ConsumerRuntime` 支持可选 `ConsumerMetricsSink`/labels；Kafka/AMQP/MQTT/NATS 通过 `CONSUMER_METRICS` 可选注入。
- metrics 新增 `ConsumerMetricsRecorder`：started/completed/failed/retried、in-flight gauge、处理耗时 ms/seconds 双发。
- 回归：service 88、metrics 67；broker 套件保持 Kafka 81/NATS 59/AMQP 63/MQTT 87。

第九十一批（Admin UI 响应式/性能审计）：

- 按 components 响应式契约审查 admin web：绑定数组均为整体替换（`map/filter/slice` 后赋值），未使用 `push/splice` 后依赖 `v-for` 刷新；无手动 render/forceUpdate/状态订阅。
- 修复 `editRouteField` 的“先改代理再替换”双触发，改为构造一次新对象赋值。
- `AdminViewController` 增加按引用失效的派生缓存：`filteredRoutes`/`enabledRoutes`、service/policy 汇总、diagnostics 投影、route detail JSON；避免每个模板绑定重复 filter/sort/Map/JSON。
- 新增 `admin-view-cache.spec.ts` 4 个测试；admin 85 passing。bundle 待 activities 并发改动稳定后重建。

第九十二批（Admin 启动/切换优化）：

- 语言切换不再调用 `reload()`：`locale` 是响应式的，`t()` 绑定会自行重跑；原实现会多一次 state 请求并丢弃未保存的路由编辑。新增 `admin-shell.spec.ts` 断言。
- 规则设计器改为首次打开时懒创建（registry/默认 workflow 不再在 dashboard/routes 启动时构建）。
- 回归：admin 87 passing。bundle 待并发 activities 稳定后重建。

第九十三批（Admin API 被 /api 路由吞掉导致 401/403）：

- 根因：网关 segment 前缀路由 `/api` 会匹配 `/api/gateway-admin/*`，把本地 admin API 转发到上游；上游未认证时返回 401/403，看起来像 admin 认证失败。
- 新增 `GatewayOptions.excludePaths`，在规则/路由匹配前直接 `next.handle`；按路径段边界匹配。
- standalone `startGatewayAdminServer()` 自动排除 `/api/gateway-admin` 与 UI prefix；README 集成示例补充 excludePaths。
- 新增 gateway `exclude-paths.spec.ts` 2 个测试、admin `server.spec.ts` 真实上游 401 回归；gateway/admin 套件通过。

第九十四批（Admin 本地路径自动注册）：

- 新增 `GATEWAY_LOCAL_PATHS` multi-provider token；`useGatewayAdminUi` 自动登记 UI prefix 与 `/api/gateway-admin`，`useGatewayAdminAuth` 登记配置的 apiPrefix/uiPrefix。
- 网关在规则/路由匹配前合并 token 路径与 `excludePaths`，嵌入式 admin 无需手动配置；路径仍按段边界匹配。
- 新增 gateway token 测试与 admin `ui-paths.spec.ts`；顺带移除 controller.openapi 的重复 throw。

第九十五批（嵌入式 admin 规则保存回归）：

- 新增 `embedded-admin.spec.ts`：真实 gateway + admin features + `/api` 上游 401，验证 `/api/gateway-admin/state` 与 `PUT /rules/:id` 均保持本地并可保存规则。
- `useGatewayAdminUi` 不再把空前缀注册为 `/`（避免误排除整个网关）；auth 的 `uiPrefix:'/'` 同样跳过。

第九十六批（transport capability matrix）：

- 新增 `service/src/capabilities.ts`：声明 HTTP/gRPC/TCP/UDP/WS/Redis/NATS/MQTT/Kafka/CoAP/AMQP/MCP 的请求响应、pub/sub、streaming、delivery、幂等、ordering、payload 说明。
- `provideService` 暴露 `SERVICE_CAPABILITIES`；`describeService().capabilities` 输出每 transport 的报告与语义告警（at-most-once、无幂等等）。
- admin doctor / CLI 展示 capability 报告；新增 service/admin 测试。
- 回归：service 112、admin 95 passing；service/admin tsc 通过。

第九十七批（Admin CSRF/Origin 防线）：

- 认证开启时，admin API 的 POST/PUT/PATCH/DELETE 校验浏览器 `Origin`：同源放行，`allowedOrigins` 支持反代/备用域名，无 Origin 的 CLI/curl 保持兼容。
- `mode:none` 启动显式打印 “Authentication: NONE”，绑定非回环地址时输出安全告警。
- 新增 `auth-origin.spec.ts` 4 个测试；admin 99 passing。

第九十八批（amqplib 类型漂移修复）：

- `amqplib@0.10.9` 的 `connect()` 返回 `ChannelModel`；AMQP client/server 与 e2e 的类型统一为 `ChannelModel`。
- `ms-tsc` 恢复 PASS；AMQP 68 passing。

第九十九批（Admin config schema v1）：

- 新增 `GATEWAY_ADMIN_CONFIG_VERSION = 1`、`migrateGatewayAdminConfig`、`validateGatewayAdminConfig` 与 `GatewayAdminConfigError`。
- v0 自动迁移（含 `auth: 'oidc'` → `{ mode: 'oidc' }`）；更高版本给出升级错误；port/prefix/routes/auth/oidcService 启动期校验并输出可操作错误。
- README 补充 version/迁移说明；admin 103 passing。

第一百批（Redis Stream 统一消费语义）：

- Redis `delivery:'stream'` 接入 `ConsumerRuntime`：retry/concurrency/idempotency/metrics/drain 与 Kafka/AMQP/NATS 一致。
- stream entry id 作为幂等键；失败保留 pending 交给 XAUTOCLAIM；关闭时先 close/drain runtime。
- 新增 stream retry E2E（首次失败、进程内重试后 ack）；Redis 77 passing。

第一百零一批（Gateway JWKS 轮换）：

- `HttpJwtAuthOptions` 新增 `jwksURI`/`jwksCacheTtlMs`；`HttpAuthService` 按 kid 解析 JWKS，缓存 5 分钟，kid 未命中强制刷新一次。
- 静态 `publicKey` 仍优先；HMAC/算法限制不变；新增 `clearHttpAuthJwksCache`。
- 新增 security JWKS 3 个测试；security 48、gateway 157 passing。

第一百零二批（MQTT QoS 幂等）：

- MQTT 新增 `idempotency` 选项；`resolveMqttMessageId(topic, payload, packet)` 使用 QoS1/2 `packet.messageId` + payload hash。
- 接入 `ConsumerRuntime` 的 idempotency；QoS0 无 packet id 时明确不 dedupe。
- capability matrix 更新 MQTT 幂等（含 QoS0 限制说明）；service 112、MQTT 92 passing。

第一百零三批（Admin 审计记录）：

- Controller 记录 routes.update/reset、config.apply/rollback、rule.save/apply/remove 的 timestamp/action/target/details。
- 新增 `GET /api/gateway-admin/audit`（最新在前，最多 200 条）；同时写结构化 logger `gateway.admin.audit`。
- controller/doctor 定向测试通过。

第一百零四批（通用 Config schema）：

- 新增 `config/src/schema.ts`：版本化字段定义、类型/required/enum/default 校验、vN→vN+1 迁移、`ConfigSchemaError`。
- `ConfigOptions.schema` 在 `DefaultConfigurationManager.load()` 合并源后自动 migrate+validate，`getSchemaWarnings()` 暴露迁移记录。
- 新增 5 个 schema 测试；config 80 passing。

第一百零五批（Gateway retry budget）：

- 新增 `gateway/src/retry-budget.ts`：成功数相对预算 + 每秒最小重试保障，窗口过期重置。
- `GatewayLoadBalanceOptions.retryBudget` 接入 HTTP/微服务 failover；预算耗尽时直接返回失败响应/抛出最后一次错误。
- 新增 3 个测试；gateway 160 passing。

第一百零六批（全链路示例）：

- 新增 `examples/full-stack.ts`：HTTP backend + InMemoryServiceDiscovery + gateway（按服务发现转发）。
- 新增 `full-stack-smoke.ts`，`ms-examples` 现在同时运行 quickstart 与 full-stack 两次真实启动/关闭。
- README 补充运行方式；`ms-examples` PASS。

第一百零七批（OTel semconv 双发）：

- 新增 tracing `semconv.ts`：HTTP span 同时写 legacy (`http.method`/`http.url`/`http.status_code`) 与当前 (`http.request.method`/`url.full`/`url.path`/`http.response.status_code`) 属性。
- broker span 同时写 `messaging.destination` 与 `messaging.destination.name`；gateway span 增加 method/path/scheme/service.name。
- 新增 3 个 semconv 测试；tracing 58、gateway 160 passing。

第一百零八批（broker 全链路示例）：

- 新增 `examples/broker-stack.ts`：HTTP edge → gateway → Redis broker → orders service，无 HTTP backend hop。
- 新增 `broker-stack-smoke.ts` 与 opt-in `ms-examples-broker` gate（`MS_BROKER_PROFILE=1`）。
- 真实 Redis 验证 `GET /api/orders -> {"id":7,"status":"paid"}`；gate PASS。

第一百零九批（Outbox 原语）：

- 新增 `service/src/outbox.ts`：`OutboxStore`/`MemoryOutboxStore`/`OutboxDispatcher`；ack 后才删除、失败延迟重试、flush 串行化、容量上限。
- 示例 `examples/outbox.ts` 与 `ms-examples` smoke 使用真实 API；service 117 passing。
- saga/事务集成仍待后续。

第一百一十批（Redis 分布式 Inbox）：

- 新增 `RedisIdempotencyStore`（SET NX PX/DEL），Redis Stream 开启 `idempotency` 且未显式提供 store 时自动使用。
- 跨副本 dedupe 不再依赖进程内存；新增 expiry/release/prefix 测试；Redis 79 passing。

第一百一十一批（Saga 原语）：

- 新增 `service/src/saga.ts`：顺序执行、失败逆序补偿、补偿错误聚合、步骤 hook。
- 新增 `examples/saga.ts` 并接入 `ms-examples`（reserve → charge 失败 → release）；service 121 passing。

第一百一十二批（Nightly CI）：

- 新增 `.github/workflows/ms-nightly.yml`：Redis/NATS/MQTT/RabbitMQ/Kafka 容器 + `ms-brokers`、`ms-examples-broker`、30 分钟 `ms-soak`、`ms-bench`。
- 覆盖 30 分钟 soak、真实 broker 与性能回归，不阻塞日常 gate。

第一百一十三批（Saga journal）：

- 新增 `SagaJournal`/`MemorySagaJournal`；`runSaga` 支持 `sagaId` 恢复已完成步骤，成功后清理、补偿成功后清理、补偿失败保留失败记录。
- 新增 2 个 resume/journal 测试；service 123 passing。

第一百一十四批（Redis Saga journal）：

- 新增 `RedisSagaJournal`：JSON 记录 + TTL（默认 24h）+ malformed 值忽略，跨副本恢复 saga 进度。
- 新增 save/load/clear/TTL 测试；Redis 81 passing。

第一百一十五批（OTLP live nightly）：

- 新增 tracing/metrics `otlp-live.spec.ts`（`TSIO_TEST_OTLP=1` 时启用），真实导出 span/metrics。
- `ms-nightly` 增加 OTel collector 容器与 live 导出步骤；默认开发/CI 跳过，不依赖 collector。

第五十一批（可选 feature 组合）：

- `ServiceFeatureOptions.extraFeatures` / `ClientFeatureOptions.extraFeatures`。
- `useFeatures({ extraFeatures: [useTracing(...)] })` 可在不引入 service→tracing 循环依赖的情况下组合可选能力。
- 函数/数组/对象 feature 均支持。

第四十九批（真实 Redis 多 Gateway）：

- 两个真实 Gateway 进程共享同一 Redis prefix。
- 验证跨副本固定窗口限流（2 次后 429）与跨副本响应缓存（B 命中 A 写入的值）。


---

## 0. 结论摘要（先看这里）

当前框架的**内核设计是好的**：DI/AOP + Feature 组合 + 协议无关的 MessageAdapter，让"新增协议/新增治理能力"成本较低；Gateway 的策略面已经非常宽。

真正制约生产可用性的不是"功能不够多"，而是三类问题：

1. **正确性缺口**（会让能力"看起来有、实际不生效"）
   - `matchTransport` 自比较 bug，协议过滤失效；
   - `multiOrder` 被当作数组下标，拦截器顺序不可控（`useJson()` 排在 Router 之后，匹配路由后永不执行）；
   - 路由级 `guards/interceptors/filters` 只收集不执行；
   - HTTP client 对 4xx/5xx 视为成功，与 broker client 语义不一致；
   - Gateway 上游 5xx 不计入熔断/错误指标；
   - 若干 Feature 选项（config/health/session/cookie/json）注入后无人消费。
2. **生产化缺口**（单机可用，集群/大规模不可用）
   - 只有 InMemory 注册中心，无 Consul/Nacos/K8s/etcd；
   - 客户端 discovery/LB 是 no-op，治理全部压在 Gateway；
   - Gateway 状态（限流/熔断/缓存/幂等）全在进程内，无法多副本；
   - 转发全量 buffer，无 SSE/流式/背压/请求体上限；
   - 配置变更整对象替换、无校验、无版本、无回滚。
3. **可观测与生命周期缺口**
   - 非 W3C traceparent；`Tracer.currentSpan` 全局可被并发覆盖；
   - `/health` DOWN 仍返回 200，无 per-indicator 超时；
   - 注册发生在 listen 之前；优雅关闭不 drain in-flight；`GracefulShutdownOptions` 未接线；
   - Metrics 标签高基数、无 exporter 抽象。

**建议总路线**（详细见 §5）：

| 阶段 | 主题 | 目标 |
|---|---|---|
| P0（1~2 周） | 正确性修复 + 契约测试 | 让已有能力真正生效，建立回归网 |
| P1（3~4 周） | Discovery 生产化 + Client 治理 | 服务间调用可发现、可负载均衡、可熔断 |
| P2（4~6 周） | Gateway 生产化 + 配置事务化 | 流式/背压/多副本状态/可回滚 |
| P3（3~4 周） | OTel 可观测 + 生命周期 | 可诊断、可 SLO、可优雅上下线 |
| P4（持续） | 开发体验 + 扩展 SPI | 一行启动、类型化客户端、可插拔 |

---

## 1. 当前架构总览

```
Application (DI)
  └─ Module
      ├─ controllers (@Controller/@Get/@Handle/@Subscribe)
      ├─ providers (ServiceFeature[], strategies, adapters)
      └─ runners  (MicroService.start → register → health → listen)

provideService(features)
  ├─ 按 ServiceFeatureKind 排序合并
  ├─ Transport feature (http/tcp/ws/grpc/mqtt/kafka/...)
  └─ ServiceHandler = filters → guards → interceptors → router

Router (trie) → RouteHandler
  ├─ MessageValueReader (@RequestBody/@RequestParam/...)
  ├─ timeout / rateLimit
  └─ controller method

Client (AbstractClient)
  └─ connect → timeout → discovery* → loadBalance* → circuitBreaker → retry → backend
      (* 目前均为 no-op)
```

关键文件：

| 关注点 | 文件 |
|---|---|
| Feature 组合 / 默认值 | `service/src/provider.ts:43-220` |
| 生命周期 | `service/src/Service.ts:15-36` |
| 路由与参数 | `service/src/router/router.optimize.ts`、`route.handler.ts` |
| 传输工厂 | `service/src/transport.ts:77-137`、`client/src/transport.ts:56-103` |
| HTTP 服务端 | `http/src/server/http-server.ts`、`message-adapter.ts` |
| HTTP 客户端 | `http/src/client/factory.ts` |
| 客户端治理 | `client/src/interceptors/features.ts`、`strategies/defaults.ts` |
| Gateway 策略 | `gateway/src/gateway.interceptor.ts` |
| Gateway 状态 | `gateway/src/gateway.runtime.ts` |
| 发现/解析 | `discovery/src/registry.ts`、`endpoint-resolver.ts` |
| 配置 | `config/src/manager.ts`、`config.module.ts` |
| 观测 | `metrics/src/*`、`tracing/src/*`、`health/src/*` |

---

## 2. 优点（应当保留并放大的部分）

1. **Feature/Provider 组合模型**
   `provideService`/`provideClient` + `ServiceFeatureKind` 把协议接入变成声明式；新增协议只需提供 options token、server/client 类型和 backend，公共逻辑（token、handler、默认 backend、auth 桥接）由 `createServiceTransportFeature` / `createClientTransportFeature` 统一。

2. **协议无关的请求抽象**
   `MessageAdapter` / `StatusMessageAdapter` / `RestfulRequestAdapter` + `MessageValueReader`，同一 controller 可运行在 HTTP/TCP/WS/Broker 上，这是相对 NestJS 的真实差异点。

3. **Router 质量不错**
   trie 匹配、按协议的通配符（MQTT `+/#`、Redis `*`、NATS `>`、Kafka `*`、AMQP `#`）、惰性解析 controller、正则路由、route/global timeout 与 rate limit。

4. **Gateway 策略面完整**
   auth/API key/HMAC/claims/IP ACL、限流/配额/降频、熔断 half-open、bulkhead（有界队列+超时）、失败重试+退避 jitter、5 种 LB、canary、rewrite、masking、compression、webhook、access log、metrics、trace、配置热更、健康探测。**这套策略模型本身值得保留**，问题在语义与生产化。

5. **EndpointResolver 设计好**
   TTL 缓存 + 并发合并 + watcher 失效 + protocol/version/tag/metadata 过滤（`endpoint-resolver.ts:51-171`），是正确的 SPI 形态。

6. **Admin 真正可用**
   独立模式 + 嵌入式、可视化规则设计器、路由编辑/预览/诊断、OIDC/OAuth2/service 认证，可作为运维入口继续扩展。

7. **Contract 工具链三角**
   一份 manifest → DTO / OpenAPI / proto，且有反向导入与 `--check` 漂移检查，具备演进成"契约驱动客户端/服务端"的基础。

---

## 3. 问题清单（按优先级与证据）

### P0 —— 正确性（必须最先修）

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| 1 | `matchTransport` 比较 `source.transport === source.transport` | `common/src/protocols.ts:120-124` | 所有按协议过滤 Feature/Config 的逻辑失效，多协议服务可能注册错误协议的能力 |
| 2 | `multiOrder` 被当作 `splice` 下标 | `ioc/src/impl/injector.ts:815-840` | 负数全部插到 0，声明顺序与"优先级"语义不符；HTTP 链实际为 `[BodyParser, Router, Json]`，`useJson` 对已匹配路由永不执行 |
| 3 | 路由级 `guards/interceptors/filters` 只合并不执行 | `service/src/router/router.optimize.ts:269-277`；`route.handler.ts:19-40` | `@Get('/x',{guards:[Auth]})` 实际不鉴权，属于安全级缺陷 |
| 4 | HTTP client 4xx/5xx 视为成功 | `http/src/client/factory.ts:74-88` | 调用方无法用统一方式处理失败；与 broker `ErrorResponse`（`transport/src/message-transfer.ts:230-238`）不一致 |
| 5 | Gateway 上游 5xx 记成功 | `gateway/src/gateway.interceptor.ts:655-674` | 熔断器/`gateway_errors_total` 看不到最常见的故障形态 |
| 6 | Gateway 前缀匹配无 segment 边界、无最长优先 | `gateway.interceptor.ts:409-436` | `/api/users2` 命中 `/api/users`；路由顺序改变行为 |
| 7 | `ConfigModule.withOptions/withFile` 实际不生效 | `config/src/manager.ts:101`；`config.module.ts:36-80` | 用户配置静默丢失 |
| 8 | `HealthOptions.timeout/includeDetails` 未使用；DOWN 仍 200 | `health/src/health.ts:52-61`；`health.controller.ts:22-43` | K8s 探针误判、悬挂 indicator 拖死整个探针 |
| 9 | `Tracer.currentSpan` 为全局单值且不恢复父 span | `tracing/src/default.tracer.ts:158-190` | 并发请求 parent 关系错误，trace 不可用 |
| 10 | `Service.start` 先注册后 listen | `service/src/Service.ts:22-28` | 发现中心提前摘流到未就绪实例 |

### P1 —— 稳定性 / 健壮性

| # | 问题 | 证据 |
|---|---|---|
| 11 | 只有 InMemory discovery；无持久化/远程 registry | `discovery/src/memory.discovery.ts` |
| 12 | InMemory `healthCheck` 恒为 UP；heartbeat 刷新 `updatedAt` 导致 TTL 永不失效 | `memory.discovery.ts:129-137,167-197` |
| 13 | 客户端 discovery/LB no-op；`EndpointResolver` 只有 gateway 使用 | `client/src/strategies/defaults.ts:8-30` |
| 14 | `DefaultConnectionPool` 已实现但 `ClientConfig.pool` 从未被使用 | `client/src/connection.pool.ts:72-263`；`options.ts:100-103` |
| 15 | 优雅关闭不 drain；未 deregister 前先停健康；options 未接线 | `service/src/strategies/default-graceful-shutdown.strategy.ts:14-23` |
| 16 | 自定义 `useTransfers()` 会丢掉 `defaultTransfer` | `service/src/provider.ts:353-372`；`client/src/provider.ts:338-359` |
| 17 | HTTP 无请求体上限、无 hop-by-hop 头清理、`host/content-length` 不修正 | `gateway.interceptor.ts:963-991` |
| 18 | Gateway 转发全量 buffer；无 SSE/流式/背压/客户端取消传播 | `gateway.interceptor.ts:729-788` |
| 19 | Gateway 缓存 key 不含认证/租户/Vary；Map 无容量上限 | `gateway.interceptor.ts:1525-1534`；`gateway.runtime.ts:50-57` |
| 20 | 同步 `zlib` 压缩阻塞 event loop | `gateway.interceptor.ts:1486-1518` |
| 21 | Webhook 无超时/重试/SSRF 防护 | `gateway.interceptor.ts:1588-1626` |
| 22 | 限流 key 默认信任客户端 `x-forwarded-for` | `service/src/interceptors/ratelimiter.ts:187-203` |
| 23 | CORS/CSRF/Helmet 已实现但不自动装配；`useAuth(false)` 会 500 | `service/src/provider.ts:586-600` |
| 24 | Session/Cookie 实现浅：内存 session，无 store/signed/keys | `http/src/server/interceptors/session.ts`、`cookie.ts` |

### P2 —— 性能 / 扩展性 / 易用性

| # | 问题 | 证据 |
|---|---|---|
| 25 | 每请求重复解析路由、构造 adapter、复制 headers、拼接 metrics label | `http-server.ts:221-252`；`gateway.interceptor.ts` |
| 26 | 指标标签用原始 URL，基数无上限；histogram bucket 配置被忽略 | `metrics/src/registry.ts:80-104`；`metrics/src/provider.ts` |
| 27 | Swagger 无 JSON/YAML spec 端点、嵌套 router 跳过、响应恒数组 | `swagger/src/swagger.service.ts:164-255` |
| 28 | MCP 仅 POST、无 SSE/session/notifications/initialize | `mcp/src/server/mcp-server.ts:82-89` |
| 29 | Contract 无运行时校验/兼容性检查；proto field number 丢失 | `contract/src/import-proto.ts`、`proto.ts:103-113` |
| 30 | 多个包未声明 `@tsdi/*` 依赖，monorepo 外发布风险 | `gateway/package.json` 等 |

---

## 4. 目标架构

### 4.1 分层与 SPI

```
┌──────────────────────────────────────────────────────────┐
│ 应用层  defineService() / typed client / contract        │
├──────────────────────────────────────────────────────────┤
│ 治理层  Resilience · RateLimit · Cache · Tracing · Metrics│
│         Gateway (edge) / Client (service-to-service)      │
├──────────────────────────────────────────────────────────┤
│ 运行时  Router · Lifecycle · Config · Discovery · Health  │
├──────────────────────────────────────────────────────────┤
│ 传输层  HTTP / TCP / WS / gRPC / MQTT / Kafka / ...       │
├──────────────────────────────────────────────────────────┤
│ 内核    DI / AOP / Application / MessageAdapter           │
└──────────────────────────────────────────────────────────┘
```

新增 4 个稳定 SPI，所有生产能力都通过它们可插拔：

```ts
// 注册中心适配器：只负责"注册/心跳/发现/订阅"
export interface ServiceRegistryAdapter {
    readonly kind: string;
    register(endpoint: ServiceEndpoint): Promise<void>;
    deregister(id: string): Promise<void>;
    heartbeat(id: string): Promise<void>;
    discover(name: string): Promise<ServiceEndpoint[]>;
    watch(name: string, cb: ServiceWatchCallback): Promise<() => void>;
    healthCheck?(endpoint: ServiceEndpoint): Promise<boolean>;
    capabilities(): RegistryCapabilities; // watch/persist/ttl/zone...
}

// 分布式状态（限流/熔断/缓存/幂等）
export interface GatewayStateStore {
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
    getCircuit(key: string): Promise<CircuitState | undefined>;
    setCircuit(key: string, state: CircuitState, ttlMs: number): Promise<void>;
    getCache(key: string): Promise<CachedResponse | undefined>;
    setCache(key: string, value: CachedResponse, ttlMs: number): Promise<void>;
    invalidate(prefix: string): Promise<void>;
}

// 配置源 + 校验
export interface ConfigValidator<T = unknown> {
    validate(raw: unknown): { ok: true; value: T } | { ok: false; errors: string[] };
}

// 传输能力声明（替代隐式约定）
export interface TransportCapabilities {
    requestResponse: boolean;
    pubSub: boolean;
    streaming: boolean;
    binary: boolean;
    wildcard: 'mqtt' | 'redis' | 'nats' | 'kafka' | 'amqp' | 'none';
    discoveryAddress: 'url' | 'host-port' | 'topic';
    idempotent: boolean;
}
```

### 4.2 统一治理内核

把 Gateway 里已经验证过的策略抽成**与传输无关的 `ResiliencePipeline`**，三处复用：

```
Gateway 出站 ─┐
Client 调用   ─┼─→ ResiliencePipeline
Server 入站   ─┘   (timeout → rateLimit → circuit → bulkhead → retry → cache → metrics/trace)
```

好处：
- Gateway 与 Client 不再各写一套熔断/重试；
- 策略顺序由显式 `order` 决定（见 §5.1），不再依赖 `multiOrder` 下标；
- 每个策略统一输出 metrics/span attributes，可直接做 SLO。

---

## 5. 优化方案

### 5.1 P0：正确性与执行语义（先修"假能力"）

#### 5.1.1 修复 `matchTransport`

```ts
// common/src/protocols.ts
export function matchTransport(source: TransportConfig, target: TransportConfig): boolean {
    return source.transport === target.transport
        && (source.name ? source.name === target.name : true)
        && (source.microservice !== undefined ? source.microservice === target.microservice : true);
}
```

验收：
- 新增 `common/test/protocols.spec.ts`：transport 不匹配返回 false、name 匹配、microservice 匹配；
- `service/test/provider.spec.ts`：同时注册 `http` + `tcp` feature 时，HTTP 服务只拿到 HTTP 的 feature（当前会串）。

#### 5.1.2 重定义 `multiOrder` 为稳定优先级

现状 `multi.splice(multiOrder, 0, record)` 把序号当位置。建议改为"注册时带顺序，解析时稳定排序"：

```ts
// ioc/src/impl/injector.ts（注册）
if (multiPdr.multi) {
    const order = (provider as MutilProvider).multiOrder;
    multiPdr.multi.push({ record, order: isNumber(order) ? order : Number.MAX_SAFE_INTEGER, seq: nextSeq() });
}

// ioc/src/impl/injector.ts（resolveArgs 前）
multi.sort((a, b) => a.order - b.order || a.seq - b.seq);
```

语义：**order 越小越外层**（与现在的注释意图一致）。迁移策略：
- 保留负值含义（`-1000` 最外层），但如果两个策略同 order，按注册顺序；
- 增加 `defineInterceptorOrder()` 常量表，避免魔法数字；
- 对现有 `multiOrder: -950`（gateway）等逐个校准，并用测试锁死顺序。

验收（必须先失败后通过）：
- `service/test/pipeline-order.spec.ts`：断言 `useRouter()+useJson()` 的实际链为 `BodyParser → Json → Router`，且 `useJson` 对已匹配响应生效；
- `http/test/auth-order.spec.ts`：`useAuth()` 必须早于 `useStatics`（静态资源不允许绕过认证）；
- 断言 `interceptors` 中 auth 只注册一次。

#### 5.1.3 路由级守卫/拦截器真正执行

`RouteHandler` 目前只消费 `resolvers/timeout/rateLimit`。建议把"每个路由一个 handler 链"作为编译产物：

```ts
interface CompiledRoute {
    method: string;
    path: string;
    resolvers: ValueResolver[];
    timeout?: number;
    rateLimit?: RateLimitOptions;
    guards: Guard[];            // 新增：class + method 合并
    interceptors: Interceptor[]; // 新增
    filters: Filter[];           // 新增
}
```

执行顺序与全局链保持一致：`filters → guards → interceptors → controller`，全局链包裹路由链。
验收：`@Get('/secure', { guards: [DenyGuard] })` 返回 403；无 guard 的路径正常；class 级 guard 与 method 级合并（内层优先）。

#### 5.1.4 统一客户端错误语义

```ts
// client/src/errors.ts
export class ServiceError extends Error {
    constructor(
        message: string,
        readonly code: ServiceErrorCode,      // transport|timeout|circuit|rateLimit|upstream|contract
        readonly status?: number,
        readonly body?: unknown,
        readonly cause?: unknown
    ) { super(message); }
}
```

- HTTP backend 默认 `throwOnError: true`（>=400 抛 `ServiceError`）；
- 保留逃生口 `throwOnError: false` 或 `responseType: 'response'`（返回完整响应）；
- broker 的 `ErrorResponse` 归一为 `ServiceError`；
- 所有 backend 统一填充 `status/body/headers/url`。

验收：`http/test/client-errors.spec.ts`（400/404/500/网络错误/超时），`transport/test/error-model.spec.ts`（broker 与 http 同构）。

#### 5.1.5 清理"死选项"

逐项要么接线、要么删除（遵循仓库"禁止死机制"约定）：

| 选项 | 处理 |
|---|---|
| `ConfigOptions`（`CONFIG_OPTIONS`） | `DefaultConfigurationManager` 注入并应用 defaults/sources/refreshInterval |
| `ConfigModule.withFile` | 真正 `addSource(new JsonFileConfigSource(...))` |
| `HealthOptions.timeout/includeDetails` | 实现 per-indicator timeout（`Promise.race` + AbortSignal）与详情裁剪 |
| `useJson/Session/Cookie` options | 对应 interceptor 注入 options token |
| `useBodySerializer` | 接线到 client/server 编解码，或删除 |
| `ClientConfig.pool` | 接入 `DefaultConnectionPool`（见 5.3） |
| `HttpServOptions.timeout` | 作为服务器级请求超时（与 route timeout 取 min） |
| `HttpClientOptions.requestOpts` | 传入 `http.request` |

验收：每个选项都有"设置后行为改变"的单测；扫描 `grep` 无生产零调用的 token。

---

### 5.2 P1：服务发现生产化

#### 5.2.1 拆分 Registry 与 Discovery

现状 `ServiceDiscovery` 同时承担注册、发现、健康、watch，导致每接一个注册中心都要重写全部。改为：

```
ServiceDiscovery (facade, 稳定)
  ├─ RegistryAdapter[]  (consul / nacos / eureka / k8s / etcd / memory)
  ├─ EndpointResolver   (缓存/合并/过滤，已有)
  └─ Selector[]         (random/rr/weighted/least/p2c)
```

`CompositeServiceDiscovery` 职责：
- 按 `registry` 字段路由到 adapter；
- 多 registry 时并发查询 + 去重 + 优先级；
- 单 adapter 失败时降级到 cache 并上报 `discovery_failures_total`；
- 统一 `watch` 语义（adapter 不支持 watch 时降级为带 jitter 的轮询）。

#### 5.2.2 首个生产适配器：Consul HTTP API

不引第三方 SDK，用 `fetch` 实现（零新依赖）：

```ts
export class ConsulServiceDiscovery extends ServiceRegistryAdapter {
    async register(ep: ServiceEndpoint) {
        await this.put(`/v1/agent/service/register`, {
            ID: ep.id, Name: ep.name, Address: ep.address, Port: ep.port,
            Tags: ep.tags ?? [], Meta: ep.metadata ?? {},
            Check: ep.healthCheckPath ? { HTTP: ..., Interval: '10s', DeregisterCriticalServiceAfter: '60s' } : undefined
        });
    }
    async discover(name: string) {
        const res = await this.get(`/v1/health/service/${encodeURIComponent(name)}?passing=true`);
        return res.map(toEndpoint);
    }
    async watch(name, cb) {
        // blocking query: ?index=<last>&wait=5m，返回后重新发起
    }
}
```

随后按同样接口补 K8s（Endpoints API）与 Nacos。Eureka/etcd 可作为社区扩展。

#### 5.2.3 修复 InMemory 语义

- **heartbeat 与 TTL 解耦**：heartbeat 只刷新 `lastHeartbeat`，TTL 判定用 `registeredAt/ttl` 或 `lastHeartbeat + ttl`，二者不互相掩盖；
- `healthCheck` 不再恒 UP：InMemory 只做"存在 + 未过期"，真实探测交给 `HealthProbe`，或注入 `EndpointProbe`；
- 增加 `maxEndpointsPerService` 与过期清理定时器（`unref()`）；
- 快照持久化：`SnapshotServiceDiscovery`（JSON/SQLite）用于重启恢复，写入需原子（临时文件 + rename）。

#### 5.2.4 Selector 修正

| Selector | 修正 |
|---|---|
| RoundRobin | cursor 按 service 维度（`Map<name, index>`），不能全局共享 |
| Weighted | 使用 `endpoint.weight`，并支持 smooth weighted |
| LeastConnections | 真实 active 计数，调用方必须 `release`（`try/finally`），否则计数泄漏 |
| 新增 P2C | power-of-two-choices，低延迟场景默认 |
| 新增 HealthAware | 过滤 `DOWN`/被驱逐，保留少量兜底 |

验收：
- `discovery/test/ttl.spec.ts`：heartbeat 开启时 TTL 仍能过期；
- `discovery/test/selector.spec.ts`：加权分布、每服务 RR、least 计数回收；
- `discovery/test/consul.spec.ts`：用本地 fake HTTP server 验证 register/discover/watch/降级。

---

### 5.3 P1：客户端治理（服务间调用）

#### 5.3.1 实现 Discovery + LB（不再 no-op）

```ts
export class ResolverClientDiscoveryStrategy extends ClientDiscoveryStrategy {
    constructor(private resolver: EndpointResolver, private options: DiscoveryOptions) { super(); }
    async discover(ctx: ClientRequestContext) {
        if (!ctx.service) return;
        const endpoints = await this.resolver.resolve(ctx.service, {
            protocol: this.options.protocol,
            tags: this.options.tags,
            status: 'UP'
        });
        if (!endpoints.length) throw new ServiceError(`no endpoint for ${ctx.service}`, 'discovery');
        ctx.endpoints = endpoints;
    }
}

export class SelectorLoadBalanceStrategy extends ClientLoadBalanceStrategy {
    async chooseServer(ctx: ClientRequestContext) {
        ctx.target = this.selector.select(ctx.endpoints, ctx.request);
    }
}
```

关键点：
- HTTP：`chooseServer` 后重写 `scheme/host/port`，再交给 backend；
- TCP/WS/Redis 等：写入 `context` 的 `SOCKET`/`address`，避免每个 backend 各自解析；
- `discover` 结果按请求缓存（`EndpointResolver` 已有 TTL），不要让每次调用都打注册中心；
- 失败 endpoint 写入 `excluded`，与 Gateway 的 failover 语义一致。

#### 5.3.2 统一 ResiliencePipeline

把 `gateway/src/gateway.runtime.ts` 的 circuit/bulkhead 与 `client/src/strategies/defaults.ts` 合并为一个共享实现：

```ts
export interface ResiliencePolicy {
    name: string;
    order: number;                 // 越小越外层
    execute<T>(ctx: InvocationContext, next: () => Promise<T>): Promise<T>;
    metrics(): PolicyMetrics;
}
```

内置：
- `TimeoutPolicy`：**总 deadline**（不是每跳），支持 `deadline` 头向下游传播；
- `RetryPolicy`：指数退避 + full jitter + `maxElapsed` + retry budget（避免重试风暴）+ 幂等判定（method/header/contract 标注）；
- `CircuitBreakerPolicy`：按 `service:endpoint` 维度、half-open 单探针、可配置滑动窗口（不再是累计失败数）；
- `BulkheadPolicy`：并发上限 + 有界队列 + 排队超时 + 队列深度指标；
- `RateLimitPolicy`：token bucket，key 可配置（用户/租户/API key，不默认信任 XFF）；
- `CachePolicy`：单飞（singleflight）、stale-while-revalidate、按 `Vary`/租户分 key。

验收（关键，必须有回归）：
- 同一 endpoint 连续失败后打开熔断，半开只放一个探针；
- 重试不会超过 `maxElapsed`，且 4xx（除 408/429）不重试；
- bulkhead 满时快速失败并返回可诊断错误；
- 并发 100 请求下 deadline 不漂移。

#### 5.3.3 连接池与 keep-alive

- HTTP/1：使用显式 `http.Agent({ keepAlive: true, maxSockets, maxFreeSockets, timeout })`；支持 `requestOpts`；
- HTTP/2：复用现有 session，增加断线重连与 `GOAWAY` 处理；
- `DefaultConnectionPool` 接入 `AbstractClient`（`acquire/release` 包住请求），或删除该能力（不能继续"存在但不用"）；
- 指标：`client_pool_active/free/pending`、`client_conn_reuse_total`。

#### 5.3.4 类型化客户端（易用性核心）

基于 contract manifest 生成：

```ts
const users = createServiceClient<UserService>({
    service: 'users-service',
    contract: userContract,      // 或运行时从 registry 拉 schema
    transport: 'http',
    resilience: { timeout: 3000, retry: { maxAttempts: 2 } }
});

await users.getUser({ id });     // 编译期类型 + 运行时响应校验（dev）
```

实现要点：
- 从 `contract/src/types.ts` 的 manifest 生成方法 → path/method/参数映射；
- dev 模式用轻量 schema 校验响应（生产可关，避免开销）；
- 契约不匹配时抛 `ServiceError('contract')`，并输出 expected/actual。

---

### 5.4 P2：Gateway 生产化

#### 5.4.1 路由匹配重写（性能 + 正确性）

现状"声明顺序 + `startsWith`"应改为**编译期建索引**：

```ts
interface CompiledRouteTable {
    exact: Map<string, Route[]>;          // 静态 path
    prefixes: PrefixTrie;                 // /api/users/:id
    byHost: Map<string, ...>;
    byMethod: Map<string, ...>;
    version: number;                      // 配置版本，缓存失效用
}
```

规则：
- 按 segment 匹配（`/api/users` 不匹配 `/api/users2`）；
- 最长前缀优先；
- 支持 `:param` 与 `*`，参数写入 `request.params`；
- 具体度评分：`static > param > wildcard`，同分按声明顺序；
- 规则（rules）仍在路由前，但按 priority 预排序并编译条件；
- 表变更时整体替换（原子），不在每请求 map/filter。

验收：
- `gateway/test/route-match.spec.ts`：`/api/users2`、`/api/users/1`、`/api/*`、host/header/method 组合；
- 10k 路由下匹配 p99 不随路由数线性增长（基准见 §7）。

#### 5.4.2 5xx 与熔断语义

```ts
const outcome = classifyUpstream(result); // success | retryable | failure
if (outcome === 'failure') {
    this.recordEndpointFailure(...);      // 计入熔断
    this.recordGatewayError(...);         // gateway_errors_total
}
```

- `retryOn` 与 `breakerOn` 分离：默认 5xx/429 计入 breaker，4xx 不计入；
- 重试耗尽后仍失败要记录一次 failure（当前只记 endpoint 失败，route 级 breaker 可能漏记）；
- 开放熔断时返回 503 + `Retry-After` + `x-gateway-error-type: circuit-open`；
- fallback（mock/stale cache）命中时标记 `outcome=cache/fallback`，不要伪装成功。

#### 5.4.3 流式转发 / 背压 / 请求体上限

- 上游响应直接 `pipe` 到下游，不再 `await json()/text()`；
- SSE（`text/event-stream`）保持不缓冲，禁用压缩与缓存；
- `Content-Length`/`Transfer-Encoding` 规范化；hop-by-hop 头（`connection`、`keep-alive`、`te`、`trailer`、`upgrade`、`proxy-*`）必须剥离；
- 增加 `x-forwarded-proto`/`x-forwarded-host`，重写 `host`；
- 请求体上限（`maxBodyBytes`，默认 1MB，可按路由配置），超限 413；
- 客户端断开时 `AbortController.abort()` 传播到上游；
- 响应改写/压缩与流式互斥：需要全量 body 的规则（rewrite body/mask）在流式模式下显式禁用或走 buffer（配置化）。

验收：
- 1GB 流式下载内存不随大小增长；
- SSE 端到端延迟 < 100ms 且不整段缓冲；
- 客户端中断后上游连接在 1s 内释放。

#### 5.4.4 缓存正确性与容量

- key 组成：`route + method + path + sorted(query) + Vary headers + auth scope/tenant`；默认对带 `Authorization` 的请求不缓存，除非显式配置；
- 存储：有界 LRU（`maxEntries`/`maxBytes`）+ TTL；定期清理 `unref()`；
- 语义：`Age`、`stale-while-revalidate`、`stale-if-error`；
- 失效：路由/规则 apply 后按 `route` 前缀失效；支持 admin 手动 purge；
- 指标：`gateway_cache_hits/misses/evictions/size`。

#### 5.4.5 配置事务化

```ts
interface GatewayConfigChange {
    version: number;
    routes?: GatewayRouteOptions[];
    rules?: GatewayRuleOptions[];
    defaults?: GatewayDefaults;
    dryRun?: boolean;
}

apply(change): Promise<{ version: number; diff: RouteDiff; warnings: string[] }>
```

- **校验**：schema + 业务校验（重复 path+method、非法 URL、timeout 范围、引用不存在的 service）；
- **合并**：`static` + `dynamic patch` 分层，删除用显式 `null`，不再整对象替换；
- **原子**：先构建新 `CompiledRouteTable`，再原子 swap；失败保持旧版本；
- **版本**：单调递增，admin/config 写入都带 `If-Match`（乐观锁）；
- **回滚**：保留最近 N 个版本，`POST /config/rollback`；
- **审计**：who/when/source/diff，写 `audit.log` 或 DB；
- **dry-run**：返回 diff + 匹配样例，不生效。

验收：
- 并发两次 PUT：旧版本得到 409；
- 非法配置不改变运行时（快照对比）；
- 回滚后行为与版本一致。

#### 5.4.6 多副本状态（可选但要有路）

抽象 `GatewayStateStore`（见 §4.1），默认 `InMemoryStateStore`，提供 `RedisStateStore`：
- 限流：Redis `INCR + EXPIRE` 或 Lua 原子窗口；
- 熔断：Redis hash + TTL；
- 缓存：Redis + 本地 L1；
- 幂等：`SETNX`。

不要求一次做完，但**接口必须先抽出来**，避免未来重写 interceptor。

#### 5.4.7 其他加固

- compression 改 async `zlib.createGzip()` + `pipeline`，跳过 `<1KB` 与已压缩类型；支持 `br`；
- mask 支持嵌套路径（`user.password`、`items[*].token`）与数组；
- webhook：超时、重试（有上限）、SSRF 白名单、异步队列、失败指标；
- health probe：in-flight guard（防重入）、jitter、指数退避、探测结果指标；
- 限流 key：默认 `socket.remoteAddress`，仅当 `trustProxy` 显式开启才使用 XFF。

---

### 5.5 P3：可观测性统一

#### 5.5.1 Trace：W3C + AsyncLocalStorage

```ts
// tracing/src/context.ts
const storage = new AsyncLocalStorage<TraceContext>();
export function runWithSpan<T>(ctx: TraceContext, fn: () => T): T {
    return storage.run(ctx, fn);
}
export function currentSpan(): Span | undefined { return storage.getStore()?.span; }
```

- 解析/生成 `traceparent` + `tracestate`（保留自定义头兼容一个版本）；
- sampling：parent-based + 本地比率 + 每秒上限；
- 所有 transport（HTTP header、TCP/WS envelope、broker message headers）统一 inject/extract；
- client span：`service.method` + `peer.service` + `rpc.*` attributes；
- gateway span：`http.route` 使用**路由模板**而非原始 URL（降基数）；
- tracing interceptor 由 `useFeatures()` 默认装配（可关）。

#### 5.5.2 Metrics：约定 + 有界基数

- 命名：`<subsystem>_<name>_<unit>`，如 `gateway_request_duration_seconds`（统一秒）；
- label 白名单：`route`（模板）、`method`、`status_class`、`transport`、`service`、`outcome`；禁止原始 URL / userId；
- histogram bucket 可配置（`useMetrics({ latencyBuckets })` 真正生效）；
- 新增：`client_requests_total`、`client_retries_total`、`circuit_state`、`bulkhead_queue_depth`、`discovery_failures_total`、`event_loop_lag_seconds`；
- exporter 抽象：`MetricsExporter`（prometheus / otlp / pushgateway），controller 仅负责 scrape。

#### 5.5.3 Health / Readiness

- `check()` 并行 + per-indicator timeout（`Promise.race` + abort）；
- DOWN 时 HTTP 503（`readiness`），`liveness` 保持 200；
- 增加 indicator：`disk`、`downstream`（对关键依赖发请求）、`redis/db`、`eventLoopLag`、`shutdown`（关闭中返回 DOWN）；
- 启动期 readiness 返回 503，直到 `onStart` 完成（解决"先注册后 listen"）；
- 报告缓存（默认 1~2s），避免探针打爆依赖。

#### 5.5.4 日志

- 结构化（JSON）+ traceId/spanId/requestId/service/version；
- 敏感字段脱敏（authorization/cookie/password/token）；
- 错误日志带 errorType + 上游状态 + endpoint，便于聚合；
- 采样（成功请求 debug 级采样，错误全量）。

---

### 5.6 P3：生命周期 / 配置 / 健康一致性

#### 5.6.1 启动顺序

```
resolve DI → validate config → listen → readiness=UP → register → onStart hooks
```

- 注册延后到 listen 成功，避免流量打到未就绪实例；
- 注册失败不应阻止服务启动（降级为本地可用 + 告警），但 readiness 标记 `DEGRADED`；
- 启动失败要清理已打开资源（socket/timer），避免半初始化。

#### 5.6.2 优雅关闭（真正 drain）

```
SIGTERM
  → readiness=DOWN / 从 discovery deregister
  → 停止接受新连接（server.close）
  → 等待 in-flight 完成（deadline，默认 15s）
  → 超时强制 closeAllConnections
  → flush metrics/traces
  → onShutdown hooks
```

接线 `GracefulShutdownOptions.timeout` / `deregisterBeforeShutdown`；对 client 也要 drain（停止新调用、等待在途）。

#### 5.6.3 配置

- 每个 source 支持 `watch`（file 用 `fs.watch` + debounce，remote 用 blocking query）；
- `mergeDeep` 区分数组（替换）与对象（深合并）；
- 修复 `load()` 重复 `source.watch`（记录已订阅 source）；
- 配置 schema 校验 + 类型化读取（`config.get<T>('key', schema)`）；
- 敏感值支持 `${env:VAR}` / secret provider，日志脱敏；
- 配置版本 + 回滚；Gateway 走 §5.4.5 的事务化 apply。

---

### 5.7 P4：易用性与扩展性

#### 5.7.1 一行启动

```ts
export const app = await defineService({
    name: 'users-service',
    transport: http({ port: 3000 }),
    features: {
        json: true,
        cors: true,
        health: true,
        metrics: true,
        tracing: true,
        gracefulShutdown: { timeout: 15000 }
    },
    controllers: [UserController],
    discovery: consul({ url: 'http://consul:8500' })
});
```

内部把 `useFeatures()` 的默认值变成"默认开启"，只有显式 `false` 才关闭（当前默认值只在调用 `useFeatures` 时生效，容易漏配）。

#### 5.7.2 能力矩阵与运行时自检

`ServiceCapabilities` 暴露：transport、request/response、pub/sub、stream、discovery、metrics、tracing、auth。
启动时校验并给出**可操作**错误：
- 缺 transport → "请传入 `http({port})` 或 `tcp(...)`"；
- 端口占用 → 指出 address + 建议；
- `useAuth()` 无 strategy → 启动失败而非运行期 500；
- `withTransfers()` 覆盖 defaultTransfer → 明确警告"响应将不会写回"。

#### 5.7.3 诊断 CLI / 开发者体验

```bash
tsdi services doctor            # 检查配置/端口/依赖/注册中心连通性
tsdi services routes            # 打印编译后的路由表与匹配样例
tsdi services call users.getUser --id 1
tsdi services trace <id>        # 查看 span 树（本地 JSON exporter）
```

- 本地 dev registry（`--dev` 启动内存注册中心 + 可视化）；
- Swagger 增加 `GET /openapi.json`，并支持嵌套 router；
- 热重载（监听源码 + 重建 controller，不重启进程）。

#### 5.7.4 包边界与发布

- 每个 `@tsdi/*` 包补全 `package.json` 依赖（`gateway` 目前只声明 discovery/undici，但 import 了 config/metrics/tracing/security/service/client/http/logger/common/ioc）；
- 统一 public barrel，内部文件不导出；
- 禁止跨包 `../../http/src/...` 深引用（gateway/discovery-health 当前存在），改为 barrel 导出；
- 语义化版本 + 弃用策略（`@deprecated` + 迁移期双实现）。

---

## 6. 路线图与验收

### P0（1~2 周）正确性

| 任务 | 验收 |
|---|---|
| `matchTransport` 修复 | 新增协议过滤回归测试 |
| `multiOrder` 稳定排序 | 拦截器顺序测试（先失败后通过） |
| 路由级 guard/interceptor/filter | `@Get` guard 403 测试 |
| Client 错误模型统一 | 4xx/5xx/超时/网络错误测试 |
| Gateway 5xx 计入熔断 | 5xx 触发 half-open 测试 |
| 死选项接线或删除 | 每个选项行为测试 + grep 检查 |
| 路由匹配 segment/最长优先 | 路由表匹配测试 |

### P1（3~4 周）发现 + 客户端治理

| 任务 | 验收 |
|---|---|
| `ServiceRegistryAdapter` + Consul | fake registry E2E |
| InMemory TTL/health 修复 | TTL 过期 + health 真实探测测试 |
| Selector 修正（RR/weighted/least/p2c） | 分布与回收测试 |
| Client discovery/LB 实现 | 多实例轮询/权重/故障剔除 E2E |
| ResiliencePipeline 共享 | 熔断/重试/bulkhead 并发测试 |
| 连接池接线 | keep-alive 复用率指标 |
| 类型化客户端（alpha） | contract → client 生成 + 响应校验 |

### P2（4~6 周）Gateway 生产化

| 任务 | 验收 |
|---|---|
| 路由编译索引 | 10k 路由基准 + 正确性 |
| 流式/SSE/背压 | 大响应内存/SSE 延迟测试 |
| 缓存正确性 + 容量 | 租户隔离、LRU、失效测试 |
| 配置事务化 | 并发 409、回滚、审计 |
| `GatewayStateStore` + Redis | 双副本限流/熔断一致 |
| header 规范/请求体上限/取消传播 | 协议一致性测试 |

### P3（3~4 周）可观测 + 生命周期

| 任务 | 验收 |
|---|---|
| W3C traceparent + ALS | 并发 parent 正确性测试 |
| 指标低基数 + exporter | label 白名单测试、OTLP 导出 |
| Health 503/timeout/并行 | 悬挂 indicator 不影响探针 |
| 启动/关闭顺序 | 注册晚于 listen、drain 测试 |
| 配置 watch/校验/回滚 | 文件热更、非法配置不生效 |

### P4（持续）易用性

| 任务 | 验收 |
|---|---|
| `defineService()` | 示例服务 20 行内启动 |
| doctor CLI / OpenAPI JSON | 手工 + 快照测试 |
| 包依赖/公开 API | `npm pack` 后可独立安装 |
| 脚手架 | `scaffold-microservice` 生成可运行服务 |

---

## 7. 性能优化与度量纪律

> 遵循仓库约定：**不做未实测的"优化"**。每项优化必须先有基准数字，再决定是否保留。

### 7.1 先建基准（P0 同期）

新增 `packages/microservices/benchmarks/`：

| 场景 | 指标 |
|---|---|
| HTTP 简单 JSON（1KB） | RPS、p50/p99、CPU、RSS |
| 路由表 1k/10k | 匹配 p99、内存 |
| Gateway 转发（本地 upstream） | RPS、p99、内存、连接复用率 |
| 串行调用链（A→B→C） | p99、重试率 |
| 大响应（100MB 流式） | 峰值 RSS、首字节延迟 |
| 熔断/限流压测 | 误判率、队列深度、拒绝率 |

工具可用 `autocannon`/`k6` + `node --cpu-prof`；结果提交到 `benchmarks/results/*.json`，CI 只做**相对回退**检查（>10% 失败）。

### 7.2 热路径优化清单（按收益排序，均需基准）

1. **路由预编译**：每请求不再 `filter/map/resolveRoute`，改为 O(segment) trie 查找；配置变更时重建。
2. **Header 规范化只做一次**：入站解析为 `Map`（小写 key），出站按需拼装；避免每请求 `{...headers}` 全量复制。
3. **Metrics label 预计算**：`route template + method + status class` 在路由编译期生成 key，避免每请求字符串拼接与高基数。
4. **避免同步大对象操作**：压缩改流式；JSON 序列化只在必要时（`sendResponse` 已序列化则复用 Buffer）。
5. **连接复用**：HTTP keep-alive/HTTP2 session；broker 共享 reply consumer（Kafka/Redis 当前每请求建 consumer，高并发下成本显著）。
6. **响应缓存**：默认只缓存显式配置的 GET；缓存命中路径跳过 auth 之后的全部策略（注意租户隔离）。
7. **对象分配**：`MessageAdapter` 按需创建（无 body 时延迟）；`RequestContext` 复用池仅在基准证明有收益时引入。
8. **GC 压力**：大 body 用 `Buffer` 切片/流，避免 `Buffer.concat` 多次拷贝。

### 7.3 稳定性压测

- 故障注入：上游 5xx/超时/半连接、注册中心不可用、DNS 失败、慢 consumer；
- soak：30 分钟持续流量，观察 RSS/句柄/定时器是否增长；
- 混沌：随机 kill 实例，验证发现摘除 + 客户端重试 + 熔断恢复；
- 断言：无内存泄漏、无句柄泄漏、错误率恢复时间 < 30s。

---

## 8. 兼容与迁移

| 变更 | 兼容策略 |
|---|---|
| `matchTransport` 修复 | 属于 bug fix；多协议配置错误的使用者会暴露问题，提供启动警告 |
| `multiOrder` 语义 | 保留字段；新增 `order` 常量；旧值按"越小越外层"重新校准，附迁移说明 |
| Client 非 2xx 抛错 | 默认开启，提供 `throwOnError:false`/`responseType:'response'` 逃生口；大版本说明 |
| Gateway 路由匹配 | 先加"严格模式"开关（`routeMatching: 'segment'`），默认开启前提供兼容期 |
| 配置事务化 | 旧 `PUT /routes` 保留，内部走新 apply；响应新增 version 字段 |
| Trace 头 | 同时发送 `traceparent` 与旧 `x-trace-*`，下一个大版本移除旧头 |

---

## 9. 一页纸行动清单

**本周就能做（低风险、高收益）**

1. 修 `matchTransport`（+测试）。
2. 修 `multiOrder` 排序（+HTTP 链顺序测试）。
3. Gateway 5xx 计入熔断与错误指标（+测试）。
4. HTTP client >=400 抛 `ServiceError`（+逃生口）。
5. `/health` DOWN 返回 503 + per-indicator timeout。
6. 路由匹配加 segment 边界（先加开关）。
7. 清理/接线 4 个死选项（config/health/session/json）。
8. 建 benchmarks 骨架，先记录当前基线。

**本季度目标**

- 一个真实 registry 适配器（Consul 或 K8s）+ 客户端 discovery/LB 真正可用；
- Gateway 支持流式/SSE + 有界缓存 + 配置事务化；
- W3C traceparent + 低基数指标 + 启动/关闭顺序修正；
- `defineService()` + `openapi.json` + doctor CLI。

做到这些，框架会从"功能很全的进程内微服务框架"变成"单机可用、集群可扩、问题可诊断"的框架，同时保持现有 DI/AOP 与多协议优势。
