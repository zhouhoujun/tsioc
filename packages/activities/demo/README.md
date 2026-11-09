# Workflow Designer Demo

Standalone browser demo for the visual workflow designer.

## Build

```bash
cd packages/activities
npm run demo:build
# or: npx ts-node -r tsconfig-paths/register demo/build-demo.ts
```

The build compiles the demo + imported `@tsdi/*` packages with `tsc` (decorator
metadata), then bundles `demo/main.js` with esbuild.

## Preview

```bash
cd packages/activities
npm run demo
# custom port:
npm run demo -- 8765
# open http://127.0.0.1:8765/
```

The demo is served by the framework's HTTP microservice
(`@tsdi/service` + `useHttpTransport`):

- `/` static demo
- `/api/workflows` workflows CRUD
- `/api/workflows/:id/run` execute a stored workflow
- `/api/workflows/:id/resume` resume from a checkpoint

The browser uses `HttpWorkflowDefinitionStore({ baseUrl: '/api' })`, so
Save / Workflows / Open in the UI go through the real HTTP service.

The demo starts on the approval workflow. It supports dragging nodes, connecting
ports, running, replaying run history and opening the execution log.

## Browser verification

```bash
cd packages/activities
npm run demo:test
# or: node demo/preview-test.js
```

`preview-test.js` starts `demo/serve.ts` (the real HTTP microservice), runs the
demo in headless Chromium, asserts:

- 6 nodes / 6 edges / 35 palette components render
- palette search filters components and restores the full list on clear
- Delete/Duplicate stay disabled until a node or connection is selected
- switching language preserves the edited document instead of reloading defaults
- Fit restores every node into the visible canvas after panning
- left/center/right/bottom panes each expose their own scrollbar
- dragging the left splitter changes the pane ratio
- collapsing and restoring the left pane works from its toggle
- theme button cycles light → dark → solarized → high-contrast
- SVG edges are visible in the SVG namespace
- dragging from an output port to an input port creates a new connection
- clicking an edge hit path selects it
- Save persists through `PUT /api/workflows/:id`
- `GET /api/workflows` returns the saved workflow
- Run produces `task_2 = success`, `task_3 = skipped`
- 4 traversed edges and 2 skipped edges
- run-history chip and execution log rows appear
- workflow library row is loaded from the HTTP API
- the chosen theme is persisted and restored after a reload
- no browser console errors

It writes the screenshot to `demo/preview.png`.

Example verified result:

```json
{
  "before": {
    "nodes": 6,
    "edges": 6,
    "palette": 35,
    "title": "Approval workflow",
    "status": "Idle",
    "edgeVisible": true,
    "edgeNamespace": "http://www.w3.org/2000/svg",
    "panesScrollable": true
  },
  "paletteFiltered": 1,
  "paletteRestored": 35,
  "deleteDisabledBefore": true,
  "deleteEnabledAfter": true,
  "localePreserved": { "count": 8, "locale": "zh-CN" },
  "fitVisible": true,
  "resized": true,
  "collapsed": true,
  "restored": true,
  "connection": { "edges": 7, "connections": 7 },
  "edgeSelected": true,
  "darkTheme": { "attribute": "dark", "background": "rgb(11, 18, 32)" },
  "themeStored": "dark",
  "themeAfterReload": "dark",
  "after": {
    "completed": "Completed",
    "traversed": 5,
    "skippedEdges": 2,
    "history": 1,
    "logs": 32
  },
  "libraryRows": 1,
  "apiWorkflows": 1,
  "errors": []
}
```
