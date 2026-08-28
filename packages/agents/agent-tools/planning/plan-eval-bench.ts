import {
    PlanEvalMetrics,
    PlanEvalReport,
    PlanEvalTrace,
    buildPlanEvalReport,
    computePlanEvalMetrics,
    renderPlanEvalReport
} from './plan-eval';

/**
 * Per-metric allowed drift from a stored baseline before a CI regression is
 * flagged. `tokenOverheadPerStep` is a token count; the rest are 0..1 rates.
 * For the two "lower is better" metrics (noEvidenceDoneRate, planConflictRate)
 * a positive drift past tolerance is a regression; for the others a negative
 * drift is.
 */
export interface PlanEvalRegressionThresholds {
    verifiableStepRate?: number;
    dependencyCorrectRate?: number;
    noEvidenceDoneRate?: number;
    failureRecoveryRate?: number;
    planConflictRate?: number;
    tokenOverheadPerStep?: number;
}

export interface PlanEvalRegressionResult {
    report: PlanEvalReport;
    /** Per-metric signed drift vs baseline (negative = improved). */
    deltas: Partial<Record<keyof PlanEvalMetrics, number>>;
    /** Per-metric boolean: true = drift exceeded the tolerance threshold. */
    regressions: Partial<Record<keyof PlanEvalMetrics, boolean>>;
    /** True when any metric regressed past its threshold. */
    regressed: boolean;
}

const DEFAULT_THRESHOLDS: Record<keyof PlanEvalMetrics, number> = {
    verifiableStepRate: 0.05,
    dependencyCorrectRate: 0.05,
    noEvidenceDoneRate: 0.05,
    failureRecoveryRate: 0.05,
    planConflictRate: 0.05,
    tokenOverheadPerStep: 10
};

/**
 * Higher-is-better metrics flag a regression when the drift from baseline is
 * more negative than the threshold; lower-is-better metrics flag when the drift
 * is more positive than the threshold.
 */
const HIGHER_IS_BETTER: Array<keyof PlanEvalMetrics> = [
    'verifiableStepRate',
    'dependencyCorrectRate',
    'failureRecoveryRate'
];

export function runPlanEvalRegression(
    traces: PlanEvalTrace[],
    baseline: PlanEvalMetrics,
    thresholds: PlanEvalRegressionThresholds = {}
): PlanEvalRegressionResult {
    const report = buildPlanEvalReport(traces, baseline);
    const merged = { ...DEFAULT_THRESHOLDS, ...thresholds };
    const deltas: Partial<Record<keyof PlanEvalMetrics, number>> = {};
    const regressions: Partial<Record<keyof PlanEvalMetrics, boolean>> = {};

    for (const key of Object.keys(DEFAULT_THRESHOLDS) as Array<keyof PlanEvalMetrics>) {
        const drift = report.deltas?.[key] ?? 0;
        deltas[key] = drift;
        const worse = HIGHER_IS_BETTER.includes(key) ? drift < -merged[key] : drift > merged[key];
        regressions[key] = worse;
    }

    return {
        report,
        deltas,
        regressions,
        regressed: Object.values(regressions).some(Boolean)
    };
}

/**
 * Render a CI-consumable regression block on top of the raw plan-eval report.
 * Emits one line per metric with drift and PASS/REGRESS; exits with an
 * explicit `[REGRESSION]`/`[OK]` marker the CI gate can grep.
 */
export function renderPlanEvalRegression(result: PlanEvalRegressionResult): string {
    const lines = [renderPlanEvalReport(result.report)];
    lines.push('Plan eval regression vs baseline:');
    for (const key of Object.keys(result.regressions) as Array<keyof PlanEvalMetrics>) {
        const drift = result.deltas[key] ?? 0;
        const flag = result.regressions[key] ? 'REGRESS' : 'PASS';
        lines.push(`  ${key.padEnd(24)} ${drift >= 0 ? '+' : ''}${drift.toFixed(3)}  ${flag}`);
    }
    lines.push(result.regressed ? '[REGRESSION] plan quality degraded vs baseline'
                                : '[OK] plan quality within baseline tolerance');
    return lines.join('\n');
}

/**
 * The P232 "plan 分解/执行" benchmark set: small, deterministic traces that
 * exercise the plan lifecycle (create -> parallel -> fail -> retry -> recover
 * -> review gate -> complete) so CI can watch for quality drift without a model.
 */
export function defaultPlanEvalTraces(): PlanEvalTrace[] {
    return [
        {
            id: 'well-formed',
            name: 'parallel plan with full evidence',
            steps: [
                { id: 'a', status: 'completed', content: 'parse spec', acceptance: 'spec parsed', evidence: 'note' },
                { id: 'b', status: 'completed', content: 'design api', acceptance: 'api sketched', evidence: 'diff' },
                {
                    id: 'c', status: 'completed', content: 'implement', acceptance: 'impl present',
                    evidence: 'diff', dependsOn: ['a', 'b']
                },
                {
                    id: 'd', status: 'completed', content: 'verify', acceptance: 'tests pass',
                    evidence: 'test', dependsOn: ['c']
                }
            ],
            writes: []
        },
        {
            id: 'recovered-failure',
            name: 'failure -> confirmed retry -> recovery',
            steps: [
                {
                    id: 'a', status: 'completed', content: 'parse spec', acceptance: 'spec parsed',
                    evidence: 'note', everFailed: true, recovered: true
                },
                {
                    id: 'b', status: 'completed', content: 'implement', acceptance: 'impl present',
                    evidence: 'diff', dependsOn: ['a'], everFailed: true, recovered: true
                }
            ],
            writes: []
        },
        {
            id: 'no-evidence-hole',
            name: 'completed step missing evidence',
            steps: [
                {
                    id: 'a', status: 'completed', content: 'hack it', acceptance: 'works',
                    completedWithoutEvidence: true
                }
            ],
            writes: []
        }
    ];
}

export function baselineFromTraces(traces: PlanEvalTrace[]): PlanEvalMetrics {
    const report = buildPlanEvalReport(traces);
    return report.summary;
}
