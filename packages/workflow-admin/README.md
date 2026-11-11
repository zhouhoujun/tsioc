# TSDI Workflow Admin

Standalone workflow administration console for `@tsdi/activities`. It packages
the visual designer, multi-document tabs, workflow library, SQLite-backed
storage and optional OAuth2/OIDC login in its own `packages/workflow-admin`
application.

The browser shell imports the visual designer entry only, so the initial bundle
contains the visual runtime, shared components/forms and the HTTP store — not
the server-side Activity library or protocol plugins.

## Features

- drag/click palette with 35 generic node types and component search,
- SVG-native canvas with pointer pan, `Ctrl` + wheel zoom-at-cursor, fit view,
  auto layout, grid snapping, click-to-connect and forgiving node-body drops,
- node inspector rendered by the JSON-configured shared `dynamic-form`
  (groups, conditional fields, radio options, validation, per-field reset),
- CodeMirror code editor loaded lazily only when a code field is opened, with
  JavaScript syntax highlighting and workflow-aware completions for
  `context` / `input` / `variables`, configured actions and variables
  (`Ctrl+Space` or automatically after `.`),
- the editor is isolated behind `@tsdi/activities/web`; Monaco can be substituted
  there if a host accepts its much larger lazy chunk,
- tabbed workflow documents: open multiple saved workflows, `+` creates a blank
  document, closing the active tab selects its neighbour, and the open-tab set
  is restored from localStorage on startup,
- workflow library, run history replay and execution log,
- autosave with `Saved / Unsaved / Saving / Save failed` state plus manual save,
- global shortcuts: `Ctrl+S` save, `Ctrl+O` library, `Ctrl+Enter` run,
  `Ctrl+Z/Y`, `Ctrl+D`, `Delete`, and `?` / `F1` shortcut sheet,
- light, dark, solarized and high-contrast themes selectable from the
  application menu's theme submenu; the workspace layout splitters, panes,
  scrollbars, node borders/ports and collapse handles follow the active theme,
  and theme/language persist across reloads,
- localized English / Chinese UI.

## Build

```bash
cd packages/workflow-admin
npm run build
```

Pipeline:

1. `emitAotProject` compiles the admin entry and every imported `@tsdi/*`
   package with the shared AOT transformer (decorator metadata and AOP lowering
   are emitted at build time).
2. esbuild tree-shakes, minifies, drops console/debugger output and emits
   `main.js` plus lazy chunks. CodeMirror and unused renderer branches are not
   part of the initial payload.
3. The build reports initial JS / gzip size and fails when the budget
   (`DESIGNER_JS_BUDGET` = 660000 bytes, `DESIGNER_GZIP_BUDGET` = 170000 bytes)
   is exceeded. The current build is about 629 KiB initial (164 KiB gzip) and
   248 KiB lazy (82 KiB gzip).

Use `SOURCE_MAP=1 npm run build` for linked source maps, or
`npm run build -- --dev` for an unminified development bundle.

## Run

```bash
cd packages/workflow-admin
npm start
# custom port:
npm run serve -- 8765
# open http://127.0.0.1:8765/

# persistent SQLite database and preinstalled protocol plugins
WORKFLOW_DB_FILE=/var/lib/tsdi/workflows.db WORKFLOW_PLUGINS=mqtt,redis npm start
```

## Authentication

Authentication is disabled by default. Enable it with environment variables or
the `auth` option passed to `startWorkflowAdminServer`.

### OAuth2 / external OIDC provider

```bash
WORKFLOW_ADMIN_AUTH_ENABLED=true \
WORKFLOW_ADMIN_OIDC_ISSUER=https://id.example.com \
WORKFLOW_ADMIN_OIDC_CLIENT_ID=workflow-admin \
WORKFLOW_ADMIN_OIDC_CLIENT_SECRET=... \
WORKFLOW_ADMIN_OIDC_AUTHORIZATION_URL=https://id.example.com/oauth2/authorize \
WORKFLOW_ADMIN_OIDC_TOKEN_URL=https://id.example.com/oauth2/token \
WORKFLOW_ADMIN_OIDC_PROFILE_URL=https://id.example.com/oauth2/userinfo \
WORKFLOW_ADMIN_OIDC_CALLBACK_URL=http://127.0.0.1:8765/auth/callback \
npm start
```

`startOidcService` (env `WORKFLOW_ADMIN_OIDC_SERVICE`, default `true`) controls
whether the admin mounts its own `/auth/*` login/callback/session endpoints.
Set it to `false` to verify bearer/session tokens issued by a separate
`@tsdi/oidc-auth` service sharing the same JWT secret/issuer; provide
`WORKFLOW_ADMIN_LOGIN_URL` for the external login page.

Local username/password login and registration are available through the same
service (`WORKFLOW_ADMIN_ALLOW_REGISTRATION=true` to enable registration). The
built-in local user store is in-memory; deploy `@tsdi/oidc-auth` as a separate
service when local identities must survive restarts.

Programmatic setup:

```typescript
import { startWorkflowAdminServer } from '@tsdi/workflow-admin';

await startWorkflowAdminServer({
    port: 8765,
    auth: {
        enabled: true,
        startOidcService: true,
        allowRegistration: true,
        clientId: 'workflow-admin',
        issuer: 'https://id.example.com',
        authorizationURL: 'https://id.example.com/oauth2/authorize',
        tokenURL: 'https://id.example.com/oauth2/token',
        profileURL: 'https://id.example.com/oauth2/userinfo',
        jwt: { secret: process.env.JWT_SECRET }
    }
});
```

`GET /auth/session` is used by the browser shell before boot. Unauthenticated
API calls return `401`; the UI redirects to `login.html` and back after login.

The server defaults to SQLite (`$WORKFLOW_DB_FILE`, then
`~/.tsdi-agent/workflows.db`). Plugin installations made through
`/api/plugins` are runtime state; use `WORKFLOW_PLUGINS` or
`startWorkflowHttpServer({ installPlugins })` to preinstall on every boot.

Served by `@tsdi/service` + `useHttpTransport`:

- `/` static designer
- `/api/workflows` workflow CRUD
- `/api/workflows/:id/run` execute a stored workflow
- `/api/workflows/:id/resume` resume from a checkpoint

The browser uses `HttpWorkflowDefinitionStore({ baseUrl: '/api' })`, so manual
save, autosave, library open and delete all go through the real HTTP service.

## Verify

```bash
cd packages/workflow-admin
npm test
# unit tests only:
npm run test:unit
# or after a build:
node preview-test.js
```

`preview-test.js` starts `serve.ts` (the real HTTP microservice), runs
the product shell in headless Chromium and checks:

- initial JS payload stays under budget and the CodeMirror chunk loads lazily,
- application menu, palette search and selection actions,
- the dynamic-form inspector, conditional fields and per-field reset,
- autosave persists edits through the HTTP store,
- keyboard shortcut sheet opens/closes,
- `Ctrl` + wheel zoom and plain wheel pan,
- Fit keeps every node in view,
- panes, splitters, collapse controls, connection drag/click, edge selection,
- save / run / logs / library through the HTTP API,
- tabs persist across reload and `+` creates/closes documents,
- theme persistence across reload,
- no browser console errors.

It writes the screenshot to `preview.png`.
