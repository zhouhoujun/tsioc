import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    buildPlanEvalReport,
    computePlanEvalMetrics,
    planConflictsFromResult,
    renderPlanEvalReport,
    stepsFromCompiledPlan,
    stepsFromReconcileResult,
    summarizePlanEvalReport,
    PlanEvalTrace,
    PlanEvalStep
} from '../planning/plan-eval';
import { compilePlan } from '../planning/plan-compiler';
import { reconcileStepStatus } from '../planning/step-reconciler';

function step(overrides: Partial<PlanEvalStep> & Pick<PlanEvalStep, 'id' | 'status' | 'content'>): PlanEvalStep {
    return { ...overrides };
}

const WELL_FORMED: PlanEvalStep[] = [
    step({ id: 's1', status: 'completed', content: 'add failing test', acceptance: 'test passes', evidence: 'test', everFailed: true, recovered: true }),
    step({ id: 's2', status: 'completed', content: 'implement feature', acceptance: 'impl present', evidence: 'diff', dependsOn: ['s1'], completedWithoutEvidence: true }),
    step({ id: 's3', status: 'completed', content: 'run lint', acceptance: 'lint clean', evidence: 'diagnostic', dependsOn: ['s2'] })
];

@Suite('PlanEval')
export class PlanEvalTest {
    @Test('verifiable step rate counts steps with acceptance + evidence')
    async verifiableStepRate() {
        const metrics = computePlanEvalMetrics({ id: 't', name: 't', steps: WELL_FORMED });
        expect(metrics.verifiableStepRate).toEqual(1);
        const withVague = computePlanEvalMetrics({
            id: 't', name: 't',
            steps: [...WELL_FORMED, step({ id: 's4', status: 'pending', content: 'wrap up things' })]
        });
        expect(withVague.verifiableStepRate).toEqual(0.75);
    }

    @Test('dependency correctness counts only edges that reference real steps')
    async dependencyCorrectRate() {
        const broken = computePlanEvalMetrics({
            id: 't', name: 't',
            steps: [...WELL_FORMED, step({ id: 's4', status: 'pending', content: 'x', dependsOn: ['missing'] })]
        });
        // 3 edges total (s2->s1, s3->s2, s4->missing); 2 reference real steps.
        expect(broken.dependencyCorrectRate).toBeCloseTo(2 / 3);
        const withRealAndBroken = computePlanEvalMetrics({
            id: 't', name: 't',
            steps: [
                ...WELL_FORMED,
                step({ id: 's4', status: 'pending', content: 'x', dependsOn: ['s1', 'nope'] })
            ]
        });
        // s2->s1, s3->s2, and s1 of s4 are correct; only s4->nope is not.
        expect(withRealAndBroken.dependencyCorrectRate).toBeCloseTo(3 / 4);
    }

    @Test('no-evidence done rate flags completed-without-evidence steps only')
    async noEvidenceDoneRate() {
        const metrics = computePlanEvalMetrics({ id: 't', name: 't', steps: WELL_FORMED });
        expect(metrics.noEvidenceDoneRate).toBeCloseTo(1 / 3);
    }

    @Test('failure recovery rate = recovered / ever-failed')
    async failureRecoveryRate() {
        const metrics = computePlanEvalMetrics({ id: 't', name: 't', steps: WELL_FORMED });
        expect(metrics.failureRecoveryRate).toEqual(1);
        const partialRecovery = computePlanEvalMetrics({
            id: 't', name: 't',
            steps: [
                step({ id: 'a', status: 'completed', content: 'a', everFailed: true, recovered: true }),
                step({ id: 'b', status: 'failed', content: 'b', everFailed: true }),
                step({ id: 'c', status: 'pending', content: 'c' })
            ]
        });
        expect(partialRecovery.failureRecoveryRate).toBeCloseTo(0.5);
    }

    @Test('plan conflict rate = conflicted revision-aware writes / revision-aware writes')
    async planConflictRate() {
        const metrics = computePlanEvalMetrics({
            id: 't', name: 't', steps: WELL_FORMED,
            writes: planConflictsFromResult([false, true, true, false])
        });
        expect(metrics.planConflictRate).toBeCloseTo(0.5);
        const noWrites = computePlanEvalMetrics({ id: 't', name: 't', steps: WELL_FORMED });
        expect(noWrites.planConflictRate).toEqual(0);
    }

    @Test('token overhead is zero when no extra tokens beyond payload')
    async tokenOverhead() {
        const metrics = computePlanEvalMetrics({ id: 't', name: 't', steps: WELL_FORMED, tokensUsed: 60, payloadTokens: 60 });
        expect(metrics.tokenOverheadPerStep).toEqual(0);
        const overhead = computePlanEvalMetrics({ id: 't', name: 't', steps: WELL_FORMED, tokensUsed: 90, payloadTokens: 60 });
        expect(overhead.tokenOverheadPerStep).toEqual(10);
    }

    @Test('stepsFromReconcileResult flags completed-without-satisfied-evidence')
    async reconcileAdapter() {
        const plan = {
            planId: 'p1', revision: 1,
            todos: [
                { id: 'a', content: 'step a', status: 'in_progress' as const },
                { id: 'b', content: 'step b', status: 'pending' as const }
            ]
        };
        const result = reconcileStepStatus({
            plan,
            evidence: [{
                id: 'e1', stepId: 'a', toolName: 'verify-command',
                verification: 'verify-command', turnId: 't1', sessionId: 's1', status: 'success', createdAt: 0
            }]
        });
        const steps = stepsFromReconcileResult(result.updatedTodos, result.outcomes.map(o => ({ stepId: o.stepId, evidenceStatus: o.evidenceStatus })));
        const a = steps.find(s => s.id === 'a');
        const b = steps.find(s => s.id === 'b');
        expect(a?.status).toEqual('completed');
        expect(a?.completedWithoutEvidence).toEqual(false);
        expect(b?.completedWithoutEvidence).toBeUndefined();
    }

    @Test('compilePlan output feeds verifiable-step metric via compiled adapter')
    async compiledPlanAdapter() {
        const compiled = compilePlan([
            { id: 'i1', content: 'write a test and run the build', status: 'pending' },
            { id: 'i2', content: 'fix something', status: 'pending' }
        ], { acceptAll: true });
        const steps = stepsFromCompiledPlan(compiled.steps);
        const metrics = computePlanEvalMetrics({ id: 'c', name: 'compiled', steps });
        // All compiled steps carry acceptance + evidence (auto-normalized in place).
        expect(metrics.verifiableStepRate).toEqual(1);
    }

    @Test('report rolls up means and emits regression deltas vs baseline')
    async reportAndRegression() {
        const traces: PlanEvalTrace[] = [
            { id: 'good', name: 'well-formed', steps: WELL_FORMED, writes: planConflictsFromResult([false]) },
            { id: 'noisy', name: 'noisy plan', steps: [
                step({ id: 'x', status: 'completed', content: 'x', completedWithoutEvidence: true }),
                step({ id: 'y', status: 'failed', content: 'y', everFailed: true })
            ], writes: planConflictsFromResult([true]) }
        ];
        const report = buildPlanEvalReport(traces);
        expect(report.totalSteps).toEqual(5);
        expect(report.traces.length).toEqual(2);
        expect(report.summary.planConflictRate).toBeCloseTo(0.5);
        expect(report.deltas).toBeUndefined();

        const baseline = report.summary;
        const regression = buildPlanEvalReport(traces, baseline);
        expect(regression.deltas).toBeDefined();
        expect(regression.deltas?.verifiableStepRate).toBeCloseTo(0);
        expect(renderPlanEvalReport(regression)).toContain('Regression deltas');
        expect(summarizePlanEvalReport(regression)).toContain('verifiable=');
    }
}
