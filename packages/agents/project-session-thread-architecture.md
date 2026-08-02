# Project / Session / Thread Architecture

This note defines the metadata model and classification rules for project-level session organization under `packages/agents`.

## Problem

The current console can already group sessions by `workspace`, but that is only a filesystem boundary.

A single workspace can contain:

- multiple unrelated tasks
- repeated sessions for the same long-running task
- exploratory branches that should not become the main project timeline

To support long-lived agent work, the system needs a stable distinction between:

- project
- session
- thread

## Terms

### Project

A `project` is the top-level unit used for cross-session continuity.

It answers:

- "Which ongoing body of work does this session belong to?"
- "What is the current main line for this work?"

A project is usually scoped to one workspace, but not every workspace is a single project.

### Session

A `session` is one runtime conversation history and execution log.

It answers:

- "What happened in this specific chat/run?"

A session is the persistence unit already managed by the session store.

### Thread

A `thread` is a logical task line inside or across sessions.

It answers:

- "Which specific task stream is being continued?"

A thread may:

- stay inside one session
- continue across multiple sessions
- branch from another thread

## Target Model

### Project metadata

Suggested fields:

- `projectId`
- `workspace`
- `title`
- `summary`
- `status`
  - `active`
  - `paused`
  - `completed`
  - `archived`
- `rootRequest`
- `currentFocus`
- `createdAt`
- `updatedAt`
- `lastActiveAt`
- `tags`

Optional derived fields:

- `sessionCount`
- `threadCount`
- `latestSummary`
- `latestTodoSnapshot`
- `latestReviewSnapshot`

### Session metadata

Existing fields already cover part of the shape:

- `sessionId`
- `workspace`
- `createdAt`
- `updatedAt`
- `summary`
- `messages`

Additional fields needed for project grouping:

- `projectId`
- `primaryThreadId`
- `sessionRole`
  - `main`
  - `branch`
  - `review`
  - `worker`
- `rootRequest`
- `focusSummary`
- `originSessionId`
- `originThreadId`

### Thread metadata

Suggested fields:

- `threadId`
- `projectId`
- `title`
- `rootRequest`
- `status`
  - `active`
  - `blocked`
  - `completed`
  - `abandoned`
- `stage`
  - examples: `discovery`, `implementation`, `review`, `rollback`
- `createdAt`
- `updatedAt`
- `lastActiveAt`
- `originThreadId`
- `currentSessionId`

Optional aggregate fields:

- `latestSummary`
- `latestTodoSnapshot`
- `latestReviewSnapshot`

## Relationship Model

The intended ownership chain is:

1. project
2. thread
3. session

Rules:

- one project can contain many threads
- one thread can span many sessions
- one session belongs to exactly one project
- one session should have one primary thread, even if it briefly touches side topics

This keeps indexing stable while still allowing branch exploration.

## Classification Rules

### Project assignment

Default rule:

- if the workspace has no existing project with a matching root request, create a new project
- otherwise attach the session to the closest active project in the same workspace

Matching signals:

- explicit `projectId`
- normalized root request similarity
- repeated file set overlap
- repeated todo/review references

### Thread assignment

Default rule:

- if the user continues the same main task, reuse the existing active thread
- if the user starts a materially new task in the same project, create a new thread
- if the task is a worker/branch spawned from another run, link it through `originThreadId`

Branch signals:

- spawned worker metadata
- rollback-only sessions
- review-only sessions
- a new root request that clearly diverges from the current thread goal

### Session role assignment

Suggested heuristics:

- `main`: ordinary user-driven continuation
- `branch`: exploratory continuation from another session
- `review`: primarily used for diff review / rollback / verification
- `worker`: spawned sub-agent or delegated execution session

## Aggregation Rules

Project-level aggregation should prefer the most recent authoritative artifacts:

- summary: latest non-empty structured session summary
- todo: latest active todo set from the primary thread
- review: latest open or most recent completed review artifact

Conflict rules:

- prefer primary thread over branch thread
- prefer active thread over completed thread
- prefer newer artifact timestamps when thread priority is equal

## UI Implications

The UI should eventually support:

1. Project index
   - project title
   - workspace
   - active thread count
   - latest summary

2. Project detail
   - current main thread
   - related sessions
   - latest todo
   - latest review

3. Thread view
   - root request
   - current stage
   - sessions in order

4. Session view
   - existing transcript and tool activity

## Storage Implications

The current `SessionStore` already persists per-session state.

The next storage step should add project-level indexing without breaking existing session records.

Recommended approach:

- keep session records backward-compatible
- add optional metadata fields for `projectId`, `primaryThreadId`, and `sessionRole`
- derive project/thread groupings lazily where possible before introducing a heavier store schema

This allows phased rollout:

1. annotate new sessions
2. derive groupings in memory
3. persist explicit project/thread indexes later if needed

## Compatibility Strategy

Legacy sessions without project metadata should still be visible.

Fallback rules:

- missing `projectId`: bucket by workspace
- missing `threadId`: treat session as a one-session thread
- missing `rootRequest`: derive from summary or earliest substantive user message

This keeps migration incremental.

## Current Implementation Anchors

Relevant code today:

- `packages/agents/agent-ui/src/AgentConsoleSessionService.ts`
- `packages/agents/agent/src/memory/SessionStore.ts`
- `packages/agents/agent/src/memory/InMemorySessionStore.ts`
- `packages/agents/agent/src/memory/TypeOrmSessionStore.ts`
- `packages/agents/agent-gateway/src/api/SessionHandler.ts`
- `packages/agents/todo.md`

## Thread Index (P30)

Implemented: derived thread index over the existing session store, with `originThreadId` branch linking. No new store schema — grouping is derived lazily from session metadata, matching the phased rollout in Storage Implications.

Store layer (`@tsdi/agent`):

- `SessionStore.deriveThreadIndexes(states)` — pure shared builder (mirrors `deriveProjectIndexes`): buckets sessions by resolved thread key (`primaryThreadId`, falling back to `session:<id>` for legacy sessions), picks the latest-active session as representative, and emits `AgentThreadIndex` (threadId/projectId/workspace/title/rootRequest/status/stage/originThreadId/currentSessionId/sessionIds/createdAt/updatedAt/lastActiveAt).
- Representative metadata comes from the most recently active session; `status`/`stage` are derived from the representative `sessionRole` (`review` → `completed`/`review`, `worker` → `implementation`, `branch` → `discovery`).
- `sessionIds` sort by activity desc then id asc; threads sort by activity desc then threadId asc.
- `SessionStore.listThreads()` default contract returns `[]`; implemented by `InMemorySessionStore` and `TypeOrmSessionStore` (persisted records round-trip `originThreadId` through `AgentState`/entity).

Gateway (`@tsdi/agent-gateway`):

- `SessionHandler.listSessionInfos` maps `originThreadId`; new `groupThreadInfos(infos)` re-derives thread groups over owned `SessionInfo`; exposed as `GET /api/sessions/threads` (HTTP) and `session.list_threads` (JSON-RPC capability + dispatch).

UI (`@tsdi/agent-ui`):

- `AgentConsoleSessionService.listThreads()` prefers the gateway RPC, falls back to `store.listThreads()` (or client-side `groupThreadChoices` grouping).
- New `/threads` command mirrors `/projects`: thread list → per-thread session list → open session; backed by `threads` / `threadsFocused` session state with the same focus-layer and escape handling.

## Worker Session Auto-Classification (P31)

Implemented: spawned worker sessions are auto-annotated at the framework chokepoint, closing the "auto-classify `sessionRole`/`originThreadId` from spawn runtime signals" future option.

- `DefaultAgentRuntime.registerChildSession` now calls `annotateChildSession(parentSessionId, childSessionId, metadata)` after recording the delegation edge.
- `annotateChildSession` (fire-and-forget, errors swallowed so annotation never breaks the delegation flow):
  - marks the child with `sessionRole: 'worker'` (any registered child session is by definition a worker/sub-agent);
  - links it back through `originThreadId` = parent `primaryThreadId`, falling back to the parent session id;
  - defaults the child `focusSummary` to the delegation `goal` (thread title source);
  - preserves existing explicit fields via read-modify-write and leaves a child with an explicit non-worker `sessionRole` untouched.
- Both `InMemorySessionStore` and `TypeOrmSessionStore` `setProjectMetadata` auto-create the child session, so the annotation can fire before the child's first turn without ordering hazards; the derived thread index then surfaces the worker thread (`stage: implementation`, `originThreadId` set) without any explicit metadata.

Relevant code today:

- `packages/agents/agent/src/runtime/DefaultAgentRuntime.ts` (`registerChildSession` / `annotateChildSession`)
- `packages/agents/agent-tools/src/lightweight-agent-runner.ts` (`runSingle` passes `goal` in the registration metadata)
- `packages/agents/agent/test/turn-cancel.spec.ts` (worker annotation cases)

## Next Step

The derived thread index (P30) plus worker auto-classification (P31) close the planned items of this architecture note: project-aware metadata, project/thread-level derived grouping, and spawn-time auto-classification of `sessionRole`/`originThreadId` are all live end-to-end (store → gateway → UI).

Future options (not currently planned):

- persist explicit project/thread indexes when the derived pass becomes a hotspot
- thread-level aggregation of todo/review artifacts (needs the persistence seam above)
