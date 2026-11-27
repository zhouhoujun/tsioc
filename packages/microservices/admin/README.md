# @tsdi/microservice-admin

Visual microservice management for `@tsdi/gateway`, built on two existing
surfaces:

- **`@tsdi/activities`** — the renderer-neutral visual workflow designer and
  workflow engine. Gateway rules are edited as a workflow (conditions → route /
  deny).
- **`@tsdi/components/html`** — browser UI. The admin shell is a component tree
  rendered by the HTML renderer; the rule canvas is the shared workflow designer.

## What it provides

- Light/dark theme and EN/中文 language switch in the global top-right `menu-bar` (shared @tsdi/components/common component).
- Editable live gateway route table.
- Visual rule editor with three contributed node types:
  - `gateway-condition` — match path / method / host / header / query.
  - `gateway-route` — forward to a service or static upstream.
  - `gateway-deny` — reject at the gateway with a status/message/body.
- Rule compiler (`compileGatewayRules`) that turns the workflow into
  `GatewayRuleOptions[]` (AND-combined conditions, `false` port negation).
- HTTP API (`/api/gateway-admin`) that applies routes/rules to the live
  `GatewayRuntime` immediately, plus `GET /api/gateway-admin/openapi` for the
  OpenAPI document generated from the compiled route table.
- Optional static UI feature (`useGatewayAdminUi`).

## Start a standalone server

The package is embeddable, but it also ships a standalone entry for local
management/preview:

```bash
cd packages/microservices/admin

# build the browser bundle, then serve (default: http://127.0.0.1:4318/admin/)
npm run start

# serve without rebuilding the browser bundle
npm run serve

# custom host/port/prefix and seeded routes
npm run start -- --port 8080 --host 0.0.0.0 --prefix /admin --routes routes.json

# API only (no static UI)
npm run start -- --no-ui
```

`serve` is an alias for `start`.

Environment variables:

| Variable | Default |
|---|---|
| `GATEWAY_ADMIN_PORT` | `4318` |
| `GATEWAY_ADMIN_HOST` | `127.0.0.1` |
| `GATEWAY_ADMIN_PREFIX` | `/admin` |
| `GATEWAY_ADMIN_UI_ROOT` | nearest `./web` with `index.html` |
| `GATEWAY_ADMIN_ROUTES` | JSON routes file |

Routes file format: a route array, or `{ "routes": [...] }`.

Programmatic startup:

```ts
import { startGatewayAdminServer } from '@tsdi/microservice-admin';

const ctx = await startGatewayAdminServer({
    port: 8080,
    prefix: '/admin',
    uiRoot: path.join(__dirname, 'admin-ui'),
    routes: [{ path: '/api', service: 'backend-service' }]
});
```

> A standalone process owns its own `GatewayRuntime`. To apply changes to a
> running gateway, declare `GatewayAdminController` in that gateway module (see
> the next section) instead of using the standalone entry.

## Gateway integration

```ts
import * as path from 'node:path';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { useGateway } from '@tsdi/gateway';
import {
    GatewayAdminController,
    GatewayAdminModule,
    useGatewayAdminUi
} from '@tsdi/microservice-admin';

@Module({
    imports: [LoggerModule, GatewayAdminModule],
    // Controllers are resolved against the module that owns the HTTP transport.
    declarations: [GatewayAdminController],
    providers: [
        provideService(
            useRouter(),
            useJson(),
            useGateway({
                routes: [{
                    path: '/api',
                    service: 'backend-service',
                    targetUrl: 'http://127.0.0.1:3001',
                    stripPrefix: true
                }],
                // Keep the co-hosted admin API/UI local: otherwise `/api`
                // forwards `/api/gateway-admin/*` upstream and its 401/403
                // leaks to the console.
                excludePaths: ['/api/gateway-admin', '/admin']
            }),
            useGatewayAdminUi({
                root: path.join(__dirname, 'admin-ui'),
                prefix: '/admin'
            }),
            useHttpTransport({
                listenOpts: { host: '0.0.0.0', port: 8080 },
                asDefault: true
            })
        )
    ]
})
export class AppModule {}
```

`admin-ui` is the output of `npm run build:web` (`web/index.html`,
`web/main.js`, `web/chunks/**`).

> If a gateway route is a broad prefix (for example `/api`), add the admin API
> and UI prefixes to `excludePaths` as shown above. Otherwise the gateway
> forwards `/api/gateway-admin/*` to the upstream service, so a backend `401`
> or `403` can look like an admin authentication failure even when admin auth
> is disabled. The standalone `startGatewayAdminServer()` entry does this
> automatically.

## Authentication (OIDC)

The admin API is open by default for local development. Production deployments
should enable OIDC:

```ts
import { startGatewayAdminServer } from '@tsdi/microservice-admin';

await startGatewayAdminServer({
    port: 8080,
    uiRoot: path.join(__dirname, 'admin-ui'),
    auth: {
        mode: 'oidc',
        issuer: 'https://login.example.com',
        clientId: 'gateway-admin',
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        sessionSecret: process.env.GATEWAY_ADMIN_SESSION_SECRET,
        redirectUri: 'https://gateway.example.com/admin/oidc/callback',
        allowedDomains: ['example.com'],
        requiredGroups: ['gateway-admins']
    }
});
```

What is protected:

- `/api/gateway-admin/*` requires a valid signed session cookie and returns
  `401` without one.
- `/admin/*` stays loadable so the browser can render the sign-in page.
- `/admin/auth/login`, `/admin/oidc/callback` and `/admin/auth/logout` implement
  authorization-code + PKCE with state/nonce validation.
- The UI shows a sign-in screen on `401` and a “Sign out” action when SSO is on.


### Auth modes

| `auth.mode` | Meaning |
|---|---|
| `none` | No login; local/development use. |
| `oidc` | Admin is an OIDC client of an external IdP (Keycloak, Entra, Auth0, ...). |
| `oauth2` | Admin is an OAuth2 authorization-code client; userinfo is read from the profile endpoint (no ID token/JWKS). |
| `service` | Admin accepts session/access JWTs issued by a **separate** `@tsdi/oidc-auth` service. |

`service` mode verifies the `oidc_session` cookie (or `Authorization: Bearer`)
with the shared `sessionSecret`/`sessionIssuer`. The `@tsdi/oidc-auth` service is
a separate process. It can be started manually:

```bash
# separate process, separate workspace/db
cd packages/oidc-auth
npm run start
```

or launched as a child of the admin process when explicitly enabled:

```json
{
  "auth": {
    "mode": "service",
    "sessionSecret": "shared-secret",
    "sessionIssuer": "tsioc-oidc-auth"
  },
  "oidcService": {
    "enabled": true,
    "host": "127.0.0.1",
    "port": 3000,
    "env": { "OIDC_DB_LOCATION": "./oidc-auth.sqlite" }
  }
}
```

```bash
npm run start -- --config gateway-admin.json
# or
GATEWAY_ADMIN_SESSION_SECRET=shared-secret \
  npm run start -- --auth service --oidc-service --oidc-service-port 3000
```

The launcher waits for
`/auth/.well-known/openid-configuration` before starting the admin and stops the
child process on admin exit. It launches the existing package; it does not embed
the auth endpoints into the admin server.

```json
{
  "auth": {
    "mode": "service",
    "authServiceUrl": "http://127.0.0.1:3000",
    "sessionSecret": "shared-with-oidc-auth",
    "sessionIssuer": "tsioc-oidc-auth",
    "loginUrl": "http://127.0.0.1:3000/auth/login",
    "requiredRoles": ["gateway-admins"]
  }
}
```

In `service` mode the admin only mounts a login redirect to `loginUrl` and a
logout redirect to `logoutUrl` (default `<authServiceUrl>/auth/logout`); it does
not host authorization/token endpoints or manage users. `@tsdi/oidc-auth`
exposes `/auth/login` as a JSON `{ url }` response, so point `loginUrl` at a
small login page (or reverse-proxy route) that redirects to that URL; the local
auth service and its database are started as a separate process.

The provider is configurable. `provider: 'oidc'` (default) uses issuer discovery;
an explicit endpoint object is also supported for non-standard providers:

```ts
auth: {
    mode: 'oidc',
    provider: {
        issuer: 'https://idp.example',
        authorizationEndpoint: 'https://idp.example/authorize',
        tokenEndpoint: 'https://idp.example/token',
        jwksUri: 'https://idp.example/jwks',
        userinfoEndpoint: 'https://idp.example/userinfo'
    },
    clientId: 'gateway-admin',
    clientSecret: '...',
    sessionSecret: '...'
}
```

OAuth2 mode config:

```ts
auth: {
    mode: 'oauth2',
    authorizationURL: 'https://idp.example/oauth/authorize',
    tokenURL: 'https://idp.example/oauth/token',
    profileURL: 'https://idp.example/oauth/userinfo',
    clientId: 'gateway-admin',
    clientSecret: '...',
    sessionSecret: '...',
    scopes: ['profile', 'email'],
    pkce: true
}
```

OIDC uses discovery (`/.well-known/openid-configuration`) unless explicit
endpoints are supplied, verifies the ID token
signature via JWKS (issuer/audience/nonce/exp), then optionally checks
`allowedEmails`, `allowedDomains`, `requiredGroups` and `requiredClaims`.
The session is an HMAC-signed HttpOnly cookie; configure a stable
`sessionSecret` so sessions survive restarts.

CLI/environment:

```bash
GATEWAY_ADMIN_AUTH=oidc \
GATEWAY_ADMIN_OIDC_ISSUER=https://login.example.com \
GATEWAY_ADMIN_OIDC_CLIENT_ID=gateway-admin \
GATEWAY_ADMIN_OIDC_CLIENT_SECRET=... \
GATEWAY_ADMIN_SESSION_SECRET=... \
GATEWAY_ADMIN_OIDC_REDIRECT_URI=https://gateway.example.com/admin/oidc/callback \
npm run start -- --auth oidc

# OAuth2
GATEWAY_ADMIN_AUTH=oauth2 \
GATEWAY_ADMIN_OAUTH2_AUTHORIZATION_URL=https://idp.example/oauth/authorize \
GATEWAY_ADMIN_OAUTH2_TOKEN_URL=https://idp.example/oauth/token \
GATEWAY_ADMIN_OAUTH2_PROFILE_URL=https://idp.example/oauth/userinfo \
GATEWAY_ADMIN_OAUTH2_CLIENT_ID=gateway-admin \
GATEWAY_ADMIN_OAUTH2_CLIENT_SECRET=... \
GATEWAY_ADMIN_SESSION_SECRET=... \
npm run start -- --auth oauth2
```

Or keep everything in a JSON config file (relative `uiRoot` resolves from the
config directory):

```json
{
  "host": "0.0.0.0",
  "port": 8080,
  "prefix": "/admin",
  "uiRoot": "./admin-ui",
  "routes": [{ "path": "/api", "service": "backend-service" }],
  "auth": {
    "mode": "oidc",
    "provider": "oidc",
    "issuer": "https://login.example.com",
    "clientId": "gateway-admin",
    "clientSecret": "replace-me",
    "sessionSecret": "replace-me",
    "allowedDomains": ["example.com"]
  }
}
```

```bash
npm run start -- --config gateway-admin.json
# toggle auth off explicitly
npm run start -- --config gateway-admin.json --auth none
```

Precedence: config file < environment variables < CLI flags. Set
`"auth": false` (or `--auth none`) to keep the admin open without OIDC.

Logout clears the local session cookie. Provider-side single logout depends on
the IdP's `end_session_endpoint` and is not invoked automatically.

## Theme and language

The admin ships with light/dark themes and English/Simplified Chinese UI copy.
The controls live in the top-right header and persist in `localStorage`:

- `tsdi-gateway-admin-theme`: `light` | `dark`
- `tsdi-gateway-admin-locale`: `en` | `zh-CN`

The embedded workflow designer receives the same `theme` and `locale`, so its
toolbar, palette, inspector and status bar follow the admin shell.

## Routing and HTTP

- The browser entry (`web/main.ts`) bootstraps `GatewayAdminAppComponent`, an
  Angular-style root component whose template is only `<router-outlet>`.
  `web/admin.module.ts` registers the root routes; the app component keeps the
  browser hash (`#/dashboard`, `#/routes`, `#/rules`) in sync with the router.
- The protected route table is loaded lazily via `loadChildren` from
  `admin.routes`; every page declares `loadComponent`, so the router resolves
  and creates the registered page component only after navigation succeeds.
  Lazy route modules are separate browser chunks and are cached after the first
  navigation.
- `GatewayAdminAuthGuard` implements `CanActivate` on the authenticated parent
  route. Because protected components are created by the outlet *after* guards
  pass, an unauthenticated request never mounts the dashboard; a `401` redirects
  to `/admin/login.html?redirect=<current-url>` first.
- The route table supports inline enable/disable, ordering (move up/down),
  duplicate and edit actions. Edits are staged locally (with an unsaved
  indicator) and validated before applying: path format, service/target
  requirement, target URL scheme, timeout range, HTTP methods and duplicate
  path+method combinations.
- The rules page lists saved visual rule workflows and lets operators create a
  new workflow, reopen, apply or delete one; applying a rule workflow compiles
  it and updates the live gateway.
- The overview dashboard lists discovered services with their endpoints
  (address/status) from `GET /api/gateway-admin/services`, summarizes staged
  routes and
  gateway policy usage, plus the active authentication mode.
- The route table can export/import route JSON, reset to the static gateway
  configuration, and open a read-only detail view with the effective route JSON.
- The routes page includes a route matcher: enter a method and path to preview
  which rule or route the live gateway would select, including target service,
  upstream and method filters, without forwarding the request.
- `GatewayAdminHttp` wraps `@tsdi/common/http` (`provideHttpClient(withFetch())`)
  for state/routes/rules calls, including cookies and typed status handling.
- A shared HTTP interceptor (`adminUnauthorizedInterceptor`) redirects to the
  login page as soon as any admin API returns `401`, not only on navigation.
- Authentication is delegated to the unified auth service; the gateway does
  **not** expose an auth/session API. In `service` mode the server exchanges the
  OAuth token for user information through `<authServiceUrl>/auth/userinfo`
  (override with `auth.userInfoUrl`) with a short 30s cache.
- The admin server gates the HTML entry (`<prefix>/` and `<prefix>/index.html`):
  a missing token or empty userinfo responds `302` to
  `<prefix>/login.html?redirect=<return-url>`, so the SPA is never served to an
  unauthenticated browser. When authorized, the resolved user is injected into
  `index.html` as `window.__TSDI_ADMIN_SESSION__`, and the route guard reads
  that bootstrapped session instead of calling an HTTP session endpoint.
- Protected API calls still return `401` when the session expires; the HTTP
  interceptor redirects to the same login page.
- The login page links to `/admin/auth/login`, which starts OIDC, OAuth2 or the
  external auth-service login flow according to `auth.mode`.

## HTTP API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/gateway-admin/state` | current routes, compiled rules, services, dynamic options |
| `PUT` | `/api/gateway-admin/routes` | replace live routes (`{ routes: [...] }`) |
| `DELETE` | `/api/gateway-admin/routes` | reset routes to the static gateway options |
| `GET` | `/api/gateway-admin/rules` | list saved rule workflows |
| `GET` | `/api/gateway-admin/rules/:id` | load one rule workflow |
| `PUT` | `/api/gateway-admin/rules/:id` | save + compile + apply a workflow |
| `POST` | `/api/gateway-admin/rules/:id/apply` | recompile a saved workflow |
| `POST` | `/api/gateway-admin/rules/apply` | compile a body without saving |
| `DELETE` | `/api/gateway-admin/rules/:id` | remove a saved workflow |

The default store is in-memory. Provide `GATEWAY_RULES_STORE` with a persistent
`WorkflowDefinitionStore` (for example a SQLite-backed store) to survive
restarts.

## Visual rule semantics

- A rule is generated for every `gateway-route` / `gateway-deny` leaf.
- Conditions on the path from `start` to the leaf are combined with AND.
- The `false` port negates the preceding condition (`equals` → `not-equals`,
  `prefix` → `not-prefix`, `exists` → `not-exists`).
- Rule priority is the node's `priority` field, otherwise traversal order.
- Rules run before the regular route table.

## Build

```bash
npm run build       # server-side package (AOT, includes src/main.ts)
npm run build:web   # browser bundle -> web/main.js + web/chunks
npm run start       # standalone service (ts-node, source checkout)
npm test            # compiler, controller, standalone server and jsdom UI
```

For a compiled package with published `@tsdi` dependencies:

```bash
npm run build
node ../../dist/microservice-admin/main.js --port 4318 --ui-root web
```

`web/preview-test.js` is a real-browser check (Playwright + Chromium system
libraries). It starts `web/serve.ts`, opens the console, applies a route, applies
the visual rules and verifies the live state.

## Security

The admin API mutates the live gateway. Keep OIDC enabled in production, restrict
`allowedEmails`/`allowedDomains`/`requiredGroups`, and terminate TLS in front of
the admin service so the session cookie is marked `Secure`.
