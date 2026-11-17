# @tsdi/client

Microservice client with Spring Cloud-style features. base on AOP, Ioc container, via @tsdi/core.

## Install

```bash
npm i @tsdi/client
```

## Use

`provideClient` / `withDiscovery` / `withLoadBalance` / `withCircuitBreaker` /
`withRetry` / `withTimeout` build the transport-agnostic client pipeline used by
every protocol package. `AbstractClient` exposes `send(pattern, options)` and
normalizes transport errors into `ServiceError`.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/client';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/client` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
