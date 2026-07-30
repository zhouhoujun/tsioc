# M1: Compaction Upgrade — Handoff Summary

**Date**: 2026-07-30
**Status**: ✅ Complete (208/208 tests passing)

## What Was Implemented

### Phase 1: Level-Gated Compaction
- `prepareHistory` now selects between `light`/`medium`/`deep` levels based on token pressure vs `maxHistoryTokens`
- Light: `< 60%` of max → `pruneHistory` (or `compactHistoryWithReport` if summarizer configured)
- Medium: `60-90%` → `compactHistoryWithReport` with `resolveCompactionAnchors`
- Deep: `> 90%` → `compactHistoryWithReport` with `aggressivePrune` (minimal anchors + recent window)
- `selectCompactionLevel(beforeTokens)` method added

### Phase 2: Session Detail Recovery
- `stashOriginalMessages(sessionId, messages, level)` — stores pre-compaction messages keyed by session
- `recoverDetail(sessionId, userQuery)` — retrieves relevant stashed messages matching query
- `hasCompactedContent(sessionId)` / `clearCompactedContent(sessionId)` — lifecycle management
- Session-level stash happens before medium/deep compaction and at light level with summarizer
- Message relevance scoring via `SemanticMatchScorer`

### Phase 3: Aggressive Prune (Deep Level)
- `aggressivePrune(messages)` — keeps only: system + first substantive user + latest error context + latest stateful tool result + latest substantive user + recent window
- `resolveCompactionAnchors(oldMessages, recentMessages, minimal)` — finds critical messages to preserve
- Anchor types: firstSubstantiveUser, latestSubstantiveUser, latestErrorContext, latestToolState
- `isStatefulToolMessage()` — detects stateful tool results via metadata or content summarization
- `isErrorContextMessage()` — detects error tool results via metadata or content
- `findLatestToolStateMessage()` / `findLatestErrorContextMessage()` — search helpers

### Phase 4: Adaptive Budget Adjustment
- `recordTokenGrowth(beforeTokens, messageCount)` — tracks rolling growth rate
- `adjustBudget()` — reduces `compactionMinTokens` when sustained growth detected
- `dynamicCompactionMinTokens` / `dynamicRecentWindow` — dynamically adjusted values
- `configuredIntercept` / `recentGrowthRates` / `budgetAdjustments` — growth tracking state
- Controlled by `adaptiveBudget` flag (default: disabled)

### Test Fixes Applied
- `compactToolMessagesForContext` is now level-independent (always runs `summary-preferred` for old, `oversized-only` for recent)
- Messages with content-derived statefulness (no receipt/error metadata) are protected from content compaction so `resolveCompactionAnchors` can detect them
- Light level with summarizer now stashes before returning (was early-returning past stash logic)
- Strategy reports 'pruned' when tool messages are compacted even without full history compaction
- All test thresholds/message counts adjusted to reliably trigger compaction

## Key Files Changed
- `packages/agents/agent/src/context/AgentContextManager.ts` — core implementation
- `packages/agents/agent/src/context/AgentContext.ts` — type definitions (CompactionLevel, preparation pipeline, budget config)
- `packages/agents/agent/test/context-compaction.spec.ts` — test adjustments

## Architecture Note
The tool compaction (`compactToolMessagesForContext`) now runs independently of history compaction level. This is intentional: tool output summarization via receipt summaries is always beneficial. The level gates only the aggressiveness of *history* compaction (pruning, summarization, anchoring).

## Candidate M2 Items
1. **Oracle retro-synthesis**: on low-confidence compaction, invoke Oracle to reconstruct compressed messages from stashed originals
2. **Cross-session experience synthesis**: extract patterns from stashed detail across sessions
3. **Scheduled detail pruning**: TTL-based cleanup of `originalMessageStore` entries for long-lived sessions
4. **Adaptive budget refinements**: Hysteresis, decay, per-session growth tracking
