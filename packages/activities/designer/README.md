# TSDI Workflow Designer

Browser product shell for the visual workflow designer in `@tsdi/activities`.
It runs on the framework's own HTTP microservice and is built with the
framework's TypeScript/ESM pipeline.

The shell imports the package's visual designer entry so the browser build only
pulls the visual runtime, shared component/form layers and the HTTP store — not
the full server-side Activity library.

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
- workflow library, run history replay and execution log,
- autosave with `Saved / Unsaved / Saving / Save failed` state plus manual save,
- global shortcuts: `Ctrl+S` save, `Ctrl+O` library, `Ctrl+Enter` run,
  `Ctrl+Z/Y`, `Ctrl+D`, `Delete`, and `?` / `F1` shortcut sheet,
- light, dark, solarized and high-contrast themes selectable from the
  application menu's theme submenu; the workspace layout splitters, panes and
  collapse handles follow the active theme, and theme/language persist across
  reloads,
- localized English / Chinese UI.

## Build

```bash
cd packages/activities
npm run designer:build
```

Pipeline:

1. TypeScript emits the designer and every imported `@tsdi/*` package as ES
   modules. The `createDecoratorPrecompileTransformer` pass:
   - batches every class/member/parameter decorator into one
     `applyPrecompiledDecorators` call per class instead of emitting the
     `__decorate` helper chain,
   - emits the equivalent `design:type` / `design:paramtypes` metadata itself,
   - lowers `@Aspect` / `@Before` / `@Around` / ... into
     `registerPrecompiledAspect`, so AOP aspects and advices are registered
     without running AOP decorator factories at startup.
2. The AOP compile pass scans `@Aspect` classes and writes
   `designer/aop-manifest.json` (pointcuts, advices, JoinPoint parameters) for
   diagnostics and tooling.
3. esbuild tree-shakes, minifies, drops console/debugger output and emits
   `main.js` plus lazy chunks. CodeMirror and unused renderer branches are not
   part of the initial payload.
4. The build reports initial JS / gzip size and fails when the budget
   (`DESIGNER_JS_BUDGET` = 640000 bytes, `DESIGNER_GZIP_BUDGET` = 170000 bytes)
   is exceeded. The current product build is about 598 KiB initial
   (151 KiB gzip) and 248 KiB lazy (82 KiB gzip).

Use `SOURCE_MAP=1 npm run designer:build` for linked source maps, or
`npm run designer:build -- --dev` for an unminified development bundle.

## Run

```bash
cd packages/activities
npm run designer
# custom port:
npm run designer -- 8765
# open http://127.0.0.1:8765/
```

Served by `@tsdi/service` + `useHttpTransport`:

- `/` static designer
- `/api/workflows` workflow CRUD
- `/api/workflows/:id/run` execute a stored workflow
- `/api/workflows/:id/resume` resume from a checkpoint

The browser uses `HttpWorkflowDefinitionStore({ baseUrl: '/api' })`, so manual
save, autosave, library open and delete all go through the real HTTP service.

## Verify

```bash
cd packages/activities
npm run designer:test
# or after a build:
node designer/preview-test.js
```

`preview-test.js` starts `designer/serve.ts` (the real HTTP microservice), runs
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
- theme persistence across reload,
- no browser console errors.

It writes the screenshot to `designer/preview.png`.
