# @tsdi/tracing

@tsdi/tracing is distributed tracing module for microservice, with span management and trace context propagation

## Install

```bash
npm i @tsdi/tracing
```

## Use

Distributed tracing with W3C `traceparent` propagation, `AsyncLocalStorage`
scope isolation, HTTP/broker carrier codecs and OTLP export. Wire it with
`useTracing({ serviceName, sampleRate })`.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/tracing';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/tracing` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
