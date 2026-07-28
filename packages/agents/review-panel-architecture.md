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

4. Patch filter layer
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

- No semantic diff folding beyond unified diff sections.
- No side-by-side patch rendering in TUI.
- No per-file risk scoring yet.
- No persistent review annotations or approvals attached to diff groups.

## Implementation Anchors

- `packages/agents/agent-ui/src/AgentConsoleSessionState.ts`
- `packages/agents/agent-ui/src/AgentConsolePanels.ts`
- `packages/agents/agent-ui/test/view-model.spec.ts`
- `packages/agents/agent-ui/test/console-renderer.spec.ts`
