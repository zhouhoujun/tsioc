# @tsdi/mime

Microservice transport mime.

## Install

```bash
npm i @tsdi/mime
```

## Use

MIME type helpers used by HTTP content negotiation and message adapters.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/mime';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/mime` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
