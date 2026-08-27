import { TodoItem } from './todo-store';

/**
 * P228: Plan DAG -> orchestration bridge.
 *
 * Bridges the plan DAG produced by `resolveSchedule` into the orchestration
 * primitives (`fan_out` / `wait_all` / `map_reduce`). The bridge is a pure,
 * replay-consistent function set — identical inputs always produce identical
 * waves, worker tasks and aggregation, so a duplicated pass never re-plans a
 * DAG differently:
 *
 *   - `buildDagExecutionRounds` maps the DAG into deterministic execution
 *     rounds (waves), honouring serial barriers, optional steps, partial
 *     failure / cancellation propagation and a concurrency budget.
 *   - `roundToWorkerTasks` maps a round's steps to isolated worker task specs
 *     (goal, toolsets, profile, reasoning, maxTurns) keyed to each step.
 *   - `pickPrimitiveForRound` selects the orchestration primitive for a round:
 *     `wait_all` for serial barriers, `fan_out` for ordinary parallel waves
 *     (or `map_reduce` when aggregation is requested).
 *   - `aggregateStepResults` writes each worker result back to its step as
 *     evidence + lineage (dependency chain), returning a compact partial-
 *     failure summary — the caller no longer concatenates worker strings by
 *     hand.
 */

export interface DagStep {
    id: string;
    content: string;
    owner?: string;
    toolsets?: string[];
    dependsOn?: string[];
    /** Steps treated as serial barriers: their wave runs alone (wait_all). */
    barrier: boolean;
    /** Optional steps: on failure their dependents are skipped but the plan continues. */
    optional: boolean;
}

export interface DagExecutionOptions {
    /** Max steps allowed in any single parallel wave (unbounded when omitted). */
    concurrency?: number;
    /** Step ids treated as serial barriers. */
    barrierStepIds?: string[];
    /** Step ids treated as optional. */
    optionalStepIds?: string[];
    /** Map step id -> allowed tool categories for the generated worker task. */
    stepToolsets?: Record<string, string[]>;
    /** Map owner -> allowed tool categories (fallback when a step has no explicit toolsets). */
    ownerToolsets?: Record<string, string[]>;
    /** Map step id -> named model profile for the generated worker task. */
    stepProfiles?: Record<string, string>;
    /** Map step id -> max worker turns. */
    stepMaxTurns?: Record<string, number>;
    /** Per-step reasoning flag override. */
    stepReasoning?: Record<string, boolean>;
    /** True when a parallel wave should be scheduled as `map_reduce`. */
    aggregateRounds?: boolean;
}

export interface DagExecutionRound {
    depth: number;
    /** True when this round is a serial barrier and should run with `wait_all`. */
    serial: boolean;
    /** True when this round was produced as an aggregate (map_reduce) wave. */
    aggregated: boolean;
    steps: DagStep[];
}

export interface DagExecutionPlan {
    rounds: DagExecutionRound[];
    /** Steps that will never run because a dependency failed / was cancelled. */
    cancelled: DagStep[];
    totalSteps: number;
    roundCount: number;
}

export interface WorkerTaskSpec {
    /** Stable step id this worker belongs to. */
    stepId: string;
    goal: string;
    toolsets?: string[];
    profile?: string;
    reasoning?: boolean;
    maxTurns?: number;
}

export type PrimitiveKind = 'fan_out' | 'wait_all' | 'map_reduce';

/**
 * Deterministically compute execution rounds (waves) from a plan DAG.
 *
 * Wave model:
 *   - Wave 0 = the initial ready set (steps whose deps are completed or absent).
 *   - After a wave, its steps are treated as completed; dependents whose deps
 *     are now all met join the next wave.
 *   - A `failed` step cancels its transitive dependents (they never run) — the
 *     plan still emits remaining independent waves (partial failure).
 *   - A wave containing a barrier step runs as a single-step serial wave;
 *     barrier steps act as hard boundaries so later steps always wait.
 *   - A concurrency budget splits an otherwise-parallel wave into sub-waves.
 */
export function buildDagExecutionRounds(todos: TodoItem[], options: DagExecutionOptions = {}): DagExecutionPlan {
    const {
        concurrency,
        barrierStepIds = [],
        optionalStepIds = []
    } = options;
    const barrierSet = new Set(barrierStepIds);
    const optionalSet = new Set(optionalStepIds);

    const byId = new Map<string, TodoItem>(todos.map(todo => [todo.id, todo]));
    const idSet = new Set(todos.map(todo => todo.id));

    // depsOf[step] = validated dependency ids; childrenOf[dep] = dependent ids.
    const depsOf = new Map<string, string[]>();
    const childrenOf = new Map<string, string[]>();
    for (const todo of todos) {
        const deps = (todo.dependsOn ?? []).filter(dep => idSet.has(dep) && dep !== todo.id);
        depsOf.set(todo.id, deps);
        for (const dep of deps) {
            if (!childrenOf.has(dep)) childrenOf.set(dep, []);
            childrenOf.get(dep)!.push(todo.id);
        }
    }

    const toDagStep = (id: string): DagStep => {
        const todo = byId.get(id)!;
        const owner = todo.owner;
        const toolsets = options.stepToolsets?.[id]
            ?? (owner ? options.ownerToolsets?.[owner] : undefined)
            ?? undefined;
        return {
            id,
            content: todo.content,
            owner,
            toolsets,
            dependsOn: depsOf.get(id),
            barrier: barrierSet.has(id),
            optional: optionalSet.has(id)
        };
    };

    // Steps already finished (their deps are met by construction).
    const done = new Set<string>();
    for (const todo of todos) {
        if (todo.status === 'completed' || todo.status === 'cancelled') {
            done.add(todo.id);
        }
    }

    // Steps still needing scheduling.
    const remaining = new Set<string>();
    for (const todo of todos) {
        if (todo.status !== 'completed' && todo.status !== 'cancelled') {
            remaining.add(todo.id);
        }
    }

    // A failed step and its transitive dependents are cancelled (never run).
    const cancelled = new Set<string>();
    const cancelTransitive = (failedId: string) => {
        for (const childId of childrenOf.get(failedId) ?? []) {
            if (!cancelled.has(childId)) {
                cancelled.add(childId);
                cancelTransitive(childId);
            }
        }
    };
    for (const todo of todos) {
        if (todo.status === 'failed') {
            cancelled.add(todo.id);
            cancelTransitive(todo.id);
        }
    }

    const rounds: DagExecutionRound[] = [];
    let depth = 0;

    while (true) {
        const wave: string[] = [];
        for (const id of remaining) {
            if (cancelled.has(id)) continue;
            const deps = depsOf.get(id) ?? [];
            if (deps.every(dep => done.has(dep))) wave.push(id);
        }
        if (wave.length === 0) break;

        // A barrier step forces a single-step serial wave.
        const barrier = wave.find(id => toDagStep(id).barrier);
        if (barrier) {
            rounds.push({ depth, serial: true, aggregated: false, steps: [toDagStep(barrier)] });
            done.add(barrier);
            remaining.delete(barrier);
            depth++;
            continue;
        }

        // Split the parallel wave by the concurrency budget into sub-waves.
        const sorted = [...wave].sort();
        const subWaves: string[][] = [];
        if (concurrency && concurrency > 0 && sorted.length > concurrency) {
            for (let i = 0; i < sorted.length; i += concurrency) {
                subWaves.push(sorted.slice(i, i + concurrency));
            }
        } else {
            subWaves.push(sorted);
        }

        for (const sub of subWaves) {
            rounds.push({
                depth,
                serial: false,
                aggregated: !!options.aggregateRounds && sub.length > 1,
                steps: sub.map(toDagStep)
            });
            for (const id of sub) {
                done.add(id);
                remaining.delete(id);
            }
            depth++;
        }
    }

    // Collect cancelled steps (with a visited guard to avoid diamond duplicates).
    const cancelledSteps: DagStep[] = [];
    const visited = new Set<string>();
    const collect = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        if (cancelled.has(id)) cancelledSteps.push(toDagStep(id));
        for (const childId of childrenOf.get(id) ?? []) collect(childId);
    };
    for (const id of cancelled) collect(id);

    return {
        rounds,
        cancelled: cancelledSteps,
        totalSteps: todos.length,
        roundCount: rounds.length
    };
}

/**
 * Map a round's steps to isolated worker task specs for the orchestration
 * primitive. Each worker carries a stable stepId so results can be written
 * back as per-step evidence + lineage.
 */
export function roundToWorkerTasks(round: DagExecutionRound, options: DagExecutionOptions = {}): WorkerTaskSpec[] {
    return round.steps.map(step => ({
        stepId: step.id,
        goal: step.content,
        toolsets: step.toolsets,
        profile: options.stepProfiles?.[step.id],
        reasoning: options.stepReasoning?.[step.id],
        maxTurns: options.stepMaxTurns?.[step.id]
    }));
}

/**
 * Select the orchestration primitive for a round:
 *   - serial barrier waves -> `wait_all`
 *   - aggregated parallel waves -> `map_reduce`
 *   - ordinary parallel waves -> `fan_out`
 */
export function pickPrimitiveForRound(round: DagExecutionRound): PrimitiveKind {
    if (round.serial) return 'wait_all';
    if (round.aggregated) return 'map_reduce';
    return 'fan_out';
}

/** Per-step write-back of a worker result with provenance (evidence + lineage). */
export interface StepExecutionRecord {
    stepId: string;
    content: string;
    outcome: 'success' | 'failed' | 'skipped' | 'cancelled' | 'timed_out';
    /** Worker lineage: the stepId(s) this step depends on (its DAG parents). */
    lineage: string[];
    /** Stable evidence id (stepId#depth#attempt). */
    evidenceId: string;
    attempt: number;
    output?: string;
    error?: string;
    summary?: string;
}

export interface StepAggregationInput {
    round: DagExecutionRound;
    /** Worker/primitive results keyed by stepId (missing entries are treated as failures). */
    results: Array<{
        stepId: string;
        output?: string;
        error?: string;
        summary?: string;
        timedOut?: boolean;
    }>;
}

export interface StepAggregation {
    records: StepExecutionRecord[];
    succeeded: string[];
    succeededCount: number;
    failed: Array<{ stepId: string; error: string }>;
    failedCount: number;
    summary: string;
}

/**
 * Aggregate worker results back onto their steps, emitting per-step evidence
 * ids and lineage. Pure: identical index-aligned results produce identical
 * aggregation. Optional steps degrade to a skipped record (non-fatal);
 * non-optional failures are reported as failed; missing results count as
 * failed with an explicit cause.
 */
export function aggregateStepResults(input: StepAggregationInput): StepAggregation {
    const { round, results } = input;
    const records: StepExecutionRecord[] = [];
    const succeeded: string[] = [];
    const failed: Array<{ stepId: string; error: string }> = [];
    let succeededCount = 0;
    let failedCount = 0;

    const byResultStep = new Map(results.map(r => [r.stepId, r]));

    for (const step of round.steps) {
        const r = byResultStep.get(step.id);
        const error = r?.error || (r?.timedOut ? 'timed out' : undefined) || (r ? undefined : 'no result recorded');
        const isFailure = !!error;

        const outcome: StepExecutionRecord['outcome'] = isFailure
            ? (step.optional ? 'skipped' : r?.timedOut ? 'timed_out' : 'failed')
            : 'success';

        const record: StepExecutionRecord = {
            stepId: step.id,
            content: step.content,
            outcome,
            lineage: step.dependsOn ?? [],
            evidenceId: `step#${step.id}#${round.depth}#1`,
            attempt: 1,
            output: r?.output,
            error,
            summary: r?.summary
        };
        records.push(record);

        if (outcome === 'success') {
            succeeded.push(step.id);
            succeededCount++;
        } else if (outcome === 'failed' || outcome === 'timed_out') {
            failedCount++;
            failed.push({ stepId: step.id, error: error || String(outcome) });
            // skipped (optional degradation) and cancelled are non-fatal.
        }
    }

    return {
        records,
        succeeded,
        succeededCount,
        failed,
        failedCount,
        summary: buildRoundSummary(round, succeededCount, failedCount)
    };
}

function buildRoundSummary(round: DagExecutionRound, succeeded: number, failed: number): string {
    const total = round.steps.length;
    if (failed === 0) {
        return `Round ${round.depth}: ${succeeded}/${total} step${total === 1 ? '' : 's'} complete`;
    }
    return `Round ${round.depth}: ${succeeded}/${total} succeeded, ${failed} failed`;
}
