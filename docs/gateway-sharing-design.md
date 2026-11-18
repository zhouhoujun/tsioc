# 两个 Gateway 共享实现设计（2026-11）

目标：让 `@tsdi/agent-gateway`（Agent 会话 BFF）与 `@tsdi/gateway`（微服务边缘代理）
共享 **HTTP 边缘原语**，同时保持两者领域完全独立。参考最新 opencode / Codex 的服务器与
协议设计，但不复制其品牌或传输栈。

## 1. 现状与重复清单（代码证据）

| 能力 | `agents/agent-gateway` | `microservices/gateway` | 结论 |
| --- | --- | --- | --- |
| HTTP 服务 | 自写 `gateway/GatewayServer.ts`（265 行，node `http`） | `@tsdi/http-microservice` `HttpServer` + 拦截器链 | 两套内核 |
| 路由 | `gateway/RouteMatcher.ts`（64 行，线性首匹配，`:param`/`*`，无 specificity） | `gateway.route-table.ts`（编译表 + specificity + 参数 + 静态段优先） | 重复且能力不一致 |
| 限流 | `auth/RateLimiter.ts`（59 行，单进程、per-IP、`Retry-After` 固定） | `gateway.rate-limit.ts` + `@tsdi/service` `ApiRateLimiter` + 共享 state store | 重复且多副本语义不一致 |
| 认证 | `auth/AuthMiddleware.ts`（pairing/approver token + `HttpAuthService`） | `gateway.auth.ts`（API key/HMAC/JWT + `HttpAuthService`） | 原语共享、接线重复 |
| CORS | `GatewayServer.setCorsHeaders` | 无（交给 ingress） | 仅 agent 有 |
| 静态资源 | `GatewayServer.tryServeStatic` | 无 | 仅 agent 有 |
| 错误 envelope | `{ error, path }` / `{ error }` | `{ statusCode, message }` + `x-gateway-error-type` | 语义不一致 |
| OpenAPI | `gateway/OpenApiDocument.ts`（从路由生成） | `@tsdi/swagger`（独立生成） | 两份来源 |
| 健康/统计 | `api/HealthHandler`、`api/StatsHandler` | `gateway.observability` + SLO + admin | 各自实现 |
| 域内能力 | JSON-RPC（384 测试）、WS 流式、配对、静态控制台 | 上游转发、发现/负载均衡、重试/熔断、缓存/ETag/压缩、聚合、webhook、规则引擎 | 不重叠，保持独立 |

依赖事实：`packages/agents/**` 不依赖 `@tsdi/gateway` / `@tsdi/http-microservice`；
两者只共享 `@tsdi/security`（`HttpAuthService`）。`@tsdi/service` 已提供通用
`ApiRateLimiter`，`@tsdi/http-microservice` 已提供 cors/bodyparser/logger/cookie/csrf/helmet
等拦截器 —— 说明**共享原语大多已存在，缺的是网关层的统一封装**。

## 2. 参考 opencode / Codex 的取舍

| 参考点 | opencode | Codex | 我们的取舍 |
| --- | --- | --- | --- |
| 服务形态 | 单服务器（Hono）同时服务 UI 与 API，中间件栈统一 | `app-server`（JSON-RPC）+ MCP server，多传输 | 采用「单一边缘内核 + 可插拔传输」；两个 gateway 各自保留入口 |
| 中间件 | cors/compress/logger/auth 组合一次 | JSON-RPC 方法注册、错误码 | 提取 middleware 组合器；错误码统一 |
| 事件推送 | `/event` SSE 单事件总线 | JSON-RPC notifications | 共享 `EventStream` envelope（SSE/WS 适配器） |
| 契约 | zod schema + OpenAPI + 生成客户端 | 类型化方法 + `initialize` 握手 | 一份 **method/route registry** 生成 OpenAPI、capabilities 与客户端类型 |
| 鉴权 | Bearer token / 密码 | 审批/沙箱策略 | 复用 `@tsdi/security` `HttpAuthService`；agent 保留 pairing 前置 |

不采用：opencode 的 Bun/Hono 运行时依赖；Codex 的 Rust 实现；两者都不适合直接搬入本仓库。

## 3. 架构

```
                       ┌──────────────────────────────┐
                       │      @tsdi/gateway-kit        │  framework-neutral, node-only
                       │  router · rate-limit · auth   │  deps: ioc/common/security(+service)
                       │  cors · static · error · openapi · event-stream
                       └──────────────┬───────────────┘
                    ┌─────────────────┴─────────────────┐
        @tsdi/agent-gateway                     @tsdi/gateway
   (JSON-RPC/WS/pairing/static console)     (upstream/retry/LB/cache/webhook/rules)
        kernel: node http (kit helper)          kernel: @tsdi/http-microservice
```

原则：

1. **领域不共享**：会话/RPC/审批/配对 与 上游转发/发现/熔断/缓存 各自保留。
2. **原语共享**：路由、限流、鉴权接线、CORS、静态、错误 envelope、OpenAPI、事件流、capabilities。
3. **内核可不同**：agent 继续用轻量 node http；microservices 继续用 `HttpServer`。
   kit 不绑定服务器，提供可组合函数与适配器，避免把 Service/发现/metrics 栈拖进 agent。
4. **registry-first**：路由/方法描述是唯一事实源，派生 OpenAPI、`app.capabilities`、
   客户端类型（opencode 模式）与权限/限流默认值。

### 3.1 公共 API 草案

```ts
// @tsdi/gateway-kit
export interface GatewayRouteDefinition<H = unknown> {
    id: string;
    method: HttpMethod | '*';
    path: string;                         // '/api/sessions/:id'
    handler: H;
    auth?: 'none' | 'bearer' | 'jwt' | 'api-key' | 'hmac';
    rateLimit?: false | { limit: number; windowMs: number; key?: 'ip' | 'principal' | 'route' };
    priority?: number;                    // 覆盖 specificity
    meta?: RouteContractMeta;             // summary/tags/params/body/response（OpenAPI）
}

export class GatewayRouter<H> {
    compile(routes: GatewayRouteDefinition<H>[]): void;
    match(method: string, pathname: string): { route: GatewayRouteDefinition<H>; params: Record<string, string> } | null;
}

export interface RateLimitStore { increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> }
export class GatewayRateLimiter {
    constructor(policy: RateLimitPolicy, store?: RateLimitStore);
    check(key: string): Promise<{ allowed: boolean; retryAfterMs: number }>;
}

export interface GatewayAuthGuard {
    authorize(requirement: GatewayRouteDefinition['auth'], request: AuthRequest): Promise<GatewayPrincipal>;
}

export interface GatewayErrorBody { error: { code: string; message: string; type?: string } }
export function sendGatewayError(res: ResponseLike, status: number, body: GatewayErrorBody, headers?): void;

export function buildOpenApiDocument(routes: GatewayRouteDefinition[], info: OpenApiInfo): OpenApiDocument;
export function createEventStream(): EventStream;   // SSE + WS adapters share the envelope
```

### 3.2 行为契约（冻结后再迁移）

- 错误 envelope 统一为 `{ error: { code, message, type? } }`，**新增**而不破坏旧字段：
  agent 保留 `path`，microservices 保留 `statusCode`/`message` 顶层字段一个版本周期。
- `x-gateway-error-type` 仅 microservices 输出，agent 可选开启。
- 429 必须带 `Retry-After`（秒），窗口/算法统一由 kit 限流器计算。
- CORS：OPTIONS 204，`Allow-Origin/Methods/Headers/Max-Age` 由 kit 生成；
  agent 保持默认 `*`，microservices 由配置开启（默认关）。
- 路由优先级：静态段 > 参数段 > 通配；同 specificity 按声明顺序（沿用 microservices 语义）。
- 鉴权失败 401/403 body 统一；principal 注入 `RequestState.principalId` 保持一致命名。
- 静态资源绕过限流与鉴权（agent 现状），SPA fallback 只在显式配置时启用。

## 4. 迁移阶段

### P0 —— 提取 `@tsdi/gateway-kit`，agent-gateway 接入（行为不变）—— 已完成（2026-11-18）

落地内容：`packages/gateway-kit`（router/rate-limit/error/cors/static/openapi，8 个单测）；
agent-gateway 的 `RouteMatcher`、`RateLimiter`、`OpenApiDocument`、`GatewayServer`
（CORS/静态/错误响应）改为复用 kit；`GatewayServer` 由 265 行降至约 190 行，
agent-gateway 全套 **388 passing** 不变。

- 新包：`packages/gateway-kit`（不依赖 agent / microservices / http-microservice）。
- 从 `microservices/gateway` 泛化 `GatewayRouteTable`（保留 specificity/参数语义）为 kit `GatewayRouter`；
  `GatewayRouteOptions` 通过适配器映射，避免改动微服务 API。
- 限流：以 `@tsdi/service` `ApiRateLimiter` 语义为基准 + `RateLimitStore` 接口（内存/共享 store）；
  `agent-gateway` 替换自制 `RateLimiter`，获得多副本一致能力（store 可选）。
- 认证接线：`HttpAuthService` 适配器 + `authorize(requirement)`；agent 的 pairing/approver 作为前置 guard。
- CORS/静态/body/错误 envelope/OpenAPI 抽成 kit 函数；`GatewayServer` 改为组合这些函数。
- 验收：agent-gateway 现有测试全绿（RPC 384 + 网关 E2E）、新增 kit 单测（路由 specificity/参数、限流窗口、
  错误 envelope、CORS、OpenAPI）、`components-bench` 不回归、构建 gate 通过。

### P1 —— microservices/gateway 复用 kit 原语（保留上游管线）

> 2026-11-18 评审结论：P1 不能直接替换，kit 需先补齐三项语义，否则会降级现有能力：
> 1. **路由**：微服务 route table 的 segment 模式允许「前缀命中」（`/api/users` 命中 `/api/users/1`），
>    并支持 `hosts` 过滤与 `accepts(resolved)` 谓词（canary/header 规则）；kit router 目前是整段精确匹配。
>    扩展：`matchMode: 'exact' | 'segment'`、`hosts?: string[]`、`accepts?(route)`、保留 specificity 排序。
> 2. **限流**：微服务支持 `quota`（多维窗口）与 `throttle`（最小间隔），并区分是否使用共享 store；
>    kit 目前只有单窗口 `limit/windowMs`。扩展：`quota`/`throttle` 维度 + `keyBy` 解析器，保持
>    `Retry-After` 秒数与共享 store 行为不变。
> 3. **错误 envelope**：微服务按 `bulkhead/circuit/timeout` 细分 `x-gateway-error-type`；
>    kit 的 `gatewayErrorTypeForStatus` 只覆盖状态码类别。扩展：允许调用方传入 error type
>    （`GatewayErrorOptions.type`），现有分类器保留在微服务侧。
>
> 已完成（2026-11-18）：a) kit router 增加 `matchMode: 'prefix'`、`hosts`、`accepts`、显式 `priority`（同分按声明顺序），
> 并有对照用例；b) `gateway.route-table.ts` 内部改为 kit adapter（`legacy` 分支与 `version`/`size` 不变），
> microservices gateway 全套 149 passing。
>
> 已完成（2026-11-18）：c) kit 限流器补齐 `quota`/`throttle`、`rejection(key)` 与共享 store（仅短窗口共享），
> `gateway.rate-limit.ts` 内部改用 kit（保留 route/global、禁用路由、destroy 语义）；gateway 149、agent-gateway 388、kit 9 全绿。
>
> 已完成（2026-11-18）：d) 错误分类法统一到 kit（含 bulkhead/circuit/network/upstream），
> microservices `GatewayErrorType` 改为共享类型别名；envelope 写入仍各自保留（微服务兼容 `statusCode`/`message`）。
>
> 剩余：
> a) kit router 增加 prefix/hosts/accepts 并加对照测试（同一路由夹具对比旧/新命中结果）；
> b) `gateway.route-table.ts` 内部改为 kit adapter（对外 `GatewayRouteTable` API/`version` 不变）；
> c) kit limiter 增加 quota/throttle，`gateway.rate-limit.ts` 内部替换（保留共享 store 分支）；
> d) 错误 envelope 接入 kit（保留 `statusCode/message` 与 `x-gateway-error-type`）。

- `gateway.route-table.ts` 内部改用 kit `GatewayRouter`（对外 `GatewayRouteTable` API 不变）。
- `gateway.rate-limit.ts` 内部改用 kit 限流器（保留 route/global 与共享 store 行为）。
- `gateway.auth.ts` 保持 API key/HMAC/JWT，但 principal/envelope 走 kit 约定。
- 错误响应由 kit `sendGatewayError` 输出（保留 `statusCode`/`message` 兼容字段）。
- OpenAPI：`@tsdi/swagger` 输入来自 kit registry（不再独立推导）。
- 验收：gateway 140+、http 199（`TSIO_TEST_HTTP=1`）、admin 72、客户端契约测试全绿。

### P2 —— 契约统一（opencode/Codex 模式）

- 单一 **method/route registry**：REST 路由 + JSON-RPC 方法共用 `id/meta/auth/rateLimit` 描述。
- `app.capabilities` 由 registry 生成（不再手写 allowlist）；OpenAPI 同源生成。
- 生成 TypeScript 客户端类型供 web console / attach 使用（opencode 的 contract-first 思路）。
- 事件：`EventStream` 统一 envelope（`{type, seq, sessionId, payload}`），SSE 与 WS 共用；
  Codex 风格的通知语义（无请求 id、单调 seq、断线重放 cursor）在 agent 侧先落地。
- `initialize`/`app.capabilities` 握手加入协议版本与能力集，客户端可按能力降级。

### P3 —— 加固与观测

- 请求超时/取消、body 上限、WS 心跳与背压；错误分类与指标（沿用 `x-gateway-error-type`）。
- 共享 health/metrics 接口：`/health`（liveness/readiness）、`/metrics`（Prometheus 文本）。
- 基准：路由匹配 O(1)（trie）、限流热路径、WS 广播；`npm run bench` 加入 kit。
- 文档：两个 gateway 的 README 明确「共享原语 / 域内专属」，避免后续再次分叉。

## 5. 依赖与发布

- `@tsdi/gateway-kit` 依赖：`@tsdi/ioc`、`@tsdi/common`、`@tsdi/security`，可选 `@tsdi/service`（限流实现复用）
  与 `@tsdi/logger`；禁止依赖 `@tsdi/agent`、`@tsdi/agent-gateway`、`@tsdi/gateway`、`@tsdi/http-microservice`。
- Node-only：不进入 web-entry / 浏览器 bundle；agent-ui 不引用。
- 版本与发布：纳入 `package-publish` gate；taskfile/tsconfig paths 同步；README + 变更日志。

## 6. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 两套服务器语义差异（node http vs Service/RequestContext） | kit 提供函数 + `RequestLike/ResponseLike` 适配器，不强制统一内核 |
| 错误/状态码行为变化影响 attach/web | 先加字段后切换；快照测试固定 404/401/429/CORS/OPTIONS |
| 限流多副本行为变化 | 默认内存 store（与现状一致），共享 store 显式开启 |
| 路由优先级变化改变命中 | 用同一份路由夹具对比旧/新匹配结果，差异清单评审后才合并 |
| 包依赖方向被破坏 | CI 检查 `gateway-kit` 依赖白名单；agents 包禁止引用 `@tsdi/gateway` |
| opencode/Codex 模式引入过度抽象 | 只提取已验证重复的 5 类原语；registry 仅覆盖已有路由/RPC |

## 7. 验收总表

- P0：agent-gateway 测试 + kit 单测 + agent-ui gate + bench。
- P1：gateway 140+ / http 199 / admin 72 / swagger 11 / contract 23。
- P2：capabilities 与 OpenAPI 由 registry 生成的一致性测试；客户端类型生成快照。
- P3：`/health`、`/metrics` 契约测试；路由/限流基准在预算内。

## 8. 未决问题

1. microservices gateway 是否最终迁移到 kit 提供的 node http 内核（当前建议：不迁移，保留 `HttpServer`）。
2. agent-gateway 的静态控制台是否继续由 gateway 服务，还是交给独立静态托管（影响 CORS/缓存策略）。
3. 共享限流默认策略：agent 当前 per-IP 600/min，microservices 按 route；统一默认值需产品确认。
4. `EventStream` 是否也用于 microservices webhook/SSE 推送（建议 P2 后评估）。
