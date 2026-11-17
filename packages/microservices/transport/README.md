# @tsdi/transport

Microservice transport with Spring Cloud-style features. base on AOP, Ioc container, via @tsdi/core.

## Install

```bash
npm i @tsdi/transport
```

## Use

Shared transport primitives: sockets, packet IDs, message transfer context and
interceptors used by the protocol packages. Most applications use a concrete
transport (`@tsdi/http-microservice`, `@tsdi/kafka`, ...) instead of this package
directly.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/transport';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/transport` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
