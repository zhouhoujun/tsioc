# Multi-Agent Delegation Architecture

This note captures the current `M2` delegation and worker aggregation model under `packages/agents`.

## Goals

- let a main agent delegate bounded work without depending on raw transcript parsing
- make worker outputs stable enough for aggregation, review, and follow-up planning
- preserve completed worker value when another worker fails
- expose worker failure isolation and retry behavior in task results and UI

## Scope

The current `M2` implementation spans:

- `packages/agents/agent-tools/agent/spawn-agent.tool.ts`
- `packages/agents/agent-tools/src/nested-agent-runner.ts`
- `packages/agents/agent-tools/coding/coding-task.tool.ts`
- `packages/agents/agent-tools/coding/coding-task-store.ts`
- `packages/agents/agent/src/tools/ToolSummary.ts`
- `packages/agents/agent-ui/src/AgentConsolePanels.ts`
- `packages/agents/agent-ui/src/AgentConsoleSessionState.ts`

## Delegation Contract

`spawn_agent` now returns a stable top-level shape for delegated worker results:

- `summary`
- `diff`
- `completed`
- `nextSteps`
- `risks`
- `artifacts`
- `report`

`report` remains the canonical structured payload, while the top-level fields let a caller consume the result without unpacking nested data.

## Worker Report Schema

Delegated worker reports use these labels:

- `Summary:`
- `Diff:`
- `Completed:`
- `Next steps:`
- `Risks:`
- `Artifacts:`

`DelegatingSpawnAgentAdapter` parses those labels from nested-agent output when the runner does not provide a structured report directly.

## Coding Task Aggregation

`coding_task run` now returns direct aggregate fields in addition to the persisted task:

- `executionMode`
- `diff`
- `workers`
- `aggregate`
- `report`
- `summary`
- `nextSteps`
- `risks`
- `artifacts`
- `rollback`

This makes `coding_task` consistent with `spawn_agent` for main-agent consumption.

## Worker Aggregate Schema

Parallel and worktree-backed task results expose `result.aggregate` with:

- `totalWorkers`
- `completedWorkers`
- `failedWorkers`
- `status`
  - `completed`
  - `partial_failure`
  - `failed`
- `successfulWorkerIds`
- `failedWorkerIds`
- `isolatedFailures`

Each isolated failure includes:

- `workerId`
- `actionIds`
- `error`
- `attemptCount`
- `branch`
- `worktreePath`

## Failure Isolation Strategy

Worker failures are isolated instead of collapsing the whole execution into one opaque error:

- successful worker diffs are preserved
- rollback checkpoints are still created from successful worker patches
- failed workers surface their own error, attempts, and worktree metadata
- aggregate status distinguishes full failure from partial failure

For partial failures, the merged task report keeps both tracks visible:

- review completed worker diffs
- inspect and fix failed workers
- rerun only the failed workers

`coding_task retry_failed` now turns that recovery path into a first-class command:

- it creates a retry task linked back to the source task
- it reruns only failed worker actions from the prior parallel task
- it carries forward successful worker diff/report state into the retry result
- it produces a fresh rollback checkpoint that includes both carried and retried successful workers

## Retry And Timeout Strategy

Parallel workers use task-level options:

- `codingTask.parallelWorkerTimeoutMs`
- `codingTask.parallelWorkerRetries`

Behavior:

- each attempt gets a fresh worktree
- timed-out or failed attempts are cleaned up before retry
- successful attempts merge back normally
- final worker records include `attemptCount`

## UI Consumption

The console now surfaces aggregate worker state in task and review details:

- worker aggregate status
- completed/failed worker counts
- isolated worker failure summaries

This gives operators a compact view of:

- whether the task is fully done or partially failed
- which worker failed
- whether rollback is still available

## Current Guarantees

- delegated worker outputs are structured without requiring transcript scraping
- partial worker success is preserved even when the overall task status is `failed`
- retry and timeout behavior is visible in worker results
- failed-worker reruns preserve successful worker artifacts and rollback coverage
- task and review panels show aggregate worker status and isolated failure reasons
- retry lineage is visible in task and review details

## Current Gaps

None tracked.

## Worker Model Routing Policy (P28)

Delegated workers can now be routed to a specific model profile per worker class:

- **Explicit request profile**: `ModelRequest.profile` selects a named profile from `AgentOptions.model.profiles` before complexity estimation or explicit route matching runs. Unknown profile names fail fast with `Unknown model profile 'X'.`; the resolved config is merged over the top-level model config.
- **Runtime session profile**: `AgentRuntime.setSessionModelProfile(sessionId, profileName)` / `clearSessionModelProfile(sessionId)` give the delegation runner a per-session override that `DefaultAgentRuntime.prepareModelRequest` injects into every model request for that session.
- **Worker-class policy** (`@tsdi/agent-tools`): `AgentToolsOptions.delegation.workerModelProfiles` maps worker classes (`spawn_agent`, `llm_task`) to profile names. `DelegatingSpawnAgentAdapter` and `DelegatingLlmTaskAdapter` stamp `workerClass` on the nested run request; `LightweightAgentRunner` resolves the mapping, sets the session profile before the turn loop, and clears it in `finally` (same lifecycle as the toolset filter).

Example:

```ts
provideTools(
  withAgentToolsOptions({
    delegation: {
      workerModelProfiles: {
        spawn_agent: 'strong', // sub-agents run on the strong model
        llm_task: 'fast'       // lightweight LLM tasks stay on the fast model
      }
    }
  })
)
```

## Persisted Delegation Graph (P27)

The delegation edges between a main task session and its spawned sub-agent sessions are now persisted:

- **Store family** (`@tsdi/agent`): `DelegationGraphStore` abstract contract with `InMemoryDelegationGraphStore`, `TypeOrmDelegationGraphStore` (via `AgentDelegationEdgeEntity`), and `DefaultDelegationGraphStore` (probes for a `TypeormAdapter`, transparent fallback).
- **Edge model**: composite key `(parentSessionId, childSessionId)`, `kind` (`nested`/`spawn_agent`/`parallel`), `status` (`active`/`completed`/`failed`/`cancelled`), `metadata` (goal/toolsets/model/maxTurns). `markClosed` is idempotent: first close wins, `cancelled` is not overwritten by a later `failed`.
- **Runtime hooks**: `AgentRuntime.registerChildSession(parent, child, metadata?)` appends an edge; `unregisterChildSession(parent, child, status?)` closes it (default `completed`); `cancelChildTurns` closes with `cancelled`. `lightweight-agent-runner` records kind/goal/toolsets/model/maxTurns metadata and ends with `completed`/`failed`.
- **Query surfaces**:
  - gateway HTTP: `GET /api/delegation/{tree,lineage,children,list}` (`DelegationHandler`, session-owner guarded)
  - gateway RPC: `delegation.tree/lineage/children/list` (`AppRpcServer`, `delegation.list` scopes to the caller's owned sessions when no sessionId is given)
  - UI: `/delegation` command with `tree` / `lineage` / `list` subcommands
- **Tree/lineage builders**: shared `buildDelegationTree` (status/depth filters, createdAt+id sibling ordering, cycle-safe by dropping back-edges) and `buildDelegationLineage` (walks to root, newest edge first, cycle-guarded).

## Implementation Anchors

- `packages/agents/agent/src/model/ModelRequest.ts` (`profile`)
- `packages/agents/agent/src/model/RoutedModelAdapter.ts` (`resolveExplicitProfile`)
- `packages/agents/agent/src/runtime/AgentRuntime.ts` (`setSessionModelProfile` / `clearSessionModelProfile`)
- `packages/agents/agent/src/runtime/DefaultAgentRuntime.ts` (`prepareModelRequest` profile injection)
- `packages/agents/agent-tools/src/options.ts` (`delegation.workerModelProfiles`)
- `packages/agents/agent-tools/src/lightweight-agent-runner.ts` (worker-class profile application)
- `packages/agents/agent/src/harness/DelegationGraphStore.ts`
- `packages/agents/agent/src/harness/InMemoryDelegationGraphStore.ts`
- `packages/agents/agent/src/harness/TypeOrmDelegationGraphStore.ts`
- `packages/agents/agent/src/harness/DefaultDelegationGraphStore.ts`
- `packages/agents/agent/src/memory/entities.ts` (`AgentDelegationEdgeEntity`)
- `packages/agents/agent/src/runtime/DefaultAgentRuntime.ts` (delegation graph wiring)
- `packages/agents/agent-tools/src/lightweight-agent-runner.ts` (metadata + end status)
- `packages/agents/agent-gateway/src/api/DelegationHandler.ts`
- `packages/agents/agent-gateway/src/app-rpc/AppRpcServer.ts` (`delegation.*`)
- `packages/agents/agent-ui/src/AgentConsoleComponent.ts` (`/delegation` command)
- `packages/agents/agent-tools/src/nested-agent-runner.ts`
- `packages/agents/agent-tools/agent/spawn-agent.tool.ts`
- `packages/agents/agent-tools/coding/coding-task.tool.ts`
- `packages/agents/agent-tools/coding/coding-task-store.ts`
- `packages/agents/agent-ui/src/AgentConsolePanels.ts`
- `packages/agents/agent-ui/src/AgentConsoleSessionState.ts`
