# @tsdi/redis

Redis protocol microservice transport implementation for @tsdi/microservices.

## Install

```bash
npm i @tsdi/redis
```

## Use

```ts
import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useRedisTransport } from '@tsdi/redis';

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
            useRedisTransport({ /* transport options, see src/server/options.ts */ })
        )
    ]
})
export class AppModule {}
```

Start it with `Application.run(AppModule)` from `@tsdi/core`.

## Options

Server options are typed in `src/server/options.ts`; client options are in
`src/client/options.ts` when the transport exposes a typed client. The package
entry point re-exports: `./server`, `./client`, `./redis.module`.

### Delivery modes

`delivery: 'stream'` (opt-in) consumes microservice events from a Redis Stream
consumer group instead of pub/sub:

```ts
useRedisTransport({
    delivery: 'stream',
    streamKey: 'tsdi:stream',
    group: 'orders-service',
    claimIdleMs: 60_000
});
```

- Server: `XGROUP CREATE ... MKSTREAM`, `XREADGROUP`, `XACK` on success; failed
  entries stay pending and are reclaimed with `XAUTOCLAIM` after `claimIdleMs`.
- Client: `withRedisTransport({ delivery: 'stream', streamKey })` publishes
  `observe: 'events'` messages with `XADD`.
- Request/response still uses pub/sub reply channels; wildcard routing is
  unchanged.
- Default remains `pubsub` (at-most-once).

## Tests

```bash
npm test
```

Tests expect Redis on `redis://127.0.0.1:6379`.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
