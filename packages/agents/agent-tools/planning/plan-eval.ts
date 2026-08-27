import { TodoItem, TodoStatus } from './todo-store';
import { DecomposedStep } from './plan-compiler';

/**
 * P232: Plan quality evaluation harness.
 *
 * Deterministic, model-free metrics over plan decomposition/execution traces.
 * Each metric is a pure function so the benchmark set is replay-consistent and
 * can be gated in CI. Grounded in the real plan primitives (compilePlan,
 * reconcileStepStatus, TodoPlanConflict) so the metrics reflect actual behavior.
 *
 * Metrics (the plan's acceptance list):
 *   - verifiableStepRate     fraction of steps carrying acceptance + evidence
 *   - dependencyCorrectRate  fraction of dependsOn edges that reference a real step
 *   - noEvidenceDoneRate      fraction of completed steps that completed with no
 *                            satisfying evidence (lower is better)
 *   - failureRecoveryRate    fraction of ever-failed steps that later completed
 *   - planConflictRate       fraction of revision-bearer write attempts rejected
 *                           as stale (TodoPlanConflict) (lower is better)
 *   - tokenOverheadPerStep   avg non-payload tokens per accepted step (lower is better)
 */

export interface PlanEvalStep {
    id: string;
    status: TodoStatus;
    content: string;
    acceptance?: string;
    evidence?: string;
    dependsOn?: string[];
    /** True when the step reached `completed` with no satisfying evidence. */
    completedWithoutEvidence?: boolean;
    /** True when the step failed or blocked at least once during execution. */
    everFailed?: boolean;
    /** True when an ever-failed step was finally completed (recovery). */
    recovered?: boolean;
}

export interface PlanWriteAttempt {
    /** Carried an `expectedRevision` (revision-aware write). */
    revisionAware: boolean;
    /** Rejected as a TodoPlanConflict (stale expectedRevision). */
    conflicted: boolean;
}

export interface PlanEvalTrace {
    id: string;
    name: string;
    steps: PlanEvalStep[];
    /** Number of revision-aware plan write attempts and how many conflicted. */
    writes?: PlanWriteAttempt[];
    /** Total tokens consumed by this plan's execution. */
    tokensUsed?: number;
    /** Tokens attributable to accepted step content payload. */
    payloadTokens?: number;
}

export interface PlanEvalMetrics {
    verifiableStepRate: number;
    dependencyCorrectRate: number;
    noEvidenceDoneRate: number;
    failureRecoveryRate: number;
    planConflictRate: number;
    tokenOverheadPerStep: number;
}

export interface PlanEvalTraceResult {
    traceId: string;
    name: string;
    metrics: PlanEvalMetrics;
}

export interface PlanEvalReport {
    traces: PlanEvalTraceResult[];
    /** Rolled-up mean across traces (0..1 for all *_rate metrics). */
    summary: PlanEvalMetrics;
    totalSteps: number;
    /** Baseline deltas, when a baseline is supplied (negative delta = improved). */
    deltas?: Partial<Record<keyof PlanEvalMetrics, number>>;
}

// ---------------------------------------------------------------------------
// Per-trace metric computation
// ---------------------------------------------------------------------------

export function computePlanEvalMetrics(trace: PlanEvalTrace): PlanEvalMetrics {
    const steps = trace.steps ?? [];
    const total = steps.length;

    const verifiable = steps.filter(step => step.acceptance && step.acceptance.trim() && step.evidence && step.evidence.trim());
    const verifiableStepRate = total ? verifiable.length / total : 0;

    let dependencyEdges = 0;
    let dependencyCorrect = 0;
    for (const step of steps) {
        for (const dep of step.dependsOn ?? []) {
            dependencyEdges += 1;
            if (steps.some(candidate => candidate.id === dep)) {
                dependencyCorrect += 1;
            }
        }
    }
    const dependencyCorrectRate = dependencyEdges ? dependencyCorrect / dependencyEdges : 1;

    const completedNoEvidence = steps.filter(step => step.status === 'completed' && step.completedWithoutEvidence === true);
    const completed = steps.filter(step => step.status === 'completed');
    const noEvidenceDoneRate = completed.length ? completedNoEvidence.length / completed.length : 0;

    const everFailed = steps.filter(step => step.everFailed === true);
    const recovered = everFailed.filter(step => step.recovered === true);
    const failureRecoveryRate = everFailed.length ? recovered.length / everFailed.length : 1;

    const revisionAware = (trace.writes ?? []).filter(write => write.revisionAware);
    const conflicted = revisionAware.filter(write => write.conflicted);
    const planConflictRate = revisionAware.length ? conflicted.length / revisionAware.length : 0;

    const accepted = steps.filter(step => step.status !== 'cancelled');
    const acceptedTokens = accepted.length;
    const payload = trace.payloadTokens ?? 0;
    const tokenOverheadPerStep = acceptedTokens > 0
        ? Math.max(0, ((trace.tokensUsed ?? payload) - payload) / acceptedTokens)
        : 0;

    return {
        verifiableStepRate,
        dependencyCorrectRate,
        noEvidenceDoneRate,
        failureRecoveryRate,
        planConflictRate,
        tokenOverheadPerStep
    };
}

// ---------------------------------------------------------------------------
// Aggregation + regression
// ---------------------------------------------------------------------------

export function buildPlanEvalReport(
    traces: PlanEvalTrace[],
    baseline?: PlanEvalMetrics
): PlanEvalReport {
    const traceResults: PlanEvalTraceResult[] = traces.map(trace => ({
        traceId: trace.id,
        name: trace.name,
        metrics: computePlanEvalMetrics(trace)
    }));

    const mean = (selector: (m: PlanEvalMetrics) => number): number => {
        if (!traceResults.length) return 0;
        return traceResults.reduce((sum, result) => sum + selector(result.metrics), 0) / traceResults.length;
    };

    const summary: PlanEvalMetrics = {
        verifiableStepRate: mean(m => m.verifiableStepRate),
        dependencyCorrectRate: mean(m => m.dependencyCorrectRate),
        noEvidenceDoneRate: mean(m => m.noEvidenceDoneRate),
        failureRecoveryRate: mean(m => m.failureRecoveryRate),
        planConflictRate: mean(m => m.planConflictRate),
        tokenOverheadPerStep: mean(m => m.tokenOverheadPerStep)
    };

    const totalSteps = traces.reduce((sum, trace) => sum + (trace.steps?.length ?? 0), 0);

    const deltas = baseline ? (Object.fromEntries(
        (Object.keys(summary) as Array<keyof PlanEvalMetrics>)
            .filter(key => key !== 'tokenOverheadPerStep')
            .map(key => [key, summary[key] - baseline[key]])
    ) as Partial<Record<keyof PlanEvalMetrics, number>>) : undefined;

    return { traces: traceResults, summary, totalSteps, ...(deltas ? { deltas } : {}) };
}

// ---------------------------------------------------------------------------
// Adapters from real plan primitives
// ---------------------------------------------------------------------------

/**
 * Map compiled steps (compilePlan output) into eval step shape, marking
 * acceptance/evidence presence based on the compiled enrichment.
 */
export function stepsFromCompiledPlan<T extends DecomposedStep>(steps: T[]): PlanEvalStep[] {
    return steps.map(step => ({
        id: step.id,
        status: step.status,
        content: step.content,
        acceptance: step.acceptance,
        evidence: step.evidence,
        dependsOn: step.dependsOn
    }));
}

/**
 * Map a reconcile outcome (reconcileStepStatus result) into eval step shape.
 * `completedWithoutEvidence` is derived from stepEvidenceStatus !== 'satisfied'.
 */
export function stepsFromReconcileResult(
    todos: TodoItem[],
    outcomes: { stepId: string; evidenceStatus: string }[]
): PlanEvalStep[] {
    const evidenceByStep = new Map(outcomes.map(outcome => [outcome.stepId, outcome.evidenceStatus]));
    return todos.map(todo => ({
        id: todo.id,
        status: todo.status,
        content: todo.content,
        acceptance: todo.acceptance,
        evidence: (todo as Partial<DecomposedStep>).evidence,
        dependsOn: todo.dependsOn,
        completedWithoutEvidence: todo.status === 'completed'
            ? evidenceByStep.get(todo.id) !== 'satisfied'
            : undefined
    }));
}

/**
 * Adapter for a revision-aware plan store flow: build write-attempt records
 * from success/conflict outcomes.
 */
export function planConflictsFromResult(attemptConflicts: boolean[]): PlanWriteAttempt[] {
    return attemptConflicts.map(conflicted => ({ revisionAware: true, conflicted }));
}

// ---------------------------------------------------------------------------
// Human/CI consumable render
// ---------------------------------------------------------------------------

export function renderPlanEvalReport(report: PlanEvalReport): string {
    const s = report.summary;
    const lines: string[] = [];
    lines.push(`Plan eval report — ${report.traces.length} traces, ${report.totalSteps} steps`);
    lines.push(`  verifiableStepRate     ${fmt(s.verifiableStepRate)}`);
    lines.push(`  dependencyCorrectRate  ${fmt(s.dependencyCorrectRate)}`);
    lines.push(`  noEvidenceDoneRate     ${fmt(s.noEvidenceDoneRate)}  (lower is better)`);
    lines.push(`  failureRecoveryRate    ${fmt(s.failureRecoveryRate)}`);
    lines.push(`  planConflictRate       ${fmt(s.planConflictRate)}  (lower is better)`);
    lines.push(`  tokenOverheadPerStep   ${s.tokenOverheadPerStep.toFixed(1)}`);
    if (report.deltas) {
        lines.push('Regression deltas vs baseline (negative = improved):');
        for (const [key, value] of Object.entries(report.deltas)) {
            lines.push(`  ${key.padEnd(22)} ${sign(value)}`);
        }
    }
    return lines.join('\n');
}

export function summarizePlanEvalReport(report: PlanEvalReport): string {
    return [
        `verifiable=${fmt(report.summary.verifiableStepRate)}`,
        `deps=${fmt(report.summary.dependencyCorrectRate)}`,
        `noEvidence=${fmt(report.summary.noEvidenceDoneRate)}`,
        `recovery=${fmt(report.summary.failureRecoveryRate)}`,
        `conflict=${fmt(report.summary.planConflictRate)}`,
        `tokens/step=${report.summary.tokenOverheadPerStep.toFixed(1)}`
    ].join(' ');
}

function fmt(value: number): string {
    return value.toFixed(2);
}

function sign(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`;
}
