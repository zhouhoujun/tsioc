# Prompt Cache / Sandbox Architecture

This note defines the unified policy layer for `M5` under `packages/agents`.

## Goals

- stop treating provider prompt cache and tool sandbox rules as unrelated one-off flags
- expose one runtime-facing policy model
- preserve backward compatibility with existing `promptCache: true` and tool sandbox options

## Prompt Cache Model

### Public config

Model configs should accept:

- `promptCache: boolean`
- `promptCache: { enabled, strategy, scopes, minContentChars, ttlSeconds }`

### Unified semantics

- `enabled`
  - whether prompt caching is requested at all
- `strategy`
  - `auto`: let provider-specific adapter choose the safest supported mode
  - `ephemeral`: prefer short-lived cache annotations
  - `persistent`: prefer durable reuse when the provider supports it
- `scopes`
  - `system`
  - `summary`
  - `memory`
- `minContentChars`
  - avoid cache annotations for tiny prompts that do not amortize provider overhead
- `ttlSeconds`
  - declarative hint for future providers with explicit cache lifetime controls

### Current provider mapping

| Provider family | Current support | Mapping |
|---|---|---|
| Anthropic | partial | `enabled` uses `cache_control: { type: "ephemeral" }` on system payloads |
| OpenAI-compatible | observe only | cache usage is read from response usage when available; request-side cache control is not emitted yet |
| DeepSeek via OpenAI-compatible adapter | observe only | same as openai-compatible |
| Echo | none | ignored |

This means `strategy=persistent` is currently a future-facing intent, not an immediately different wire behavior.

## Sandbox Capability Matrix

The codebase currently has two sandbox layers:

1. runtime tool-execution sandbox
   - `packages/agents/agent/src/harness/SandboxExecutor.ts`
2. agent-tools command/env guard
   - `packages/agents/agent-tools/src/sandbox-policy.ts`

The target model should classify tools by capability instead of requiring each tool to hard-code policy decisions.

### Capability classes

- `readonly_fs`
  - examples: `read_file`, `list_dir`, `glob_search`, `content_search`
- `workspace_write`
  - examples: `write_file`, `edit_file`, `mkdir`, `move_file`, `delete_file`
- `process_exec`
  - examples: `terminal`, `process.start`, `ai_cli`
- `vcs_exec`
  - examples: `git_operations`
- `code_exec`
  - examples: `execute_code`
- `network_fetch`
  - examples: `http_fetch`, `http_request`, `web_extract`
- `gui_capture`
  - examples: `screenshot`, `gui_control`

### Default isolation intent

| Capability | Default sandbox intent |
|---|---|
| `readonly_fs` | workspace-bound path guard, no extra process isolation |
| `workspace_write` | workspace-bound path guard, no extra network grant |
| `process_exec` | command allow/block policy + env filtering + process isolation when runtime sandbox is enabled |
| `vcs_exec` | same as `process_exec`, workspace-bound cwd required |
| `code_exec` | strongest available sandbox, no inherited secrets by default |
| `network_fetch` | provider/network allowlist policy |
| `gui_capture` | explicit host capability, local-only trust boundary |

## Rollout plan

1. `M5-ARCH`
   - define shared policy vocabulary
2. `M5-RUNTIME-1`
   - resolve prompt cache through one helper instead of raw booleans
3. `M5-RUNTIME-2`
   - assign default sandbox capability classes to tool groups
4. `M5-RUNTIME-3`
   - expose provider support / applied policy in runtime metadata and observability
5. `M5-TEST`
   - lock command/env/workspace compatibility matrix with regression tests

## Compatibility

- old `promptCache: true` remains valid
- old tool sandbox options remain valid
- new policy objects layer on top without forcing immediate provider or tool rewrites
