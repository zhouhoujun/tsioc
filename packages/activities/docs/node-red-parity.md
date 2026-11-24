# Node-RED parity

This document records how the visual workflow engine maps onto Node-RED's node
set and configuration model, what is intentionally different, and what is a
deliberate non-goal. It is the reference for future parity work; the code lives
in `src/visual/node-registry.ts` (definitions), `src/visual/workflow-runtime.ts`
(execution) and `src/visual/components/` (editor).

## Runtime model

| Topic | Node-RED | This engine |
| --- | --- | --- |
| Execution | Message-level: a node runs once per message and may `send` many messages on many ports | DAG run: a node runs once per execution and returns one result |
| Sequences | `msg.parts` streams a message per item | `split` returns the array; `map`/`filter`/`sort`/`join`/`batch` process it |
| Replay | Not built in | Immutable execution plan + snapshots (`WorkflowExecutionSnapshot`) with deterministic replay/resume |
| Status | `node.status({fill, shape, text})` pushed live | `ActivityResult.status = { text, level, key?, params? }`, snapshotted with the run |
| Credentials | Separate `flows_cred.json`; `node.credentials` | `{{credential:name}}` references resolved by the host; writes migrate inline values into the store |
| Node definition | Definition + runtime + editor hooks in one file | Central registry (fields/ports/palette) + runtime switch + plugin `execute` |

Consequences that are deliberate:

- A node cannot emit N messages to the same branch in one run; `function` with
  more than one output can route one message per port, and arrays plus the
  array nodes (or `loop`/`subprocess`) cover repeated sub-workflows.
- Payload mutation flows through the `ActivityContext` (`msg`, `flow`,
  `global`, `env`, `payload`), not through a chain of cloned messages.

## Node matrix

Legend: `+` is a superset of the Node-RED option set, `=` is equivalent,
`~` is a different shape with the same intent, `-` is not supported.

### Common

| Node-RED | Type here | Notes |
| --- | --- | --- |
| inject | `inject` | `~` payload types JSON/string/number/boolean/timestamp/env/**expression**, arbitrary properties that target the message, flow or global scope (each value can be a typed value or expression), topic, manual/interval/cron/event trigger, start delay and repeat count |
| debug | `debug` | `+` value path, complete message, level, console mirror, **Show in node status** (`tostatus`) |
| complete | `complete` | `~` `scope` filter (node ids/types) instead of a multi-select |
| catch | `catch` | `~` same scope filter; errors carry the failed node id/message |
| status | `status` | `~` reacts to workflow status events; status lines are also painted on nodes |
| link in/out/call/return | `link` | `=` mode + comma-separated names + call timeout |
| comment | `comment` | `=` |
| junction | `junction` | `=` |

### Function

| Node-RED | Type here | Notes |
| --- | --- | --- |
| function | `function` | `~` sandboxed JS with `msg`/`flow`/`global`/`env`/`context` plus Node-RED-style `node.status()`, `node.info/warn/debug/error()`, `node.id`/`node.name`, `node.send(msg)` (last send forwarded) and `flow.get/set` / `global.get/set` and `env.get/has`. Set **Outputs** > 1 and return an array of messages to route one message per output port; each wire gets its own branch-local message while `flow`/`global` stay shared |
| switch | `switch`, `router` | `+` one output per rule (**dynamic ports**, no eight-output limit), all rule operators, check-all fan-out, `else`, output labels summarize the rule; compare values may be typed values or JSONata |
| change | `change` | `+` set/delete/append/move/search-and-replace; values from literal, `msg`/`flow`/`global`/`env` or a **JSONata expression** |
| range | `scale` | `~` maps a value between ranges with **clamp / scale / wrap / drop** (legacy `clamp: false` still scales; drop stops the branch). The `range` type here is a sequence generator |
| template | `template` | `+` mustache sections or plain text; output text/JSON/YAML |
| delay | `delay` | `+` fixed/random/rate modes, `msg.delay` override, rate queue/drop |
| trigger | `trigger` | `~` first + optional second message, per-emit delay, new-message mode |
| exec | `command` | `~` host command/action name through the command allowlist policy |
| rbe | `rbe` | `~` value/change/deadband and ignore-first over **array items** |

### Network

| Node-RED | Type here | Notes |
| --- | --- | --- |
| http in / response | `http-in`, `http-response` | `=` method/path matching, request metadata, response status/headers/body; CORS, uploads, query/policy on the inbound endpoint |
| http request | `http-request` | `+` shared `http` endpoint (base URL, headers, query, redirect/error policy, basic/bearer/API-key auth), retry, timeout, response type, **`paytoqs`**, ignore errors; URL/body accept `{{expr: ...}}` |
| mqtt in/out | `mqtt-in`, `mqtt-out` | `+` shared `mqtt` broker config node, QoS 0-2, retain, keepalive, clean session, will + birth, client id, TLS profile |
| tcp in/out | `tcp-in`, `tcp-out` | `+` shared `tcp` endpoint (host/port/TLS), **line framing** (separator with `\n`/`\r\n`/`\t`, trailing fragment flushed on close, one reply per framed message without closing the socket), topic |
| udp in/out | `udp-in`, `udp-out` | `+` shared `udp` endpoint incl. broadcast, reply, topic |
| websocket in/out | `websocket-in`, `websocket-out` | `+` shared listener/client config nodes, path, subprotocol, headers, broadcast to connected clients |
| tls | `tls` | `=` reusable CA/cert/key/servername/verify profile; secrets can be credentials |
| http proxy | `-` | Not supported; hosts that need it configure the runtime fetch/agent |
| watch | `watch` | `+` recursive, debounce, event filter |
| file in/out | `file-in`, `file-out` | `+` encoding, JSON parse, delete-after-read, append, mkdir, newline |

### Sequence / parser / storage

| Node-RED | Type here | Notes |
| --- | --- | --- |
| split | `split` | `~` array or delimiter text → `items` array |
| join | `join` | `~` joins **parallel branch results**: array, **joined text** (`joiner`), merged object, keyed object, first N, timeout |
| sort | `sort` | `+` single path or **multi-key** (`keys: [{ path, order, numeric }]`), numeric/lexical |
| batch | `batch` | `+` size + **overlap** chunking |
| csv | `csv` | `+` parse/stringify, separator presets (comma/tab/space/semicolon/custom, legacy delimiter), header row (both directions), column projection, numeric parsing, optional omission of empty cells |
| json | `json` | `+` parse/stringify/pretty with a configurable field |
| xml | `xml` | `+` attributes/text toggles, pretty print, optional XML declaration when stringifying |
| html | `html` | `~` text/links/attribute extraction (no scraping selectors) |
| yaml | `yaml` | `+` parse/stringify |
| subflow | `subprocess`, `loop` | `~` stored workflow id, context path or inline definition, `inputs`/`outputs` path mapping, child tabs with a breadcrumb back to the parent (see the README's *Sub-workflow ports* section); the node menu can create and bind a child document in one action; there is no subflow canvas with generated in/out nodes |
| tail | `tail` | `+` line splitting, initial file content, workspace-root sandbox |

### Nodes without a Node-RED counterpart

`parallel`, `join` (branch barrier), `loop`, `trycatch` (error-port guard),
`sequence`, `assign`, `transform`, `statistics`, `merge`, `event-emit`,
`event-wait`, `range` (sequence generator), `custom` (plugin-provided).

## Configuration features

| Feature | Where |
| --- | --- |
| Field schema (label/hint/unit/group/visibility/validation rules) | `WorkflowConfigField` in `types.ts`, rendered by `@tsdi/components/common/dynamic-form` on DOM and TUI |
| Typed values | `literal`/`number`/`boolean`/`JSON`/`regex`/`expression`/`msg`/`flow`/`global`/`env`; stored as `{ type, value }` objects (legacy prefixes still resolve) |
| Expressions | JSONata via the optional `jsonata` package, loaded on demand; typed values, Change rules, inject payload and `{{expr: ...}}` markers in URL/body/assign/log/event/http-response |
| Cross-field validation | `WorkflowConfigField.validate(value, { values, field })` |
| Structural validation | `WorkflowNodeDefinition.validateConfig(config)` (for example switch rules/else placement) |
| Dynamic outputs | `WorkflowNodeDefinition.outputsFor(config)` (switch/router one port per rule) |
| Shared endpoints | Config nodes (`mqtt`, `tls`, `http`, `tcp`, `udp`, `websocket`, ...) with reference pickers and missing-reference validation |
| Credentials | `secret` fields, `{{credential:name}}`, publish-time validation against the host store, write-time migration of inline values |
| Node status | `ActivityResult.status` painted on the canvas + inspector, translated by `key`/`params` |
| Node activation | `disabled` nodes keep their wiring but are skipped |

## Deliberate non-goals

- **`msg.parts` streaming.** Multi-message per-node execution conflicts with the
  deterministic per-node result and snapshot/resume model. Arrays plus the
  sequence nodes are the supported equivalent.
- **Node-RED `send`/`receive` runtime API for code nodes.** Plugins extend the
  engine through `WorkflowPlugin.execute`/`onStart`-style hooks and the core
  interceptor chain instead.
- **Editor subflow canvas.** `subprocess`/`loop` cover reuse without a second
  document canvas.
- **HTTP proxy support.** Deployments that need a proxy configure the host
  `fetch` implementation.

## Known gaps worth revisiting

- CSV `multi` (one message per row) is the streaming non-goal in another shape.
- Binary payloads are base64 strings (`file-in`/`file-out` honour `encoding`);
  there is intentionally no `Buffer` type in the renderer-neutral runtime.
- Editor expression completion offers scope names and common JSONata functions;
  it does not complete against a live evaluation scope yet.
