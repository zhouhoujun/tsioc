# @tsdi/kafka

Kafka protocol microservice transport implementation for @tsdi/microservices.

## Install

```bash
npm i @tsdi/kafka
```

## Use

```ts
import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useKafkaTransport } from '@tsdi/kafka';

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
            useKafkaTransport({ /* transport options, see src/server/options.ts */ })
        )
    ]
})
export class AppModule {}
```

Start it with `Application.run(AppModule)` from `@tsdi/core`.

## Options

Server options are typed in `src/server/options.ts`; client options are in
`src/client/options.ts` when the transport exposes a typed client. The package
entry point re-exports: `./server`, `./client`, `./kafka.module`.

### Delivery guarantees

`delivery: 'at-least-once'` disables kafkajs auto-commit and commits the offset
only after the handler succeeds (or the message is dead-lettered).

Because a crash can happen after a side effect but before the commit, enable
idempotency to skip redelivered offsets:

```ts
useKafkaTransport({
    delivery: 'at-least-once',
    idempotency: { ttlMs: 5 * 60_000, maxEntries: 10_000 }
});
```

The default in-memory store is process-local; provide a shared
`ConsumerIdempotencyStore` (`idempotency.store`) when multiple replicas may see
the same redelivery. Reservations are released when handling fails so the next
redelivery can retry.

## Tests

```bash
npm test
```

Tests expect Kafka brokers on `127.0.0.1:9092` (override with `TSIO_TEST_KAFKA_BROKERS` for tests).


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
