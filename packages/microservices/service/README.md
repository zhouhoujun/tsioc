# @tsdi/service

Service and microservice provider layer for `@tsdi/microservices`.
Provides routing, lifecycle, interceptors, guards, and transport wiring.

## Architecture

The service layer uses a single `RequestContext` as the request-scoped container.
Protocol capabilities are accessed through adapter token lookups:

```ts
import { RequestContext, StatusMessageAdapter, RestfulRequestAdapter } from '@tsdi/common';

function handle(ctx: RequestContext) {
  const statusAdapter = ctx.get(StatusMessageAdapter);
  const restAdapter = ctx.get(RestfulRequestAdapter);
  // ...
}
```

## Available features

All features are registered via `provideService(...)`:

| Feature | Description |
|---------|-------------|
| `useRouter()` | Enable route matching |
| `useCookie()` | Enable cookie parsing/setting |
| `useSession()` | Enable server-side sessions |
| `useBodyParser()` | Enable body parsing |
| `useJson()` | Enable JSON response formatting |
| `useCors()` | Enable CORS headers |
| `useAuth()` | Enable security (bearer/JWT) |
| `useInterceptors()` | Register request interceptors |
| `useGuards()` | Register authorization guards |
| `useRegistration()` | Register/deregister with service discovery |
| `useHealth()` | Report health to discovery |
| `useGracefulShutdown()` | Readiness drain + graceful shutdown |

```ts
provideService(
  useRouter(),
  useCookie(),
  useAuth({ bearerToken: 'secret' }),
  useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
)
```

## Parameter resolution

Controller method parameters are resolved through the `MessageValueReader` abstraction:

- `@RequestBody()` — reads from request body
- `@RequestParam()` — reads from query string
- `@RequestPath()` — reads from path parameters
- `@RequestHeader()` — reads from request headers
- `@Inject(AdapterType)` — resolves an adapter from the request context

```ts
@Controller('/api')
class MyController {
  @Post('/items')
  create(@RequestBody() body: ItemDto): Observable<Item> { ... }

  @Get('/items/:id')
  get(@RequestPath('id') id: string): Observable<Item> { ... }
}
```

## MessageValueReader

The default `ServiceMessageValueReader` (registered via `provideService`) reads scoped parameter values through the transport's `MessageAdapter`. Custom readers can be registered by implementing the abstract `MessageValueReader` class from `@tsdi/core`.

## Lifecycle and graceful shutdown

`provideService(useFeatures())` enables registration, health and graceful
shutdown by default. Startup order is `listen → register → health`; if any step
fails the service rolls back (`health stop → deregister → onShutdown`) and the
original error is rethrown.

`close()` runs `readiness DRAINING → health DOWN → deregister → grace period →
in-flight drain → onShutdown → handler destroy`. Each step is attempted even if
an earlier one fails; the first error is rethrown at the end.

```ts
provideService(
  useRouter(),
  useGracefulShutdown({
    waitDuration: 5000,      // let the registry/LB observe DOWN first
    drainTimeoutMs: 15000,   // deadline for in-flight requests (overrides timeout)
    enabled: true
  }),
  useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
)
```

- `InFlightTracker` + `InFlightInterceptor` are registered by the feature; the
  tracker counts real subscriptions, so streaming responses are drained too.
- `ReadinessStateService` (`STARTING|UP|DRAINING|DOWN`) is provided by
  `provideService`; `HealthController` returns `503` with
  `components.lifecycle` while the phase is not `UP`.

## ConsumerRuntime

Broker servers use `ConsumerRuntime` for per-message lifecycle:

```ts
const runtime = new ConsumerRuntime({
  concurrency: 4,                                   // <=0 or omitted = unlimited
  retry: { maxAttempts: 3, delayMs: 100, maxDelayMs: 2000 },
  idempotency: { ttlMs: 5 * 60_000 }                // opt-in dedupe by message.id
});

await runtime.handle({
  id: 'topic:0:42',                                 // stable delivery identity
  payload,
  ack: () => commit(),                              // success settlement
  fail: (err, attempts) => republishToDlq(err)      // retry budget exhausted
}, async message => {
  await handle(message.payload);
});

runtime.close();                                    // reject new deliveries
await runtime.drain(5_000);                         // wait for running/queued work
```

`runtime.stats()` reports `completed`, `failed`, `retried`, `duplicates`,
`inFlight` and `peakInFlight`; broker servers log a drained summary on shutdown.

Idempotency is opt-in: without a store, duplicates run again (at-least-once).
The default `MemoryIdempotencyStore` is bounded and process-local; pass a shared
`idempotency.store` when replicas can see the same redelivery. A failed handler
releases its reservation so the next delivery can retry.
