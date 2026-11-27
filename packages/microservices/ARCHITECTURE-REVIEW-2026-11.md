# 微服务架构复核与优化方案（2026-11）

> 复核对象：`packages/microservices/**`、`packages/gateway-kit`、admin/contract/observability 相关包。
> 方法：源码走查 + S4 基准/测试证据 + 与主流框架的能力对照。本文只列**当前仍成立**的问题，已完成项见 `IMPROVEMENT-PLAN.md` §12 与 `OPTIMIZATION.md`。

## 1. 当前基线

- 25 个微服务包：HTTP/WS/TCP/UDP/gRPC/CoAP、AMQP/Kafka/MQTT/NATS/Redis、MCP，以及 service/client/discovery/gateway/admin/metrics/tracing/health/config/swagger/contract 等。
- 统一内核：`@tsdi/ioc` + `@tsdi/core` + `@tsdi/service`，transport/client 通过 feature factory 组合。
- Gateway 已有：编译路由表、规则引擎、JWT/API key/HMAC/IP ACL、5 种 LB、retry/circuit/bulkhead、缓存/ETag/压缩、聚合、webhook、SLO、共享 Redis 状态、admin API/UI。
- 可靠性：Kafka/AMQP/NATS 已接 `ConsumerRuntime` 的幂等/drain；Kafka/AMQP/MQTT/NATS 有 retry/DLQ；Redis 支持 `delivery:'stream'`，NATS 支持 `delivery:'jetstream'`。
- 观测：W3C trace + AsyncLocalStorage、`_ms`/`_seconds` 双发、event-loop lag、consumer 指标、Prometheus/OTLP。
- 工程：per-package tests、真实 broker opt-in gate、route/metrics/gateway 基准、`ms-tsc`、package publish 校验、source-size ratchet。

S4 复跑后的关键数字：gateway route-match 10k p99 ≈ **0.0023 ms**（327k ops/sec），10k/100 p50 比回到 ~1；broker 测试 Kafka 81 / NATS 59 / AMQP 63 / MQTT 87 / Redis 73（真实 Docker，opt-in）。

## 2. 优点

1. **TS 原生、内核统一**：DI/AOP、装饰器路由、client/server 抽象共用一套生命周期；浏览器 admin UI 与 TUI/服务端共享 components 生态。
2. **协议覆盖广**：同步/异步、请求响应/发布订阅/流式都有实现，且 client/server factory 统一，新增 transport 成本可控。
3. **Gateway 治理深度高**：路由索引、规则优先、认证/限流/熔断/舱壁/重试/缓存/压缩/聚合/webhook/SLO 都在进程内完成，不强制依赖 Envoy/Dapr sidecar。
4. **可观测与契约不是附属品**：tracing carrier、OTLP、contract manifest → DTO/OpenAPI/proto/client、breaking-change CLI 已进入主路径。
5. **可靠性已越过“能跑”阶段**：at-least-once、DLQ、幂等（Kafka/AMQP/NATS）、drain、readiness、共享 Redis 状态都有实现与回归。
6. **性能有实测纪律**：路由索引、异步压缩、ETag 复用、指标写入、gateway 连接池都做了基准对比；回退有 `ms-bench` 门禁。
7. **运维/DX 已有基础**：`defineService`、quickstart、soak、doctor/routes CLI、admin UI、每包 README。

## 3. 仍存在的短板

### P0（正确性/安全/一致性）

| # | 问题 | 证据/影响 | 方向 |
|---|---|---|---|
| 1 | transport 能力不可机器读 | `describeService` 只有 transports/router/health 等计数；幂等、请求响应、流式、ordering、max payload、delivery 默认值未声明 | 新增 `TransportCapabilities`，启动自检并在 readiness/doctor 展示 |
| 2 | 消费语义仍不齐 | MQTT 无稳定消息 id/幂等；Redis stream 走独立实现，未统一 `ConsumerRuntime`/drain/幂等 | 统一能力矩阵；Redis stream 接入 runtime 或明确标记不支持项并告警 |
| 3 | admin 安全默认偏弱 | 默认 `mode:'none'` 开放；cookie 会话依赖 `SameSite=Lax`，无显式 CSRF token/origin 校验 | 本地默认显式提示；增加 CSRF/origin 校验与审计日志 |
| 4 | Gateway JWT 缺少 JWKS/轮换 | gateway 用静态 `publicKey`；OIDC/JWKS 能力在 security/admin，未接入 gateway 边缘 | 支持 issuer + JWKS 缓存/轮换，保留静态 key 兼容 |
| 5 | 配置无 schema/版本迁移 | config 多源、gateway config version 有，但字段 schema、旧版本迁移、启动期可操作错误缺失 | 增加 schema v1 + migration + `doctor` 校验 |
| 6 | 依赖/类型漂移会破坏 gate | `amqplib` 类型从 `Connection` 漂移到 `ChannelModel`，`ms-tsc` 已因此失败 | 锁版本/类型适配层；依赖升级纳入 CI 矩阵 |

### P1（架构/生态/边界能力）

| # | 问题 | 影响 | 方向 |
|---|---|---|---|
| 1 | 缺少 outbox/inbox/saga | at-least-once + 业务副作用仍需用户自己保证最终一致 | 提供 `OutboxStore`、inbox 去重、与 activities/workflow 的 saga 集成 |
| 2 | 服务发现真实环境验证不足 | Consul/Nacos/Eureka 仍是 fake HTTP；无 etcd；无 zone-aware/多区域 | etcd adapter + 容器化 nightly + 区域/权重选择 |
| 3 | OTel 语义未完全统一 | metric 名/单位已修，但 http/rpc/messaging semconv、日志-追踪关联、exemplars、仪表盘模板仍缺 | 按 semconv 输出，提供 collector compose 与 dashboard 模板 |
| 4 | Gateway 边缘能力不完整 | 上游原始 WebSocket upgrade、gRPC-Web、流式背压、retry budget/hedging 缺失 | HTTP/2/WS 隧道、流控、预算化重试；保持现有路由语义 |
| 5 | Admin 运维能力有限 | 规则默认内存存储、无 HA/多副本协调、RBAC 只到 roles/groups、无审计 | 持久化 store、shared state、租户/角色策略、审计日志 |
| 6 | DX 缺脚手架/热重载 | 新服务需要手写 Module/feature；示例偏 HTTP quickstart | `create-tsdi-service`、`tsdi dev`、gateway+discovery+broker 全链路示例 |
| 7 | 契约未进入默认 CI 流程 | `--compat` 可用，但注册中心、生成 client 的默认流水线未串起来 | contract registry + breaking gate + 生成代码漂移检查 |

### P2（规模化/维护性）

- **性能覆盖不均衡**：gateway 有基准，broker 吞吐/背压、client 连接复用、流式内存占用缺长期数据。
- **混沌/soak 仍偏短**：已有 quickstart soak 和 gateway kill 测试；缺 broker 断连、注册中心抖动、30 分钟 nightly。
- **包分发形态**：源码 package 无 `main/types/exports`，依赖 `prepare-package-publish` 生成 dist；ESM/CJS、版本兼容矩阵未显式化。
- **大文件/单一职责**：`admin/src/auth.ts` ~1016 行、`gateway.options.ts` ~1065 行、`service/src/router/router.optimize.ts` ~900 行，后续改动需继续按职责拆分。

## 4. 与主流框架对比

| 能力 | 当前 @tsdi | NestJS | Spring Cloud | Moleculer | Dapr |
|---|---|---|---|---|---|
| DI/AOP/装饰器 | 强 | 强 | 强（JVM） | 中 | 无（sidecar） |
| transport 广度 | 强（11+） | 中（adapters） | 中（HTTP/messaging） | 强 | 强（building blocks） |
| 服务发现/LB | 内建 + providers | 需外部 | 强 | 内建 | sidecar/name resolution |
| Gateway | 内建且深 | 需额外 | Spring Cloud Gateway | API Gateway 可选 | 依赖 Envoy/Ingress |
| 可靠性模式 | retry/circuit/bulkhead/DLQ/幂等 | 需库组合 | 成熟 | 内建 | 内建（sidecar） |
| 可观测 | 内建指标/tracing/OTLP | 生态丰富 | 成熟 | 内建 | 强 |
| 契约/DTO | manifest→DTO/OpenAPI/proto | OpenAPI 生态 | 成熟 | 中 | 无 |
| DX/生态 | 中（正在补） | 强 | 强 | 中 | 强 |
| 部署形态 | 进程内库 | 进程内 | JVM 进程 | 进程内 | sidecar |

借鉴重点：
- **Moleculer**：把能力自检、服务注册/LB 的默认体验做成一等公民。
- **NestJS**：模块/CLI/文档/示例的 DX；我们保留更强 transport/gateway，但要把“5 分钟可运行”补齐。
- **Spring Cloud**：config/discovery/actuator/RBAC 的运维模型；避免把可靠性都留给用户手工拼。
- **Dapr**：pubsub/state/bindings 的 sidecar 解耦；保留可选 sidecar 路径，不强制。
- **Temporal/Encore**：outbox/saga/durable workflow 应作为可选上层，而不是塞进 transport。

## 5. 目标架构

```text
┌──────────────────────────────────────────────┐
│ Edge: Gateway / Admin / WS·HTTP2 proxy       │
│  - compiled routes + rules + policy          │
│  - local-first admin API (GATEWAY_LOCAL_PATHS)│
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ Kernel: service/client/transport + DI/AOP    │
│  - capability descriptors / self-check       │
│  - contract-first DTO + typed clients        │
└──────────┬───────────────────────┬───────────┘
           │                       │
┌──────────▼─────────┐   ┌─────────▼───────────┐
│ Governance         │   │ Reliability         │
│ discovery/config   │   │ retry/DLQ/idempotency│
│ LB/zone/registry   │   │ outbox/saga/drain   │
└──────────┬─────────┘   └─────────┬───────────┘
           │                       │
┌──────────▼───────────────────────▼───────────┐
│ Observability: metrics/tracing/logs/audit    │
│ OTel semconv + collector + SLO dashboards    │
└──────────────────────────────────────────────┘
```

设计原则：
1. **能力显式化**：每个 transport 声明 request/response、pub/sub、stream、delivery、idempotency、ordering、payload 限制；不支持的组合启动时告警/失败。
2. **本地优先、边界治理**：admin/health/doctor 属于进程本身，gateway 不得转发；策略在边缘统一执行。
3. **契约优先**：manifest 是源，DTO/client/OpenAPI 是产物，breaking change 进 CI。
4. **安全与可观测默认开启**：本地开发可显式关闭，但必须打印开关；生产默认最小权限。
5. **先实测再优化**：性能改动必须有真实路径基准，不以单测/代码推测宣布收益。

## 6. 优化路线图

### P0：2 周内（正确性/安全/一致性）

| 任务 | 交付 | 验收 |
|---|---|---|
| Transport capability matrix | `TransportCapabilities` + `describeService` 扩展 + 启动自检（矩阵/报告已落地，strict 启动失败待接入） | 不支持的 idempotency/stream 配置启动即可诊断 |
| Admin CSRF/安全默认 | origin 校验 + `allowedOrigins`、`mode:none` 启动提示、`/audit` 记录已落地；独立 CSRF token 待补 | 跨站写请求被拒；本地开发可显式关闭 |
| Gateway JWKS | `jwksURI` 缓存 + kid 轮换刷新已落地；issuer discovery 待补 | 过期/轮换 key 自动刷新；gateway 回归不变 |
| Config schema v1 | Admin config schema v1 + v0 迁移 + 启动期校验已落地；gateway/service 通用 schema 待补 | 旧配置可启动并给出迁移报告 |
| 依赖/类型矩阵 | amqplib 类型已适配（`ChannelModel`），`ms-tsc` 绿；锁版本/升级矩阵待补 | `ms-tsc` 在支持版本范围全绿 |
| Redis/MQTT 语义补齐 | Redis Stream 已接 ConsumerRuntime；MQTT QoS1/2 幂等（messageId+payload hash），QoS0 明确不 dedupe | 重复投递副作用为 0 或明确告警 |

### P1：3–6 周（DX/可观测/边缘）

| 任务 | 交付 | 验收 |
|---|---|---|
| 脚手架与 dev 体验 | `create-tsdi-service`、`tsdi dev`、watch/reload、全链路示例 | 新目录一条命令启动 HTTP+gateway+broker 示例 |
| OTel 语义与仪表盘 | semconv 字段、log-trace 关联、collector compose、SLO 模板 | 真实 collector 下 trace/metrics 可查；dashboard 可用 |
| 真实注册中心 CI | Consul/Nacos/Eureka/etcd nightly + zone-aware LB | 容器环境注册/发现/摘除回归通过 |
| Gateway 边缘增强 | 上游 WS/HTTP2、流式背压、retry budget、canary 配置 | 长连接/1MB 流式/故障注入测试通过 |
| Admin 运维 | 持久化规则/配置 store、HA 共享状态、RBAC/审计 | 多副本一致；越权请求可审计 |
| 契约 registry | 契约版本库 + breaking gate + client 生成漂移检查 | 非兼容变更 CI 失败 |

### P2：季度内（分布式一致性与规模化）

- Outbox/inbox + saga/workflow 集成；幂等 producer/consumer 统一接口。
- 多区域/多集群拓扑、gateway/admin HA、配置灰度/回滚。
- broker 吞吐/背压/内存长测；连接池与编解码按基准调默认值。
- 30 分钟 soak + 多进程 kill/注册中心抖动混沌；nightly 报告。
- 包 ESM/CJS/`exports`/版本兼容矩阵；大文件继续拆分。

## 7. 可度量目标

| 指标 | 当前 | 目标 |
|---|---|---|
| gateway 10k route p99 | ~0.0023 ms | ≤ 0.05 ms（保持） |
| 不支持 transport 组合的启动诊断 | 无 | 100% 可操作错误/告警 |
| 重复投递业务副作用 | Kafka/AMQP/NATS 已覆盖 | MQTT/Redis 同样为 0 或显式标记 |
| admin 跨站写请求 | 依赖 SameSite | CSRF/origin 校验用例通过 |
| 真实 collector/registry CI | opt-in/缺 | nightly 稳定运行 |
| 新服务从零到可运行 | 手写 Module | ≤ 5 分钟脚手架 |

## 8. 兼容与风险

- 能力自检默认 **warn**（显式 `strict` 才失败），避免破坏已有配置。
- Admin 安全默认变化需要 `mode:none` 下的开发开关与清晰日志，保持本地体验。
- Gateway JWKS/CSRF/WS 代理只新增能力，不改现有路由/认证语义。
- 真实注册中心/collector 使用 opt-in/nightly，不阻塞日常 gate。
- 所有性能改动必须有真实路径基准，未实测收益不保留。

## 9. 下一批 PR 顺序

1. `feat(service): transport capability descriptors + startup self-check`
2. `feat(admin): CSRF/origin guard and explicit no-auth warning`
3. `feat(config): schema v1 + migration`
4. `fix(deps): amqplib type compatibility`
5. `feat(redis,mqtt): align consumer semantics or report capability gaps`
6. `feat(observability): OTel semconv + collector compose`
7. `feat(cli): create-tsdi-service and dev runner`

## 10. 明确不做

- 不重写 DI/AOP/内核，不为追新框架替换现有 transport。
- 不强制依赖 Envoy/Dapr/K8s；sidecar 仅作为可选部署形态。
- 不在没有真实路径基准的情况下做“缓存/对象池”微优化。
- 不降低现有 gateway/admin/transport 的可见能力来换取简单实现。
