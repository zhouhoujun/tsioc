# @tsdi/health

@tsdi/health is health check module for microservice, with health indicators and endpoints

## Install

```bash
npm i @tsdi/health
```

## Use

Health checks and readiness probes. Import `HealthModule`, declare
`HealthController`, and add indicators to expose `/health` and
`/health/readiness` (readiness returns 503 while a service is starting or
draining).

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/health';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/health` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
