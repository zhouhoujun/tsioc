# @tsdi/amqp

AMQP protocol microservice transport implementation for @tsdi/microservices.

## Install

```bash
npm i @tsdi/amqp
```

## Use

```ts
import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useAmqpTransport } from '@tsdi/amqp';

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
            useAmqpTransport({ /* transport options, see src/server/options.ts */ })
        )
    ]
})
export class AppModule {}
```

Start it with `Application.run(AppModule)` from `@tsdi/core`.

## Options

Server options are typed in `src/server/options.ts`; client options are in
`src/client/options.ts` when the transport exposes a typed client. The package
entry point re-exports: `./server`, `./client`, `./amqp.module`.

### Delivery guarantees

Failed deliveries are retried through a TTL retry queue (`retry.maxAttempts`,
`retry.delayMs`) and then published to `deadLetterExchange` / `deadLetterQueue`.

For dedupe across redeliveries, set a stable id on publish and enable
idempotency:

```ts
useAmqpTransport({
    // publishers must set `messageId` (or the `x-tsdi-id` header)
    idempotency: { ttlMs: 5 * 60_000 }
});
```

Duplicates are acknowledged without running the handler. Only messages that
carry an id are deduplicated; the rest keep at-least-once semantics.

## Tests

```bash
npm test
```

Tests expect RabbitMQ on `amqp://127.0.0.1:5672` (set `url` in transport options).


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
