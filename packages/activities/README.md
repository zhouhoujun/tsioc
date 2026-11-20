# @tsdi/activities

A powerful workflow framework for TypeScript applications, built on AOP and IoC container via `@tsdi`. Supports both browser and Node.js environments with visual workflow design capabilities.

## Features

- 🎯 **Declarative Workflow Definition** - Define workflows using decorators and templates
- 🔄 **Rich Activity Library** - 30+ built-in activities for common workflow patterns
- 🎨 **Visual Workflow Engine** - Build and visualize workflows programmatically
- ⚡ **Parallel & Sequential Execution** - Support for both execution modes
- 🔌 **Extensible Architecture** - Easy to create custom activities
- 📦 **IoC Integration** - Full dependency injection support
- 🔐 **Type-Safe** - Full TypeScript support with generics
- ✅ **Well Tested** - 108 unit tests with full coverage

## Installation

```bash
npm install @tsdi/activities
```

### CLI Tools

```bash
npm install -g @tsdi/cli

# Run workflow
tsdi run [taskfile.ts]

# Build
tsdi build [options]
```

## Quick Start

### Basic Activity

```typescript
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { Component, Attribute } from '@tsdi/components';

@Component({ selector: 'my-task' })
export class MyTaskActivity extends Activity {
    
    @Attribute()
    message: string = 'Hello World';

    async execute(context: ActivityContext): Promise<ActivityResult> {
        console.log(this.message);
        return {
            success: true,
            data: { message: this.message }
        };
    }
}
```

### Workflow with Visual Builder

```typescript
import { VisualWorkflowBuilder, VisualWorkflowService } from '@tsdi/activities';

const workflow = VisualWorkflowBuilder
    .create()
    .setId('approval-workflow')
    .setName('Document Approval')
    .startNode('Submit')
    .taskNode('Review', { reviewer: 'manager' })
    .conditionNode('Approved?', { field: 'status' })
    .taskNode('Process', { action: 'save' })
    .endNode('Complete')
    .connect('start_0', 'task_1')
    .connect('task_1', 'condition_2')
    .connect('condition_2', 'task_3', { sourcePort: 'true' })
    .connect('task_3', 'end_4')
    .build();

const service = new VisualWorkflowService();
const result = await service.execute(workflow);
```

## Built-in Activities

### Control Flow Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `SequenceActivity` | `sequence` | Execute activities in sequence |
| `ParallelActivity` | `parallel` | Execute activities in parallel |
| `IfActivity` | `if` | Conditional execution |
| `SwitchActivity` | `switch` | Multi-branch selection |
| `WhileActivity` | `while` | While loop execution |
| `DoWhileActivity` | `do-while` | Do-while loop execution |
| `ForEachActivity` | `foreach` | Iterate over collections |
| `TryCatchActivity` | `trycatch` | Exception handling |
| `ConditionalActivity` | `conditional` | Boolean condition evaluation |

### Data Processing Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `AssignActivity` | `assign` | Variable assignment with merge/overwrite support |
| `TransformActivity` | `transform` | Data transformation with chain support |
| `MapActivity` | `map` | Array mapping |
| `FilterActivity` | `filter` | Array filtering |
| `ReduceActivity` | `reduce` | Array reduction |
| `MergeActivity` | `merge` | Data merging (object/array/concat) |
| `SplitActivity` | `split` | Data splitting (string/array chunks) |
| `BatchActivity` | `batch` | Batch processing with size control |

### Validation Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `ValidateActivity` | `validate` | Multi-rule validation with stop-on-first-error |
| `RequiredActivity` | `required` | Required field check |
| `RangeActivity` | `range` | Numeric range validation (min/max) |
| `PatternActivity` | `pattern` | Regex pattern validation |

### Utility Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `LogActivity` | `log` | Multi-level logging with timestamp |
| `DelayActivity` | `delay` | Timed delay with optional body |
| `TimerActivity` | `timer` | Timer execution (timeout/interval/date) |
| `IntervalActivity` | `interval` | Interval execution with max count |
| `EmitActivity` | `emit` | Event emission to context |
| `WaitActivity` | `wait` | Wait for event with timeout |
| `InvokeActivity` | `invoke` | Method invocation with retry |
| `ThrowActivity` | `throw` | Error throwing with details |

### Lifecycle Activities

| Activity | Selector | Description |
|----------|----------|-------------|
| `StartActivity` | `start` | Workflow start point |
| `EndActivity` | `end` | Workflow end point |
| `ConfirmActivity` | `confirm` | User confirmation dialog |

## Usage Examples

### Sequential Execution

```typescript
import { SequenceActivity } from '@tsdi/activities';

const sequence = new SequenceActivity();
sequence.activities = [
    { execute: async () => console.log('Step 1') } as any,
    { execute: async () => console.log('Step 2') } as any,
    { execute: async () => console.log('Step 3') } as any
];

await sequence.execute({});
```

### Parallel Execution

```typescript
import { ParallelActivity } from '@tsdi/activities';

const parallel = new ParallelActivity();
parallel.activities = [
    { execute: async () => fetchData('api1') } as any,
    { execute: async () => fetchData('api2') } as any,
    { execute: async () => fetchData('api3') } as any
];
parallel.maxConcurrent = 3;
parallel.waitAll = true;

const context = { activities: parallel.activities };
await parallel.execute(context);
```

### Conditional Flow

```typescript
import { IfActivity } from '@tsdi/activities';

const ifActivity = new IfActivity();
ifActivity.condition = true;
ifActivity.thenActivity = { execute: async () => ({ success: true }) } as any;
ifActivity.elseActivity = { execute: async () => ({ success: false }) } as any;

const result = await ifActivity.execute({});
```

### While Loop

```typescript
import { WhileActivity } from '@tsdi/activities';

const whileActivity = new WhileActivity();
let counter = 0;

whileActivity.condition = async () => counter < 5;
whileActivity.body = {
    execute: async () => {
        counter++;
        console.log(`Iteration ${counter}`);
        return { success: true };
    }
} as any;
whileActivity.maxIterations = 10;

await whileActivity.execute({});
```

### Try-Catch Error Handling

```typescript
import { TryCatchActivity } from '@tsdi/activities';

const tryCatch = new TryCatchActivity();
tryCatch.tryActivity = {
    execute: async () => {
        // Risky operation
        return { success: true };
    }
} as any;
tryCatch.catchActivity = {
    execute: async (ctx: any) => {
        console.error('Caught:', ctx.error.message);
        return { success: true };
    }
} as any;
tryCatch.finallyActivity = {
    execute: async () => {
        console.log('Cleanup');
        return { success: true };
    }
} as any;

await tryCatch.execute({});
```

### Data Transformation Pipeline

```typescript
import { SequenceActivity, AssignActivity, ForEachActivity, ValidateActivity } from '@tsdi/activities';

const pipeline = new SequenceActivity();
pipeline.activities = [
    Object.assign(new AssignActivity(), {
        values: { status: 'processing', timestamp: Date.now() }
    }),
    Object.assign(new ForEachActivity(), {
        items: [1, 2, 3, 4, 5],
        parallel: true,
        maxConcurrency: 3,
        body: {
            execute: async (ctx: any) => {
                return { success: true, data: ctx.currentItem * 2 };
            }
        } as any
    }),
    Object.assign(new ValidateActivity(), {
        data: { results: [2, 4, 6, 8, 10] },
        rules: [
            { field: 'results', validator: (v: any[]) => v.length === 5 }
        ]
    })
];

await pipeline.execute({ variables: {} });
```

### Validation

```typescript
import { ValidateActivity } from '@tsdi/activities';

const validator = new ValidateActivity();
validator.data = {
    name: 'John Doe',
    age: 25,
    email: 'john@example.com'
};
validator.rules = [
    { 
        field: 'name', 
        validator: (v: string) => v.length >= 2 ? true : 'Name too short'
    },
    { 
        field: 'age', 
        validator: (v: number) => v >= 18 && v <= 65 ? true : 'Age must be 18-65'
    },
    { 
        field: 'email', 
        validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : 'Invalid email'
    }
];
validator.stopOnFirstError = false;

const result = await validator.execute({});
if (!result.success) {
    console.log('Validation errors:', result.data?.errors);
}
```

### Batch Processing

```typescript
import { BatchActivity } from '@tsdi/activities';

const batch = new BatchActivity();
batch.items = Array.from({ length: 100 }, (_, i) => ({ id: i, data: `item-${i}` }));
batch.batchSize = 10;
batch.delayBetweenBatches = 100;
batch.continueOnError = true;
batch.body = {
    execute: async (ctx: any) => {
        await processItem(ctx.currentItem);
        return { success: true };
    }
} as any;

const result = await batch.execute({});
console.log(`Processed ${result.data?.processed} items in ${result.data?.batches} batches`);
```

### Logging

```typescript
import { LogActivity } from '@tsdi/activities';

const logger = new LogActivity();
logger.level = 'info';
logger.message = 'Processing completed';
logger.data = { itemCount: 100, duration: 5000 };
logger.includeTimestamp = true;

await logger.execute({});
```

## Visual Workflow Engine

### Creating Workflows Programmatically

```typescript
import { VisualWorkflowBuilder } from '@tsdi/activities';

const workflow = VisualWorkflowBuilder
    .create()
    .setId('data-pipeline')
    .setName('Data Processing Pipeline')
    .setDescription('ETL pipeline for data processing')
    .startNode('Input', { x: 100, y: 100 })
    .taskNode('Extract', { source: 'database' }, { x: 250, y: 100 })
    .taskNode('Transform', { operations: ['clean', 'normalize'] }, { x: 400, y: 100 })
    .taskNode('Load', { target: 'warehouse' }, { x: 550, y: 100 })
    .endNode('Complete', { x: 700, y: 100 })
    .connect('start_0', 'task_1')
    .connect('task_1', 'task_2')
    .connect('task_2', 'task_3')
    .connect('task_3', 'end_4')
    .build();
```

### Workflow Validation

```typescript
import { VisualWorkflowService } from '@tsdi/activities';

const service = new VisualWorkflowService();

// Validate workflow definition
const validation = service.validate(workflow);
if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
}

// Execute workflow
const result = await service.execute(workflow, { inputData: {} });
console.log('Execution result:', result);
```

### Serialization

```typescript
// Serialize to JSON
const json = service.serialize(workflow);

// Deserialize from JSON
const restored = service.deserialize(json);

// Save to file
fs.writeFileSync('workflow.json', json);
```

### Node Types

```typescript
type VisualNodeType =
    | 'start'        // Optional explicit start point
    | 'end'          // Optional explicit end point
    | 'inject'       // Manual, interval, cron or event trigger
    | 'task'         // Task node
    | 'function'     // JavaScript transform with initialize/finalize
    | 'template'     // Mustache/plain text template
    | 'condition'    // Condition node
    | 'switch'       // Ordered rules, optional check-all fan-out and else
    | 'router'       // Rule-based routing with named ports
    | 'parallel'     // Parallel node
    | 'join'         // Wait for branches and merge their results
    | 'junction'     // Wire pass-through
    | 'sequence'     // Explicit ordering helper
    | 'link'         // Jump to matching link nodes by name
    | 'delay'        // Delay node
    | 'trigger'      // Emit a payload, optionally a second one after a delay
    | 'loop'         // Repeat a referenced sub-workflow
    | 'trycatch'     // Guard a branch and route failures to the error port
    | 'subprocess'   // Sub-process node
    | 'complete'     // Lifecycle hook after a successful run
    | 'catch'        // Lifecycle hook after a failed run
    | 'status'       // Lifecycle hook on status changes
    | 'log'          // Log node
    | 'debug'        // Inspect a property or the complete message
    | 'http-request' // HTTP request node
    | 'http-in'      // Start a flow from a webhook request
    | 'tcp-in'       // Start a flow from a TCP message
    | 'udp-in'       // Start a flow from a UDP datagram
    | 'websocket-in' // Start a flow from a WebSocket message
    | 'http-response' // Shape the webhook status, headers and body
    | 'json'         // JSON parse/stringify
    | 'csv'          // CSV parse/stringify
    | 'xml'          // XML parse/stringify
    | 'html'         // HTML text/attribute extraction
    | 'yaml'         // YAML parse/stringify
    | 'rbe'          // Report only value changes in an array
    | 'combine'      // Merge, concat or join several values
    | 'change'       // Set/delete/append/move/replace context fields
    | 'statistics'   // Count/sum/avg/min/max
    | 'merge'        // Merge data
    | 'split'        // Split text/arrays
    | 'map'          // Map array items
    | 'filter'       // Filter array items
    | 'sort'         // Sort array items (numeric/lexical)
    | 'range'        // Generate a number range
    | 'batch'        // Batch items with overlap
    | 'scale'        // Map numbers between ranges
    | 'event-emit'   // Emit a workflow event
    | 'event-wait'   // Wait for a workflow event
    | 'command'      // Run a host command through the context executor
    | 'assign'       // Assign node
    | 'transform'    // Data transform node
    | 'comment'      // Canvas note, never executed
    | 'custom';      // Custom node
```

### Scheduling and host plugins

`inject` supports four trigger sources: `manual`, `interval`, `cron` and
`event`. Cron uses five fields (`minute hour day month weekday`) with `*`,
`*/n`, `a-b`, `a-b/n` and comma lists. A workflow started from the toolbar can
keep interval/cron injections running via `WorkflowScheduler` (`Schedule` /
`Stop schedule` actions).

Server-side plugins add host capabilities that browsers cannot provide:

```typescript
import { createFilePlugin, createExecPlugin } from '@tsdi/activities';

// file read/write: path, encoding, append, createDirs
// exec: command, args list, cwd, env, timeout, captured stdout/stderr
```

Plugin nodes report a clear error when the host does not install their
executor, so the same workflow definition stays valid in the browser editor.

### TCP / UDP / WebSocket inbound listeners

Server hosts can run long-lived listeners and start one workflow run per
message. Each `tcp-in` / `udp-in` / `websocket-in` node declares its own
host/port (WebSocket also accepts an upgrade `path`); `0` selects a free port and
the handle reports the bound ports. WebSocket listeners load the optional `ws`
package on demand.

WebSocket nodes can share a `websocket` listener config node instead of
repeating host/port/path (see below). Nodes that reference the same listener
share one server, and the config node's fields are used unless the node
overrides them inline.

```typescript
import { WorkflowInboundRunner } from '@tsdi/activities/server';

const runner = new WorkflowInboundRunner(service);
const handle = await runner.start(definition, {
    context: { env: 'prod' },
    execution: { timeout: 30_000 },
    onResult: (result, message) => console.log(message.transport, result.success)
});
// later
await handle.stop();
```

- The message is exposed as `context.inbound` and as the `payload` output of the
  matching node.
- `Reply with result` sends the latest node output back to the sender (JSON for
  objects, echoed text otherwise).
- Other inbound nodes in the same workflow skip their branches, so one document
  can host several listeners.
- Listeners are server-only; browsers and the TUI keep using HTTP entries.

### HTTP webhooks

`http-in` and `http-response` expose a workflow as a real HTTP endpoint
through the workflow server:

```text
POST /api/workflows/:id/hook/orders
POST /api/workflows/:id/hook/orders/42
GET  /api/workflows/:id/hook?path=/orders   # query fallback
```

- `http-in` filters by method (`ANY` by default) and path; when no request
  reached the execution (for example a manual run), its branch is skipped
  instead of running with an empty message. The inspector shows the resulting
  webhook URL for the selected node.
- `http-response` sets the returned status code, headers and body path.
- Without an `http-response` node the endpoint returns a JSON run summary with
  status `200` on success and `500` on failure.

### Messages and scopes

Each execution context now carries a Node-RED style message plus scopes:

```typescript
context.msg    // { payload, topic?, parts?, meta? }
context.flow   // per-run values shared by all nodes in this execution
context.global // service-wide values (persist across runs)
context.env    // host-provided environment values
```

- `function` nodes receive `(context, input, msg, flow, global, env)`; mutating
  `msg` or returning it updates the payload/topic for downstream nodes.
- Existing definitions keep working: plain `payload` results are mirrored into
  `msg.payload`, and context fields are still merged as before.
- `service.getGlobalContext()` exposes the shared global scope; pass
  `{ env: { ... } }` in execution options to provide environment values.
- Fields resolved through `resolveWorkflowValue` accept typed references:
  `{ type: 'msg' | 'flow' | 'global' | 'env', path }` and
  `{ type: 'literal', value }`. Plain strings keep the legacy
  literal/context-path behavior.

## Visual Designer (drag & drop)

The package ships a renderer-neutral designer built on `@tsdi/components`:

```typescript
import { Application } from '@tsdi/core';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { WorkflowModule, WorkflowDesignerComponent } from '@tsdi/activities';

const ctx = await Application.run(WorkflowDesignerComponent, {
    deps: [HtmlTemplateModule, WorkflowModule]
});
```

Browser products that only run registry-defined visual nodes can import
`WorkflowDesignerModule` instead of `WorkflowModule`; it declares the designer
UI and generic visual runtime without bundling the full server Activity library.

A standalone administration shell (tabs, SQLite storage, plugins and optional
OAuth2/OIDC login) lives in `packages/workflow-admin` / `@tsdi/workflow-admin`.

Features:

- opened workflows are independent document tabs; `+` creates a blank workflow,
  each tab keeps its own canvas/selection/history, and the host can restore the
  persisted open-tab set on startup,
- palette to drag generic node components onto the canvas (or click to add);
  dropping a component onto an existing wire splices it between the two
  endpoints as one undoable edit, and double-clicking a wire opens quick-add in
  insert mode,
  `Menu → Plugins` (when the host provides a plugin manager) lists bundled and
  installed plugins and installs/uninstalls them without reloading the designer,
- theme switching: light / dark / solarized / high-contrast from the application
  menu's `Theme` submenu (shared `ThemeService`); layout panes, borders,
  scrollbars and node cards follow the active theme,
- left/center/right/bottom `workspace-layout` with draggable ratios,
  collapse/expand toggles and independently themed scrollbars for palette,
  canvas, inspector and status/output,
- SVG-native canvas: connection lines render through the components SVG
  namespace support (not per-edge style positioning),
- drag nodes with grid snapping; connect from output or input ports, drop anywhere
  on the target node body, or click one port then the other (click-to-connect);
  valid ports and hovered nodes highlight while wiring, and `Esc` or an empty-canvas
  click cancels the pending wire,
- click an edge (widened hit path) to select it; `Delete` removes the selected node or connection,
- multi-select with `Shift`/`Ctrl` click or `Shift`+drag box selection; selected
  nodes move together, and `Delete`, `Ctrl+D`, `Ctrl+E` apply to the whole
  selection,
- `Ctrl+C` / `Ctrl+X` / `Ctrl+V` copy, cut and paste nodes (with internal
  connections) within and across open workflow tabs; pasted nodes get fresh ids
  and singleton nodes already present are skipped; frames whose members are all
  selected are copied/duplicated with their nodes,
- multi-selection shows an alignment bar over the canvas: align left/center/
  right/top/middle/bottom and distribute horizontally/vertically,
- `Ctrl+G` wraps the selection in a named group frame (`Ctrl+Shift+G` or the
  frame's `✕` removes it); dragging the frame title moves all member nodes
  together and groups persist with the workflow definition,
- frames can be collapsed with the `▾` control: member nodes and their internal
  edges are hidden while the frame (and its wiring) stays in place,
- double-click a frame title to rename it or pick a frame color,
- `Enabled` in the inspector (or the node right-click menu) disables a node
  without deleting it: the node and its wiring stay on the canvas (dimmed,
  struck-through title) but the run skips it and stops that branch,
- inspector for node name/description/config fields driven by `WorkflowNodeRegistry`,
- searchable palette: filter 67 registered node types by label, description or type,
- workflow settings (menu → Settings) edit the document description and a
  default run timeout stored in `metadata.timeout`; the timeout applies to
  designer runs and server run/resume/hook executions,
- execution metrics (menu → Execution metrics) show total runs, success rate,
  average duration, last status, per-node run/failure/duration rows and a
  windowed run trend (last hour / 24h / 7 days) when the store exposes
  `getMetrics`,
- `Ctrl+K` opens a quick-add overlay that searches every registered node and
  inserts the selected one at the viewport center (arrow keys + Enter),
- inspector property editing is rendered by the shared JSON-configured
  `dynamic-form` component (conditional fields, groups, per-field defaults and
  reset); validation uses `@tsdi/components/forms` (`required`, `min`/`max`,
  `pattern`, JSON) and invalid values are never persisted to the node,
- `code` fields are enhanced by the open-source CodeMirror editor through the
  optional `@tsdi/activities/web` `WorkflowCodeEditorModule`: JavaScript syntax
  highlighting, workflow-aware completions for `context` / `input` / `variables`
  / configured action names (`Ctrl+Space` or automatically after `.`) and JS
  keyword hints; HTML hosts import `codemirror.css` and `codemirror-hint.css`
  (the `@tsdi/workflow-admin` shell does this automatically). The editor is lazy-loaded, so
  it stays out of the initial browser payload;
- undo/redo, pointer pan, Ctrl+wheel zoom-at-cursor, fit-to-view, auto layout,
  duplicate (`Ctrl+D`), JSON import/export,
- Node-RED-style base components: inject (manual / interval / cron / event), debug,
  trigger (first + optional second message), function, template, JSON, CSV, XML, HTML, YAML, RBE, combine,
  change, statistics, merge, split/map/filter/sort/range/batch/scale,
  event-emit/event-wait, command, condition/switch/router, parallel/join,
  loop (sub-workflow repeat), delay, log, HTTP request, complete/catch/status,
  link/junction/sequence, try/catch, sub workflow, comment,
- sub workflow / loop nodes resolve a stored workflow id through the host
  resolver (`service.setDefinitionResolver`; the HTTP server uses the definition
  store) or fall back to a context path / inline definition JSON; right-clicking
  such a node can open the referenced workflow in a new tab,
- opt-in autosave (`autosave`, `autosaveDelay`) with Saved / Unsaved / Saving /
  Save failed state in the toolbar; manual save and autosave share the same store,
- global keyboard shortcuts (`Ctrl+S` save, `Ctrl+O` library, `Ctrl+Enter` run,
  `Ctrl+D` duplicate, `Ctrl+E` enable/disable, `Shift`+drag box select,
  `Ctrl+C/X/V` copy/cut/paste, `Ctrl+K` quick add, `Ctrl+G` group, `?`/`F1`
  shortcut sheet) and an empty-canvas onboarding hint,
- run history chips replay retained execution snapshots on the canvas; when the
  store implements `listExecutions` (for example `HttpWorkflowDefinitionStore`),
  opening a saved workflow also loads its persisted runs from the server,
- execution panel with per-node start/end log entries plus a searchable
  **Messages** tab that expands each node's structured output and errors,
- workflow library: save, save-as-copy, open and delete definitions through
  `WorkflowDefinitionStore` (localStorage in browsers, in-memory in Node/TUI,
  HTTP/microservice via `HttpWorkflowDefinitionStore`),
- `trigger` waits its delay, sends the first payload, and can send a second
  payload after `secondDelay`; the downstream branch runs once per message,
- `delay` supports fixed, random and **rate limit** modes; the rate limit uses a
  sliding window with `drop` or `queue` for excess messages and keeps state per
  workflow/node across executions,
- `link` nodes connect distant wire segments: a `link out` named `shared`
  reaches every matching `link in` node, which then continues its own branch,
- `join` node waits for all parallel branches, then exposes their results as
  an array, a merged object, or a keyed object (`keyField`/`valueField`),
  skipping empty branches by default,
- `trycatch` guards its downstream branch: any failure is routed to the `error`
  port with `error`, `errorMessage`, `failedNodeId` and `failedResult` context,
  while the recovery branch is skipped when the guarded chain succeeds,
- `error` ports route failures into recovery branches instead of aborting,
- reusable `WorkflowRetryInterceptor` / `WorkflowTimeoutInterceptor` core
  interceptors,
- live execution path: node and edge states are painted from execution events,
- stylesheet-based skin (`WORKFLOW_DESIGNER_CSS`) with `@tsdi/i18n` labels.

The designer compiles the editable document into an immutable execution plan
(`compileVisualWorkflow`) before running it; the plan exposes adjacency,
reachability and entry information to hosts and tests without re-reading the
graph on every step. Like Node-RED, `start`/`end` nodes are optional helpers:
every explicit `start`/`inject` node and every node without an incoming
connection is an entry, and multiple entries run in sequence.

### Generic node components

```typescript
import { WorkflowNodeRegistry } from '@tsdi/activities';

const registry = new WorkflowNodeRegistry();
registry.register({
    type: 'custom',
    label: 'Robot',
    labelZh: '机器人',
    category: 'action',
    icon: 'R',
    color: '#123456',
    inputs: [{ id: 'in', name: 'in', type: 'input' }],
    outputs: [{ id: 'out', name: 'out', type: 'output' }],
    fields: [
        { key: 'endpoint', label: 'Endpoint', labelZh: '地址', type: 'url', required: true },
        { key: 'name', label: 'Name', labelZh: '名称', type: 'text', maxLength: 80 }
    ]
});
```

Localized copy for node labels, descriptions, fields, placeholders, groups and options
is resolved through `@tsdi/i18n` (`workflow.node.*`, `workflow.field.*`,
`workflow.fieldPlaceholder.*`, `workflow.fieldDescription.*`,
`workflow.group.*`, `workflow.option.*`). Node definitions only carry English
fallbacks; the catalogs live in `src/visual/i18n.nodes.ts`.

Field metadata is the node-provided dynamic form schema: `type`, `options`,
`rows`, `min`/`max`, `minLength`/`maxLength`, `pattern`, `rules`,
`errorMessages`, `visibleWhen`, `group` and `inputClass` are rendered and
validated by the shared dynamic form. The same registry feeds the palette,
inspector, validation and runtime. `activityType` lets a node plug an existing
`Activity` class into the workflow.

### Execution interceptors

Generated node execution is bridged to the core interceptor pipeline through
`VisualNodeActivityAdapter`:

```typescript
const service = injector.get(VisualWorkflowService);

service.use({
    intercept: async (input, next, context) => {
        // input.node, input.context, input.state
        return next.handle(input, context);
    }
});
```

The built-in `VisualExecutionPathInterceptor` records node start/end and streams
events to the editor. User interceptors can add retry, timeout, auth, metrics or
short-circuit a node. Branch/join/condition semantics stay in the execution
kernel, not in interceptors.

```typescript
import {
    WorkflowRetryInterceptor,
    WorkflowTimeoutInterceptor
} from '@tsdi/activities';

service.use(new WorkflowRetryInterceptor({ retries: 2, delayMs: 200 }));
service.use(new WorkflowTimeoutInterceptor({ timeoutMs: 5000 }));
```

### Persistence

```typescript
import {
    HttpWorkflowDefinitionStore,
    LocalStorageWorkflowDefinitionStore
} from '@tsdi/activities';

const store = new HttpWorkflowDefinitionStore({
    baseUrl: 'http://localhost:3000/api',
    token: '<token>'
});
await designer.saveTo(store);
await designer.openFrom(store, 'approval');
```

The HTTP store expects `GET/PUT/DELETE /workflows[/:id]`; any gateway can back
it. Errors are surfaced to the editor instead of silently losing definitions.

Node hosts default to SQLite through `SqliteWorkflowDefinitionStore`:

```typescript
import { startWorkflowHttpServer } from '@tsdi/activities/server';

const ctx = await startWorkflowHttpServer({
    port: 8765,
    staticRoot: 'designer',
    databaseFile: '/var/lib/tsdi/workflows.db'
});
```

Defaults: `$WORKFLOW_DB_FILE`, then `~/.tsdi-agent/workflows.db`. Definitions
are stored as JSON with indexed summary columns, so library queries stay fast.
When Node's built-in `node:sqlite` is unavailable the server falls back to the
in-memory store.

The server can keep inject interval/cron/once schedules running after a request:

```text
POST   /api/workflows/:id/schedule   # start (context/execution options)
GET    /api/workflows/:id/schedule   # running state and run count
DELETE /api/workflows/:id/schedule   # stop
```

Scheduled runs persist execution snapshots, restart automatically when the
workflow is saved/published, and stop when the workflow is deleted or cleared.

Batch deployment endpoints and the designer **Deployments** dialog manage every
stored workflow with an interval/once/cron inject **or a long-lived inbound
node** (`tcp-in`, `udp-in`, `websocket-in`, `mqtt-in`, `watch`, `tail`):

```text
GET  /api/deployments         # running deployments
POST /api/deployments/start   # start all deployable workflows (or workflowIds)
POST /api/deployments/stop    # stop all or the given workflowIds
```

Deployment status includes `ports`, the bound listener ports (ephemeral `0`
ports are resolved). Starting/stopping a deployment now also starts/releases
the inbound listeners, so deployed webhooks, sockets and file watchers accept
traffic without a separate runner process. Saving or publishing a running
workflow restarts its listeners as part of the same deployment entry.

### MQTT nodes

`mqtt-in` and `mqtt-out` speak MQTT 3.1.1 over `mqtt://` (1883) or `mqtts://`
(8883, TLS) with optional username/password (`{{credential:name}}` works).

Broker settings live in an **`mqtt` config node** so they are configured once:

```json
{ "id": "mqtt_1", "type": "mqtt",
  "config": { "url": "mqtts://broker:8883", "clientId": "workflows",
              "username": "{{credential:mqtt-user}}", "password": "{{credential:mqtt-pass}}",
              "tls": "tls_1", "keepalive": 60 } }
```

`mqtt-in` / `mqtt-out` reference it with `"mqtt": "mqtt_1"` and only carry the
per-node topic/payload. Inline `url`/credentials still work and override the
config node, so existing workflows keep running.

Sharing semantics (mirrors the microservice subscriber):

- one broker connection per config node, shared by every `mqtt-in`/`mqtt-out`
  (and by the inbound runner and the host publisher)
- one broker subscription per `(config, topic)`; multiple listeners on the same
  topic receive messages through handler fan-out
- the subscription is released (UNSUBSCRIBE) only when the last listener stops
- a connection timeout (`connectTimeout`, default 10s) fails fast instead of
  hanging when the broker is unreachable

- `mqtt-in` is a host listener: `WorkflowInboundRunner` connects, subscribes and
  starts one run per message with `context.inbound = { transport: 'mqtt', topic,
  payload, data }`.
- `mqtt-out` publishes `payload` (context path, JSON-encoded when it is not a
  string) and needs a host transport: the HTTP server installs one
  (`WorkflowMqttTransport`). Browser-only hosts get a clear error instead of a
  silent no-op.
- `qos` supports 0 and 1; incoming QoS 1 messages are acknowledged, and
  subscriptions are re-established after a reconnect.

### Outbound network nodes

`tcp-out`, `udp-out`, `websocket-out` (and `mqtt-out`) publish from the runtime
through host transports:

- the HTTP server installs them (`WorkflowNetTransport`, `WorkflowMqttTransport`);
  browser-only hosts get a clear error instead of a silent no-op
- `payload` is a context path; non-string values are JSON-encoded
- `timeout` bounds connect/send operations
- `websocket-out` either connects to `url` (client mode) or, when it references
  a `websocket` listener config node, broadcasts to every client connected to
  that shared listener. Broadcasting reports the client count and fails with a
  clear error when the listener is not running.

### TLS config

`tls` is a config node: it never executes, it only carries options that other
nodes reference by id.

```json
{ "id": "tls_1", "type": "tls",
  "config": { "ca": "{{credential:tls-ca}}", "cert": "{{credential:tls-cert}}",
              "key": "{{credential:tls-key}}", "servername": "broker.example.com",
              "rejectUnauthorized": true } }
```

Referenced by `tcp-out` / `websocket-out` / `mqtt-out` through `"tls": "tls_1"`.
The runtime resolves the node from the definition, resolves `{{credential:name}}`
values, and hands the result to the transport. A missing id fails the node with
`TLS config not found: <id>`.

`websocket` is a config node too: it describes one WebSocket listener
(`host`, `port`, `path` and an optional `tls` reference). `websocket-in` nodes
that reference it subscribe to the shared server; `websocket-out` nodes that
reference it broadcast to the connected clients instead of opening a new
client connection.

### HTTP in security and uploads

`http-in` guards and decorates webhook requests before a flow runs:

```json
{ "method": "POST", "path": "/orders",
  "authType": "basic", "username": "hook-user", "password": "{{credential:hook-pass}}",
  "cors": true, "corsOrigin": "https://app.example.com",
  "responseHeaders": { "cache-control": "no-store" },
  "upload": true }
```

- `authType: basic|bearer` validates the `Authorization` header against the
  credential store; failures return 401 (basic also sends `WWW-Authenticate`)
- `cors` answers `OPTIONS` preflight with 204 and allow-origin/methods/headers
  before auth runs, and decorates normal responses
- `responseHeaders` are applied first; an `http-response` node merges over them
- `upload` parses `multipart/form-data` into `request.files` / `request.fields`
  (multipart parsing is enabled by default; disable with `upload: false` on the
  server options)

### File nodes

`file-in`, `file-out`, `watch` and `tail` run on the host and stay inside the workspace:

```text
file-out  { path: "data/out.json", payload: "payload", append: false, mkdir: true }
file-in   { path: "data/out.json", encoding: "utf8", parse: "auto" }
watch     { path: "data", recursive: false, debounce: 200, event: "all" }
tail      { path: "logs/app.log", split: true, sendWholeFile: false }
```

- every path is resolved against the workspace root; escaping it fails with
  `outside the allowed workspace root` and a suggested relative path
- `file-in` parses valid JSON when `parse: "auto"`, otherwise keeps the text
- `watch` starts one run per debounced change with
  `context.inbound = { transport: "watch", path, event }`; the watcher is closed
  when the run handle stops
- `tail` starts one run per appended line (`split: true`, the default) or per
  appended chunk, with `context.inbound = { transport: "tail", path, line }`.
  `sendWholeFile` replays the current file on start; truncation resets the
  read offset. The watcher is released with the deployment/run handle.
- browser-only hosts fail with a diagnosable error instead of silently skipping

### Global config and context

`global-config` declares workflow variables without a node hop:

```json
{ "id": "config_1", "type": "global-config",
  "config": { "values": { "region": "eu", "retries": 3 }, "scope": "env" } }
```

- `scope: "env"` exposes `env.region` to every node, plus `env.get(name)` /
  `env.has(name)` helpers (non-enumerable, so serialized payloads stay clean)
- `scope: "global"` merges into the shared `global` scope
- the config node never executes

`flow` / `global` context is persisted between runs when the host installs a
context store:

```ts
service.setContextStore(new InMemoryWorkflowContextStore());
```

The HTTP server installs a SQLite store next to the definition database by
default (`workflow_context` table, only that table is created), so a workflow
that increments `flow.counter` continues from the previous run after a restart.
Store failures never fail a run.

### Link routing

`link` has four modes (Node-RED semantics):

| Mode | Behaviour |
| --- | --- |
| `out` | jumps into every `in` node sharing a link name; their branches run in order |
| `in` | sink for deliveries; continues its own downstream |
| `call` | runs a matching `in` branch and waits for a matching `return` |
| `return` | hands the current message back to the pending call and stops the branch |

- names are a comma separated list (`links: "job, alerts"`), matched by overlap
- `call` has a `timeout` (default 5000 ms) and fails with
  `Link call "..." timed out after <n>ms waiting for a link-return.`
- a call with no matching `in` fails fast with `found no matching link-in node`
- link-in/return nodes never start a flow on their own

### Sub-workflow ports

`subprocess` maps data across the boundary:

```json
{ "workflow": "child-id", "inputs": { "orderId": "payload.id" }, "outputs": { "total": "total" } }
```

`inputs` puts `payload.id` into the child context as `orderId`; `outputs`
resolves `total` from the child result and exposes it as the node's `msg`
(so downstream nodes read `payload.total`). Without mappings the whole parent
context is passed through, as before.

Credentials are stored outside workflow definitions and never returned by the API:

```text
GET    /api/credentials           # names only
PUT    /api/credentials/:name     # { "value": "..." }
DELETE /api/credentials/:name
```

Use `{{credential:name}}` in node fields (for example HTTP basic/bearer auth).
SQLite storage encrypts values with AES-256-GCM using `WORKFLOW_CREDENTIAL_KEY`
(or the `credentialKey` option); without a key the server falls back to an
in-memory store so secrets are never written unencrypted. The designer's
**Credentials** dialog lists stored names, adds or replaces a secret and deletes
entries through the same API; stored values are never sent back to the browser.

Configuration, deployment and plugin changes are recorded in an audit trail:

```text
GET /api/audit?workflowId=...&action=...&limit=100
```

Entries include save/publish/restore/delete, schedule and deployment start/stop,
runtime-state clears and plugin installs. The audit store defaults to SQLite next
to the workflow database (in-memory when the definition store is in-memory) and
keeps the newest 2000 entries; override with `auditStore` /
`auditHistoryLimit`. The designer's **Audit log** dialog shows the recent entries
for the active workflow when the store exposes `listAudit`.

The same server exposes execution inspection and cancellation:

```text
GET  /api/executions[?workflowId=...]   # recent snapshots, newest first
GET  /api/executions/:executionId       # one snapshot
POST /api/executions/:executionId/cancel
```

Snapshots use the same serializable shape the designer replays, so external
dashboards can render node/edge state without loading the workflow definition.
`GET /api/workflows/:id/runtime` exposes per-node runtime state such as
rate-limit windows (`DELETE` clears it); the execution panel's **Messages** tab
shows the same state under each node and offers a Clear state action.
`GET /api/workflows/:id/metrics` aggregates the last snapshots into run counts,
success/failure/cancel totals, average duration and per-node run/failure/average
duration metrics. `window` (ms) restricts the period and `buckets` (1-60, default
12) adds an evenly split `trend` of `{ start, end, runs, failed, avgDurationMs }`
points; without a window `trend` stays empty so dashboards only pay for it when
they chart it.

Finished runs are persisted automatically: `SqliteWorkflowExecutionStore` writes
to the same database file when SQLite is available, otherwise an in-memory store
is used. Pass `executionStore` / `executionHistoryLimit` (default 200 snapshots
per workflow) to `startWorkflowHttpServer` to override them. Only the
`workflow_executions` table is created; existing definitions are never rewritten.
Deleting a workflow (or clearing the library) removes its execution history too.

### Inject triggers and scheduling

Inject nodes support `manual`, `interval`, `cron` and `event` triggering. The editor runs
one cycle by default; hosts can schedule interval/once triggers through the
service:

```typescript
const handle = service.startSchedule(definition, {
    context: {},
    onResult: result => console.log(result.success)
});
// later
handle.stop();
```

`interval` uses `interval` + `intervalUnit` + `repeatCount` (0 runs until
stopped). `event` injection waits on the host event bus (`context.eventBus` or
`context.waitEvent`) before emitting the configured payload.

### Property forms

Node settings are rendered by the shared dynamic form. Object-valued JSON fields
default to key/value rows with an explicit JSON toggle; lists (rules, arguments,
columns) use add/remove rows. Field metadata supplies labels, hints, units,
conditional visibility and validation rules.

Fields marked `typed` show a literal/`msg`/`flow`/`global`/`env` selector. The
stored value becomes `msg.payload.endpoint`-style reference text and reference
values skip URL/format validation; literal values keep the normal validation.
HTTP request URL/body plus the value-path fields of condition, switch, router,
log/debug, JSON/CSV/HTML/XML/YAML, RBE, statistics, split, map/filter/sort and
batch opt in by default. List fields (switch/router rule values and change rule
paths) expose the same selector per row.

### Workflow plugins

`WorkflowPluginRegistry` installs custom nodes, services and lifecycle hooks:

```typescript
import { WorkflowPlugin } from '@tsdi/activities';

const plugin: WorkflowPlugin = {
    id: 'acme',
    name: 'Acme connector',
    services: { acme: new AcmeClient() },
    nodes: [{
        type: 'acme-call',
        label: 'Acme call',
        category: 'action',
        icon: '◆',
        color: '#0f766e',
        inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
        outputs: [{ id: 'out', name: 'out', type: 'output', label: 'Output' }],
        execute: async (node, context) => ({
            success: true,
            data: { result: await context.services.acme.call(node.config) }
        })
    }]
};
```

`startWorkflowHttpServer({ plugins: [plugin] })` installs it at bootstrap.
The HTTP API also exposes the bundled catalog:

```text
GET    /api/plugins
POST   /api/plugins/:id/install
DELETE /api/plugins/:id
```

Bundled protocol plugins: `mqtt`, `redis`, `nats`, `coap`, `websocket`, `tcp`, `udp`, plus the
server-side `file` (read/write) and `exec` (run host commands) plugins. Install them on
demand (HTTP API or `WORKFLOW_PLUGINS=mqtt,redis npm --prefix packages/workflow-admin start`) so
their optional client libraries are only loaded when used. Installed
node manifests are returned to the designer, which adds them to its palette;
plugin executors run on the server (browser nodes report a clear error when a
plugin is not available locally).

Plugin services are exposed to every node as `context.services` and are disposed
on uninstall. Plugin nodes are marked `requiresServer` by default; set
`requiresServer: false` for browser-compatible plugins.

Host plugins run with the server process privileges, so production hosts can
scope them:

```typescript
await startWorkflowHttpServer({
    workspaceRoot: '/srv/workflows',
    allowedCommands: ['/usr/bin/node', 'git']
});
```

`workspaceRoot` (or `WORKFLOW_WORKSPACE_ROOT`) resolves file paths inside that
directory and rejects escapes with an actionable error; `allowedCommands`
restricts exec nodes and keeps their working directory inside the root. Without
a policy the plugins keep their previous unrestricted behavior.

### Error ports

A `task`/`http-request` node that fails routes through its `error` output when
that output is connected. The failure context exposes `error`, `errorMessage`,
`failedNodeId` and `failedResult`, while the rest of the workflow can recover.

### Checkpoints and resume

```typescript
let checkpoint;
await service.execute(definition, context, {
    onCheckpoint: snapshot => { checkpoint = snapshot; }
});

// Later / another process
await service.execute(definition, context, {
    resumeFrom: checkpoint
});
```

Completed nodes are replayed on the visual path but are not executed again;
pending nodes continue normally. Checkpoints are plain JSON snapshots, so they
can be stored in a database, file or microservice.

### Execution timeout

```typescript
await service.execute(definition, context, { timeout: 30_000 });
```

`timeout` is a whole-run budget in milliseconds. When it expires no further
nodes are scheduled, in-flight built-in `delay` / `trigger` / loop waits stop
early, and the run finishes as `cancelled` with a `Workflow timed out after
Nms` error. Nested `loop` / sub-workflow executions inherit the remaining
budget instead of restarting a full timeout, and a failing sub-workflow stops
the loop immediately. The HTTP run endpoint accepts the same value in its body:

```json
{ "context": {}, "timeout": 30000 }
```

### Node-level policy

Task and HTTP nodes expose inspector fields for:

- `retry`
- `retryDelay`
- `timeout`

They are enforced by the default `WorkflowNodePolicyInterceptor`; global
`WorkflowRetryInterceptor` / `WorkflowTimeoutInterceptor` still work for
cross-node policies.

### Condition config

Condition nodes support `field`, `operator` (`truthy`/`equals`/`not-equals`/`gt`/`lt`)
and `value`; `config.condition` may be a boolean, a dotted path or a function.
Task nodes read `context.actions[name]`, a function `config.execute`, a JSON
`config.result`, or `config.fail` for failure-path demos.

## Custom Activity

### Creating Custom Activities

```typescript
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { Component, Attribute } from '@tsdi/components';

@Component({ selector: 'email' })
export class EmailActivity extends Activity {
    
    @Attribute()
    to!: string;

    @Attribute()
    subject!: string;

    @Attribute()
    body!: string;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            await this.sendEmail(this.to, this.subject, this.body);
            return {
                success: true,
                data: { sent: true, to: this.to }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // Email sending logic
    }

    async compensate(context: ActivityContext): Promise<void> {
        // Compensation logic (rollback)
        console.log('Compensating email sent to:', this.to);
    }
}
```

### Registering Custom Activities

```typescript
import { Module } from '@tsdi/ioc';
import { WorkflowModule } from '@tsdi/activities';
import { EmailActivity } from './email.activity';

@Module({
    imports: [WorkflowModule],
    declarations: [EmailActivity],
    exports: [EmailActivity]
})
export class MyWorkflowModule {}
```

## API Reference

### Activity Base Class

```typescript
abstract class Activity {
    abstract execute(context: ActivityContext): Promise<ActivityResult>;
    compensate?(context: ActivityContext): Promise<void>;
}

interface ActivityContext {
    [key: string]: any;
}

interface ActivityResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
}
```

### Visual Workflow Types

```typescript
interface VisualWorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    version?: string;
    nodes: IVisualWorkflowNode[];
    connections: NodeConnection[];
    metadata?: VisualWorkflowMetadata;
}

interface IVisualWorkflowNode {
    id: string;
    name: string;
    type: VisualNodeType;
    position: NodePosition;
    config?: Record<string, any>;
    inputs?: NodePort[];
    outputs?: NodePort[];
    style?: NodeStyle;
}

interface NodeConnection {
    id: string;
    sourceNodeId: string;
    sourcePort: string;
    targetNodeId: string;
    targetPort: string;
    condition?: string | ((context: ActivityContext) => boolean);
}
```

## Testing

The package includes comprehensive unit tests with **108 test cases** covering all activities.

### Test Coverage

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Core Activities | 51 | Start, End, Sequence, Parallel, If, While, DoWhile, TryCatch, Timer, Interval, Switch |
| Common Activities | 33 | Assign, Log, ForEach, Transform, Map, Filter, Reduce, Validate, Emit, Batch, Merge, Split |
| Visual Workflow | 24 | Builder, Validation, Serialization, Execution, Node Types |

### Running Tests

```bash
# Run all tests (re-spawns ts-node with a 4 GB heap; override with
# ACTIVITIES_TEST_HEAP_MB when tuning the UI suite)
cd packages/activities
npm test

# Run specific test file
npx ts-node -r tsconfig-paths/register -e "
const { runTest } = require('@tsdi/unit');
const { ConsoleReporter } = require('@tsdi/unit-console');
runTest('./test/core-activities.spec.ts', { baseURL: __dirname }, ConsoleReporter);
"
```

### Test performance notes

The designer UI suite boots one application and renders a fresh designer per
test. Measured on an idle host (2026-11):

| Phase | Cost |
| --- | --- |
| `Application.run` (module + AOP metadata + first render) | ~2.5-3.3 s per app |
| Designer first render (JSDOM, ~1400 elements) | ~1.0-1.5 s |
| JSDOM `createElement` (plain node) | ~0.5-0.7 ms each |

So the wall time is dominated by DOM node creation in jsdom, not by the
framework's reactive logic. Practical rules:

- `run-tests.js` runs with `TS_NODE_TRANSPILE_ONLY=1`; type checking belongs to
  the `tsc` gate, and rebuilding the TS program per run costs tens of seconds.
- The UI specs are split into `workflow-designer-ui-{a,b,c}.spec.ts` and each
  part boots one application (`DesignerUiHost`) and renders a fresh designer per
  test. `npm run test:ui` runs the parts in parallel processes
  (`ACTIVITIES_UI_PARTS=a,b,c` to choose parts), which keeps the run near
  ~3.5 minutes instead of ~4.5.
- Prefer fewer elements over fewer re-renders: the palette/menu/item markup is
  the bulk of the tree.
- Sharing one `ApplicationContext` between tests saves little and leaks
  module-level singletons (service runtime state, action bus), so keep a fresh
  app per test unless those singletons gain an explicit reset.
- `packages/components` gates first-render cost with `npm run bench:check`
  (`render designer tree`, `render 200 bound rows`); use it rather than
  wall-clock suite time to judge render changes, since the host is often busy.

## Related Packages

- [@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc) - IoC container
- [@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop) - AOP support
- [@tsdi/core](https://www.npmjs.com/package/@tsdi/core) - Application core
- [@tsdi/components](https://www.npmjs.com/package/@tsdi/components) - Component framework
- [@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot) - Bootstrap utilities

## Documentation

- [@tsdi/ioc](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc)
- [@tsdi/aop](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop)
- [@tsdi/core](https://github.com/zhouhoujun/tsioc/tree/master/packages/core)
- [@tsdi/components](https://github.com/zhouhoujun/tsioc/tree/master/packages/components)

## License

Apache License 2.0 © [Houjun](https://github.com/houjun)