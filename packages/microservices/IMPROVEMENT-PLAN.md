# 微服务框架现状复核与完善设计（2026-11）

> 基线：`7.tui`，分析时工作区含未提交改动；本文只做只读走查与测试，不改变任何行为。
> 方法：25 个包逐包阅读关键路径 + 19 个包实跑测试 + 核对 `scripts/agents-gate.sh` / CI / 发布脚本。
> 与 [`OPTIMIZATION.md`](./OPTIMIZATION.md) 的关系：那份文档记录了 2026 年度已完成的 60+ 批改造；本文复核"改完之后还剩什么"，只列**当前仍然成立**的问题，并给出下一阶段设计。

---

## 0. 结论（先看这里）

内核设计仍然成立：**DI/AOP + Feature 组合 + 协议无关 MessageAdapter + EndpointResolver**，让"多协议接入"和"策略扩展"成本很低。经过前几轮改造，功能面上"有没有"的问题基本补齐（Consul/Nacos/Eureka/K8s、Gateway 配置事务化、SSE 流式、共享状态、gRPC 四类流、OTLP 导出、路由 SLO 等）。

当前制约生产可用性的主要矛盾已经从"功能不够"变成三类：

1. **可靠性语义不完整**
   - Kafka/MQTT/NATS 消费端**先 ack、后处理**（handler 未 await），崩溃会丢消息；
   - AMQP 失败直接 `nack(..., false, false)` 丢弃，没有 DLQ/重试；
   - broker 客户端失败时抛出的是**非 `Error` 对象**（`ErrorResponse extends ResponseBase`），`instanceof Error`、`err.message`、堆栈全部失效；
   - 启动顺序是"注册 → 健康 → listen"，关闭只 sleep 不 drain；
   - 追踪上下文用 `AsyncLocalStorage.enterWith` + 手工恢复，并发 span 会互相成为父子。
2. **结构债开始反噬**
   - `gateway/src/gateway.interceptor.ts` 2189 行，路由匹配/规则/鉴权/转发/缓存/压缩/指标/webhook 全在一个类；
   - Gateway 路由匹配仍是**每请求 O(N) 全量 filter/map + 克隆 route + 逐段 split**，而服务端 Router 早已是 trie + 有界缓存；
   - LB 逻辑存在三份独立实现（discovery selector / client strategy / gateway load-balancer）；
   - `admin/web/admin.state.ts` 1343 行。
3. **质量门禁没有覆盖微服务**
   - 统一 gate 只跑 agents/components，**微服务 25 个包没有任何 test/tsc stage**；
   - 本次实跑发现 `gateway`、`contract`、`http` 三个测试套件**当前直接编译失败**；
   - CI 只监听 `master/main`，活跃分支 `7.tui` 不触发；
   - 没有 benchmarks，性能结论无法验证；发布门禁校验的是源码 tarball，而真正发布的是构建后的 `packages/dist/*`。

**建议路线**

| 阶段 | 周期 | 主题 | 退出标准 |
|---|---|---|---|
| S0 | 3~5 天 | 绿基线 + 门禁 | 三个红套件修复；agents-gate 增加微服务 test/tsc；CI 覆盖当前分支 |
| S1 | 2~3 周 | 可靠性内核 | at-least-once/DLQ/重试可用；启动/关闭顺序正确；错误全是 `Error`；trace 并发隔离 |
| S2 | 2~3 周 | 结构与性能治理 | Gateway 拆分；编译路由表；LB 内核统一；有基准与阈值 |
| S3 | 持续 | 可观测 / DX / 规模化 | defineService、capabilities、doctor、OpenAPI 端点、每包 README、扩展基准 |

---

## 1. 现状盘点

### 1.1 规模

| 指标 | 数值 |
|---|---|
| 包数量 | 25（含 admin） |
| 非测试 TS 行数 | ≈ 79,900 |
| 测试 spec 文件 | 181 |
| 服务发现适配器 | 5（InMemory / Consul / Nacos / Eureka / Kubernetes） |
| Gateway 状态存储 | 2（InMemory / Redis） |
| Metrics / Trace Exporter | 2 / 2（Prometheus+OTLP / Console+OTLP） |

### 1.2 已落地、应保留的能力

| 能力 | 证据（符号） |
|---|---|
| Feature 组合与协议工厂 | `service/src/provider.ts: provideService`、`client/src/provider.ts`、各包 `create*TransportFeature` |
| 协议无关请求抽象 | `MessageAdapter` / `StatusMessageAdapter` / `MessageValueReader`，同一 controller 可跑 HTTP/TCP/WS/Broker |
| 服务端 Router | `service/src/router/router.optimize.ts`：trie + `maxCacheSize` 有界缓存 + 通配符 + 正则路由 |
| 路由级 guard/interceptor/filter | `service/src/router/route.handler.ts`：`guards → interceptors → controller` 真正执行 |
| Gateway 策略面 | auth/API key/HMAC/IP ACL、限流/配额/降频、熔断 half-open、bulkhead、重试、5 种 LB、canary、rewrite、mask、compression、webhook、access log |
| Gateway 配置事务化 | `gateway/src/gateway.config.service.ts`：validate → diff → atomic swap → version → history/rollback，支持 `expectedVersion` / `dryRun` |
| 多注册中心 + 解析器 | `discovery/src/{consul,nacos,eureka,kubernetes}.discovery.ts`、`endpoint-resolver.ts`（TTL 缓存/合并/stale+backoff） |
| 共享状态抽象 | `gateway/src/state.store.ts`：缓存/熔断/nonce/固定窗口计数，Redis 多副本 |
| 可观测性 | `metrics/src/exporters/{prometheus,otlp}.ts`、`tracing/src/default.tracer.ts`（W3C + 批量导出）、`health` 503/timeout/并行 |
| 契约工具链 | `contract`：manifest → DTO/OpenAPI/proto；`createContractClient` + 运行期校验 |
| gRPC 全流型 | unary / server stream / client stream / bidi + deadline/metadata + 取消传播 |
| Admin | 独立/嵌入式、OIDC、规则设计器、路由编辑、版本 diff/回滚、SLO 告警 |

### 1.3 本次实跑测试基线

| 包 | 结果 |
|---|---|
| discovery | **81 passing** |
| client | **84 passing** |
| service | **63 passing** |
| config | **75 passing** |
| health | **19 passing** |
| metrics | **54 passing** |
| tracing | **45 passing** |
| mime | **56 passing** |
| transport | **52 passing** |
| swagger | **10 passing** |
| mcp | **38 passing** |
| grpc | **28 passing** |
| tcp | **65 passing** |
| udp | **54 passing** |
| ws | **88 passing** |
| coap | **25 passing** |
| gateway | **编译失败**：`test/config.service.spec.ts(53,21)` / `(86,20)`，`toThrow(GatewayConfigValidationError)` 传入的构造器参数类型不匹配 |
| contract | **编译失败**：`test/client.spec.ts(108,92)`，`Promise<{}>` 不能赋给 `Promise<T>` |
| http | **编译失败**：`test/http-microservice.spec.ts(376,30)`，`Agent` 上不存在 `keepAlive` |
| amqp/kafka/mqtt/nats/redis 等 broker | 依赖真实中间件（Docker），本轮未复跑 |
| admin | 依赖 jsdom/浏览器构建，本轮未复跑（上一轮为 63 passing） |

> 这三个失败都是**测试自身类型问题**，不是运行期回归；但"测试套件不能编译"意味着该包的 CI 保护等于零，且没有门禁发现它。

### 1.4 门禁现状

| 检查 | 现状 |
|---|---|
| `scripts/agents-gate.sh` | 仅对 agents/components 跑 `npm test` 和 `tsc`；微服务只有 `package-deps` / `package-publish` / `publish-dry-run` 三个打包检查 |
| `.github/workflows/agents-gate.yml` | 只在 `master` / `main` 的 push/PR 触发，当前活跃分支 `7.tui` 不在触发列表 |
| `package-publish` | 校验**源码** tarball（要求 `index.ts`、`src/index.ts`） |
| `publish-dry-run` | 构建 `packages/dist/<name>` 后发布；默认 `SKIP`（需 `PUBLISH_DRY_RUN_PACKAGES`） |
| 基准 | 无 `benchmarks/` 目录，无基线 |

---

## 2. 优点（应保留并放大）

1. **Feature 组合模型**
   新增协议只需提供 options token、server/client 类型、backend；token、handler、默认 transfer、auth 桥接由 `createServiceTransportFeature` / `createClientTransportFeature` 统一。协议数量从 HTTP 扩到 12+ 仍保持同一装配方式。

2. **同一个 Controller 跑多协议**
   `MessageAdapter` + `MessageValueReader` 把"请求读取"从传输层解耦，HTTP 的 `@Body`/`@Param` 与 MQTT 的 `@Payload`/topic 参数共用路由和守卫，这是相对 NestJS 的真实差异点。

3. **服务端路由质量高**
   trie 匹配、通配符按协议定制（MQTT `+/#`、Redis `*`、NATS `>`、Kafka `*`、AMQP `#`）、正则兜底、有界缓存、controller 惰性解析、路由级 timeout/rateLimit。

4. **Gateway 策略面完整且可组合**
   认证、限流、配额、熔断、bulkhead、重试、负载均衡、灰度、重写、脱敏、压缩、webhook、访问日志都在同一条可配置链路里，且 Admin 能可视化编辑与回滚。

5. **配置事务化是同类框架少见的完整度**
   `validate → diff（含字段级 before/after）→ dryRun → 原子换表 → version → history → rollback → 审计`，并且配置 apply 会按 diff 失效缓存/熔断状态。

6. **发现层 SPI 形态正确**
   `EndpointResolver` 已具备 TTL 缓存、并发合并、stale 回退、指数退避、`getLastError` 诊断；四个生产 registry 适配器都只依赖 HTTP/fetch，没有引入重 SDK。

7. **契约三角**
   一份 manifest 同时生成 DTO / OpenAPI / proto，并有反向导入与 `--check` 漂移检查，具备演进成"契约驱动客户端/服务端"的基础。

8. **可观测性有真实出口**
   指标有 Prometheus 与 OTLP 导出，追踪有 W3C 解析/注入与批量导出，健康检查有 liveness/readiness 区分和 per-indicator timeout。

9. **共享状态抽象已存在**
   `GatewayStateStore` 把缓存/熔断/nonce/计数从进程内状态里抽了出来，并已有 Redis 实现与双实例 E2E，是后续统一 client/gateway 韧性状态的基础。

10. **Admin 是可用的运维入口**
    独立模式、嵌入式、OIDC、规则设计器、路由编辑、版本 diff/rollback、SLO 告警都在真实浏览器里验证过。

---

## 3. 缺点与风险（按优先级与证据）

### 3.1 P0 —— 交付与正确性（必须先做）

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| 1 | 三个核心包测试无法编译 | `gateway/test/config.service.spec.ts:53,86`；`contract/test/client.spec.ts:108`；`http/test/http-microservice.spec.ts:376` | 这三个包的回归网当前不可用；没有门禁发现 |
| 2 | broker 客户端抛出的不是 `Error` | `common/src/response.ts:42` `ResponseBase` 不继承 `Error`；`transport/src/message-transfer.ts:231`、`transport/src/interceptors.ts:49` 直接 `throwError(() => new ErrorResponse(...))`；只有 `http/src/client/factory.ts` 用 `ServiceError` | `instanceof Error` 为 false、无堆栈、`err.message` 取不到；日志/告警/tracing 采集器都会退化；与 HTTP 客户端语义不一致 |
| 3 | Kafka 实际是 at-most-once | `kafka/src/server/kafka-server.ts:65-67` `eachMessage` 调用 `this.handleMessage(payload)` 但**不 await**；kafkajs 在回调 resolve 后自动提交 offset；`:128-140` 只订阅错误日志 | 进程崩溃/重启时在途消息丢失；handler 失败不会重试，也不会进入 DLQ |
| 4 | MQTT / NATS 同样"先返回后处理" | `mqtt/src/server/mqtt-server.ts:148-155` 订阅 Observable 后立即返回；`nats/src/server/nats-server.ts:68-70` `for await` 里调用 `handleMessage` 不 await | QoS1/2 的 ack 在业务处理完成前发出；错误只打日志 |
| 5 | AMQP 失败直接丢弃 | `amqp/src/server/factory.ts:99-103` `afterError` 调 `nack(msg, false, false)`（requeue=false，无 DLX） | 处理失败的消息永久消失，没有重试/DLQ |
| 6 | 启动顺序错误 | `service/src/Service.ts:23-27`：`strategyRegister() → strategyHealthStart() → onStart()`（listen 在最后） | 注册中心/网关切流到尚未 listen 的实例；`onStart` 失败后注册残留，需要人工清理 |
| 7 | 关闭不 drain | `service/src/strategies/default-graceful-shutdown.strategy.ts:14-23` 只有 `health.stop()` + `waitDuration` sleep，没有停止接收、没有等待在途请求、没有强制关闭 | 滚动发布时请求被硬断；长请求/流式响应被截断 |
| 8 | 追踪上下文不是结构化作用域 | `tracing/src/default.tracer.ts:198-218` 用 `storage.enterWith(span)`，`finish()` 再 `enterWith(previous)`；没有 `storage.run()` 包住请求 | 同一异步上下文内并发/连续 span 会互相成为父子；本地复现两个并发请求出现 `B.parent = A`（或反向）；跨请求 span 树不可信 |
| 9 | 门禁不覆盖微服务 | `scripts/agents-gate.sh` 的 `ALL_STAGES` 无任何 `ms-*` test/tsc；`.github/workflows/agents-gate.yml` 仅 `master/main` | 上述问题能长期存在而不被发现 |

### 3.2 P1 —— 生产可靠性 / 一致性

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| 10 | 没有统一的消费运行时 | 各 broker 各自实现 `handleMessage`；`ack/prefetch/concurrency/retry/backoff/DLQ/idempotency` 没有公共抽象（AMQP 只有 `prefetch` 和 ack/nack） | 每接一个 broker 都要重写一遍可靠性逻辑，且行为不一致 |
| 11 | 客户端 LB 有三份实现且语义不全 | `discovery/src/selector.ts`（RR/Weighted/Least，Least 注释 "simulated"）；`client/src/strategies/defaults.ts`（另一套）；`gateway/src/load-balancer.ts`（第三套） | 修复一个 bug 要改三处；client 的 RR `cursor` 是**全局**一个字段（`defaults.ts:45,69`），不是按 service；least-connections 统计的是"被选中次数"而非真实 in-flight；没有 P2C |
| 12 | 追踪只表达 HTTP 语义 | `tracing/src/interceptors/tracing.interceptor.ts` 使用 `http.method/http.url/http.status_code`；`client/src/AbstractClient.ts:86-93` 只有 `headers.set` 时才注入 carrier | TCP/WS/Broker 的 span 属性错误；broker 客户端不传播 traceparent；client span 不继承当前 span 作为 parent |
| 13 | 指标单位/命名不统一 | `client_request_duration_ms`、`gateway_request_duration_ms`、`http_request_duration_ms`；Prometheus/OTel 约定是秒 | 仪表盘/告警需要每个指标单独换算；与 OTel semantic conventions 不一致 |
| 14 | 传输能力矩阵缺失 | 无 `TransportCapabilities` / `ServiceCapabilities`；README 已把它列为短板 | 无法在启动时自检（stream? pubsub? wildcard? discovery address?），用户只能靠文档猜 |
| 15 | 客户端韧性状态仍是进程内 | `client/src/strategies/CircuitBreakerStrategy.ts` 只有计数器；`GatewayStateStore` 在 gateway 包内 | 多实例 client 的熔断/限流不共享；与 gateway 的共享状态能力不对等 |
| 16 | 服务发现 selector 不完整 | `discovery/src/selector.ts` 无 P2C/health-aware；client/gateway 没有复用它 | 低延迟场景缺少更优选择策略；三套 LB 行为不一致 |
| 17 | 健康/就绪状态没有纳入生命周期 | `MicroService.start` 先注册后 listen；关闭时没有"readiness=DOWN"状态机 | K8s/网关无法区分"正在启动/正在关闭" |

### 3.3 P2 —— 结构与性能

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| 18 | Gateway 拦截器是 god-object | `gateway/src/gateway.interceptor.ts` 2189 行；包含 `matchRoute`、`matchRule`、`authorize`、`forward*`、`applyResponseCaching`、`applyCompression`、`dispatchWebhook`、`recordAccessLog`、`buildMetricsLabels` 等 80+ 方法 | 单测只能整类跑；任何策略改动都触碰同一文件；review/回滚风险高 |
| 19 | 路由匹配在每请求热路径上做全量工作 | `gateway.interceptor.ts:410-449` 每请求 `filter → resolveRoute → 线性扫描 → routeSpecificity`；`resolveRoute`（`:1503`）每请求克隆 headers、调用 6+ 次 `runtime.getOption`；`matchRoutePath` 每候选 `split('/')`；`methods.map(toUpperCase())` 每路由每请求 | 路由数增长时 p99 线性上升；GC 压力；对照服务端 `router.optimize.ts` 已有 trie + 缓存 |
| 20 | Admin 状态类过大 | `admin/web/admin.state.ts` 1343 行 | 与 AGENTS.md 的单一职责/行数纪律冲突；改一个页面要动同一个类 |
| 21 | 无基准 | 无 `packages/microservices/benchmarks/` | 无法证明"路由预编译/缓存/对象复用"有收益；违反仓库"性能改动必须实测"的纪律 |
| 22 | 启动/诊断 DX 不足 | 无 `defineService()`、无 capability 自检、无 `doctor`/`routes` CLI；`scripts/scaffold-microservice.mjs` 可用，但仓库内没有可直接运行的 `examples/` | 新用户需要拼 6~8 个 `use*` feature，或从测试里反推用法；常见错误（端口占用、缺 transport、缺 strategy）没有可操作提示 |
| 23 | 文档漂移 | `README.md` 的"主要短板"仍写"只有 InMemory、无 Consul/Nacos/K8s"，实际四个适配器已存在；25 个包中 21 个没有 README | 新用户得到错误的第一印象；发布包缺少使用说明 |
| 24 | Swagger 缺 HTTP spec 端点 | `swagger/src` 只有 `buildDoc`，没有 `GET /openapi.json` controller；嵌套 router 仍跳过 | 无法直接给前端/网关消费，契约价值打折 |

### 3.4 P3 —— 发布 / 兼容

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| 25 | 源码包不可直接消费 | `gateway/package.json` 无 `main`/`types`，`files` 只含 `index.ts`/`src`；`package-publish` 校验源码 tarball；真正发布走 `packages/dist` | 直接 `npm publish` 会产出 Node 无法 require 的包；门禁与真实发布对象不一致 |
| 26 | 无弃用/迁移策略 | 无 `@deprecated` 约定与双发期 | 错误模型、指标单位、trace 头等变更会破坏使用者 |

---

## 4. 目标设计

### 4.1 新增四个内核 SPI

目标不是再加功能，而是把"每个传输/每个策略各自实现"收敛成四个可复用内核。

```text
Application (DI/AOP)
  ├─ TransportCapabilities        ← 能力声明 + 启动自检
  ├─ ConsumerRuntime              ← 交付语义（ack/retry/DLQ/idempotency/并发）
  ├─ ResiliencePipeline           ← 超时/重试/熔断/舱壁/限流（gateway + client 共用）
  └─ TraceScope                   ← ALS 作用域 + 跨传输 carrier 编解码
```

#### 4.1.1 `TransportCapabilities`

放在 `@tsdi/common`（已有 `TransportConfig`），由各 transport factory 声明，启动时校验：

```ts
export interface TransportCapabilities {
    requestResponse: boolean;
    pubSub: boolean;
    streaming: 'none' | 'server' | 'client' | 'bidi';
    binary: boolean;
    wildcard: 'mqtt' | 'redis' | 'nats' | 'kafka' | 'amqp' | 'none';
    discoveryAddress: 'url' | 'host-port' | 'topic';
    delivery: 'at-most-once' | 'at-least-once' | 'exactly-once';
    idempotent: boolean;
}
```

启动自检使用点：路由声明了 `stream` 但 transport 不支持、`@Subscribe` 用了 broker 通配符但 transport 无 wildcard、Gateway 路由无 `targetUrl` 且 transport 无 discovery 地址 → 启动失败并给出可操作提示。

#### 4.1.2 `ConsumerRuntime`（可靠性核心）

放在 `@tsdi/service`（broker server 都已依赖 service），传输适配器只实现"拉取/确认/拒绝"三个原语：

```ts
export interface ConsumerMessage<T = unknown> {
    id: string;                    // 稳定 identity，用于去重/日志
    payload: T;
    headers: Record<string, string>;
    attempt: number;
    ack(): Promise<void>;
    nack(requeue: boolean): Promise<void>;
}

export interface ConsumerOptions {
    concurrency?: number;          // 并发处理数
    prefetch?: number;             // 预取上限
    delivery?: 'at-most-once' | 'at-least-once';
    retry?: { attempts: number; backoffMs: number; maxBackoffMs?: number };
    deadLetter?: { enabled: boolean; topic?: string };
    idempotency?: { enabled: boolean; ttlMs?: number; store?: IdempotencyStore };
    shutdownTimeoutMs?: number;
}

export abstract class ConsumerRuntime {
    abstract run(handler: (msg: ConsumerMessage) => Promise<void>): Promise<void>;
    abstract stop(): Promise<void>;   // 停止拉取 + 等待在途 + 释放
    abstract stats(): ConsumerStats;  // in-flight / retried / dlq / lag
}
```

各 broker 的映射：

| Transport | 拉取 | ack | 重试 | DLQ | 备注 |
|---|---|---|---|---|---|
| Kafka | `consumer.run({ eachMessage, partitionsConsumedConcurrently })` | `autoCommit:false` + `commitOffsetsIfNecessary` | attempt + backoff，超限后 ack 并写 DLQ topic | `deadLetter.topic` | 必须 **await** handler |
| AMQP | `channel.consume` | `ack(msg)` | `nack(msg, false, true)` 重入队，attempt 超限后 `nack(false,false)` + DLX | 交换机/队列参数 | `prefetch` 保留 |
| MQTT | `client.on('message')` 回调返回 Promise | QoS1/2 由 mqtt.js 在回调 resolve 后 ack | attempt 超限后丢弃并计数 | 应用级 topic | handler 必须返回 Promise |
| NATS | JetStream consumer（默认 core 为 at-most-once） | `msg.ack()` | `msg.nak(delay)` | `max_deliver` + DLQ subject | core NATS 显式声明 at-most-once |
| Redis | Streams consumer group（pub/sub 仅 at-most-once） | `XACK` | `XAUTOCLAIM` + attempt | DLQ stream | 默认保持 pub/sub 兼容 |
| InMemory | 测试适配器 | 立即 | 可配置 | 内存 | 用于门禁与本地开发 |

> 兼容策略：默认 `delivery` 保持当前语义（at-most-once），在 Kafka/AMQP/MQTT 文档中推荐显式开启 `at-least-once`；S1 先用 opt-in，S2 再评估默认值。

#### 4.1.3 `ResiliencePipeline`

现状：Gateway 有 circuit/bulkhead/retry；Client 有另一套 strategy；两者状态与指标不共享。设计一个共享策略内核，放在 `@tsdi/client`（Gateway 已依赖 client），Gateway 通过组合复用：

```ts
export interface ResiliencePolicy {
    readonly name: string;
    readonly order: number;              // 越小越外层
    execute<T>(ctx: InvocationContext, next: () => Promise<T>): Promise<T>;
    snapshot(): PolicyMetrics;
}
```

内置策略：`TimeoutPolicy`（总 deadline，不是每跳）、`RetryPolicy`（指数退避 + jitter + `maxElapsed` + 幂等判定）、`CircuitBreakerPolicy`（按 `service:endpoint`，滑动窗口 + half-open 单探针）、`BulkheadPolicy`（并发 + 有界队列 + 排队超时）、`RateLimitPolicy`（key 可配置，默认不信任 XFF）、`CachePolicy`（singleflight + 有界 LRU）。

状态 SPI 从 `gateway/src/state.store.ts` 提升到共享层（改名 `ResilienceStateStore`，保留 gateway 的 re-export 兼容），让 client 与 gateway 都能使用 Redis 共享状态。

#### 4.1.4 `TraceScope`

```ts
// @tsdi/tracing
export function runWithSpan<T>(span: Span, fn: () => T): T;   // storage.run
export interface CarrierCodec { extract(c): TraceContext | null; inject(ctx, c): void; }
```

要求：

- 请求入口用 `runWithSpan` 包住整个 handler 执行，不再 `enterWith`；
- `AbstractClient` 的 client span 以当前 span 为 parent；
- 每个 transport 提供 `CarrierCodec`：HTTP header / Kafka headers / AMQP headers / MQTT properties / NATS headers / WS envelope；
- span 属性按 transport 分类：`http.*`、`rpc.*`、`messaging.*`，不再统一写 `http.*`。

### 4.2 Gateway 拆分设计

`gateway.interceptor.ts` 按职责拆成 7 个模块，拦截器只保留编排：

| 新模块 | 职责 | 现文件中的符号 |
|---|---|---|
| `gateway.route-table.ts` | 编译路由表、匹配、参数提取、specificity | `matchRoute`、`matchRoutePath`、`routeSpecificity`、`resolveRoute`、`previewMatch` |
| `gateway.rule-engine.ts` | 规则匹配、条件编译、action → route | `matchRule`、`matchesRule*`、`ruleToRoute`、`denyByRule` |
| `gateway.auth.ts` | API key/HMAC/claims/IP ACL/authorize | `authorize`、`validateApiKey`、`validateSignature`、`enforceAuthorization`、`matchesIp` |
| `gateway.upstream.ts` | HTTP/microservice/aggregate 转发、endpoint 选择、retry、circuit、bulkhead | `forward*`、`resolveTarget`、`resolveClient`、`isRetryable*` |
| `gateway.response.ts` | rewrite/mask/cache/compression/etag/fallback | `rewriteResponse`、`applyResponseCaching`、`applyCompression`、`resolveCacheKey` |
| `gateway.observability.ts` | trace/metrics/access log/error classification | `startTrace`、`recordGateway*`、`buildMetricsLabels`、`recordAccessLog` |
| `gateway.webhook.ts` | 异步 webhook、超时/重试/SSRF 白名单 | `dispatchWebhook` |

拆分顺序：先 `route-table`（收益最大且可独立测试）→ `observability`（纯输出）→ `auth` → `response` → `upstream` → `rule-engine`。每一步保持现有测试 + 新增模块级单测。

#### 4.2.1 编译路由表

```ts
interface CompiledRoute {
    source: GatewayRouteOptions;
    resolved: ResolvedGatewayRoute;       // 默认值/headers 已合并，不再每请求克隆
    methods?: Set<string>;
    hosts?: Set<string>;
    segments: string[];                   // 预 split
    specificity: number;                  // 预计算
    matcher: (parts: string[]) => Record<string, string> | null;
}

interface CompiledRouteTable {
    version: number;
    exact: Map<string, CompiledRoute[]>;      // 静态 path
    prefixes: PrefixTrie<CompiledRoute>;      // 含 :param / *
    rules: CompiledRule[];                    // 按 priority 预排序
}
```

规则：

- 配置 apply 后构建新表并**原子替换**（与 `GatewayConfigService.version` 绑定）；
- 匹配时先按 method/host 缩小候选，再 segment trie；`static > param > wildcard`，同分按声明顺序；
- `methods` 用 `Set`，不再每请求 `map(toUpperCase())`；
- 指标 label 使用预编译的 `route template`，不拼原始 URL；
- 目标：20k 路由下匹配 p99 不随路由数线性增长（以基准为准，不预设数字）。

### 4.3 生命周期设计

```text
start:
  resolve DI → validate config/capabilities → listen → readiness=UP → register → onStart hooks

shutdown:
  readiness=DOWN → deregister → stop accepting new requests
  → drain in-flight（deadline，默认 15s） → force close connections
  → flush metrics/traces → onShutdown hooks
```

实现点：

- `MicroService.start` 调整顺序，`onStart` 成功后再注册；失败时回滚 health/registration；
- 新增 `InFlightTracker`（HTTP/TCP/WS/broker 共用的 middleware/interceptor），`close()` 等待计数归零或超时；
- `GracefulShutdownOptions` 增加 `drainTimeoutMs` / `forceClose` / `deregisterBeforeShutdown`，真正接线；
- readiness 增加 `STARTING` / `DRAINING` 状态，`/health/readiness` 在关闭期间返回 503。

### 4.4 统一错误模型

- 所有 client backend 的失败在 `AbstractClient.request` 的 `catchError` 统一归一：
  - `ErrorResponse` / 非 `Error` → 包装成 `ServiceError`（`code='upstream'`，保留 `status/body/headers/url/cause`）；
  - 已是 `ServiceError` 原样透传；
  - 超时/熔断/发现/契约错误分别填 `timeout/circuit/discovery/contract`。
- 禁止继续 `throwError(() => <非 Error>)`；在 `transport` 层用 `toServiceError` 显式转换。
- 验收：`transport/test/error-model.spec.ts` 断言 broker 错误 `instanceof Error`、`instanceof ServiceError`、`stack` 存在。

### 4.5 可观测性统一

- 指标命名统一为 Prometheus 基础单位：`*_seconds`（保留 `*_ms` 双发一个版本，标记 deprecated）；
- label 白名单：`route`（模板）、`method`、`status_class`、`transport`、`service`、`outcome`；禁止原始 URL/userId；
- 新增指标：`event_loop_lag_seconds`、`discovery_failures_total`、`consumer_inflight`、`consumer_dlq_total`、`circuit_state`、`bulkhead_queue_depth`；
- tracing：每个 transport 一组 `CarrierCodec`，server/client span 成对；Gateway 使用路由模板作为 `http.route`；
- 日志：结构化 + traceId/spanId/requestId + 敏感字段脱敏（authorization/cookie/password/token）。

### 4.6 易用性（DX）

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
        gracefulShutdown: { drainTimeoutMs: 15000 },
        discovery: useConsulDiscovery({ url: 'http://consul:8500' })
    },
    controllers: [UserController]
});
```

- `defineService` 内部调用现有 `provideService`，把默认 feature 变为"默认开启、显式 false 关闭"；
- `ServiceCapabilities` 暴露 transport/request-response/pubsub/stream/discovery/metrics/tracing/auth；
- 启动自检给可操作错误：缺 transport、端口占用、`useAuth()` 无 strategy、`withTransfers()` 覆盖 defaultTransfer；
- `doctor` / `routes` / `call` CLI（可先放在 admin 包的 bin）；
- Swagger 增加 `GET /openapi.json` 与 `GET /openapi.yaml`，支持嵌套 router；
- 每包 README 模板：安装、最小示例、配置项、能力矩阵、已知限制。

### 4.7 质量门禁与基准

在 `scripts/agents-gate.sh` 增加：

| stage | 内容 | 失败即阻断 |
|---|---|---|
| `ms-core` | common/transport/service/client 测试 | 是 |
| `ms-observe` | config/health/metrics/tracing 测试 | 是 |
| `ms-discovery` | discovery 测试 | 是 |
| `ms-gateway` | gateway 测试 | 是 |
| `ms-http` | http 测试 | 是 |
| `ms-brokers` | amqp/kafka/mqtt/nats/redis（`MS_BROKER_PROFILE=1` 时运行，否则显式 SKIP） | 条件 |
| `ms-tsc` | 每个有 tsconfig 的包 `tsc --noEmit`；无 tsconfig 的包补一个 | 是 |
| `ms-bench` | 基准相对回退 >10% 失败 | 条件 |

CI：把 `.github/workflows/agents-gate.yml` 的触发分支改为 `['**']` 或至少包含 `7.tui`；broker 测试用 GitHub services 或显式跳过。

基准场景（`packages/microservices/benchmarks/`）：

| 场景 | 指标 |
|---|---|
| HTTP JSON 1KB | RPS、p50/p99、CPU、RSS |
| 路由表 1k/10k/20k | 匹配 p99、内存 |
| Gateway 转发（本地 upstream） | RPS、p99、连接复用率 |
| Kafka/AMQP 消费 | 吞吐、in-flight、DLQ、重启丢失数 |
| 大响应 100MB 流式 | 峰值 RSS、首字节延迟 |
| 熔断/限流压测 | 误判率、队列深度、拒绝率 |

结果提交到 `benchmarks/results/*.json`；CI 只做相对回退检查，不做绝对数字门禁（避免机器差异）。

---

## 5. 分阶段路线图

### S0（3~5 天）绿基线 + 门禁

| 任务 | 改动点 | 验收 |
|---|---|---|
| 修 3 个测试编译错误 | `gateway/test/config.service.spec.ts`、`contract/test/client.spec.ts`、`http/test/http-microservice.spec.ts` | 三个包 `npm run test` 出现 `N passing` 且 EXIT=0 |
| 补微服务 tsc | 给 gateway/http/kafka/mqtt/nats/redis/amqp/udp/ws 补 `tsconfig.json` 或统一根 tsconfig | `tsc --noEmit` 全绿 |
| 接门禁 | `agents-gate.sh` 增加 `ms-core/ms-observe/ms-discovery/ms-gateway/ms-http/ms-tsc` | gate 能捕获上述任一失败 |
| CI 分支 | `.github/workflows/agents-gate.yml` | push 到 `7.tui` 能触发 |
| 基准骨架 | `benchmarks/` + `npm run bench` | 能产出第一份基线 JSON |

### S1（2~3 周）可靠性内核

| 任务 | 改动点 | 验收 |
|---|---|---|
| `ConsumerRuntime` | `service/src/consumer/*` + 各 broker 适配 | 杀掉消费者进程后消息可重投（Kafka/AMQP）；DLQ 可消费；并发/预取可配置 |
| Kafka 至少一次 | `kafka-server.ts` await handler + manual commit + retry/DLQ | 进程重启不丢在途消息；失败进入 DLQ |
| AMQP 重试/DLX | `amqp-server.ts` + `factory.ts` | 失败重入队；超限进 DLX |
| MQTT/NATS 返回 Promise | `mqtt-server.ts`、`nats-server.ts` | QoS1 ack 在 handler 完成后发出；错误计数 |
| 错误归一 | `AbstractClient` / `transport` | broker 错误 `instanceof Error` + `ServiceError` |
| 生命周期 | `Service.ts`、`default-graceful-shutdown.strategy.ts`、`InFlightTracker` | 注册晚于 listen；关闭等待在途；readiness 503 |
| trace 作用域 | `DefaultTracer` + `TracingInterceptor` + `AbstractClient` + broker codec | 并发 2 请求均为根 span；跨 broker parent 正确 |
| LB 统一 | `discovery/src/selector.ts` 单实现 + client/gateway 复用 | RR 按 service；weighted/least/P2C 分布测试 |

### S2（2~3 周）结构与性能

| 任务 | 改动点 | 验收 |
|---|---|---|
| Gateway 拆分 | 7 个模块（§4.2） | 每模块独立单测；interceptor < 500 行 |
| 编译路由表 | `gateway.route-table.ts` + `CompiledRouteTable` | 20k 路由 p99 不线性增长；匹配回归全绿 |
| 热路径减配 | `resolveRoute` 预计算、`methods Set`、label 预编译 | 基准相对提升；无行为变化 |
| Admin 拆分 | `admin.state.ts` → 页面控制器 + 纯函数 | 行数下降；测试不变 |
| 基准对比 | `benchmarks/results` | 改动前后数字可追溯 |

### S3（持续）可观测 / DX / 规模化

| 任务 | 改动点 | 验收 |
|---|---|---|
| metrics 单位/低基数 | gateway/client/http/metrics | 双发期；label 白名单测试 |
| defineService/capabilities | `service/src/define.ts` | 20 行内启动示例；错误可操作 |
| 可运行示例 | `packages/microservices/examples/`（HTTP + discovery + gateway + 1 broker） | `npm run start` 直接可跑；作为 README/门禁 smoke |
| doctor/routes CLI | admin bin | 本地检查端口/注册中心/路由表 |
| OpenAPI 端点 | `swagger` controller | `GET /openapi.json` 可被前端消费 |
| 契约兼容检查 | `contract`：破坏性变更检测（字段删除/类型变更/必填新增） | 非兼容变更 CI 失败；输出迁移建议 |
| 每包 README | 25 个包 | `npm pack` 后文档完整 |
| 发布链路 | gate 校验 dist + package.json main/types | `npm pack` 产物可直接 require |
| 混沌/soak | acceptance | 30 分钟无句柄/RSS 增长；实例 kill 后 <30s 恢复 |

---

## 6. 验收测试清单（新增）

| 领域 | 测试 | 断言 |
|---|---|---|
| 消费语义 | `kafka/test/delivery.spec.ts` | 处理失败重试 N 次；超限进 DLQ；重启不丢 |
| 消费语义 | `amqp/test/retry-dlx.spec.ts` | 失败重入队；超限进 DLX |
| 错误模型 | `transport/test/error-model.spec.ts` | broker 失败 `instanceof ServiceError`，有 stack/code/status |
| 生命周期 | `service/test/lifecycle.spec.ts` | register 在 listen 之后；onStart 失败回滚；drain 等待在途 |
| 追踪 | `tracing/test/concurrency.spec.ts` | 2 个并发请求均为根 span；client span parent 正确 |
| 追踪 | `tracing/test/carrier.spec.ts` | Kafka/AMQP/MQTT header 注入/提取 |
| LB | `discovery/test/selector.spec.ts` | 每服务 RR；weighted 分布；least 释放；P2C 低延迟优先 |
| 路由 | `gateway/test/route-table.spec.ts` | `/api/users2` 不匹配；最长/最具体优先；20k 路由基准 |
| 门禁 | `agents-gate.sh ms-*` | 上述任一失败 gate 失败 |

---

## 7. 兼容与迁移

| 变更 | 兼容策略 |
|---|---|
| 错误模型归一 | 新增 `ServiceError` 包装，保留 `status/body/response` 字段；大版本说明；broker `observe:'response'` 行为不变 |
| 消费语义 | 默认保持现状；`delivery:'at-least-once'` opt-in；文档标注各 transport 的保证 |
| 启动顺序 | 属于 bug fix；对依赖"注册早于 listen"的测试显式调整 |
| 指标单位 | `*_seconds` 与 `*_ms` 双发一个版本，`@deprecated` 标注 |
| trace 头 | 同时发送 `traceparent` 与旧 `x-trace-*`；下一个大版本移除旧头 |
| Gateway 拆分 | 公共 API 不变；内部文件迁移，保留 re-export |
| 发布 | `package.json` 补 `main`/`types` 指向 dist；源码包标记 `private` 或改为 `exports` 映射 |

---

## 8. 一页纸行动清单

**本周**

1. 修 `gateway` / `contract` / `http` 三个测试编译错误，恢复绿基线。
2. `agents-gate.sh` 增加微服务 test + tsc stage；CI 覆盖 `7.tui`。
3. Kafka `eachMessage` await handler（先止血，不改协议）。
4. `AbstractClient` 把 broker `ErrorResponse` 归一为 `ServiceError`。

**两周内**

5. `ConsumerRuntime` + Kafka/AMQP 的 at-least-once + DLQ。
6. `Service.start` 改为 listen 后注册；`close()` 加 drain。
7. `TraceScope`（`storage.run`）+ client parent + broker carrier。
8. LB 收敛为 `discovery` 单实现，client/gateway 复用。

**一个月内**

9. Gateway 拆出 `route-table`，上编译路由表 + 基准。
10. metrics 秒单位 + event loop lag / consumer 指标。
11. `defineService()` + capabilities 自检 + `doctor`。
12. 每包 README + OpenAPI 端点 + dist 发布门禁。

**不要做**

- 不要在可靠性语义修好之前继续加新协议/新策略；
- 不要在基准之前做"路由缓存/对象池"微优化（仓库纪律：未实测不保留）；
- 不要把 Gateway 拆成微服务（当前问题是单类职责，不是进程边界）；
- 不要用"跳过测试"或"吞错误"换取绿灯。

---

## 9. S0 执行记录（2026-11-16）

S0 已完成，改动只涉及测试类型修复、缺失的 `tsconfig`、门禁/CI 接线与基准骨架，没有改变运行期行为。

| 任务 | 结果 |
|---|---|
| 三个红套件 | `gateway` **82 passing**、`contract` **18 passing**、`http` **48 passing**，均 EXIT=0 |
| 顺带修复 | `packages/common` 的 `http/test/protocols.spec.ts` 仍用已移除的 `Transport.REDIS` / `TransportConfig.side`，修复后 **34 passing**（原本编译失败，`ms-core` 依赖它） |
| 测试修复内容 | `gateway/test/config.service.spec.ts` 改为断言 `instanceof`（`toThrow` 的 `Constructable` 类型不接受带参构造器）；`gateway/test/redis-state.e2e.spec.ts` 用 `as unknown as typeof describe`；`gateway/src/gateway.runtime.ts` 的 `GatewayRouteSnapshot` 补上运行期已返回的 `alerts`；`contract/test/client.spec.ts` 的泛型 transport 补 `as any`；`http/test/http-microservice.spec.ts` 的 Agent 类型补 `keepAlive` |
| 缺失 tsconfig | 给 amqp/coap/gateway/grpc/http/kafka/mcp/mqtt/nats/redis/udp/ws 补 `tsconfig.json`（含 `index.ts` + `src/**/*`，排除 test）；**25/25 包 `tsc --noEmit` 全绿** |
| 门禁 | `scripts/agents-gate.sh` 新增 `ms-core`（common/transport/service/client）、`ms-observe`、`ms-discovery`、`ms-protocols`、`ms-gateway`、`ms-http`、`ms-brokers`（`MS_BROKER_PROFILE=1` 才跑，否则显式 SKIP）、`ms-tsc`、`ms-bench`，并加入 `ALL_STAGES` |
| CI | `.github/workflows/agents-gate.yml` 的 push 分支增加 `7.tui` |
| 基准 | 新增 `packages/microservices/benchmarks/`（`run.ts` + README + `results/baseline.json`），根 `package.json` 增加 `npm run bench` |
| 门禁实跑 | `bash scripts/agents-gate.sh ms-core ms-observe ms-discovery ms-protocols ms-gateway ms-http ms-brokers ms-tsc ms-bench` → **PASS**（9 passed，1 skipped=`ms-brokers` 未开 opt-in），EXIT=0 |

首份 route-match 基线（linux/x64, node v24.22.3, 2000 samples）：

| routes | ops/sec | p50 ms | p99 ms |
|---|---|---|---|
| 100 | 6,736 | 0.1301 | 0.2904 |
| 1,000 | 688 | 1.3343 | 2.7598 |
| 10,000 | 64 | 14.7615 | 25.8606 |

数据确认了 §3.3 的判断：匹配耗时随路由数近似线性增长（100→10,000 约 105×）。S2 的编译路由表应以该基线为对照，目标不是"更快"而是"p99 不随路由数线性增长"。

---

## 10. S1 执行记录（2026-11-16，进行中）

S1 按"先止血可靠性、再统一内核"的顺序推进。以下为已落地部分（改动未提交）。

| 任务 | 改动 | 验证 |
|---|---|---|
| broker handler 等待 | Kafka `eachMessage`、NATS `for await`、MQTT `message`、AMQP `consume` 全部改为 `await lastValueFrom(handler.handle(...))`；失败可被计数/重投，不再"先返回后处理" | `kafka/test/delivery.spec.ts` 3、`nats/test/delivery.spec.ts` 3、`mqtt/test/delivery.spec.ts` 3、`amqp/test/retry-dlx.spec.ts` 2 通过（旧实现第一个用例即失败） |
| Kafka 至少一次 | 新增 `delivery: 'at-most-once' \| 'at-least-once'`（默认保持现状）；至少一次时 `autoCommit: false`，成功后 `commitOffsets(offset+1)`；`retry.maxAttempts/delayMs` 进程内重试；超限且配置 `deadLetterTopic` 时投递 DLQ 后提交，否则不提交并抛错（重启/再平衡后重投） | `kafka/test/delivery.spec.ts` 新增 5 用例（提交时机、默认不提交、重试、DLQ、无 DLQ 不提交） |
| AMQP 重试/DLX | 新增 `retry.maxAttempts/delayMs`（默认关闭）、`deadLetterExchange`/`deadLetterRoutingKey`/`deadLetterQueue`；重试用 `x-tsdi-retry-count` 头 + TTL retry queue（`x-message-ttl` + `x-dead-letter-*`）回主队列；超限投 DLQ/DLX，未配置时保持 `nack(requeue=false)` 的 broker DLX 语义 | `amqp/test/retry-dlx.spec.ts` 7 通过 |
| 错误归一 | `client/src/errors.ts` 新增 `toServiceError()`，`AbstractClient.onError` 归一 broker `ErrorResponse`（保留 status/body/headers/response/cause/stack）；已是 `Error` 原样透传 | `client/test/error-model.spec.ts` 4 通过；client **88 passing** |
| trace 作用域 | `Tracer.runWithSpan()` + `AsyncLocalStorage.run()`；`startSpan` 不再隐式激活 span；`TracingInterceptor`、`AbstractClient.request`、Gateway 上游调用均在 span 作用域内订阅 | tracing **55 passing**；两并发请求均为根 span（`tracing/test/tracing.spec.ts`、`tracing-interceptor.spec.ts`） |
| broker trace carrier | `tracing/src/carrier.ts` 统一 kafka Buffer / amqp properties / nats `MsgHdrs` / MQTT5 userProperties；Kafka/AMQP/NATS server normalize 暴露 `headers`，client 把 `request.headers` 写入 broker headers；span 名用 `CONSUME <topic>` 并带 `messaging.destination` | `tracing/test/carrier.spec.ts` 7 通过（跨 broker parent、无 carrier 为根、并发隔离） |
| 生命周期 | `MicroService.start()`：listen(`onStart`) → register → health；任一步失败回滚（health stop → deregister → onShutdown）且不掩盖原始错误；`close()`：readiness DOWN → deregister → grace/drain → onShutdown → handler.destroy，单步失败不阻断后续并抛首个错误 | `service/test/lifecycle.spec.ts` 12 通过（旧实现 `register` 先于 `listen`，第一个用例即失败） |
| 关闭 drain | 新增 `InFlightTracker` + `InFlightInterceptor`（`useGracefulShutdown` 默认注册，`multiOrder: -10000` 最外层）；`GracefulShutdownOptions.drainTimeoutMs`（覆盖 `timeout`，默认 30s）；close 期间等待在途请求归零或超时后由 `onShutdown` 强制关闭 | `service/test/lifecycle.spec.ts` + `http/test/in-flight-drain.spec.ts`（真实 HTTP 请求，`close()` 等待慢请求返回 200 而不是被截断） |
| LB 统一 | `discovery/src/selector.ts` 新增 `EndpointSelection` 单一实现（random/round-robin/weighted/least-connections/consistent-hash，RR 按 service 独立游标，支持外部 `nextIndex`）；DI selectors、client `DefaultClientLoadBalanceStrategy`、gateway `GatewayLoadBalancer` 全部委托；client 新增 `release()` 支持 least-connections 释放 | `discovery/test/selector-shared.spec.ts` 6 通过；client **88**、discovery **81**、gateway **82** 全绿 |
| `ConsumerRuntime` | `service/src/consumer/ConsumerRuntime.ts`：并发上限、进程内重试/指数退避、成功 `ack`/失败 `fail` 结算、`stats()`（completed/failed/retried/inFlight/peak）。Kafka/MQTT/NATS/AMQP 已接线（Kafka 的 ack=提交 offset、fail=DLQ 后提交或抛出不提交；MQTT/NATS 的 fail=发布到 `deadLetterTopic`/`deadLetterSubject`；AMQP 的 ack/nack 仍由 transfer hook 结算，runtime 只做统计）；Kafka `concurrency` 映射 `partitionsConsumedConcurrently`；关闭时输出 drained 统计 | `service/test/consumer-runtime.spec.ts` 6 通过；kafka **8**、mqtt **6**、nats **5**、amqp **8** 通过 |
| readiness 状态 | `service/src/readiness.ts` 新增 `ReadinessStateService`（`@Injectable({ singleton: true })`）；start=STARTING→UP，失败/关闭=DOWN，shutdown 开始=DRAINING；`provideService` 默认提供；`HealthController./health/readiness` 在非 UP 阶段返回 DOWN + 503（`components.lifecycle`），UP 时才跑 indicators | `health/test/readiness.spec.ts` 4 通过；`health/test/health-http.spec.ts` 新增真实 HTTP 关闭窗口断言（DRAINING → 503，关闭前 200） |
| MQTT trace carrier | server 把 MQTT5 `packet` 透传到请求，carrier 从 `packet.properties.userProperties` 提取；client 仅在 `connectOpts.protocolVersion === 5` 时把 `request.headers` 写入 publish `properties.userProperties`（MQTT4 不发送，保持兼容） | mqtt delivery 新增 packet 透传用例；tracing carrier 覆盖 MQTT5 形状 |

当前回归：service **82**、health **24**、http **50**、client **88**、discovery **81**、gateway **82**、tracing **55**，相关包 `tsc --noEmit` 全绿。

S1 待办：

- 新增配置（`delivery`/`retry`/`deadLetter*`/`drainTimeoutMs`）需要补 README 与每包配置说明；
- `ms-brokers` 的真实 broker（Docker）回归（Kafka offset 重投、AMQP DLX、MQTT QoS1、NATS DLQ）；
- S2 起：Gateway 拆分与编译路由表（基线见 §9）。

---

## 11. S2 执行记录（2026-11-16，进行中）

S2 按"先拆路由匹配、再拆其余职责"的顺序推进。已完成前两步（改动未提交）。

### 11.1 编译路由表

- 新增 `gateway/src/gateway.route-table.ts`：
  - `GatewayRouteTable.compile(routes, { resolve, normalizePath, version })` 在配置版本内只编译一次；
  - `resolveRoute`（合并默认值/全局 auth）在编译期执行，不再每请求克隆 route；
  - `methods`/`hosts` 预转为 `Set`，specificity 预计算；
  - 静态段 + `:param` 用 trie 收集候选，`*` 作为节点通配；候选按 `specificity desc + 声明顺序` 选第一个通过 method/host/matchHeaders/canary 的路由；
  - `legacy` 模式保留原 `url.startsWith(route.path)` 首个命中语义。
- `GatewayRuntime` 增加 `configRevision`，`setDynamicOptions` 每次变更自增；`GatewayInterceptor` 以 revision + routes 引用缓存编译表，配置 apply 后原子重建。
- 删除 interceptor 内的 `matchRoutePath`/`routeSpecificity`（职责移入 route-table）。
- `ResolvedGatewayRoute` 从 interceptor 局部类型提升到 `gateway.options.ts`，供新模块复用。

验证：`gateway/test/route-table.spec.ts` 11 通过（`/api/users2` 不匹配、static > param > wildcard、method/host、canary fallback、legacy、20k 路由、compile 复用、revision 失效）。

### 11.2 规则引擎

- 新增 `gateway/src/gateway.rule-engine.ts`：
  - `GatewayRuleEngine` 在编译期过滤 disabled 并按 `priority + 声明顺序` 排序，不再每请求 `map/filter/sort`；
  - 条件求值改为 `GatewayRuleMatchContext`（path/method/host/header/query 回调），与 HTTP 解耦；
  - `ruleToRoute` 从 interceptor 移出。
- interceptor 以 revision + rules 引用缓存规则引擎。

验证：`gateway/test/rule-engine.spec.ts` 7 通过（优先级/禁用、全部操作符、header/query、未知字段、ruleToRoute、revision 失效）。

### 11.3 基准对比（route-match，linux/x64，node v24.22.3，2000 samples）

| routes | 改造前 ops/sec | 改造后 ops/sec | 改造前 p99 ms | 改造后 p99 ms |
|---|---|---|---|---|
| 100 | 6,927 | 292,210 | 0.2791 | 0.0228 |
| 1,000 | 690 | 303,196 | 2.8381 | 0.0205 |
| 10,000 | 62 | 316,591 | 32.5682 | 0.0165 |

匹配耗时不再随路由数线性增长（10k 路由 p99 从 32.6ms 降到 0.0165ms）。改造前基线保留在 `benchmarks/results/baseline-pre-route-table.json`，当前 `baseline.json` 为重跑结果。

### 11.4 Gateway 拆分完成（2026-11-16）

按 11.1 的顺序继续拆分，`GatewayInterceptor` 从 2062 行降到 436 行：

| 模块 | 职责 | 模块级测试 |
|---|---|---|
| `gateway.types.ts` | `GatewayForwardResult/Meta`、错误分类 | `observability.spec.ts` |
| `gateway.http.ts` | header/host/client ip/prefix/claim/CIDR 纯函数 | `auth.spec.ts` |
| `gateway.observability.ts` | trace scope、error tag、metrics、access log | `observability.spec.ts` 10 个 |
| `gateway.auth.ts` | JWT/API key/HMAC/claims/IP ACL | `auth.spec.ts` 6 个 |
| `gateway.response.ts` | rewrite/cache/etag/compression/fallback | `response.spec.ts` 9 个 |
| `gateway.rate-limit.ts` | 路由/全局限流与共享窗口 | `rate-limit.spec.ts` 6 个 |
| `gateway.upstream.ts` | retry/failover、endpoint、HTTP/微服务/聚合转发、webhook | `upstream.spec.ts` 9 个 |

`GatewayInterceptor` 仅保留 intercept/preview、规则与路由表缓存、canary/header 匹配、`resolveRoute` 与 HTTP pool 生命周期，已满足 < 500 行目标。

验证：gateway 140 passing、admin 69 passing；每步均通过 `tsc --noEmit`；`bash scripts/agents-gate.sh ms-gateway ms-admin ms-tsc` PASS（gate 已新增 `ms-admin` stage）。

### 11.5 Admin 状态拆分完成

`admin.state.ts` 1343 → 593 行，低于 600 行目标；页面行为不变：

| 模块 | 职责 |
|---|---|
| `admin.state.pure.ts` | 告警时间、SLO CSV、config diff、方法 key、路由校验 |
| `admin.config.controller.ts` | 配置预览/历史/rollback |
| `admin.routes.controller.ts` | 路由列表/编辑器/apply |
| `admin.rules.controller.ts` | 规则工作流与 match 测试 |
| `admin.routes-transfer.controller.ts` | 路由详情 JSON、导入/导出/reset |
| `admin.diagnostics.controller.ts` | diagnostics/services 与 SLO 导出 |
| `admin.view.controller.ts` | 派生视图、统计与展示格式 |
| `admin.menu.controller.ts` | 语言/主题菜单 |
| `admin.shell.controller.ts` | 初始化、路由订阅、跳转、登录重定向 |
| `admin.types.ts` | 公开接口类型（state 继续 re-export） |

新增 `GET /api/gateway-admin/doctor`，汇总路由、发现、熔断与 SLO 告警检查。
验证：admin 72 passing；bundle 已按拆分前源码重建（后续拆分的行为等价，待 activities 并发改动稳定后再次重建）。

### 11.6 S3 执行记录（2026-11-16）

| 项目 | 结果 |
|---|---|
| metrics 单位 | 新增 `recordDuration`，http/client/gateway 延迟指标双发 `*_ms` + `*_seconds` |
| defineService | `defineService` / `describeService`；示例见 `examples/http-quickstart.ts` |
| OpenAPI | swagger 暴露 `GET /{prefix}/openapi.json` |
| 契约兼容 | `compareContracts` / `assertCompatible` + CLI `--compat`，breaking 变化 exit 1 |
| 可运行示例 | quickstart + smoke，gate `ms-examples` 真实启动端口 |
| soak | 新增 `examples/soak.ts` 与 opt-in gate `ms-soak`（heap/句柄稳定） |
| 每包 README | 21 个缺失包补齐（共 26 个包） |
| 发布 | `ms-admin` / `ms-examples` / `ms-soak` 接入 gate；publish 分片与 payload 校验 |

真实 Docker broker 回归（`MS_BROKER_PROFILE=1 ms-brokers` PASS）：
Kafka 81、NATS 59、AMQP 63、MQTT 87、Redis 73。
修复了 NATS/Kafka/AMQP payload `authorization` 被 broker headers 覆盖丢失的问题。

最终门禁（2026-11-16）：

```text
ms-core ms-observe ms-discovery ms-protocols ms-gateway ms-admin ms-http
ms-examples ms-tsc ms-brokers package-deps package-publish
```

全部 PASS。soak 30s：37,942 请求、0 失败、heap -1MB、句柄回落到 2。

外部验证未完成（Docker registry 无法访问，镜像拉取超时）：
OTLP Collector 实机导出、Consul/Nacos/Eureka 实机容器。

---

## 附：本文的证据来源

- 源码走查：`gateway/`、`service/`、`client/`、`transport/`、`common/src/response.ts`、`tracing/`、`discovery/`、各 broker server/factory、`admin/web/admin.state.ts`。
- 实跑：19 个包执行（16 个通过：`discovery` 81、`client` 84、`service` 63、`config` 75、`health` 19、`metrics` 54、`tracing` 45、`mime` 56、`transport` 52、`swagger` 10、`mcp` 38、`grpc` 28、`tcp` 65、`udp` 54、`ws` 88、`coap` 25）；`gateway`/`contract`/`http` 编译失败（错误见 §1.3）。
- 并发 span 复现：在 `tracing` 包内用两个并发 `startSpan` 观察 parent 关系（临时脚本已删除，未进入仓库）。
- 门禁/CI/发布：`scripts/agents-gate.sh`、`.github/workflows/agents-gate.yml`、`scripts/check-package-deps.mjs`、`scripts/verify-package-publish.mjs`、`scripts/prepare-package-publish.mjs`。
