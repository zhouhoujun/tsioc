# @tsdi/oidc-auth

Authentication microservice built on `@tsdi/security`, `@tsdi/service`,
`@tsdi/http-microservice` and `@tsdi/typeorm-adapter`.

It supports two authentication paths:

- **OIDC authorization-code login** against an external identity provider.
- **Local username/password login** with TypeORM-backed users.

Both paths issue local access / refresh / session JWTs, expose verification
and RFC 7662 style introspection endpoints, and can protect downstream
microservices with `OIDCAuthGuard`.

## Runtime

The runtime entrypoint is `src/app.ts`. It wires:

- `provideService(...)`
- `useRouter()`
- `useCookie()`
- `useHttpTransport(...)`
- `OIDCModule.withPersistence(...)`

By default the app uses a file-backed `sql.js` database
(`oidc-auth.sqlite`). Set `OIDC_DB_TYPE=postgres` (plus host/port/user/password
/database) for PostgreSQL.

## TypeORM persistence

```ts
import { OIDCModule } from '@tsdi/oidc-auth';
import { AuthUserEntity } from '@tsdi/oidc-auth';

@Module({
    imports: [
        OIDCModule.withPersistence({
            connection: {
                type: 'postgres',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: 'postgres',
                database: 'oidc_auth',
                synchronize: true,
                entities: [AuthUserEntity]
            },
            auth: {
                issuer: 'https://auth.example.com',
                clientId: '...',
                clientSecret: '...',
                jwt: { secret: process.env.JWT_SECRET }
            },
            allowRegistration: true
        })
    ],
    declarations: [AuthController]
})
export class AppModule {}
```

`AuthUserEntity` is appended automatically when a plain connection options
object is supplied. Local passwords are stored as scrypt hashes
(`scrypt$<salt>$<key>`), never in plain text.

Without `withPersistence(...)` the module falls back to an in-memory user
store, which is useful for tests but does not survive restarts.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/login` | Start the OIDC authorization-code flow |
| `GET` | `/auth/callback` | OIDC callback; persists/links the user and sets `oidc_session` |
| `POST` | `/auth/login` | Local login (`{ username, password }`) |
| `POST` | `/auth/register` | Local registration when enabled |
| `GET` | `/auth/userinfo` | Current user from bearer token or session cookie |
| `GET` | `/auth/session` | `{ authenticated, user? }` |
| `GET` | `/auth/verify` | Verify a bearer/session token; `401` when invalid |
| `POST` | `/auth/introspect` | RFC 7662 style introspection; invalid tokens return `active: false` |
| `POST` | `/auth/refresh` | Refresh a local refresh token or a provider refresh token |
| `GET` | `/auth/logout` | Clear auth cookies |
| `GET` | `/auth/.well-known/openid-configuration` | Discovery metadata |

Local login/register responses include `sessionToken`, `accessToken`,
`refreshToken`, `expiresIn`, `tokenType` and `user`.

## Token verification

Access, refresh and session tokens are all signed with the same HMAC secret
and issuer but carry different `typ` claims:

- `typ: "access"` — for API calls and `OIDCAuthGuard`.
- `typ: "refresh"` — only accepted by `/auth/refresh` / `refreshTokens()`.
- `typ: "session"` — browser session cookie.

`verifyAccessToken()` rejects session/refresh tokens. `verifyToken()` accepts
access/session/refresh tokens for generic introspection.

### Protecting downstream microservices

```ts
import { provideService, useGuards, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http';
import { OIDCAuthGuard, getOIDCAuthUser } from '@tsdi/oidc-auth';

provideService(
    useRouter(),
    useGuards(OIDCAuthGuard),
    useHttpTransport({ listenOpts: { port: 3001 }, asDefault: true })
);
```

The verified `SessionUser` is attached to the request context and can be read
with `getOIDCAuthUser(context)`.

## Environment

See `.env` for the full list. Important variables:

- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_CALLBACK_URL`
- `OIDC_SESSION_SECRET` / `JWT_SECRET` (token signing secret)
- `OIDC_ACCESS_TOKEN_EXPIRES_IN` (default `1h`)
- `OIDC_REFRESH_TOKEN_EXPIRES_IN` (default `7d`)
- `OIDC_SESSION_EXPIRES_IN` (default `24h`)
- `OIDC_ALLOW_REGISTRATION` (`true` to enable local registration)
- `OIDC_DB_TYPE`, `OIDC_DB_LOCATION`, `OIDC_DB_HOST`, `OIDC_DB_PORT`,
  `OIDC_DB_USERNAME`, `OIDC_DB_PASSWORD`, `OIDC_DB_NAME`

## Tests

Relevant runtime checks:

- `test/auth-controller.spec.ts`
- `test/app-runtime.spec.ts`
- `test/oidc-service.spec.ts`
- `test/local-auth.spec.ts`
- `test/typeorm-auth.spec.ts` (real TypeORM + HTTP runtime)
