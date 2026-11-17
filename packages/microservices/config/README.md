# @tsdi/config

@tsdi/config is configuration management module for microservice, with multiple config sources and dynamic refresh

## Install

```bash
npm i @tsdi/config
```

## Use

Configuration manager with multiple sources, typed access and dynamic refresh.
Use `ConfigurationManager` plus the source helpers, or the configuration
manager gateway adapter to drive gateway hot reload.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/config';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/config` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
