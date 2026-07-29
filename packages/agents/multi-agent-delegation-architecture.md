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
- task and review panels show aggregate worker status and isolated failure reasons

## Current Gaps

- no dedicated worker-only rerun command yet
- no persisted delegation graph linking a main task to spawned sub-agents
- no cross-task worker lineage or parent-child task tree in UI
- no policy layer yet for routing different worker classes to different models

## Implementation Anchors

- `packages/agents/agent-tools/src/nested-agent-runner.ts`
- `packages/agents/agent-tools/agent/spawn-agent.tool.ts`
- `packages/agents/agent-tools/coding/coding-task.tool.ts`
- `packages/agents/agent-tools/coding/coding-task-store.ts`
- `packages/agents/agent-ui/src/AgentConsolePanels.ts`
- `packages/agents/agent-ui/src/AgentConsoleSessionState.ts`
