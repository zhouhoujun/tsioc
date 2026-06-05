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
