# @tsdi/grpc

gRPC protocol microservice transport implementation for @tsdi/microservices.

## Install

```bash
npm i @tsdi/grpc
```

## Use

```ts
import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useGrpcTransport } from '@tsdi/grpc';

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
            useGrpcTransport({ /* transport options, see src/server/options.ts */ })
        )
    ]
})
export class AppModule {}
```

Start it with `Application.run(AppModule)` from `@tsdi/core`.

## Options

Server options are typed in `src/server/options.ts`; client options are in
`src/client/options.ts` when the transport exposes a typed client. The package
entry point re-exports: `./server`, `./client`, `./grpc.module`.

## Tests

```bash
npm test
```

Tests expect A gRPC endpoint such as `127.0.0.1:50051` when calling a remote service.


## Related

- Runnable examples: `packages/microservices/examples` in the repository.
- Improvement plan and operational notes: `packages/microservices/IMPROVEMENT-PLAN.md`,
  `packages/microservices/OPTIMIZATION.md`.
