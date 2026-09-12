import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    GateScenarioMetrics,
    baselineFromMetrics,
    mergeGateMetrics,
    parseGateCliArgs,
    renderGateRegression,
    runGateRegression
} from '../harness/gate-metrics';

function makeMetrics(overrides: Partial<GateScenarioMetrics> & Pick<GateScenarioMetrics, 'scenarioId' | 'gate'>): GateScenarioMetrics {
    return {
        elapsedMs: 1000,
        sseFrameCount: 10,
        sseConsumed: 10,
        sseLossRate: 0,
        replayLatencyMs: null,
        firstScreenVisibleRate: null,
        measured: false,
        ...overrides
    };
}

async function withTempBaseline(run: (path: string) => Promise<void>): Promise<void> {
    const dir = await fs.mkdtemp(join(tmpdir(), 'gate-metrics-'));
    try {
        await run(join(dir, 'baseline.json'));
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

@Suite('GateMetricsBench')
export class GateMetricsBenchTest {
    @Test('identical-to-baseline run reports no regression')
    async noRegressionOnIdentical() {
        const metrics = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom' });
        const baseline = baselineFromMetrics([metrics]);
        const result = runGateRegression([metrics], baseline);
        expect(result.regressed).toBe(false);
        expect(result.scenarios[0].regressed).toBe(false);
    }

    @Test('higher sse loss rate regresses the lower-is-better metric')
    async regressionOnSseLossRise() {
        const base = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom' });
        const degraded = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', sseFrameCount: 10, sseConsumed: 8, sseLossRate: 0.2 });
        const result = runGateRegression([degraded], [base]);
        expect(result.scenarios[0].regressions.sseLossRate).toBe(true);
        expect(result.regressed).toBe(true);
    }

    @Test('lower first-screen visible rate regresses the higher-is-better metric')
    async regressionOnFirstScreenDrop() {
        const base = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', measured: true, firstScreenVisibleRate: 0.9 });
        const degraded = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', measured: true, firstScreenVisibleRate: 0.5 });
        const result = runGateRegression([degraded], [base]);
        expect(result.scenarios[0].regressions.firstScreenVisibleRate).toBe(true);
        expect(result.regressed).toBe(true);
    }

    @Test('unmeasurable (JSDOM) first-screen rate never regresses')
    async noRegressionWhenUnmeasured() {
        const base = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', measured: false, firstScreenVisibleRate: null });
        const current = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', measured: false, firstScreenVisibleRate: null });
        const result = runGateRegression([current], [base]);
        expect(result.scenarios[0].regressions.firstScreenVisibleRate).toBeUndefined();
        expect(result.regressed).toBe(false);
    }

    @Test('measured-mismatch (baseline real browser, current JSDOM) never regresses')
    async noRegressionOnMeasuredMismatch() {
        const base = makeMetrics({ scenarioId: 'disconnect-retry', gate: 'dom', measured: true, firstScreenVisibleRate: 0.9 });
        const current = makeMetrics({ scenarioId: 'disconnect-retry', gate: 'dom', measured: false, firstScreenVisibleRate: null });
        const result = runGateRegression([current], [base]);
        expect(result.scenarios[0].regressions.firstScreenVisibleRate).toBeUndefined();
        expect(result.regressed).toBe(false);
    }

    @Test('baselined scenario missing from the current run is a regression')
    async missingCurrentIsRegression() {
        const baseline = [makeMetrics({ scenarioId: 'disconnect-retry', gate: 'dom' })];
        const current = [makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom' })];
        const result = runGateRegression(current, baseline);
        expect(result.regressed).toBe(true);
        const missing = result.scenarios.find(s => s.reason === 'missing-current');
        expect(missing).toBeDefined();
        expect(missing!.regressed).toBe(true);
    }

    @Test('new scenario without a baseline is not a regression')
    async newScenarioNotRegression() {
        const result = runGateRegression([makeMetrics({ scenarioId: 'new-scenario', gate: 'dom' })], []);
        expect(result.regressed).toBe(false);
        expect(result.scenarios[0].reason).toBe('new-scenario');
    }

    @Test('higher replay latency regresses')
    async regressionOnReplayRise() {
        const base = makeMetrics({ scenarioId: 'disconnect-retry', gate: 'dom', replayLatencyMs: 500 });
        const slow = makeMetrics({ scenarioId: 'disconnect-retry', gate: 'dom', replayLatencyMs: 5000 });
        const result = runGateRegression([slow], [base]);
        expect(result.scenarios[0].regressions.replayLatencyMs).toBe(true);
        expect(result.regressed).toBe(true);
    }

    @Test('elapsed time beyond threshold regresses, jitter within threshold does not')
    async elapsedThresholdBehavior() {
        const base = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', elapsedMs: 1000 });
        const jitter = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', elapsedMs: 1200 });
        expect(runGateRegression([jitter], [base]).regressed).toBe(false);
        const slow = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', elapsedMs: 8000 });
        const slowResult = runGateRegression([slow], [base]);
        expect(slowResult.scenarios[0].regressions.elapsedMs).toBe(true);
        expect(slowResult.regressed).toBe(true);
    }

    @Test('rendered regression output exposes metrics, drift lines, and the gate marker')
    async renderContent() {
        const healthy = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom' });
        const okText = renderGateRegression(runGateRegression([healthy], [healthy]));
        expect(okText).toContain('[OK]');
        const degraded = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom', sseFrameCount: 10, sseConsumed: 8, sseLossRate: 0.2 });
        const badText = renderGateRegression(runGateRegression([degraded], [healthy]));
        expect(badText).toContain('[REGRESSION]');
        expect(badText).toContain('[METRICS]');
        expect(badText).toContain('sseLossRate');
        expect(badText).toContain('REGRESS');
        expect(badText).toContain('measured=false');
    }

    @Test('baseline JSON persists and reloads to an identical, non-regressing summary')
    async baselineRoundTrip() {
        await withTempBaseline(async (path: string) => {
            const metrics = [
                makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom' }),
                makeMetrics({ scenarioId: 'disconnect-retry', gate: 'tui' })
            ];
            const baseline = baselineFromMetrics(metrics);
            await fs.writeFile(path, JSON.stringify(baseline, null, 2), 'utf8');
            const loaded: GateScenarioMetrics[] = JSON.parse(await fs.readFile(path, 'utf8'));
            expect(loaded).toEqual(baseline);
            expect(runGateRegression(metrics, loaded).regressed).toBe(false);
        });
    }

    @Test('mergeGateMetrics keeps distinct scenarios and lets the later value win')
    async mergeBehavior() {
        const dom = makeMetrics({ scenarioId: 'desktop-basic', gate: 'dom' });
        const tui = makeMetrics({ scenarioId: 'desktop-basic', gate: 'tui' });
        const again = makeMetrics({ scenarioId: 'desktop-basic', gate: 'tui', elapsedMs: 999 });
        const merged = mergeGateMetrics([dom, tui], [again]);
        expect(merged).toHaveLength(2);
        const tuiMerged = merged.find(m => m.gate === 'tui');
        expect(tuiMerged && tuiMerged.elapsedMs).toBe(999);
    }

    @Test('parseGateCliArgs handles scenario id and --json')
    async cliParsing() {
        expect(parseGateCliArgs([])).toEqual({});
        expect(parseGateCliArgs(['desktop-basic'])).toEqual({ only: 'desktop-basic' });
        expect(parseGateCliArgs(['--json', '/tmp/m.json'])).toEqual({ jsonPath: '/tmp/m.json' });
        expect(parseGateCliArgs(['desktop-basic', '--json', '/tmp/m.json'])).toEqual({ only: 'desktop-basic', jsonPath: '/tmp/m.json' });
        expect(parseGateCliArgs(['--json', '/tmp/m.json', 'desktop-basic'])).toEqual({ only: 'desktop-basic', jsonPath: '/tmp/m.json' });
    }
}