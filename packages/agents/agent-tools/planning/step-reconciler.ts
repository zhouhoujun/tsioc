import { ToolEvidenceEntry } from '@tsdi/agent';
import { TodoItem, TodoPlanSnapshot, TodoStatus } from './todo-store';

/**
 * P227: Plan execution reconciler.
 *
 * Deterministically associates tool-receipt / LSP / verify / review evidence to
 * plan steps and drives status transitions:
 *
 *   - Only evidence that satisfies a step's `acceptance` (and carries no
 *     falsified entry) auto-marks the step `completed`.
 *   - Falsified / failed evidence marks the step `failed` (or `blocked` when a
 *     review gate holds it), recording `cause` and a `nextAction`.
 *   - Evidence with no step attribution (`stepId` absent and no in-progress
 *     fallback) leaves the step untouched (`unrelated`).
 *
 * The function is pure and replay-consistent: identical inputs always produce
 * identical outcomes and an identical updated plan, so a duplicated reconcile
 * pass never changes a step twice.
 */

export type StepTransition = 'completed' | 'failed' | 'blocked' | 'none';

/** How a step's evidence was associated for this reconcile pass. */
export type StepEvidenceStatus =
    | 'satisfied'    // acceptance-satisfying evidence present, none falsified
    | 'falsified'    // at least one falsified / failed entry attributed
    | 'unrelated'    // only unrelated evidence (no stepId, no fallback)
    | 'none';        // no evidence at all

export interface StepOutcome {
    stepId: string;
    content: string;
    transition: StepTransition;
    evidenceStatus: StepEvidenceStatus;
    /** Why the transition (or non-transition) happened. */
    cause?: string;
    /** Recommended next turn action. */
    nextAction?: string;
    /** True when a manual override was respected (step left untouched). */
    overridden?: boolean;
    /** Evidence entry ids that drove this decision. */
    evidenceIds: string[];
}

export interface ReconcileStepInput {
    plan: TodoPlanSnapshot;
    /** Evidence recorded since the last reconcile pass (round-scoped). */
    evidence: ToolEvidenceEntry[];
    /** Step ids rejected by the review gate this pass. */
    reviewRejectedStepIds?: string[];
    /** Explicit status overrides that must not be overwritten (manual override). */
    manualOverrides?: Record<string, TodoStatus>;
    /** Fallback step id for evidence that carries no explicit `stepId`. */
    inProgressStepId?: string;
    /** When true, a single successful (non-falsified) evidence entry completes a step. */
    acceptOnAnyEvidence?: boolean;
    /** Step ids that are gated by an active review (-> blocked, not failed). */
    gatedStepIds?: string[];
}

export interface ReconcileResult {
    outcomes: StepOutcome[];
    /** The plan with status transitions applied (keys in plan order). */
    updatedTodos: TodoItem[];
}

/** Compact, consumable per-step summary for next-turn injection (not full todo text). */
export interface StepExecutionSummaryStep {
    id: string;
    content: string;
    status: TodoStatus;
    failureCause?: string;
    nextAction?: string;
}

export interface StepExecutionSummary {
    completed: StepExecutionSummaryStep[];
    failedOrBlocked: StepExecutionSummaryStep[];
    unresolved: StepExecutionSummaryStep[];
}

const DEFAULT_ACCEPTANCE_EVIDENCE: ReadonlySet<string> = new Set(['verify-command', 'test', 'diagnostic']);

function isAcceptanceSatisfying(entry: ToolEvidenceEntry, acceptOnAny: boolean): boolean {
    if (entry.status === 'error' || entry.falsified === true) {
        return false;
    }
    if (acceptOnAny) {
        return true;
    }
    if (entry.verification === 'verify-command') {
        return true;
    }
    if (entry.lspDiagnostics?.length) {
        return entry.lspDiagnostics.every(diag => diag.severity !== 1);
    }
    return DEFAULT_ACCEPTANCE_EVIDENCE.has(entry.toolName);
}

function buildCause(entry: ToolEvidenceEntry): string {
    if (entry.falsificationReason) {
        return entry.falsificationReason;
    }
    if (entry.error) {
        return entry.error;
    }
    if (entry.exitCode !== undefined && entry.exitCode !== 0) {
        return `Tool "${entry.toolName}" exited with code ${entry.exitCode}`;
    }
    return `Tool "${entry.toolName}" failed verification`;
}

/**
 * Reconcile a round of evidence against a plan snapshot and produce the
 * resulting step transitions plus an updated plan.
 */
export function reconcileStepStatus(input: ReconcileStepInput): ReconcileResult {
    const {
        plan,
        evidence,
        reviewRejectedStepIds = [],
        manualOverrides = {},
        inProgressStepId,
        acceptOnAnyEvidence = false,
        gatedStepIds = []
    } = input;

    const byId = new Map(plan.todos.map(todo => [todo.id, todo]));
    const outcomes: StepOutcome[] = [];
    const updated: TodoItem[] = [];

    const attributed = new Map<string, ToolEvidenceEntry[]>();
    for (const entry of evidence) {
        const stepId = entry.stepId ?? inProgressStepId;
        if (!stepId || !byId.has(stepId)) {
            continue;
        }
        const list = attributed.get(stepId) ?? [];
        list.push(entry);
        attributed.set(stepId, list);
    }

    for (const todo of plan.todos) {
        let outcome: StepOutcome;
        const stepEvidence = attributed.get(todo.id) ?? [];
        const overridden = manualOverrides[todo.id] !== undefined;

        if (overridden) {
            outcome = {
                stepId: todo.id,
                content: todo.content,
                transition: 'none',
                evidenceStatus: 'none',
                overridden: true,
                evidenceIds: []
            };
            updated.push(todo);
            outcomes.push(outcome);
            continue;
        }

        if (reviewRejectedStepIds.includes(todo.id) && todo.status === 'completed') {
            outcome = {
                stepId: todo.id,
                content: todo.content,
                transition: gatedStepIds.includes(todo.id) ? 'blocked' : 'failed',
                evidenceStatus: 'falsified',
                cause: 'Review rejected the completed step',
                nextAction: 'Address review findings and re-run the step',
                evidenceIds: stepEvidence.map(entry => entry.id)
            };
            updated.push({
                ...todo,
                status: gatedStepIds.includes(todo.id) ? (todo.status === 'completed' ? 'in_progress' : todo.status) : 'failed',
                updatedAt: Date.now()
            });
            outcomes.push(outcome);
            continue;
        }

        // Steps not in an active/executable state are left untouched.
        // Steps not in an active/executable state are left untouched.
        if (todo.status !== 'in_progress' && todo.status !== 'pending') {
            updated.push(todo);
            outcomes.push({
                stepId: todo.id,
                content: todo.content,
                transition: 'none',
                evidenceStatus: stepEvidence.length ? 'unrelated' : 'none',
                evidenceIds: stepEvidence.map(entry => entry.id)
            });
            continue;
        }

        if (!stepEvidence.length) {
            updated.push(todo);
            outcomes.push({
                stepId: todo.id,
                content: todo.content,
                transition: 'none',
                evidenceStatus: 'none',
                evidenceIds: []
            });
            continue;
        }

        const falsified = stepEvidence.filter(entry => entry.falsified === true || entry.status === 'error');
        if (falsified.length > 0) {
            const cause = buildCause(falsified[0]);
            outcome = {
                stepId: todo.id,
                content: todo.content,
                transition: gatedStepIds.includes(todo.id) ? 'blocked' : 'failed',
                evidenceStatus: 'falsified',
                cause,
                nextAction: 'Fix the underlying issue and retry with a genuinely different approach',
                evidenceIds: stepEvidence.map(entry => entry.id)
            };
            updated.push({
                ...todo,
                status: gatedStepIds.includes(todo.id) ? todo.status : 'failed',
                updatedAt: Date.now()
            });
            outcomes.push(outcome);
            continue;
        }

        const satisfying = stepEvidence.filter(entry => isAcceptanceSatisfying(entry, acceptOnAnyEvidence));
        if (satisfying.length === 0) {
            updated.push(todo);
            outcomes.push({
                stepId: todo.id,
                content: todo.content,
                transition: 'none',
                evidenceStatus: 'unrelated',
                evidenceIds: stepEvidence.map(entry => entry.id)
            });
            continue;
        }

        outcome = {
            stepId: todo.id,
            content: todo.content,
            transition: 'completed',
            evidenceStatus: 'satisfied',
            evidenceIds: satisfying.map(entry => entry.id)
        };
        updated.push({ ...todo, status: 'completed', updatedAt: Date.now() });
        outcomes.push(outcome);
    }

    return { outcomes, updatedTodos: updated };
}

/**
 * Build a compact step summary for next-turn injection. Emits only the
 * unresolved (pending / in_progress) and failed-or-blocked steps with their
 * failure cause and next action, plus the count of completed steps — never the
 * full todo text.
 */
export function buildStepSummary(result: ReconcileResult): StepExecutionSummary {
    const completed: StepExecutionSummaryStep[] = [];
    const failedOrBlocked: StepExecutionSummaryStep[] = [];
    const unresolved: StepExecutionSummaryStep[] = [];

    const outcomeByStep = new Map(result.outcomes.map(outcome => [outcome.stepId, outcome]));

    for (const todo of result.updatedTodos) {
        const outcome = outcomeByStep.get(todo.id);
        const base: StepExecutionSummaryStep = {
            id: todo.id,
            content: todo.content,
            status: todo.status,
            failureCause: (outcome?.transition === 'failed' || outcome?.transition === 'blocked') ? outcome.cause : undefined,
            nextAction: (outcome?.transition === 'failed' || outcome?.transition === 'blocked') ? outcome.nextAction : undefined
        };
        if (outcome?.transition === 'completed') {
            completed.push(base);
        } else if (outcome?.transition === 'failed' || outcome?.transition === 'blocked') {
            failedOrBlocked.push(base);
        } else if (todo.status === 'pending' || todo.status === 'in_progress') {
            unresolved.push(base);
        }
    }

    return { completed, failedOrBlocked, unresolved };
}

/** Render a step summary as a compact user/assistant message for next-turn injection. */
export function renderStepSummary(summary: StepExecutionSummary): string {
    const lines: string[] = [];

    if (summary.failedOrBlocked.length) {
        lines.push('Steps needing attention:');
        for (const step of summary.failedOrBlocked) {
            lines.push(`- (${step.status}) ${step.content}` + (step.failureCause ? ` — ${step.failureCause}` : ''));
            if (step.nextAction) {
                lines.push(`  next: ${step.nextAction}`);
            }
        }
    }
    if (summary.unresolved.length) {
        lines.push('Remaining steps:');
        for (const step of summary.unresolved) {
            lines.push(`- (${step.status}) ${step.content}`);
        }
    }
    if (summary.completed.length) {
        lines.push(`Completed this pass: ${summary.completed.length} step(s).`);
    }
    if (!lines.length) {
        return 'No plan steps updated this pass.';
    }
    return lines.join('\n');
}
