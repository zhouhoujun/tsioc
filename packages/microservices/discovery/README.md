# @tsdi/discovery

@tsdi/discovery is service discovery module for microservice, with registration and discovery capabilities

## Install

```bash
npm i @tsdi/discovery
```

## Use

Service discovery and load balancing: `InMemoryServiceDiscovery` for tests/dev and
Consul, Nacos, Eureka and Kubernetes providers (`useConsulDiscovery`,
`useNacosDiscovery`, `useEurekaDiscovery`, `useKubernetesDiscovery`). The shared
`EndpointSelection` implementation is reused by clients and the gateway.

The package entry point (`src/index.ts`) re-exports the public classes, decorators
and helpers described above.

```ts
// Import the public API from the package entry point.
import * as api from '@tsdi/discovery';
```

## Tests

```bash
npm test
```

Run from `packages/microservices/discovery` so the shared `tsconfig` paths resolve.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
