# `@tsdi/microservices` 微服务框架设计与演进方案

本目录收纳 `@tsdi` 的微服务基础设施：传输、客户端/服务端、服务发现、网关、健康检查、指标、Tracing、Swagger、MCP 等。

本文保留当前架构判断、备选框架对比和后续演进方案，作为微服务相关包的统一设计说明。

> 基于当前代码逐文件核对的优化设计（正确性缺口、性能/稳定性/健壮性方案、分阶段路线图与验收标准）见
> [`OPTIMIZATION.md`](./OPTIMIZATION.md)。

---

## 1. 总体定位

目标是把当前框架演进为：

> **TS 微服务内核 + 可插拔传输/发现/治理适配器 + 可选 Envoy/Dapr 基础设施**

```text
┌─────────────────────────────────────────────┐
│            API Gateway / Edge                │
│  Envoy/Istio 或 @tsdi/gateway                │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│          Service Discovery & Registry        │
│  Consul/Nacos/Eureka/K8s + InMemory          │
│  统一 EndpointResolver / Watch / Cache       │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│       Microservice Kernel / Contracts        │
│  DI/AOP、Client/Server、协议能力矩阵、校验    │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│                 Transports                   │
│ HTTP/WS/gRPC/TCP/UDP + AMQP/Kafka/MQTT/NATS  │
│ Redis/CoAP/MCP                               │
└─────────────────────────────────────────────┘
```

---

## 2. 当前能力

### 已有能力

- 统一 DI/AOP：`@tsdi/ioc`、`@tsdi/aop`、`@tsdi/core`
- 统一客户端/服务端抽象：`@tsdi/client`、`@tsdi/service`
- 多协议传输：
  - HTTP / WS / TCP / UDP / gRPC / CoAP
  - AMQP / Kafka / MQTT / NATS / Redis
  - MCP
- 服务发现：`@tsdi/discovery`
- 网关：`@tsdi/gateway`
- 健康检查：`@tsdi/health`
- 指标：`@tsdi/metrics`
- Tracing：`@tsdi/tracing`
- Swagger：`@tsdi/swagger`
- 可视化管理：`@tsdi/microservice-admin`（activities 流程规则 + components/html UI）
- 契约生成：`@tsdi/microservice-contract`（JSON manifest → DTO / OpenAPI / proto）
- Agent MCP 与微服务 MCP 桥接：`@tsdi/agent-tools/mcp` + `@tsdi/mcp-microservice`

### 近期已完成的通用化

- 服务端协议工厂统一为 `createServiceTransportFeature`
- 客户端协议工厂统一为 `createClientTransportFeature`
- Gateway 负载均衡：
  - round-robin
  - random
  - smooth weighted round-robin
  - consistent-hash
  - least-connections
- Gateway HTTP failover 与非 HTTP failover
- Circuit Breaker half-open
- 限流 + 限次 quota + 降频 throttle
- `EndpointResolver` + Gateway 自动发现接入
- `useMetrics()`、`useMetrics(options)` 指标接入
- MCP 请求体上限、限流器 key 上限、传输半包缓存 GC 等健壮性加固

---

## 3. 当前主要短板（2026-11 更新）

> 详细证据与计划见 [`IMPROVEMENT-PLAN.md`](./IMPROVEMENT-PLAN.md) §12（已完成项）与 §13（Streams/JetStream 设计）。

1. **broker 投递语义仍不统一**
   - Kafka / AMQP / MQTT / NATS 已有至少一次、重试、DLQ 与 `ConsumerRuntime`；
   - Redis 默认仍是 pub/sub（at-most-once），但已提供 `delivery: 'stream'` 消费组后端（XACK/XAUTOCLAIM，见 §13.1）；
   - NATS 默认仍是 core（at-most-once），但已提供 `delivery: 'jetstream'` durable 消费者（ack/nak/maxDeliver，见 §13.2）。

2. **服务发现缺真实注册中心回归**
   - 已有 InMemory / Consul / Nacos / Eureka / Kubernetes 适配；
   - 仍缺 etcd 适配，以及 Consul/Nacos/Eureka 的容器化 e2e（受 Docker 环境限制）。

3. **Gateway 剩余的是实测与调优，不是功能缺失**
   - 已有编译路由表、限流/配额、熔断、bulkhead、重试、5 种 LB、缓存/ETag/压缩、SLO、共享状态；
   - 出站连接池仍是 opt-in（回环实测主要改善 p99，见 §12.12）；
   - 仍缺大流量真实上游压测与默认值调优。

4. **协议能力矩阵尚未显式化**
   - `describeService` 可汇总启用的能力；
   - 但没有在启动时自检每个 transport 的 request-response / pub-sub / stream / 幂等 / 重试语义。

5. **可观测性接近完整，但语义未完全统一**
   - 已有 `_ms`/`_seconds` 双单位、event-loop lag、consumer 指标、Prometheus/OTLP 导出；
   - 仍缺完整的 OpenTelemetry semantic conventions 与统一 SLO 仪表。

6. **构建与 AOT 复杂**
   - 装饰器预编译/元数据生成链路复杂；
   - 不同包构建方式仍需进一步统一。

---

## 4. 备选微服务框架对比

| 方案 | 优势 | 不足 | 适合场景 |
|---|---|---|---|
| **NestJS** | TS 生态成熟、文档好、模块/DI/守卫/管道完善、社区大 | 本身不是完整微服务基础设施；多协议、服务发现、网关、负载均衡需要额外组件 | 以 HTTP/API 为主，团队熟悉 Angular/Nest 风格 |
| **Moleculer** | 原生微服务：服务注册、负载均衡、重试、熔断、指标、Tracing、多传输 | DI/AOP 不如当前框架强；生态和商业化弱于 NestJS | Node.js 微服务、需要开箱即用的服务治理 |
| **Spring Cloud** | 服务发现、配置、网关、LB、熔断最成熟 | JVM 技术栈，和当前 TS 体系不兼容 | Java/Kotlin 团队、企业级生产 |
| **Dapr** | Sidecar 化，语言无关，服务调用/pubsub/state/actors 完整 | 运维复杂度高，进程内控制力弱 | 多语言、K8s、希望基础设施下沉 |
| **Envoy / Istio** | 生产级 Gateway、LB、重试、熔断、限流、mTLS、可观测性 | 需要独立基础设施，学习成本高 | 大规模生产、K8s |
| **go-micro / Kratos / Kitex** | 高性能、云原生、Go 生态 | TS 团队迁移成本高 | 性能敏感、Go 团队 |
| **当前 @tsdi 自研框架** | DI/AOP 统一、多协议、可深度定制、TS 全栈 | 生态和基础设施能力仍需补齐 | 已有 TS 体系、需要多协议和深度定制 |

### 结论

- 如果继续保留当前 TS 技术栈和 DI/AOP 能力：**不建议整体迁移到 NestJS**。
- 如果想快速获得成熟微服务治理：可以考虑 **Moleculer** 或 **Dapr**。
- 如果想达到生产级 Gateway/LB/可观测性：最终应引入 **Envoy/Istio**，而不是把所有能力都堆在进程内。
- 当前建议：**保留 @tsdi 内核，补齐 Discovery SPI + Gateway 治理组件，生产大规模场景可选接入 Envoy/Istio 或 Dapr。**

---

## 5. 演进优先级

### P0：服务发现与 Gateway 统一接入（已完成基础能力）

- 定义稳定的 `EndpointResolver`：
  - `resolve(service, { protocol, version, tags, metadata, status })`
  - TTL 缓存
  - watch + 自动失效
  - 并发请求合并
- Gateway 优先消费 `EndpointResolver`，回退 `ServiceDiscovery`。
- `GatewayOptions.discovery` 支持：
  - `true`：内置 DiscoveryModule providers
  - 自定义 provider(s)
- HTTP 与非 HTTP 路由共享同一 endpoint 解析结果。

后续仍需补齐：
- Consul / Nacos / Eureka / Kubernetes / etcd 适配
- 生产级 watch/cache 与故障降级

### P1：Gateway 治理组件化（进行中）

- 已实现：
  - LoadBalancer（random / round-robin / weighted / consistent-hash / least-connections）
  - HTTP failover
  - 非 HTTP failover
  - Circuit Breaker half-open
  - per-endpoint circuit breaker
  - 限流 / 限次 / 降频
  - Bulkhead 并发隔离 + 有界排队/超时 + per-endpoint 限流
  - HTTP 出站连接池（undici Agent，可配置连接数/keep-alive/超时）
  - 统一错误分类（`x-gateway-error-type`、access log、metrics label）
  - Gateway 请求级 SERVER span（成功 OK / 失败 ERROR + recordError）
  - `gateway_errors_total` 错误计数指标
  - failover 指数退避 + jitter
  - 可视化规则引擎：`GatewayOptions.rules` 按条件（path/method/host/header/query）在路由表前执行 route/deny 动作
- 待补充：
  - 更细粒度背压策略

### P2：统一 Resiliency + Observability

- 已实现：统一超时、重试、熔断、隔离舱、背压基础能力；Gateway SERVER span 生命周期与错误分类指标
- Tracing DI：`TracingModule.withOptions(...)` 的 options 与 `TracingModule.withExporter(...)` 注册的 exporter 真实注入 `DefaultTracer`，支持 exporter class / 实例 / 多 exporter；flush timer 使用 `unref()`，不阻塞进程退出
- 待补充：OpenTelemetry：
  - trace parent propagation
  - span 命名与状态
  - 统一 metrics 标签
- 错误分类：
  - client error / server error / timeout / circuit open / rate limited
- 健康检查与优雅关闭统一

### P3：开发体验与 AOT

- 微服务包 `taskfile.ts` 统一使用 `@tsdi/compiler` 的 `runCompiler` AOT 构建入口。
- 脚手架：
  - `node scripts/scaffold-microservice.mjs <name>` 创建 HTTP 服务包
  - `node scripts/scaffold-microservice.mjs <name> --kind gateway` 创建 Gateway 包
  - `node scripts/scaffold-microservice.mjs <name> --kind transport` 创建自定义传输适配器骨架
  - 生成 package.json / tsconfig / taskfile / main / module / controller / README
- 契约优先：
  - 共享 DTO + `@RequestBody` / `@RequestParam` 等参数装饰器
  - `@tsdi/core` pipes 做输入校验/转换
  - `@tsdi/microservice-contract`：一份 JSON manifest 生成 DTO / OpenAPI 3 / proto3（含 `--check` CI 漂移检查）
  - Swagger/OpenAPI 作为 HTTP 契约输出；gRPC 使用生成的 proto 作为契约源
- 可视化微服务管理：`@tsdi/microservice-admin`（`packages/microservices/admin`）
  - `@tsdi/activities` 可视化流程配置 gateway rules（gateway-condition / gateway-route / gateway-deny）
  - `@tsdi/components/html` 管理界面：实时路由表 + 规则画布
  - `/api/gateway-admin` 读写并即时应用到 `GatewayRuntime`
- 双向同步：`importOpenApi` / `importProto` 可把已有 OpenAPI 3 / proto3 导入 manifest（支持本包生成子集与常见手写结构）

---

## 6. 扩展新协议

服务端：

```ts
import { createServiceTransportFeature } from '@tsdi/service';

export function myTransportFactory(option, asDefault?: boolean) {
    const config = normalizeMyConfig(option);
    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: MY_SERV_OPTIONS,
        serverType: MyServer,
        providers: [MyMessageAdapter, MyMessageAdapterFactory]
    });
}
```

客户端：

```ts
import { createClientTransportFeature } from '@tsdi/client';

export function withMyTransport(option, asDefault?: boolean) {
    const config = normalizeMyClientConfig(option);
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: MY_CLIENT_OPTIONS,
        clientType: MyClient,
        backendProvider: myBackendProvider
    });
}
```

新协议应保证：

- config / option token 可注入
- 支持统一 auth bridge
- 支持 discovery endpoint + Gateway
- 支持 health / metrics / tracing 接入
- 明确 request-response / pub-sub / stream 语义

---

## 7. Gateway 能力说明

### 负载均衡

```ts
loadBalance: {
    strategy: 'weighted' | 'round-robin' | 'random' | 'consistent-hash' | 'least-connections',
    hashHeader?: string,
    hashQuery?: string,
    retries?: number,
    retryOn?: number[],
    retryMethods?: string[],
    retryBackoffMs?: number,
    retryBackoffMaxMs?: number,
    retryJitter?: boolean
}
```

### 限流 / 限次 / 降频

```ts
rateLimit: {
    limit: 100,
    windowMs: 60_000,
    quota: { limit: 10_000, windowMs: 86_400_000 },
    throttle: { minIntervalMs: 200 }
}
```

### 熔断

```ts
circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30_000,
    perEndpoint: true,
    fallback: { ok: false }
}
```

### HTTP 出站连接池

```ts
httpPool: {
    connections: 100,
    pipelining: 1,
    keepAliveTimeout: 5_000,
    headersTimeout: 10_000,
    bodyTimeout: 30_000
}
```

### 错误分类

Gateway 响应会带 `x-gateway-error-type`，access log 与 metrics 也会使用同一分类：

- `rate_limited`
- `bulkhead_full`
- `circuit_open`
- `unauthorized` / `forbidden`
- `validation`
- `timeout`
- `network`
- `upstream` / `client` / `internal`

熔断器支持 half-open：超时后只放行一个探测请求，成功关闭、失败立即重新打开。

---

## 8. 服务发现接入

Gateway 已提供：

- `GatewayInterceptor` 通过 `EndpointResolver` / `ServiceDiscovery` 解析 endpoint
- HTTP 与非 HTTP 路由均支持
- `endpoint.metadata.clientName` 可映射协议客户端
- `GatewayLifecycle` 可用 discovery 做主动健康探测与 endpoint 驱逐

示例：

```ts
provideService(
    useRouter(),
    useGateway({
        discovery: true,
        routes: [
            {
                path: '/api',
                service: 'users-service',
                loadBalance: { strategy: 'least-connections', retries: 1 }
            }
        ]
    }),
    useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
)
```

生产环境建议传入自定义 registry provider：

```ts
useGateway({
    discovery: [
        { provide: ServiceDiscovery, useClass: NacosServiceDiscovery }
    ],
    routes: [...]
})
```

---

## 9. 可视化管理

`@tsdi/microservice-admin` 把 gateway 路由和规则变成可视化管理面：

- **规则**：用 `@tsdi/activities` 的流程设计器配置
  `gateway-condition` → `gateway-route` / `gateway-deny`，保存时编译成
  `GatewayRuleOptions[]` 并即时应用到运行中的 gateway。
- **UI**：基于 `@tsdi/components/html`；Overview / Routes / Rules 管理台，支持 light/dark 主题与 EN/中文切换（右上角全局控件，持久化到 localStorage），流程设计器按需全屏打开。
- **API**：`/api/gateway-admin/state`、`/routes`、`/rules[/:id]`。
- **认证**：通过 JSON config / env / CLI 切换 `auth.mode`：`none`（本地）/ `oidc`（外部 IdP OIDC client）/ `oauth2`（OAuth2 authorization code + userinfo）/ `service`（校验独立 `@tsdi/oidc-auth` 服务签发的 session/access JWT）。OIDC 统一认证服务可通过 `oidcService.enabled` 由 admin 拉起独立子进程（也可手动启动），admin 不内嵌 provider；支持 allowedEmails/Domains/Groups/Roles/Claims。

```ts
import { GatewayAdminController, GatewayAdminModule, useGatewayAdminUi } from '@tsdi/microservice-admin';

@Module({
    imports: [LoggerModule, GatewayAdminModule],
    declarations: [GatewayAdminController],
    providers: [
        provideService(
            useRouter(),
            useJson(),
            useGateway({ routes: [...] }),
            useGatewayAdminUi({ root: path.join(__dirname, 'admin-ui'), prefix: '/admin' }),
            useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
        )
    ]
})
export class AppModule {}
```

启动独立管理台：`cd packages/microservices/admin && npm run start`（默认 `http://127.0.0.1:4318/admin/`）。构建 UI：`npm run build:web`。详细说明见该包 README。

---

## 10. 脚手架

```bash
# HTTP 微服务
node scripts/scaffold-microservice.mjs orders --port 3000

# Gateway
node scripts/scaffold-microservice.mjs edge --kind gateway --port 8080
```

生成后：

```bash
cd packages/microservices/orders
npm run build
node ../../dist/orders/main.js
```

## 11. 契约生成

`@tsdi/microservice-contract`（`packages/microservices/contract`）用一份 JSON manifest 同时生成：

- TypeScript DTO（class/interface，可选 Swagger 装饰器）
- OpenAPI 3 文档
- proto3 message + RPC service

```bash
cd packages/microservices/contract
npx ts-node -r tsconfig-paths/register cli.ts example/orders.contract.json --out src/contract
# CI: 有漂移时失败
npm run generate -- example/orders.contract.json --out src/contract --check

# 反向导入已有契约
npm run generate -- --from-openapi openapi.json --manifest contract.json
npm run generate -- --from-proto orders.proto --manifest contract.json
```

字段支持 `string/number/integer/boolean/array/object` 和模型引用；数组必须有 `items`；
对象可内联 `properties`。未知模型、重复路由/operationId 会在生成前报错。

---

## 12. Tracing

```ts
import { TracingModule } from '@tsdi/tracing';

@Module({
    imports: [
        TracingModule.withOptions({
            serviceName: 'orders',
            sampleRate: 0.1,
            propagateHeaders: true
        }),
        TracingModule.withExporter(JsonTraceExporter)
    ]
})
export class AppModule {}
```

`withExporter` 可传 exporter class、exporter 实例，或一次传多个。未注册 exporter 时 span 仅保留在内存批次中。

## 13. 可靠性配置（S1）

交付语义与重试默认保持兼容（at-most-once / 进程内重试关闭），需要时显式开启：

| 传输 | 选项 | 说明 |
|---|---|---|
| Kafka | `delivery: 'at-least-once'` | 关闭 autoCommit，成功后提交 `offset+1`；崩溃/再平衡后重投 |
| Kafka | `retry: { maxAttempts, delayMs, maxDelayMs }` | 进程内重试（指数退避），耗尽后按 `deadLetterTopic` 处理 |
| Kafka | `deadLetterTopic` | 耗尽重试后投递 DLQ 并提交 offset；未配置则不提交并抛错 |
| Kafka | `concurrency` | 映射 `partitionsConsumedConcurrently` |
| AMQP | `retry: { maxAttempts, delayMs }` | TTL retry queue + `x-tsdi-retry-count` 头，超限进 DLX |
| AMQP | `deadLetterExchange` / `deadLetterRoutingKey` / `deadLetterQueue` | 耗尽重试后的去处；未配置保留 broker DLX 语义 |
| MQTT | `retry` / `deadLetterTopic` / `concurrency` | QoS ack 在回调完成后发出；耗尽后发布到 DLQ topic |
| NATS | `retry` / `deadLetterSubject` / `concurrency` | core NATS 仍是 at-most-once；耗尽后发布到 DLQ subject |
| 通用 | `useGracefulShutdown({ waitDuration, drainTimeoutMs })` | readiness DOWN → deregister → drain → close |
| 通用 | `/health/readiness` | `STARTING`/`DRAINING`/`DOWN` 时返回 503 |

MQTT 追踪透传需要 MQTT 5：server/client 的 `connectOpts.protocolVersion: 5`，
trace carrier 走 `properties.userProperties`；MQTT 4 不发送属性。

## 14. 选型建议

| 目标 | 建议 |
|---|---|
| 继续使用 TS + DI/AOP + 多协议 | 演进当前 `@tsdi/microservices` |
| 快速获得成熟 Node.js 微服务治理 | 考虑 Moleculer |
| 以 HTTP/API 为主、生态优先 | 考虑 NestJS + Consul/Nacos |
| 多语言、K8s、基础设施下沉 | 考虑 Dapr |
| 大规模生产 Gateway/LB/可观测性 | 引入 Envoy/Istio |
| 性能敏感、Go 团队 | 考虑 go-micro/Kratos/Kitex |

最终建议：

> **不要整体重写当前框架。继续完善 Discovery SPI、Gateway 治理组件和 Observable 能力；生产规模上来后，把边缘流量交给 Envoy/Istio，把构建块交给 Dapr，应用层继续保留 @tsdi 的 DI/AOP 和多协议能力。**
