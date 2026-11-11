# @tsdi/microservice-admin

Visual microservice management for `@tsdi/gateway`, built on two existing
surfaces:

- **`@tsdi/activities`** — the renderer-neutral visual workflow designer and
  workflow engine. Gateway rules are edited as a workflow (conditions → route /
  deny).
- **`@tsdi/components/html`** — browser UI. The admin shell is a component tree
  rendered by the HTML renderer; the rule canvas is the shared workflow designer.

## What it provides

- Editable live gateway route table.
- Visual rule editor with three contributed node types:
  - `gateway-condition` — match path / method / host / header / query.
  - `gateway-route` — forward to a service or static upstream.
  - `gateway-deny` — reject at the gateway with a status/message/body.
- Rule compiler (`compileGatewayRules`) that turns the workflow into
  `GatewayRuleOptions[]` (AND-combined conditions, `false` port negation).
- HTTP API (`/api/gateway-admin`) that applies routes/rules to the live
  `GatewayRuntime` immediately.
- Optional static UI feature (`useGatewayAdminUi`).

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
                }]
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
npm run build       # server-side package (AOT)
npm run build:web   # browser bundle -> web/main.js + web/chunks
npm test            # compiler, controller and jsdom UI regression
```

`web/preview-test.js` is a real-browser check (Playwright + Chromium system
libraries). It starts `web/serve.ts`, opens the console, applies a route, applies
the visual rules and verifies the live state.

## Security

The admin API mutates the live gateway. Mount it behind authentication and do not
expose `/api/gateway-admin` or the admin UI on a public interface without an
authorization layer.
