# Agent console + tools fix log — 2026-10

Real end-to-end simulation testing of the `@tsdi/agent*` stack (real TUI over PTY, real
ORM/DB, real MCP/OAuth transports, fake model + acceptance harness; on 2026-10-15, a real
DeepSeek model driving the real CLI/TUI over an isolated `--root`). Each entry records
the root cause and the commit; every fix ships a regression test that **fails on the old
implementation and passes on the new one**.

- Branch: `7.tui` · Pushed to `gitree` (gitee); `origin` intentionally not pushed.
- Scope: `packages/agents/*` and the `packages/components/*` touched by agent input.

## agent-tools

| Commit | File | Root cause |
| --- | --- | --- |
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
| `7aeef2965` | `files/stat.tool.ts` | Missing path threw a raw ENOENT instead of returning `exists:false`. |
| `65ed5a70a` | `git/git-operations.tool.ts` | Read-only actions in a non-git workspace errored instead of degrading to an informational result. |
| `3c59646dd` | `files/read-file.tool.ts`, `harness/ToolOutputSpill.ts` | Truncated reads returned no `nextOffset` and could be re-compressed by the generic output truncation. |

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
| `86fe48b4e` | `src/config.ts` | `settings.json` top-level `cancel`/`q` sentinels and empty profiles were not sanitized (not self-healed). |

## agent / agent-gateway / components / agent-ssh / agent-desktop

| Commit | File | Root cause |
| --- | --- | --- |
| `fe4f64ce3` | gateway `api/EventHandler.ts` | `tool_completed` collapsed the `ask_user` structured output via `summarizeValue`, so the client could not render the question panel. |
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
