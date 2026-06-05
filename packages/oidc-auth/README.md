# @tsdi/oidc-auth

OIDC authentication demo/runtime built on the shared `@tsdi/security` modules and the microservice HTTP runtime.

## Runtime

The runtime entrypoint is `src/app.ts`.
It wires:
- `provideService(...)`
- `useRouter()`
- `useCookie()`
- `useHttpTransport(...)`
- `OIDCModule`

## Controller contract

`AuthController` should be treated as an HTTP request handler that receives a `RestfulRequestContext`.
The controller uses the adapter-backed context for:
- cookies (`oidc_state`, `oidc_nonce`, `oidc_session`)
- secure flag
- request headers
- response status for error cases

## RequestContext / adapter usage

The current microservice model is:

- `RequestContext` is the container
- `MessageAdapter` / `StatusMessageAdapter` / `RestfulRequestAdapter` carry protocol-specific behavior
- `AuthController` should operate on the adapter-capable context, not a custom request-context inheritance tree

## Example

```ts
import { Application } from '@tsdi/core';
import { AppModule } from './src/app';

await Application.run(AppModule);
```

## Tests

The most relevant runtime checks are in:
- `test/auth-controller.spec.ts`
- `test/app-runtime.spec.ts`
- `test/oidc-service.spec.ts`
