# Agent console + tools fix log — 2026-10

Real end-to-end simulation testing of the `@tsdi/agent*` stack (real TUI over PTY, real
ORM/DB, real MCP/OAuth transports, fake model + acceptance harness; on 2026-10-15, a real
DeepSeek model driving the real CLI/TUI over an isolated `--root`). Each entry records
the root cause and the commit; every fix ships a regression test that **fails on the old
implementation and passes on the new one**.

- Branch: `7.tui` · Pushed to `gitree` (gitee); `origin` intentionally not pushed.
- Scope: `packages/agents/*` and the `packages/components/*` touched by agent input.

## 2026-10-19 — real TUI build run (sleep-mlt)

Real `npm run chat -- --workspace ~/workspace/sleep-mlt` run with `gpt-5.6`, asked to build
a new `insight-system` (module + `node:assert/strict` test + `AGENTS.md` structure entry).
The build completed (82/82 workspace tests green after the change). The previously
503-blocked `note-system` task was rerun separately with `gpt-5.6` and also passed
(`node test/note.test.js` → `note tests passed`). The runs exposed:

| Commit | File | Root cause |
| --- | --- | --- |
| `e083adceb` | `agent-tools/git/git-operations.tool.ts` | Non-git `git_operations diff` fallback still used the order-independent `simpleLineDiff`. A new file's repeated lines (blank lines, `}`, ...) were all emitted at the first occurrence's position and later copies vanished, so the reported diff did not match the file. Headers also used absolute paths (`a//home/...`). Now uses ordered `unifiedLineDiff`, relativizes against the workdir, and prints `/dev/null` for added/deleted files. |
| `e083adceb` | `agent/src/tools/ToolSummary.ts` | A failing Node test row showed `exit 1 · node:internal/modules/run_main:107` (or `throw new AssertionError(...)`) instead of the assertion. The summary now prefers `AssertionError`/`Error`/`ERR_*`/`TS####` lines and keeps the following comparison detail (`1 !== 2`). |
| `e083adceb` | `agent/src/model/{OpenAICompatible,Anthropic}ModelAdapter.ts`, `RetryPolicy.ts` | Streaming 5xx/529 retries had no delay and ignored `Retry-After`, spending the whole retry budget in a tight loop (observed: 502/503 failed the turn immediately). Both adapters now share `sleepRetryDelay` and back off exactly like the non-streaming path, including abort handling. |
| `c1e858712` | `agent-cli/bin/tsdi-agent.js` | The bin let `ts-node` / `tsconfig-paths` discover configuration from the caller's cwd. Running `tsdi-agent tools list` inside `sleep-mlt` failed with `TS5109` before argument parsing. It now pins `TS_NODE_PROJECT` to the CLI package and registers path mapping with `cwd: packageRoot`; a regression spawns `--version` from a tsconfig-less temp directory. |
| `c1e858712` | `agent/src/prompt/sections/IdentitySection.ts` | In the rerun of the previously failed `note-system` task, the agent read `AGENTS.md`, applied the five numbered rules, but left the `Project Structure` section stale (it only updated it when the prompt explicitly asked). The identity prompt now says to update structure/key-commands docs when project instructions require them. |
| `406168576` | `agent/src/prompt/SystemPromptBuilder.ts`, `runtime/DefaultAgentRuntime.ts`, `model/OpenAICompatibleModelAdapter.ts` | Real runs ended with 52K–75K prompt tokens but only 6,272 cached and `prefixBroken: true`: the static identity/tools text and the per-turn `date-time`/memory tail were one system message, so the changing tail invalidated the provider's cached prefix. `buildParts()` now separates the cacheable prefix from the dynamic tail; runtime emits two system messages (static instructions + hints, then date-time/memory). The static-prefix diagnostic now hashes the first system message plus complete tool schemas. Verified with a real `run`: prompt 12,887, cached 12,800, `prefixBroken: false`. |
| `e722fabc4` | `agent/src/prompt/sections/IdentitySection.ts` | A real `ledger-system` task said "without changing existing behavior"; the model still tightened the shared `requireDate` validator to reject calendar-invalid dates, changing `addEntry` semantics. The identity prompt now says new constraints belong at the new API boundary (or behind an explicit opt-in) when existing behavior must be preserved. |

A third real TUI run (the `note-system` test gained an `update()` assertion; the module
still exported only `add/list/remove`) validated the first two fixes end to end: the
failing row showed `exit 1 · SyntaxError: The requested module '../src/note.js' does not
provide an export named 'update'`, and the non-git `git_operations diff` produced
`--- a/src/note.js` / `@@ -17,6 +17,20 @@` with the real `update()` body. After the
patch, `node test/note.test.js` reported `note tests passed`.

Startup: SWC initially exposed a chain of circular value imports — `TranslatorService`
(`packages/i18n`), `InMemoryServiceDiscovery`/`DISCOVERY_OPTIONS`
(`packages/microservices/discovery`) and `SERVICE_*_OPTIONS` (`packages/microservices/service`).
`b1f5cab17` makes the i18n option imports type-only and moves the discovery/service
option tokens into `tokens.ts` (public re-exports unchanged). The CLI now uses
`@swc/core` when installed and falls back to ts-node when it is absent or
`TSDI_AGENT_TRANSPILER=ts-node` is set. Measured on this machine (varies with load):
`--help` **3.4–8.0s** (ts-node fallback 12.2–21.9s, previously 15–57s), external-cwd
`tools list` **3.4–7.3s**, TUI first screen **10s** (previously 60–90s); a real
tool-using `run` and a streaming TUI reply both succeeded.

MCP validation (no code change): an isolated `--root` with a local stdio server added
through `mcp add demo --command "node mcp-echo.js" --allow echo` was discovered and
called from the TUI (`mcp call tool: echo` → `echo:hello-from-mcp`), confirming the
newline-JSON transport, allowlist gate and dynamic tool path end to end.

## agent-tools

| Commit | File | Root cause |
| --- | --- | --- |
| `86a41b6d3` | `files/read-file.tool.ts` | `read_file` on a directory leaked Node's raw `EISDIR: illegal operation on a directory, read`, which is not actionable (AGENTS.md §9). Now raises `Path '<p>' is a directory; use list_dir to inspect its entries.` |
| `c89f8b197` | `knowledge/knowledge-search.tool.ts` | `knowledge_search` dropped the tool context, so the in-memory adapter never observed `AbortSignal` (Esc could not stop it). Now forwards `context.signal` via a typed option, and `DefaultKnowledgeAdapter.search` rejects with `AbortError` when already aborted. |
| `91649673f` | `web/domain-policy.ts` | Domain allowlist used `String.includes()` (substring) → `https://evil.com/?x=example.com`, `https://example.com.evil.com/`, `https://notexample.com/` all passed. Now matches the URL **hostname** (exact or `.sub`). |
| `f257e783b` | `git/git-operations.tool.ts` | `stash_pop`/`stash_list` set `args[0] = 'stash pop'` as one token; `spawnSync('git', argv)` has no shell → git got the invalid subcommand and always failed. Now `['stash','pop']` as separate args. |
| `b4e519812` | `skills/remote-skill-manager.ts` | Registry manifest skill name was used raw in `path.join(destDir, id)`; a remote (`../`) name wrote `SKILL.md` outside the cache dir. Now skips ids with separators/`..`/absolute. |
| `91e3b7882` | `mcp/StdioMcpClient.ts` | Used LSP-style `Content-Length` framing, but MCP stdio is newline-delimited JSON (spec + reference SDK) → could not talk to any spec-compliant server. The old test mirrored the wrong framing. |
| `e502a26e0` | `mcp/StreamableHttpMcpClient.ts` | Omitting the spec-required `MCP-Protocol-Version` header (a MUST); strict servers 400 every request after init. |
| `c495bf095` | `mcp/mcp-oauth.ts` | Loopback callback matched by `pending.shift()` and ignored `state`; an early/instant callback was dropped and 400-ed → flow timed out. Now matches by `state` and buffers early callbacks. |
| `d638a49e8` | `mcp/mcp-oauth.ts` | `spawn('xdg-open', …)` missing-binary error is an async `'error'` event, not a throw → whole `mcp auth` crashed headless. Now attaches an `'error'` handler and prints the fallback URL. |
| `8c1935ac9` | `terminal/terminal.tool.ts` | Timeout sent only `SIGTERM`; a command that ignores it (or a shell holding the stdio pipe) never fired `close` → the tool hung forever. Now spawns a process group, escalates to `SIGKILL`, and always settles with `exitCode 124`. |
| `909f8b96f` | `process/ProcessRegistry.ts` | `kill()` sent only `SIGTERM`; a SIGTERM-ignoring background process kept `running=true`, leaking the session's process slot (`Process limit reached` forever). Now escalates to `SIGKILL`. |
| `db6098557` | `http/http-fetch.tool.ts`, `http/http-request.tool.ts` | The abort timer was cleared as soon as `fetch` resolved (headers), before `response.text()`; a server stalling the body hung the tool. Timeout now covers the body read. |
| `e87fd7741` | `files/path-policy.ts` | Missing paths leaked a raw `ENOENT: … lstat …`; now an actionable message with `code` preserved. |
| `f4dd4c626` | `files/simple-diff.ts` | `edit_file`/`write_file` returned an unordered diff; now a real ordered unified diff. |
| `5da6bbd54` | `planning/todo.tool.ts` | `action` used a strict enum, rejecting unknown values; now unknown values are treated as an update. |
| `37308fb01` | `planning/todo.tool.ts` | `kind`/`status` still used strict enums, so a model's unknown kind (e.g. `kind:"test"`) **hard-rejected the whole plan update** before the store's lenient `normalizeKind`/`normalizeStatus` could run; the `status` enum also omitted `failed`, which `TodoStatus` supports. Both are now free strings with allowed values moved into the description, matching `action`. Reproduced on a real DeepSeek-driven build run. |
| `12ca547bd` | `src/nested-agent-runner.ts` | `parseDelegatedAgentReport` matched only `^\s*Summary:`, so a delegated worker's markdown report (`## Summary:`, `- **Summary:**`, `**Next steps:**`) never parsed → the runner looped it up to `maxTurns` with "Continue the delegated task…" even after it finished. Now strips heading/bullet/bold decoration, accepts `**`/fullwidth colon, and normalizes the label for the multi-value check. A forced `spawn_agent` run whose worker emitted `- **Summary:** …` now finishes in one turn. |
| `8613e12a7` | agent `model/ModelRequest.ts`, `runtime/{AgentTurnInput,DefaultAgentRuntime}.ts`, `model/{OpenAICompatible,Anthropic}ModelAdapter.ts` + agent-tools `src/lightweight-agent-runner.ts` | `llm_task` documented and forwarded `model`/`temperature`/`maxTokens`, but `runSingle` passed only `reasoning`, so all three were silently dropped. Threaded as per-turn overrides (`AgentTurnAgentConfig` → `ModelRequest` → adapters with `request.X ?? default`); response `metadata.model` now reports the model actually used instead of the configured one. A real `llm_task` run with `model='deepseek-v4-pro'` now reports and uses it. |
| `7aeef2965` | `files/stat.tool.ts` | Missing path threw a raw ENOENT instead of returning `exists:false`. |
| `65ed5a70a` | `git/git-operations.tool.ts` | Read-only actions in a non-git workspace errored instead of degrading to an informational result. |
| `3c59646dd` | `files/read-file.tool.ts`, `harness/ToolOutputSpill.ts` | Truncated reads returned no `nextOffset` and could be re-compressed by the generic output truncation. |
| `e976c7a26` | `web/web-extract.tool.ts` | A 2xx fetch of a JS-rendered page extracted to `content: ''` but reported **success with no signal**, so the model retried URLs blindly (observed in a real web run). Empty extraction now returns `empty: true` plus an actionable `warning`; `content`/`title`/`url` and the success verdict are unchanged. |
| `ebabdd9ed` | `mcp/LocalMcpClientRegistry.ts` | `mcp.call_tool` rejected an un-declared/un-allowlisted tool with `not declared or allowlisted` but never said how to enable it — a real MCP run (local stdio server configured the way `mcp add` writes it) dead-ended until the turn timed out. The message now names the exact fix (`tools` declaration or `allowedTools` entry in `settings.json`). The discovery-hint and allowlist-gate behaviors are intended (test-locked) and unchanged. |
| `0242f31a4` | `project/project-intel.tool.ts` | `project_intel` is a pure formatter of caller-supplied `task`/`todos`/`notes`, but its description read like workspace analysis, so a real run called it 3× expecting analysis, got an echo of its own task, and reported it "misconfigured". The description now states it does not inspect the workspace or read files. |
| `31654ae86` | agent `scheduler/NextRunCalculator.ts` + agent-tools `cron/cron-manage.tool.ts` | `cron_manage`'s own `cron_expr` example is standard 5-field (`"0 9 * * *"`), but `parseCronExpr` required 6 fields and rejected it (`expected 6 fields`), forcing a retry. 5-field cron is now accepted (seconds default to 0); 6-field stays canonical. |
| `a4515c1da` | `files/apply-patch.tool.ts` | A non-matching hunk (16 occurrences in the production DB — the top input friction) already had an actionable message but forced a full re-read. Added an opencode-style `nearestAnchorHint`: a hunk line that does exist in the file, with its line number and a ±2-line excerpt, so the model can correct the patch in one retry. |
| `3bd47784d` | agent `prompt/sections/{Identity,Tools}Section.ts` | The system prompt still advertised `project_intel` for "project/workspace analysis" after the description fix, contradicting the formatter behavior. The two guidance lines now say it produces "a structured summary of the context you/they provide". |

## agent-ui

| Commit | File | Root cause |
| --- | --- | --- |
| `0e215b4fc` | `AgentConsoleSessionState.ts` / `run-command.ts` (agent + agent-cli) | Non-interactive `run` waited the full 30s approval timeout for every gated call (no UI can answer). Added opt-in `tools.approvalAutoDeny` (default false) wired into `resolveApprovalManager`; the `run` paths set it so gated calls are denied immediately with the strategy reason. |
| `4660e3887` | `AgentConsoleSessionState.ts` | `suggestionsHint` / `approvalsHint` stayed the English overlay defaults under zh (`enter 执行` mixed). `ZH_CONSOLE_HINTS` now also covers them (pure zh). |
| `afbafda87` | `AgentConsoleSessionState.ts` | The projected command-execution row hardcoded its status word (`running` / `completed` / `cancelled` / `failed`) and the `Command` fallback, so a zh host showed `$ /x failed: …`. They now resolve `agent.command.status.*` / `agent.command.label` (en / zh-CN). |
| `40d42b3af` | `AgentConsoleCommandDispatch.ts` | `Unknown command:` / `Ambiguous command:` were hardcoded English, so a zh host showed English for mistyped commands. Added `agent.command.unknown` / `agent.command.ambiguous` (en / zh-CN) and routed the dispatch through `state.translateLabel()`. |
| `05b0a4d1d` | `AgentConsoleSessionState.ts` | Keyboard hints (`selectHint`, `sessionHint`, `messagesHint`, `toolsHint`, `toolRunsHint`, `messageDetailHint`, `selectCloseHint`, `reviewDetailHint`) defaulted to English, so a zh host showed `up/down move   enter confirm   q cancel`. `ZH_CONSOLE_HINTS` now replaces the instance options under a zh locale (English defaults untouched). |
| `e9b6855af` | `AgentConsoleSessionState.ts` | Default `timelineLabels` / `messageStatusLabels` were hardcoded Chinese, so an en-locale host showed `正在执行` and Chinese timeline sentences while the catalog rendered English (`EN_TIMELINE_LABELS` was test-only). Defaults now follow `translator.currentLocale`; the shared default object is cloned, not mutated. |
| `569c87276` | `AgentConsoleSessionState.ts` / `AgentConsolePanels.ts` | The status line (`Approval required: …`) and the context diagnostics (`context unchanged · level light · …`) were hardcoded English. The state now injects the translator for `agent.context.*`, and the status panel renders `agent.status.approvalRequired` (en / zh-CN). |
| `72a41fc71` | `AgentConsolePanels.ts` | The approval detail printed the agent's English reason verbatim. It now prefers `agent.approval.reasonCode.<code>` (en / zh-CN) with the raw reason as fallback; the state and both event bridges forward `reasonDetail`. |
| `4837b5ede` | `AgentConsoleComponent.ts` | Approval prompts rendered from events, but resolving them read only the injected approval manager (null in the CLI) and fell back to an unconfigured appRpc → `Approval is not configured`; `a`/`d` silently did nothing until the 30s timeout. The console now uses the runtime's actual gating manager. |
| `9686bddfb` | `AgentConsolePanels.ts` | The approvals panel hardcoded English for the title, actions, count, detail (`Reason:`/`Expires in`) and accessibility labels, bypassing i18n (AGENTS.md §9). Now resolves `agent.approval.*` through the translator (en / zh-CN) with English fallbacks. |
| `4078d2abc` | `AgentConsoleApprovalView.ts` | The `/approvals` selector hardcoded its title and detail labels (`Pending approvals`, `Tool:`/`Reason:`/`Input:`/`Timeout:`/`Expires:`). Now takes a `translate` callback (English fallback) and resolves `agent.approval.*` (en / zh-CN). |
| `316a1fc09` | `AgentConsoleMessageRenderers.ts` | Timeline role labels (`Thought · `, `Tool · `, `Plan · ` …) were static English fields and stayed English under zh-CN. The kind renderer now resolves `agent.timeline.<kind>` through the translator; a host override keeps its own label (compared against the English default). |
| `4cc350387` | `AgentConsoleSuggestions.ts` | The `/` command menu triggered on any whitespace-preceded `/word` (e.g. a path in `check /tmp/foo`); with the fallback-to-all-commands the menu stole Enter and replaced the user's text. Now only a line-start `/` token triggers it. |
| `15745c8da` | `AgentConsoleMessageRenderers.ts` | `command-execution` rows fell through to `resolveAgentConsoleMessageStatus`'s default `success`, so **running** (and failed) `/` commands always showed the ✓ glyph. Now maps running→●, failed→✕. |
| `f2ffd1249` | `AgentConsoleTimelineWindow.ts` | Collapsed-turn summary summed every member's `durationMs`, double-counting the turn-level duration (showed ~2× the real turn time). Now prefers the turn event's duration. |
| `e5797e346` | `AgentConsoleMessageRenderers.ts` | Removed the stray leading vertical rail on timeline messages. |
| `be202b679` | `AgentConsoleSuggestions.ts` | An exact command name did not win over a longer name it prefixes (`/compact` vs `/compactions`). |
| `558eea519` | `AgentConsoleSessionState.ts` | `turnStartedAt` was not reset after a cancelled turn, so the next turn's Working timer kept counting. |
| `624a4d098` | `AgentConsoleMessageTemplates.ts` | A collapsed long tool row lost its summary when expanded. |
| `029873ed7` | `AgentConsoleFocusLayers.ts`, `AgentConsoleSessionState.ts` | Pressing Esc on an `ask_user` prompt did not sync the cancel to the server → the question reappeared on reconnect. |
| `e1ff13627` | `AgentConsoleSessionState.ts` | An `ask_user` answer was not sent back to the agent / did not resume the turn. |
| `54fd10346` | `AgentConsoleEventBridge.ts`, `AgentConsoleStreamHelpers.ts` | Unmapped tool labels leaked the raw key instead of a readable name. |
| `f30d6a4fd` | `AgentConsoleTerminalInputController.ts` | A bracketed-paste payload was treated as a submit. |
| `dba8ffbd1` | `AgentConsoleTerminalInputController.ts` | Multi-line paste lost its newlines (lines were concatenated and submitted). |
| `ad6c97e65` | `AgentConsoleEventBridge.ts` | The bridge did not inject `ApplicationContext`, so it never subscribed and the `ask_user` panel never appeared. |

## agent-cli

| Commit | File | Root cause |
| --- | --- | --- |
| `28b8a2799` | `run-command.ts` | Follow-up: the JSON/RPC `run` path missed the `approvalAutoDeny` merge (the earlier patch matched a similar line in `runAgentStreaming`), so `run --json` still waited 30s per gated call. Patched; `run --json` now finishes in ~9s with 0 approval timeouts. The earlier "AgentModule `asDefault` shadowing" hypothesis was retracted (a minimal @tsdi experiment shows the outer provider overrides the inner `asDefault`). |
| `d794dff27` | `src/mcp-command.ts` | `mcp auth --root X` ignored `--root`, storing the token under the default root while `mcp list --root X` read `X`. |
| `356b601c7` | `src/{run-command,run-console}.ts` + agent-tools `skills/{remote-skill,plugin}.tool.ts` | The skills feature was **entirely unwired in the CLI**: `provideSkills` (skill tools + registry + catalog section + interceptor) had no production caller, the CLI read `skills.roots` but never used it, and agent-ui's `skill_list` invocations silently failed. Also `skills_remote`/`plugins` had no `activation` and their `skills` toolset was in neither the always-active nor deferred set, so `tool_inspect` reported `activated=false` and they were unreachable. Now the CLI calls `provideSkills(...)` and both tools declare `activation = always`. Verified in a real TUI run: `skills_remote install` from a mock registry installed 1 skill and skipped `../evil-skill`/`nested/deep`. |
| `550848ad8` | `src/mcp-command.ts`, `src/cli.ts` | `mcp add --command "node server.js"` stored the whole string in `command`, but `StdioMcpClient` runs `spawn(command, args)` (no shell) → ENOENT (server unusable) while the CLI printed it as valid; and the CLI had no way to set `allowedTools`, so CLI-added dynamic MCP tools were never callable. `--command` is now tokenized (quote-aware) into `command` + `args`, and `mcp add --allow <tool>` (repeatable) writes `allowedTools`. A local stdio MCP server added this way is now callable end-to-end (`echo: hello-from-mcp`). |
| `86fe48b4e` | `src/config.ts` | `settings.json` top-level `cancel`/`q` sentinels and empty profiles were not sanitized (not self-healed). |

## agent / agent-gateway / components / agent-ssh / agent-desktop

| Commit | File | Root cause |
| --- | --- | --- |
| `9bf918ab6` | `agent-app-server.module.ts` | The in-process stream bridge (`mapRunTurnStreamChunk`) relayed only a fixed field list and dropped `durationMs`, so the TUI's tool rows fell back to `Date.now() - row.createdAt` — showing model-generation time (`69s`/`5.5s`) instead of the real receipt duration (`16ms`/`12ms`). It now forwards `durationMs` (+ `approvalId`/`report`/`diagnostics`). |
| `72a41fc71` | `tools/ToolApprovalManager.ts` | Approval `reason` was a free-form English string only, so host UIs could not localize it. The request/view/event now carry an optional `reasonDetail { code, params }` populated from `ApprovalStrategy.reasonDetail?()`; `DefaultApprovalStrategy` emits `tool-requires-approval` + tool params. |
| `fe4f64ce3` | gateway `api/EventHandler.ts` | `tool_completed` collapsed the `ask_user` structured output via `summarizeValue`, so the client could not render the question panel. |
| `83740cf79` | gateway `gateway/GatewayBootstrap.ts` | The bootstrap's `@Optional()` constructor injections (`rpc`, `events`, `reviews`, `stats`, `approvals`, `shares`, `evals`, `chatWs`) were **all null at start() time** (a DI-order miss that `@Optional` swallowed silently), so the HTTP gateway registered only 25 of 33 routes — **`/rpc` and `/rpc/stream` were never registered**, breaking the browser/desktop UI over HTTP (`AppRpcHandler` resolved fine via `ctx.get` after bootstrap, proving a timing issue). Optional handlers are now resolved lazily from the injector in `start()`. Verified against a real booted `AgentGatewayModule`: routes 25→33, and `POST /rpc/stream {session.create}` succeeds. |
| `e92b67ea7` | agent `runtime/DefaultAgentRuntime.ts` + agent-tools `src/lightweight-agent-runner.ts` | The nested runner imported the sub-agent transcript into the parent session **verbatim**, so the child's user/assistant/tool turns landed between the parent's assistant `tool_calls` and the `spawn_agent` tool result. The next model request was rejected with 400 ("An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'") and the run crashed. The import is kept for display but every message is tagged (`IMPORTED_MESSAGE_METADATA_KEY`) and `buildModelRequest` excludes tagged messages. Reproduced on a real DeepSeek run. |
| `23b2ea8d4` | agent `model/OpenAICompatibleModelAdapter.ts` | A stream interruption was not degraded/retried based on un-emitted body, and the reasoning phase showed no status. |
| `7a1961a57` / `d7ad4bbb7` | agent `prompt/sections/IdentitySection.ts` | The prompt forced `ask_user` / a `git diff` check in non-git workspaces. |
| `acd3ad623` | components `common/src/input.ts`, `console/src/input.ts`, `console/src/terminal.ts` | Terminal escape sequences were consumed non-atomically and batched keys were not tokenized. |
| `05369cbda` / `f191b5b05` | components `console/src/terminal.ts`, `common/src/input.ts` | Enabled bracketed paste; added `shouldSubmitCommonTextInputChunk`. |
| `79698f110` | agent-ssh `src/ssh-client.ts` | `knownHosts: 'strict'` never accepted any host: `loadKnownHosts` only kept lines whose third column was literally `sha256`, and it compared a SHA256 fingerprint against the stored public key. Now parses real `known_hosts` lines and compares the key. |
| `7348ca435` | agent-desktop `src/desktop-html.ts` | The window title was interpolated raw into `<title>`; a `</title>` broke out and injected markup. Now HTML-escaped. |

## Tests / refactors (no behaviour change)

- `bebf9a4cc` — timeline transcript expand contract (Enter → inspector; `e` → toggle, keyed by id).
- `f1304745c`, `095c8dc32` — exact-command precedence, PageUp viewport scroll.
- `b57350183`, `c64142807` — extractions/compaction to stay under the source-size ratchet.

## Verified as contract/intended (not defects)

- `glob_search` / `content_search` **reject** a result set containing an escaping symlink — asserted by `test/tools.spec.ts` ("filesystem tools reject symlink paths in workspace"); `list-dir` deliberately skips instead.
- Timeline session footer `完成 · 耗时 X` (session-elapsed) and the `✓` glyph on non-event rows in timeline mode — asserted by `p291-session-header-footer.spec.ts` and `p237-b2-width-glyph-aria.spec.ts`.
- `code-execution` has no strong sandbox (worker runs with full Node access) — documented limitation (`README` "no universal sandbox runtime").
- HMAC webhook signature verification is timing-safe and uses the raw body; share tokens are 192-bit random with ownership checks.

## typeorm-adapter

| Commit | File | Root cause |
| --- | --- | --- |
| `3037c701f` | `typeorm-adapter/TypeormAdapter.ts` | sql.js `autoSave` rewrote the whole DB file in place; a killed process truncated the production DB (9MB → 4MiB, malformed). The adapter now overrides the driver save with a `<location>.tmp` write + atomic rename, so a crash leaves the last consistent file. |

## 2026-10-21 timeline selection reveal

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `components/console/src/terminal.ts`, `agent-ui/src/AgentConsolePanels.ts`, `AgentConsoleTranscriptLayout.ts`, `AgentConsoleTranscriptNavigation.ts`, `AgentConsoleComponent.ts` | Moving the message selection (PageUp/PageDown/↑/↓) only changed `selectedMessageId`, so the highlighted message could stay offscreen. The panel now reports the rendered row offset (item lines + `spacerBefore` rows) and the TUI surface scrolls that absolute row into view via `scrollViewportToRow`. |

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `typeorm-adapter/src/TypeormAdapter.ts` | Follow-up to the atomic sql.js save: the override read `driver.database`, but TypeORM 0.3.x exposes the connection as `databaseConnection`, so every autoSave took the `if (!database) return;` path and **wrote nothing**. Now both field names are resolved and an unreadable connection falls back to the driver's own `save` instead of silently dropping the write; the unit test now models the real driver shape. |

## 2026-10-21 startup (real profile-driven)

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent/src/memory/SessionStore.ts`, `TypeOrmSessionStore.ts`, `TypeOrmSessionReads.ts`, `agent-gateway/src/api/SessionHandler.ts` | Session lists loaded every transcript just to count messages (`sessions.get()` per session). Added `listSessionFacts()` (session row + section counts) with a `get` fallback and used it for `listSessionInfos` / `listOwned`; `deriveSectionInfos` gained an optional precomputed-counts argument. |
| (this commit) | `agent-gateway/src/auth/SessionOwnerStore.ts` | Every authorized RPC read the whole transcript to check the owner. `getOwner` now uses `SessionStore.getOwnerPrincipalId()` (single-column query in TypeORM), keeping a legacy `has`+`get` fallback for lighter stores. |
| (this commit) | `agent-gateway/src/usage/UsageStats.ts` | The global usage digest deserialized every session to read `metadata.usage`. Added `SessionStore.listMessageUsageRecords()` (metadata-only query in TypeORM) with the transcript path as fallback. |
| (this commit) | `agent-cli/bin/transpile-cache.js`, `bin/tsdi-agent.js` | Each start re-transpiled the whole dependency graph (ts-node has no disk cache). The `.ts` loader output is now cached under `~/.tsdi-agent/transpile-cache` keyed by path + mtime + size + tsconfig stamp, falling back to the loader on any miss/error. |

## 2026-10-21 timeline copy (real session findings)

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent-ui/src/AgentConsoleSessionState.ts` | The component re-applied `defaultAgentConsoleOptions` (zh labels/hints) after the state had selected labels from the host locale, producing a mixed-language timeline. Locale overrides are now remembered and re-applied unless the host passes its own. |
| (this commit) | `agent-ui/src/AgentConsoleSessionState.ts`, `AgentConsoleTimelineWindow.ts` (labels split into `AgentConsoleTimelineLabels.ts`) | Plan summaries counted `cancelled` steps as failures (`3/4 步，1 个失败` next to `1 cancelled`). Failure and cancellation are now separate, non-zero-only segments. |
| (this commit) | `agent-ui/src/AgentConsoleTimelineEventPresenter.ts` | `todo` rows printed the requested delta and the resulting counts together (`2 items … · 3 items …`). The delta is dropped when the result summary exists. |
| (this commit) | `agent-ui/src/AgentConsoleMessageRenderers.ts` | While a turn was still running, the preamble reply rendered `Worked for 29s · done …`, which reads as "finished". Only final replies carry that footer now (`metadata.preamble` / `conversationPhase` are skipped). |
| (this commit) | `agent-ui/src/agent-ui.i18n.tools.ts`, `agent-ui.i18n.ts` | 63 builtin tools (`read_skill`, `memory.*`, `sessions_*`, `ssh_*`, `lsp_*`, `mcp.*`, …) had no display label, so rows rendered the humanized identifier and stayed English under a zh locale. Both bundles now carry the labels; a parity/coverage spec guards them. |

## 2026-10-21 zh locale round-trip

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent-ui/src/AgentConsoleSessionState.ts`, `AgentConsoleComponent.ts` | The state resolved labels from the translator before the i18n module set the final locale, so a zh host rendered English labels (`Cancelled · Turn cancelled`) next to Chinese chrome. `applyLocaleDefaults()` now runs from `configure()` too, zh overrides include labels (symmetric with en), and the constructor copies the default options instead of mutating the shared object. |
| (this commit) | `agent-ui/src/AgentConsoleMessageRenderers.ts`, `agent-ui.i18n.ts` (via `AgentConsoleTimelineMeta.ts`) | The cancelled row's boilerplate came from persisted English text and a hardcoded `Cancelled · ` role label. The renderer now resolves turn-cancelled boilerplate from the label catalog (custom reasons verbatim) and diagnostic role labels from `agent.timeline.*`. |
| (this commit) | `agent-ui/src/AgentConsoleSessionState.ts` | zh input placeholder was always `Ask code or files`; added to `ZH_CONSOLE_HINTS`. |

## 2026-10-22 shell output summary volume

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent/src/tools/ToolSummary.ts` | A 200-line stdout summarized as `exit 0 · line 1`, which reads as a single-line output. Outputs longer than 5 lines now summarize their volume (`exit 0 · 200 lines`); short outputs keep the first line. |

## 2026-10-22 tool output inspector

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent/src/memory/SessionStore.ts`, `TypeOrmSessionStore.ts`, `TypeOrmSessionReads.ts`, `agent-gateway/src/app-rpc/session-tool-payload.ts`, `session-messages.ts`, `agent-ui/src/AgentConsoleSessionState.ts`, `AgentConsoleComponent.ts` | Long tool output was unreachable in the TUI: event rows only carry a one-line summary and loaded transcripts drop `role='tool'` payload messages. The event inspector now fetches one payload by `toolCallId` via `session.tool_payload` (single-row query, JSON envelope flattened to readable output) and renders it under `Raw output`. |
| (this commit) | `agent-ui/src/AgentConsoleFocusLayers.ts` | Enter delivered as a bare `\r` (no `controlKey`) normalized to `''`, so `enter open` did nothing in the transcript/message focus layers. Raw CR/LF now maps to `enter`. |
| (this commit) | `agent-ui/src/AgentConsoleMessageNormalization.ts` | Resuming a session dropped the tool history: `role='tool'` messages were discarded (raw JSON) and UI event rows are not persisted. They are now projected into read-only event rows (`uiKind='event'`, summary + duration + `timeline.toolCallId`), so the transcript keeps the tool history and the inspector can still fetch the payload on demand. |
| (this commit) | `agent-ui/src/AgentConsoleSessionState.ts`, `AgentConsoleMessageRenderers.ts`, `agent-ui.i18n.ts` | A plan restored after a restart still rendered `Plan · Running …` although no turn was running, and its collapsed summary was hardcoded English. Plan rows only claim running while a turn does (`planLive` metadata), and the collapsed summary uses `agent.timeline.planSummary` (en/zh). |

## 2026-10-22 test stability

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent-gateway/test/p405-turn-stream-stack-propagation.spec.ts` | The assertion looked for the test frame in a captured stack that was exactly 10 frames deep (V8's default `Error.stackTraceLimit`) — the async RPC frames filled the budget and truncated it intermittently. The spec raises the limit around the call and restores it. |

## 2026-10-22 approval gate (enabled by default)

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent/src/tools/ToolApprovalManager.ts`, `agent/src/tools/approval-categories.ts`, `agent/src/harness/HarnessProfile.ts`, `agent/src/runtime/DefaultAgentRuntime.ts` | The documented default rules never fired: rule strings (`shell.exec`, `fs.write`) were compared with tool names, and no `fs` category existed, so shell commands and file writes ran un-gated. Rules now match by tool name **or** approval category (new `fs` category), and an explicit empty `requireApproval: []` disables the gate. |
| (this commit) | `agent-ui/src/AgentConsoleFocusLayers.ts`, `AgentConsoleSessionState.ts`, `AgentConsoleComponent.ts`, `AgentConsolePanels.ts`, `agent-ui.i18n*.ts` | Approvals had no session-wide escape hatch. `A` in the approval panel approves and enables auto-approve for the session (`setAutoApprove`), with a localized notice and hint (`a 允许 d 拒绝 A 始终允许 …`). |

## 2026-10-22 slash/mention menus

| Commit | File | Root cause |
| --- | --- | --- |
| (this commit) | `agent-ui/src/AgentConsoleSuggestions.ts`, `AgentConsoleCommandRegistry.ts`, `AgentConsoleSessionState.ts`, `agent-ui.i18n.ts` | The inline command menu used subsequence matching (`/se` listed `/resume`, `/side`, `/statusline`) and hardcoded Chinese group labels; `@` listed tool mentions before workspace files, and async file suggestions kept the highlight on a tool mention (`@tim` + Enter submitted `@time`). Commands now rank exact > prefix > substring (fuzzy only as fallback), group/mention labels are localized, files precede tools, and the highlight resets to the best match unless the user moved it. |

| (this commit) | `agent-ui/src/AgentConsoleOverlay.ts`, `AgentConsoleFocusLayers.ts`, `AgentConsoleSessionState.ts` | The hint advertises `tab 补全` but Tab accepted **and executed** the highlighted command (`/se`+Tab opened `/settings`); the terminal also delivers Tab as a bare `\t`. Tab now returns a distinct `complete` decision (fill without executing) and raw `\t` is normalized to `tab`. |

| (this commit) | `agent-ui/src/AgentConsoleSuggestions.ts` | A typo (`/nosuch`) fell back to the full command list, so Enter executed the first unrelated command instead of reporting an unknown command. No-match now yields an empty menu; a bare `/` still lists everything. |
| (this commit) | `agent-ui/src/AgentConsoleSuggestions.ts`, `AgentConsoleWorkspaceMentions.ts` | A bare `@` listed every tool mention (~64) before any workspace file, and the agent's own `.tsdi-agent` spill directory was offered as a mention (top-level listings skipped the ignore list). Tools now appear only for queries ≥2 chars and the storage directory is excluded. |
| (this commit) | `agent-ui/src/AgentConsoleCommandRegistry.ts`, `AgentConsoleSuggestions.ts`, `AgentConsoleTerminalInputController.ts`, `AgentConsoleCommandHandlers.ts`, `agent-ui.i18n.ts` | Command descriptions were English-only in the `/` menu, palette and `/help`. A `describe` hook now resolves `agent.command.desc.*` at all three surfaces (zh catalogs for the 49 core/session commands; English falls back to the definition text). |
| (this commit) | `agent-ui/src/AgentConsoleCommandRegistry.ts`, `agent-ui.i18n.ts` | Subcommand rows in `/help` (`/diagnostics trend`, `/delegation tree`, …) stayed English; they now resolve `agent.command.sub.<parent>.<sub>` through the same describe hook (10 zh entries). |
| (this commit) | `agent-cli/bin/tsdi-agent.js` | Two startup shortcuts were attempted and reverted after A/B measurement: a hand-written SWC `.ts` loader (median 2069ms vs ts-node 1634ms) and lazy `cli-highlight` (2088ms vs 2039ms). The comment records both so they are not retried; the remaining startup cost is module evaluation, which needs bundling. |
| (this commit) | `scripts/agents-gate.sh` | `gate-regression` failed on wall-clock spikes (host load) even though the functional stages passed. The stage now re-measures the DOM/TUI gate metrics once before failing (same baseline and thresholds) and reports `(passed on re-measure)`; thresholds stay strict. |
| (this commit) | `typeorm-adapter/src/TypeormAdapter.ts` | The atomic sql.js save staged into a fixed `<location>.tmp`, so two agents writing the same database clobbered each other's staging file: the loser failed with `ENOENT: rename '<db>.tmp' -> '<db>'` and lost its writes. The staging file is now per-process (`<location>.<pid>.tmp`); simultaneous writes no longer crash (lost updates remain inherent to the single-writer sql.js model and are documented). |
| (this commit) | `agent-cli` bundle (`scripts/build-bundle.mjs`, `bin/bundle-state.js`, `src/cli-entry.ts`) | A warm CLI start evaluated ~2,100 modules (workspace sources, typeorm, rxjs, highlight.js). The CLI now loads an optional SWC+esbuild bundle (`npm run bundle`), which brings first TUI paint from ~2.0s to ~0.8s (module loads 8,454 → 375). The bundle is used only while every input matches the build manifest; otherwise the CLI falls back to sources, so stale code never runs (`TSDI_AGENT_BUNDLE=0/1`, `TSDI_AGENT_BUNDLE_LOG=1`). Decorator metadata is preserved by transforming with SWC before bundling; `sql.js`, `jsdom` and native/optional drivers stay external. |
| (this commit) | `agent/ToolApprovalManager` | Auto-resolved approvals (session-wide `A`, `autoDeny`, A2 reviewer) published `AgentApprovalRequestedEvent` before completing, so hosts rendered an "Approval required" status/row for every subsequent gated call even though nobody had to answer (and remote clients showed an unanswerable request). Those paths now publish only the outcome event; the audit record is unchanged. Human-gated calls still request first. Covered by `approval-events.spec.ts` (5 cases, 3 failed before the fix). |
| (this commit) | `agent-gateway` + `agent-ui` stream relay | Approval panels degraded to the composed `content` text (`$` line and `Reason:` line showed the same sentence, and the panel re-rendered after approval): the stream relay dropped structured fields in three hand-maintained whitelists (`AppRpcServer.toStreamEventChunk`, `mapRunTurnStreamChunk`, `HttpAgentConsoleAppRpc.stream`). All three now forward the full chunk; the approval mapping moved to `approval-chunk.ts` (`AppRpcServer` 3684 → 3647 lines). The UI prefers structured fields and keeps the first-arrival details on duplicate upserts. Also restores `durationMs`/`report`/`diagnostics` through the HTTP client. Tests: 6 cases (4 red before the fix); gateway 326, agent-ui 1589 passing. |
| (this commit) | `agent-cli` bundle build | The bundle inlined `tr46`/`whatwg-url`, which require the deprecated built-in `punycode`, so every bundled start printed a `DeprecationWarning` above the TUI. The build aliases `punycode` to the userland package; `doctor` stderr is clean and `--help` still matches the source path. |
| (this commit) | `agent-ui` approval hint | The panel read `A Always allow` next to `Allow <tool>?`, but `A` approves every gated tool for the session (a real TUI run showed `write_file` running unapproved after a terminal allow). The hint now says `A Always allow (session)` / `A 本会话始终允许` so the scope is explicit. |
