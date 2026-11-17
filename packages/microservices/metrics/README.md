# @tsdi/metrics

@tsdi/metrics is metrics monitoring module for microservice, with Prometheus exporter and HTTP request metrics interceptor

## Install

```bash
npm i @tsdi/metrics
```

## Use

Metrics collection with counters, gauges, histograms, Prometheus and OTLP
exporters, HTTP/client interceptors and `useMetrics(...)`. `recordDuration`
dual-emits `*_ms` and `*_seconds` during the unit migration window.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/metrics';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/metrics` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
