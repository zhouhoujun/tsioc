# @tsdi/gateway-kit

Shared HTTP edge primitives for the two gateways in this repository:

- `@tsdi/agent-gateway` — Agent session BFF (JSON-RPC, SSE/WS, pairing, static console)
- `@tsdi/gateway` — Microservice edge proxy (upstream forwarding, discovery, retry, cache)

The kit owns the **generic edge concerns**; each gateway keeps its domain pipeline.
Node-only: it is not part of any browser entry point.

## Modules

| Module | Exports | Used by |
| --- | --- | --- |
| `router` | `GatewayRouter`, `GatewayRouteDefinition` | both gateways (specificity, `:param`/`*`, prefix mode, hosts/accept predicates, priority) |
| `rate-limit` | `GatewayRateLimiter`, `GatewayRateLimitPolicy`, `GatewayRateLimitStore` | both (window, `quota`, `throttle`, shared store for the simple window) |
| `error` | `GatewayErrorType`, `gatewayErrorTypeForStatus`, `gatewayErrorBody`, `sendGatewayError` | both (legacy `{ error }` and structured envelope shapes) |
| `cors` | `applyGatewayCorsHeaders`, `handleGatewayCorsPreflight` | agent gateway (microservice edge relies on ingress) |
| `static` | `serveGatewayStaticFile`, `resolveGatewayStaticPath`, `gatewayContentType` | agent gateway (console shell; traversal-safe) |
| `openapi` | `buildGatewayOpenApi` | both (agent adds `x-rpc-methods`) |
| `capabilities` | `GatewayCapabilityRegistry` | agent gateway (`app.capabilities`, typed method union) |
| `event-stream` | `GatewayEventStream`, `stringifyGatewayEvent` | agent gateway SSE (ids + `Last-Event-ID` replay); reusable by other hosts |

## Usage

```ts
import {
    GatewayRouter,
    GatewayRateLimiter,
    buildGatewayOpenApi,
    sendGatewayError
} from '@tsdi/gateway-kit';

const router = new GatewayRouter<Handler>()
    .add({ method: 'GET', path: '/api/users/:id', handler })
    .add({ method: 'GET', path: '/api/*', handler });

const matched = router.match('GET', '/api/users/42', { accept: () => true });
```

```ts
const limiter = new GatewayRateLimiter({ limit: 600, windowMs: 60_000 });
if (!limiter.check(ip).allowed) {
    sendGatewayError(res, 429, 'rate limit exceeded', {
        headers: { 'Retry-After': String(limiter.retryAfterSeconds(limiter.check(ip))) }
    });
}
```

## Boundaries

- **Do** add generic HTTP edge behavior here when both gateways need it.
- **Do not** import `@tsdi/agent*`, `@tsdi/http-microservice` or either gateway package here.
- **Do not** put gateway-specific domain logic (sessions/RPC handlers, upstream/proxy policy) in the kit.
- Wire formats are compatibility-sensitive: the error envelope and rate-limit headers keep their historical
  shapes; new fields are additive.

## Tests

```bash
cd packages/gateway-kit
npm test
```

Covers router specificity/prefix/hosts/predicates, limiter windows/quota/throttle/shared store,
error envelopes, CORS, static traversal safety, OpenAPI projection, capability registry and SSE replay.
