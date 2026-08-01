# Context Compaction Architecture

This note defines the current `M1` context compaction strategy under `packages/agents/agent`.

## Goals

- keep long sessions usable without depending only on raw tail truncation
- preserve root task goals, current follow-up goals, failure context, and actionable tool state
- reduce large tool payload pressure before they crowd out recent conversational context
- expose compaction behavior through runtime events without making observability a hard dependency

## Scope

The current strategy is implemented across:

- `packages/agents/agent/src/context/AgentContextManager.ts`
- `packages/agents/agent/src/memory/LLMSessionSummarizer.ts`
- `packages/agents/agent/src/runtime/DefaultAgentRuntime.ts`
- `packages/agents/agent/src/runtime/AgentEvents.ts`

It applies to model-request history preparation before each turn.

## Preparation Pipeline

History preparation now runs in three stages:

1. Lightweight tool-output compaction
   - older tool messages may be rewritten to concise summaries before full history compaction is needed
   - recent tool messages are only compacted when they are oversized or clearly reducible

2. History shaping
   - if compaction thresholds are not met, history is pruned in place
   - if thresholds are met, old history is summarized into a structured system message

3. Runtime observability
   - `DefaultAgentRuntime` publishes `AgentContextPreparedEvent`
   - `DefaultAgentRuntime` publishes `AgentTurnDiagnosticsEvent`
   - event publication is best-effort and must not break the turn path

## Trigger Model

Compaction is considered only when both conditions hold:

- message count reaches `context.compactionThreshold`
- estimated history tokens reach either:
  - `maxHistoryTokens`, or
  - `min(compactionMinTokens, maxHistoryTokens)`

Old-history summarization is skipped if the old section is too small to justify it:

- `minOldSectionTokens = min(200, max(60, floor(compactionMinTokens / 2)))`

This avoids spending summary budget on tiny histories while still allowing shorter Chinese follow-up sessions to compact earlier than the previous fixed threshold allowed.

## Window Model

History is split into:

- system messages
- old conversation window
- recent conversation window

The recent window starts from `recentMessageWindow`, but it can expand backward to keep an `assistant toolCall -> tool result` pair intact. This prevents the model from receiving a recent tool result without the assistant message that initiated it.

## Anchor Model

Before summarizing old history, the runtime resolves a protected anchor set from old messages:

- first substantive user goal
- latest substantive user goal
- latest error context
- latest stateful tool result

Anchors are preserved verbatim outside the summary so the model retains authoritative source messages for:

- original task intent
- later scope changes
- failing tool context
- worker/task state snapshots

These anchors are also excluded from old-tool pre-compaction so they are not rewritten away before summary assembly.

## Tool Output Retention Rules

Tool messages are treated differently by age and usefulness.

### Older tool messages

Older tool outputs are summary-preferred:

- compact when content is clearly reducible
- prefer `receipt.outputSummary`
- otherwise use `summarizeToolDisplayText(...)`
- preserve protected anchors unchanged

### Recent tool messages

Recent tool outputs are treated more conservatively:

- always compact if they exceed `maxToolResults`
- otherwise compact only when:
  - they already have a trustworthy summary shape, and
  - the reduction is materially smaller than the raw payload

### Fallback behavior

If no structured summary is available:

- preserve metadata errors as `{ "error": ... }`
- otherwise truncate raw content to `maxToolResults`

## Summary Schema

Structured compaction summaries are normalized into exactly five fields:

- `Goal`
- `Decisions`
- `Files`
- `Errors`
- `Open state`

`LLMSessionSummarizer` enforces this shape in two ways:

1. model prompt contract
   - the summarizer prompt asks for exactly five labeled lines

2. normalization layer
   - multiline continuations are folded back into the active label
   - missing fields fall back to deterministic extraction from conversation history

The fallback extractor favors:

- root and current substantive user goals
- recent assistant decisions
- file-path mentions
- explicit tool/runtime errors
- latest turn state as `Open state`

The `Files` line distinguishes write operations from mere references:

- `modified: a.ts, b.ts` — paths from write-style tool calls (`write_file`, `edit`, `apply_patch`, ...) or assistant text reporting past-tense mutations (`created`, `updated`, `deleted`, ...)
- `mentioned: c.ts` — every other path reference (reads, user text, tool results)

## Runtime Observability

Each history-preparation pass emits a `ContextPreparationReport` through `AgentContextPreparedEvent`.

Current fields:

- `strategy`
  - `unchanged`
  - `pruned`
  - `compacted`
- `compactionTriggered`
- `summaryInserted`
- `beforeMessageCount`
- `afterMessageCount`
- `beforeTokens`
- `afterTokens`
- `compactedMessageCount`
- `preservedAnchorCount`
- `recentMessageCount`
- `prunedMessageCount`
- `toolMessagesCompacted`

This gives downstream UI, metrics, or logs a stable source for:

- how often compaction runs
- how much history is being summarized
- how many tool payloads are collapsed before the model sees them

Each completed turn also emits `AgentTurnDiagnosticsEvent` with:

- `emptyResponseRetryCount`
- `followUpRecoveryCount`
- `followUpContextRewritten`
- `finalAssistantWasClarification`
- `repeatedClarificationDetected`

This keeps empty-response and repeated-clarification signals available without coupling aggregation logic into the runtime.

## Summary Quality Scoring

Every produced summary is scored deterministically by `scoreSummaryQuality` in
`packages/agents/agent/src/harness/SummaryQualityScorer.ts`:

- `fieldCompleteness` — five summary fields (Goal, Decisions, Files, Errors, Open state); each missing field costs 20 points
- `annotationQuality` — Files line carries both `modified:` and `mentioned:` annotations (100), exactly one (50), or none (0)
- `lengthBalance` — individual field values below 15 chars or above 250 chars are penalized
- `truncationScore` — very long summaries (>= 1000 chars) are downgraded because they indicate a compaction or token cap was hit
- `total` — weighted 0.4 / 0.2 / 0.2 / 0.2 across the four dimensions; fallback-generated summaries are multiplied by 0.7

`LLMSessionSummarizer` records a `SummaryQualityRecord` for each summary through
`SummaryQualityStore` (provider, model, per-dimension scores, fallback flag,
summary length). The model name is resolved from the adapter's `options.model` or
its `model` field (`EchoModelAdapter` reports `echo`), falling back to undefined.
The store family follows the same pattern as the other harness
stores: in-memory default, durable TypeORM-backed store when a `TypeormAdapter`
is registered, and a `DefaultSummaryQualityStore` that picks between them.

Per-provider aggregates (record count, average/min/max total, average per-dimension
scores, fallback rate, time range) are available through `aggregateSummaryQuality`
and are exposed by the gateway's `SummaryQualityHandler`:

- `GET /api/summary-quality` — record list with optional `provider`, `model`,
  and `limit`
- `GET /api/summary-quality/stats` — provider-scoped aggregates (optional
  `model` filter narrows to a single model within the provider)
- `GET /api/summary-quality/trend` — day-bucketed trend points (optional
  `provider`, `model`, `limit` clamped to 500, `bucketSize`, `maxBuckets`
  clamped to 90)

The `model` filter (added when model names were persisted) flows through the
whole surface: `SummaryQualityStore.list({ model })` and
`aggregate(provider, model)` in `@tsdi/agent`, the `summary_quality.list` /
`summary_quality.stats` / `summary_quality.trend` RPC params, and the HTTP
query string, so quality can be compared per concrete model (for example
`deepseek-v4-flash` vs `deepseek-v3`) inside one provider.

The same data is reachable interactively:

- gateway RPC `summary_quality.list` / `summary_quality.stats` /
  `summary_quality.trend` (declared in `AppRpcServer` capabilities, injected
  `SummaryQualityStore` is optional)
- console `/quality [provider]` command in `@tsdi/agent-ui`, which fetches the
  provider-scoped aggregates over RPC and renders a one-line digest per provider
  (record count, average total, fallback rate, date range)
- console `/quality list [provider]` opens a browsable record selector over
  `summary_quality.list` (limit 200), with per-record dimension scores,
  fallback flag, and creation time in the option detail
- console `/quality trend [provider] [bucketSize] [maxBuckets]` renders an
  8-level sparkline over day-bucketed `summary_quality.trend` points
  (`buildSummaryQualityTrend` reduction in `@tsdi/agent`), one line per
  provider with bucket date range, average total, and fallback rate;
  `bucketSize` accepts `Nd` days or milliseconds, `maxBuckets` caps the
  returned buckets
- the always-on dashboard panel (`AgentConsoleDashboardPanelComponent`)
  renders a `quality · <digest>` line from `AgentConsoleSessionState
  summaryQualityDigest`, refreshed via `summary_quality.stats` on startup and
  after each turn, so quality trends stay visible without typing a command

This closes the last tracked gap: provider-specific summary quality is now
measured, persisted, and inspectable instead of being a subjective one-off read.

## Current Guarantees

The current design specifically protects these regression cases:

- repeated `继续` turns keep the root goal visible
- later substantive follow-up goals remain visible
- latest tool failure context remains available
- latest stateful worker/task tool output remains available
- recent tool-call/result pairs are not split apart
- observability event failures do not break turn execution

## Current Gaps

None tracked. Summary quality scoring (per provider) and compaction history are
now persisted through dedicated stores and exposed through gateway APIs.

## Implementation Anchors

- `packages/agents/agent/src/context/AgentContextManager.ts`
- `packages/agents/agent/src/memory/LLMSessionSummarizer.ts`
- `packages/agents/agent/src/runtime/DefaultAgentRuntime.ts`
- `packages/agents/agent/src/runtime/AgentEvents.ts`
- `packages/agents/agent/src/harness/SummaryQualityScorer.ts`
- `packages/agents/agent/src/harness/SummaryQualityStore.ts`
- `packages/agents/agent/test/context-compaction.spec.ts`
- `packages/agents/agent/test/summary-quality.spec.ts`
- `packages/agents/agent/test/runtime-loop.spec.ts`
