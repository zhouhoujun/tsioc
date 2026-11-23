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

### Delivery guarantees

`delivery: 'jetstream'` (opt-in) consumes event subjects from a durable
JetStream consumer:

```ts
useNatsTransport({
    delivery: 'jetstream',
    stream: 'TSDI',
    jetstreamSubject: 'orders.>',
    durable: 'orders-service',
    maxDeliver: 5,
    ackWaitMs: 30_000
});
```

- The server creates the stream when missing, `ack()`s on success and `nak()`s
  failures; after `maxDeliver` it `term()`s (or publishes to
  `deadLetterSubject` when configured).
- `withNatsTransport({ delivery: 'jetstream' })` publishes
  `observe: 'events'` messages with `js.publish`; request/response stays on core
  NATS.
- The event subject is consumed only through JetStream (the core subscription
  is skipped, so handlers do not run twice).
- Default remains `core` (at-most-once). The broker must run with `-js`.

## Tests

```bash
npm test
```

Tests expect A NATS server on `nats://127.0.0.1:4222`.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
