# Review Panel Architecture

This note defines the current architecture for the TUI review panel in `packages/agents/agent-ui`.

## Goals

- Keep large coding-task diffs readable inside a terminal UI.
- Preserve a stable path from task summary to worker detail to file patch.
- Avoid rendering every patch body at once when a task touches many files.
- Keep review and rollback decisions visible without forcing users to parse raw diff text first.

## Information Model

The review panel is driven by four layers of state:

1. Task layer
   - source: coding task metadata loaded from `coding_task.get` and `coding_task.diff`
   - examples: task id, title, status, execution mode, rollback state, checkpoints

2. Group layer
   - type: `aggregate` or `worker`
   - purpose: choose the diff scope currently being reviewed
   - aggregate group represents the merged task-level diff
   - worker groups represent per-worker diff/output slices

3. File layer
   - source: parsed unified diff sections within the selected group
   - purpose: choose the current file patch without expanding every file body

4. Hunk layer
   - source: `@@`-delimited hunks parsed within the selected file section
   - purpose: fold/expand individual hunks so noisy patches stay scannable

5. Patch filter layer
   - values: `all`, `additions`
   - purpose: let reviewers focus on added lines when scanning noisy patches

## State Mapping

Current state lives in `AgentConsoleSessionState`:

- task scope
  - `reviewTask`
  - `reviewDiff`
  - `reviewWorkers`
- group scope
  - `reviewGroups`
  - `selectedReviewGroupIndex`
  - `selectedReviewGroup`
- file scope
  - `reviewFileSections`
  - `selectedReviewFileIndex`
  - `selectedReviewFileSection`
- hunk scope
  - `selectedReviewHunkIndex`
  - `foldedReviewHunks` (keyed by `groupKey:path#hunkIndex`)
  - `isReviewHunkFolded()`
- patch filter
  - `selectedReviewPatchFilter`

Derived review output is exposed through:

- `reviewDetailLines`
- `reviewDetailMaxColumn`
- `buildSelectedReviewCopyText()`

## Navigation Structure

The panel is intentionally hierarchical:

1. Review summary
   - summary
   - review conclusion
   - scope
   - risks
   - rollback/checkpoint state

2. Group chooser
   - `aggregate`
   - one row per worker

3. Current group metadata
   - worker status
   - branch
   - worktree
   - action ids
   - error, when present
   - patch filter state

4. File chooser
   - one row per parsed diff section in the selected group

5. Current patch body
   - only the currently selected file patch is expanded
   - individual hunks can be folded independently

This keeps large tasks bounded to:

- summary rows
- one group list
- one file list
- one patch body

instead of rendering every file body from every worker.

## Keyboard Model

Review focus currently uses:

- `,` / `.`: previous or next group
- `[` / `]`: previous or next file within the current group
- `{` / `}`: jump to previous or next hunk in the current file patch
- `f`: fold or expand the current hunk
- `a`: switch patch filter to additions only
- `u`: reset patch filter to full patch
- arrow keys / page keys: scroll current review viewport
- `y`: copy the current structured review view
- `Esc` / `q`: dismiss review focus

## Diff Parsing Rules

Unified diff parsing is section-based:

- a new section starts at `diff --git`
- file identity prefers the `+++` marker when available
- additions count excludes the header marker `+++`
- deletions count excludes the header marker `---`

Parsed sections are stored as:

- `path`
- `additions`
- `deletions`
- `lines`

This structure is reused for:

- aggregate task diff
- worker diff/output when it contains unified diff text

## Hunk Folding

Hunks are derived from a section's lines at render time:

- `parseReviewHunks(section)` splits `lines` on `@@` headers
- each hunk records `header`, `context`, `startIndex`, `endIndex`, `additions`, `deletions`
- hunk context resolves the trailing function/class label after the second `@@`

Rendering (`renderReviewPatchLines`) walks hunks in order:

- section header lines (`diff --git`, `index`, `---`, `+++`) render before the first hunk
- an unfolded hunk renders its full body
- a folded hunk renders only its `@@` header plus a summary row
  (`⋯ folded hunk +N -M · context (f expand)`)
- the additions patch filter applies to hunk bodies; folded summaries stay visible

Fold state:

- `foldedReviewHunks` is keyed by `groupKey:path#hunkIndex` so folds survive
  group/file switches and task reopens
- `clearReview()` resets fold state
- `selectedReviewHunkIndex` drives `{`/`}` jumps and the `f` toggle, and resets
  to the first hunk when the group or file selection changes
- `jumpReviewHunk` scrolls to the rendered position of the target hunk header

## Filter Dimensions

The review experience now has two filter families:

1. Task list filters in `/tasks`
   - `all`
   - `failed`
   - `rollback`

2. Patch view filters inside review
   - `all`
   - `additions`

These target different questions:

- task filters answer "which tasks need attention?"
- patch filters answer "which lines inside this patch matter first?"

## Reviewer Flows

Common flows the panel is designed to support:

1. Open task review
   - inspect conclusion, risks, rollback readiness
   - decide whether the task is safe to inspect deeper

2. Compare aggregate vs worker output
   - stay on `aggregate` to understand the final merged patch
   - switch to a worker group to isolate a specific worker's changes or failure

3. Scan large tasks
   - stay on the file list
   - move between files without rendering unrelated patch bodies

4. Check risky patches
   - toggle `additions` mode
   - inspect only newly added lines first

5. Decide rollback
   - use review summary plus rollback/checkpoint rows
   - trigger rollback from task-focused flows without leaving the review context

## Design Constraints

- The panel must remain usable in a plain TUI.
- Rendering must stay bounded for large diffs.
- Copy output should preserve the selected group, file, and patch filter.
- The review state should survive reopening the same task when possible.

## Current Gaps

- No side-by-side patch rendering in TUI.

## Implementation Anchors

- `packages/agents/agent-ui/src/AgentConsoleSessionState.ts`
- `packages/agents/agent-ui/src/AgentConsolePanels.ts`
- `packages/agents/agent-ui/test/view-model.spec.ts`
- `packages/agents/agent-ui/test/console-renderer.spec.ts`

Implemented anchors:

- hunk folding and `f` / `{` / `}` keys: `AgentConsoleSessionState.ts`
  (`parseReviewHunks`, `renderReviewPatchLines`, `toggleReviewHunkFold`,
  `jumpReviewHunk`, `foldedReviewHunks`)
- per-file risk scoring: `computeFileRiskScore()`
- persistent review annotations: `review_annotations.save/load` RPC in
  `AgentConsoleComponent.ts` plus `reviewAnnotationCache` in session state
