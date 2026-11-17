# @tsdi/nats

NATS protocol microservice transport implementation for @tsdi/microservices.

## Install

```bash
npm i @tsdi/nats
```

## Use

```ts
import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useNatsTransport } from '@tsdi/nats';

@Controller('/hello')
class HelloController {
    @Get('/')
    hello() {
        return { ok: true };
    }
}

@Module({
    declarations: [HelloController],
    providers: [
        provideService(
            useRouter(),
            useNatsTransport({ /* transport options, see src/server/options.ts */ })
        )
    ]
})
export class AppModule {}
```

Start it with `Application.run(AppModule)` from `@tsdi/core`.

## Options

Server options are typed in `src/server/options.ts`; client options are in
`src/client/options.ts` when the transport exposes a typed client. The package
entry point re-exports: `./server`, `./client`, `./nats.module`.

## Tests

```bash
npm test
```

Tests expect A NATS server on `nats://127.0.0.1:4222`.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
