import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    baselineFromTraces,
    defaultPlanEvalTraces,
    renderPlanEvalRegression,
    runPlanEvalRegression,
} from '../planning/plan-eval-bench';
import {
    PlanEvalMetrics,
    PlanEvalTrace,
    computePlanEvalMetrics,
    renderPlanEvalReport,
} from '../planning/plan-eval';

function benchTrace(overrides: Partial<PlanEvalTrace> & Pick<PlanEvalTrace, 'id' | 'name'>): PlanEvalTrace {
    return { steps: [], ...overrides };
}

async function withTempBaseline(run: (path: string) => Promise<void>): Promise<void> {
    const dir = await fs.mkdtemp(join(tmpdir(), 'plan-eval-bench-'));
    try {
        await run(join(dir, 'baseline.json'));
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

@Suite('PlanEvalBench')
export class PlanEvalBenchTest {
    @Test('baseline derived from traces rolls up the same summary the report emits')
    async baselineFromTraceSummary() {
        const traces = defaultPlanEvalTraces();
        const baseline = baselineFromTraces(traces);
        expect(baseline.verifiableStepRate).toBeGreaterThan(0);
        expect(baseline.noEvidenceDoneRate).toBeLessThanOrEqual(1);
    }

    @Test('identical-to-baseline run reports no regression')
    async noRegressionOnIdentical() {
        const traces = defaultPlanEvalTraces();
        const baseline = baselineFromTraces(traces);
        const result = runPlanEvalRegression(traces, baseline);
        expect(result.regressed).toBe(false);
        expect(Object.values(result.regressions).every(flag => flag === false)).toBe(true);
    }

    @Test('lower verifiable-step rate regresses beyond tolerance')
    async regressionOnVerifiableDrop() {
        const traces = defaultPlanEvalTraces();
        const baseline = baselineFromTraces(traces);
        const degraded = [
            ...traces,
            benchTrace({
                id: 'degraded',
                name: 'unverifiable step',
                steps: [{ id: 'x', status: 'pending', content: 'vague task' }]
            })
        ];
        const result = runPlanEvalRegression(degraded, baseline, { verifiableStepRate: 0.02 });
        expect(result.regressions.verifiableStepRate).toBe(true);
        expect(result.regressed).toBe(true);
    }

    @Test('higher no-evidence-done rate regresses the lower-is-better metric')
    async regressionOnNoEvidenceRise() {
        const traces = defaultPlanEvalTraces();
        const baseline = baselineFromTraces(traces);
        const leaky = [
            ...traces,
            benchTrace({
                id: 'leaky',
                name: 'completed without evidence',
                steps: [{ id: 'y', status: 'completed', content: 'claim done',
                    completedWithoutEvidence: true }]
            })
        ];
        const result = runPlanEvalRegression(leaky, baseline, { noEvidenceDoneRate: 0.02 });
        expect(result.regressions.noEvidenceDoneRate).toBe(true);
        expect(result.regressed).toBe(true);
    }

    @Test('rendered regression report exposes delta signs and a gate marker')
    async renderReportContent() {
        const traces = defaultPlanEvalTraces();
        const baseline = baselineFromTraces(traces);
        const degraded = [
            ...traces,
            benchTrace({ id: 'd', name: 'vague', steps: [{ id: 'z', status: 'pending', content: 'do stuff' }] })
        ];
        const result = runPlanEvalRegression(degraded, baseline, { verifiableStepRate: 0.01 });
        const text = renderPlanEvalRegression(result);
        expect(text).toContain('[REGRESSION]');
        expect(text).toContain('verifiableStepRate');
        expect(text).toContain('REGRESS');
    }

    @Test('baseline JSON persists to disk and reloads to an identical summary (入库)')
    async baselinePersistRoundTrip() {
        await withTempBaseline(async (path: string) => {
            const traces = defaultPlanEvalTraces();
            const baseline = baselineFromTraces(traces);
            await fs.writeFile(path, JSON.stringify(baseline, null, 2), 'utf8');
            const loaded: PlanEvalMetrics = JSON.parse(await fs.readFile(path, 'utf8'));
            expect(loaded.verifiableStepRate).toEqual(baseline.verifiableStepRate);
            expect(loaded.noEvidenceDoneRate).toEqual(baseline.noEvidenceDoneRate);
            const result = runPlanEvalRegression(defaultPlanEvalTraces(), loaded);
            expect(result.regressed).toBe(false);
        });
    }

    @Test('persisted baseline consumed by a degraded run flags regression (CI report)')
    async ciReportAgainstStoredBaseline() {
        await withTempBaseline(async (path: string) => {
            const baseline = baselineFromTraces(defaultPlanEvalTraces());
            await fs.writeFile(path, JSON.stringify(baseline, null, 2), 'utf8');
            const stored: PlanEvalMetrics = JSON.parse(await fs.readFile(path, 'utf8'));
            const run = [
                ...defaultPlanEvalTraces(),
                benchTrace({
                    id: 'leaky',
                    name: 'completed without evidence',
                    steps: [{ id: 'a', status: 'completed', content: 'hack it',
                        completedWithoutEvidence: true }]
                })
            ];
            const result = runPlanEvalRegression(run, stored, { noEvidenceDoneRate: 0.02 });
            expect(result.regressed).toBe(true);
            expect(result.regressions.noEvidenceDoneRate).toBe(true);
            const gate = renderPlanEvalRegression(result).split('\n').filter(l => l.startsWith('['));
            expect(gate.some(l => l.includes('[REGRESSION]'))).toBe(true);
        });
    }

    @Test('computePlanEvalMetrics stays consistent with the report summary')
    async metricsConsistency() {
        const traces = defaultPlanEvalTraces();
        const first = computePlanEvalMetrics(traces[0]);
        expect(first.verifiableStepRate).toBeGreaterThan(0);
        expect(first.dependencyCorrectRate).toBeLessThanOrEqual(1);
        // plain render (no baseline) is stable text
        expect(renderPlanEvalReport({ summary: first, traces: [], totalSteps: 0 }).length).toBeGreaterThan(0);
    }
}
