# @tsdi/mqtt

MQTT protocol microservice transport implementation for @tsdi/microservices.

## Install

```bash
npm i @tsdi/mqtt
```

## Use

```ts
import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useMqttTransport } from '@tsdi/mqtt';

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
            useMqttTransport({ /* transport options, see src/server/options.ts */ })
        )
    ]
})
export class AppModule {}
```

Start it with `Application.run(AppModule)` from `@tsdi/core`.

## Options

Server options are typed in `src/server/options.ts`; client options are in
`src/client/options.ts` when the transport exposes a typed client. The package
entry point re-exports: `./server`, `./client`, `./mqtt.module`.

## Tests

```bash
npm test
```

Tests expect An MQTT broker on `mqtt://127.0.0.1:1883`.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
