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

A third real TUI run (the `note-system` test gained an `update()` assertion; the module
still exported only `add/list/remove`) validated the first two fixes end to end: the
failing row showed `exit 1 · SyntaxError: The requested module '../src/note.js' does not
provide an export named 'update'`, and the non-git `git_operations diff` produced
`--- a/src/note.js` / `@@ -17,6 +17,20 @@` with the real `update()` body. After the
patch, `node test/note.test.js` reported `note tests passed`.

Startup investigation: `@swc/core` through ts-node reduced the `--help` path to ~7.7s,
but the transformed CommonJS output hit a chain of circular value imports — first
`Cannot access 'TranslatorService' before initialization` (`packages/i18n`), then
`Cannot access 'InMemoryServiceDiscovery' before initialization`
(`packages/microservices/discovery`, which imports `DISCOVERY_OPTIONS` from the module
that imports the class). Making SWC viable requires moving those tokens into separate
files and auditing the rest of the graph; it is not a drop-in replacement. The SWC
experiment was reverted and no dependency was added; startup remains TypeScript
transpile-bound.

## agent-tools

| Commit | File | Root cause |
| --- | --- | --- |
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
| `d794dff27` | `src/mcp-command.ts` | `mcp auth --root X` ignored `--root`, storing the token under the default root while `mcp list --root X` read `X`. |
| `356b601c7` | `src/{run-command,run-console}.ts` + agent-tools `skills/{remote-skill,plugin}.tool.ts` | The skills feature was **entirely unwired in the CLI**: `provideSkills` (skill tools + registry + catalog section + interceptor) had no production caller, the CLI read `skills.roots` but never used it, and agent-ui's `skill_list` invocations silently failed. Also `skills_remote`/`plugins` had no `activation` and their `skills` toolset was in neither the always-active nor deferred set, so `tool_inspect` reported `activated=false` and they were unreachable. Now the CLI calls `provideSkills(...)` and both tools declare `activation = always`. Verified in a real TUI run: `skills_remote install` from a mock registry installed 1 skill and skipped `../evil-skill`/`nested/deep`. |
| `550848ad8` | `src/mcp-command.ts`, `src/cli.ts` | `mcp add --command "node server.js"` stored the whole string in `command`, but `StdioMcpClient` runs `spawn(command, args)` (no shell) → ENOENT (server unusable) while the CLI printed it as valid; and the CLI had no way to set `allowedTools`, so CLI-added dynamic MCP tools were never callable. `--command` is now tokenized (quote-aware) into `command` + `args`, and `mcp add --allow <tool>` (repeatable) writes `allowedTools`. A local stdio MCP server added this way is now callable end-to-end (`echo: hello-from-mcp`). |
| `86fe48b4e` | `src/config.ts` | `settings.json` top-level `cancel`/`q` sentinels and empty profiles were not sanitized (not self-healed). |

## agent / agent-gateway / components / agent-ssh / agent-desktop

| Commit | File | Root cause |
| --- | --- | --- |
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
