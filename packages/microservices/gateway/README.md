# @tsdi/gateway

Microservice API gateway for @tsdi/microservices with route forwarding, discovery, and rate limiting.

## Install

```bash
npm i @tsdi/gateway
```

## Use

API gateway with compiled route matching, rule engine, auth/API key/HMAC, rate
limiting, retries/failover, response cache/etag/compression, aggregation,
webhook dispatch and SLO diagnostics. Wire it with `useGateway(...)`; runtime
state is exposed through `GatewayRuntime`, and the admin API lives in
`@tsdi/microservice-admin`.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/gateway';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/gateway` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
