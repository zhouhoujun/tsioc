import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TodoItem } from '../planning/todo-store';
import {
    buildDagExecutionRounds,
    roundToWorkerTasks,
    pickPrimitiveForRound,
    aggregateStepResults,
    DagExecutionOptions
} from '../planning/dag-orchestrator';

function item(id: string, overrides: Partial<TodoItem> = {}): TodoItem {
    return { id, content: `${id}: do work`, status: 'pending', ...overrides };
}

function ids(round: { steps: Array<{ id: string }> }): string[] {
    return round.steps.map(s => s.id);
}

@Suite('plan DAG -> orchestration bridge (P228)')
export class DagOrchestratorTest {

    @Test('chain DAG resolves to one step per round')
    chainDagProducesSerialRounds() {
        const plan = buildDagExecutionRounds([
            item('a'),
            item('b', { dependsOn: ['a'] }),
            item('c', { dependsOn: ['b'] })
        ]);
        expect(plan.roundCount).toBe(3);
        expect(ids(plan.rounds[0])).toEqual(['a']);
        expect(ids(plan.rounds[1])).toEqual(['b']);
        expect(ids(plan.rounds[2])).toEqual(['c']);
    }

    @Test('diamond DAG runs the two independent middles in parallel')
    diamondDagParallelMiddle() {
        const plan = buildDagExecutionRounds([
            item('root'),
            item('l', { dependsOn: ['root'] }),
            item('r', { dependsOn: ['root'] }),
            item('join', { dependsOn: ['l', 'r'] })
        ]);
        expect(plan.roundCount).toBe(3);
        expect(ids(plan.rounds[0])).toEqual(['root']);
        expect(ids(plan.rounds[1])).toEqual(['l', 'r']);
        expect(ids(plan.rounds[2])).toEqual(['join']);
    }

    @Test('a barrier step runs as a single-step serial wave')
    barrierStepIsSerial() {
        const plan = buildDagExecutionRounds(
            [
                item('a'),
                item('gate', { dependsOn: ['a'] }),
                item('b', { dependsOn: ['gate'] }),
                item('c', { dependsOn: ['gate'] })
            ],
            { barrierStepIds: ['gate'] }
        );
        expect(plan.rounds.length).toBe(3);
        const gateRound = plan.rounds.find(r => ids(r).includes('gate'))!;
        expect(gateRound.serial).toBe(true);
        expect(gateRound.steps).toHaveLength(1);
        expect(pickPrimitiveForRound(gateRound)).toBe('wait_all');
    }

    @Test('concurrency budget splits a parallel wave into sub-waves')
    concurrencyBudgetSplitsWave() {
        const plan = buildDagExecutionRounds(
            [item('a'), item('b'), item('c'), item('d'), item('e')],
            { concurrency: 2 }
        );
        expect(plan.rounds.length).toBe(3); // [a,b], [c,d], [e]
        expect(ids(plan.rounds[0])).toEqual(['a', 'b']);
        expect(ids(plan.rounds[1])).toEqual(['c', 'd']);
        expect(ids(plan.rounds[2])).toEqual(['e']);
    }

    @Test('a failed step cancels its transitive dependents but keeps independent waves')
    partialFailureCancelsTransitiveDependents() {
        const plan = buildDagExecutionRounds([
            item('okA'),
            item('fails', { status: 'failed' }),
            item('dep', { dependsOn: ['fails'] }),
            item('dep2', { dependsOn: ['dep'] }),
            item('independent')
        ]);
        // okA + independent run; fails/dep/dep2 cancelled.
        // Waves are sorted alphabetically for deterministic replay.
        const allRounds = plan.rounds.flatMap(r => ids(r));
        expect(allRounds).toEqual(['independent', 'okA']);
        const cancelled = plan.cancelled.map(s => s.id).sort();
        expect(cancelled).toEqual(['dep', 'dep2', 'fails']);
    }

    @Test('completed steps are skipped from scheduling but unblock dependents')
    completedStepsUnblockDependents() {
        const plan = buildDagExecutionRounds([
            item('done', { status: 'completed' }),
            item('next', { dependsOn: ['done'] })
        ]);
        expect(plan.rounds).toHaveLength(1);
        expect(ids(plan.rounds[0])).toEqual(['next']);
    }

    @Test('worker tasks are built from step content with toolsets derived from step or owner')
    workerTasksCarryToolsetsAndProfile() {
        const plan = buildDagExecutionRounds(
            [item('a', { owner: 'ops' }), item('b', { owner: 'ops' })],
            {
                ownerToolsets: { ops: ['terminal', 'files'] },
                stepProfiles: { a: 'strong' },
                stepReasoning: { b: true },
                stepMaxTurns: { b: 5 }
            }
        );
        const tasks = roundToWorkerTasks(plan.rounds[0], {
            stepProfiles: { a: 'strong' },
            stepReasoning: { b: true },
            stepMaxTurns: { b: 5 }
        });
        const a = tasks.find(t => t.stepId === 'a')!;
        const b = tasks.find(t => t.stepId === 'b')!;
        expect(a.goal).toBe('a: do work');
        expect(a.toolsets).toEqual(['terminal', 'files']);
        expect(a.profile).toBe('strong');
        expect(b.reasoning).toBe(true);
        expect(b.maxTurns).toBe(5);
    }

    @Test('aggregate writes per-step evidence + lineage from worker results')
    aggregationWritesEvidenceAndLineage() {
        const plan = buildDagExecutionRounds([
            item('a'),
            item('b', { dependsOn: ['a'] })
        ]);
        // Run first round (a) to completion.
        const aggA = aggregateStepResults({
            round: plan.rounds[0],
            results: [{ stepId: 'a', output: 'ok', summary: 'done a' }]
        });
        expect(aggA.succeeded).toEqual(['a']);
        expect(aggA.failedCount).toBe(0);
        expect(aggA.records[0].evidenceId).toBe('step#a#0#1');
        expect(aggA.records[0].lineage).toEqual([]);

        // Second round: b depends on a (already completed in round 0).
        const aggB = aggregateStepResults({
            round: plan.rounds[1],
            results: [{ stepId: 'b', output: 'out', error: undefined, summary: 'done b' }]
        });
        expect(aggB.records[0].lineage).toEqual(['a']);
        expect(aggB.records[0].outcome).toBe('success');
    }

    @Test('a non-optional failing worker is recorded as failed with cause')
    nonOptionalFailureRecordedAsFailed() {
        const plan = buildDagExecutionRounds([item('x')]);
        const agg = aggregateStepResults({
            round: plan.rounds[0],
            results: [{ stepId: 'x', error: 'boom' }]
        });
        expect(agg.failedCount).toBe(1);
        expect(agg.records[0].outcome).toBe('failed');
        expect(agg.records[0].error).toBe('boom');
        expect(agg.summary).toContain('1 failed');
    }

    @Test('an optional failing step degrades to skipped (non-fatal)')
    optionalFailureDegradesToSkipped() {
        const plan = buildDagExecutionRounds([item('opt')], { optionalStepIds: ['opt'] });
        const agg = aggregateStepResults({
            round: plan.rounds[0],
            results: [{ stepId: 'opt', error: 'fail', summary: undefined }]
        });
        expect(agg.records[0].outcome).toBe('skipped');
        expect(agg.failedCount).toBe(0); // skipped is non-fatal
    }

    @Test('a timed-out worker is recorded as timed_out')
    timeoutRecordedAsTimedOut() {
        const plan = buildDagExecutionRounds([item('t')]);
        const agg = aggregateStepResults({
            round: plan.rounds[0],
            results: [{ stepId: 't', timedOut: true }]
        });
        expect(agg.records[0].outcome).toBe('timed_out');
        expect(agg.records[0].error).toBe('timed out');
    }

    @Test('a missing result counts as a failure with explicit cause')
    missingResultCountsAsFailure() {
        const plan = buildDagExecutionRounds([item('m')]);
        const agg = aggregateStepResults({
            round: plan.rounds[0],
            results: []
        });
        expect(agg.records[0].outcome).toBe('failed');
        expect(agg.records[0].error).toBe('no result recorded');
    }

    @Test('aggregate round that requests map_reduce is flagged aggregated')
    aggregateRoundsFlaggedForMapReduce() {
        const plan = buildDagExecutionRounds(
            [item('a'), item('b')],
            { aggregateRounds: true }
        );
        expect(plan.rounds[0].aggregated).toBe(true);
        expect(pickPrimitiveForRound(plan.rounds[0])).toBe('map_reduce');
    }

    @Test('repeated calls produce identical round plans (deterministic replay)')
    deterministicReplay() {
        const todos = [
            item('a'),
            item('b', { dependsOn: ['a'] }),
            item('c'),
            item('d', { dependsOn: ['c'] })
        ];
        const opts: DagExecutionOptions = { concurrency: 1 };
        const p1 = buildDagExecutionRounds(todos, opts);
        const p2 = buildDagExecutionRounds(todos, opts);
        expect(p1).toEqual(p2);
        expect(p1.roundCount).toBe(p2.roundCount);
    }
}
