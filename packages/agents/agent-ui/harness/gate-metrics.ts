/**
 * v20-B — Quantitative metrics + baseline regression for the DOM/TUI interaction
 * gates (`run-dom-gate.ts` / `run-tui-gate.ts`).
 *
 * The two gates already assert REAL observed behavior structurally (seed counts,
 * RPC records, rendered rows/duplicates). This module adds the quantitative lens:
 * per-scenario elapsed time, SSE frame loss rate, reconnect replay latency, and
 * first-screen visible rate — captured by the gates and compared against a
 * committed JSON baseline (`harness/gate-baseline.json`). Run through
 * `harness/run-gate-regression.ts` (or the `gate-regression` gate stage), which
 * emits a CI-consumable `[OK]`/`[REGRESSION]` marker exactly like
 * `@tsdi/agent-tools`' plan-eval-bench (`runPlanEvalRegression`).
 *
 * Honesty contract (AGENTS.md / CHECKLIST.md):
 *  - `sseLossRate` comes from the fake gateway's REAL wire metadata
 *    (`sseFrameCount` vs `sseConsumed`); a non-zero loss is a real degradation.
 *  - `firstScreenVisibleRate` is ONLY comparable when `measured` is true (real
 *    browser geometry). Under JSDOM `measured:false` — the value is reported
 *    verbatim in the `[METRICS]` line but never regresses (no fabricated values).
 *  - `elapsedMs` / `replayLatencyMs` are wall-clock measures; thresholds are
 *    generous absolute drifts so CI jitter does not trip them — a regression on
 *    timing means a REAL slowdown, not noise.
 *
 * Direction: `firstScreenVisibleRate` is higher-is-better (drift < -threshold
 * regresses); `sseLossRate` / `replayLatencyMs` / `elapsedMs` are
 * lower-is-better (drift > threshold regresses).
 *
 * This file is intentionally PURE (no node API, no fs/process imports) so both
 * gates, the regression runner, and the unit spec can import it freely. File IO
 * lives in `run-gate-regression.ts` and the spec.
 */

export type GateLens = 'dom' | 'tui';

export interface GateScenarioMetrics {
    scenarioId: string;
    gate: GateLens;
    /** Full scenario wall time (mount + settle + dispose), ms. */
    elapsedMs: number;
    /** Frames the fake gateway pushed on the SSE wire. */
    sseFrameCount: number;
    /** Frames the bridge actually consumed across (re)connects. */
    sseConsumed: number;
    /** (frameCount - consumed) / frameCount; 0 when no frames. Healthy = 0. */
    sseLossRate: number;
    /**
     * Reconnect replay latency: from the moment the post-settle reconnect phase
     * starts until the render settles again. null when the scenario has no
     * `postSettlePush` (no replay to measure).
     */
    replayLatencyMs: number | null;
    /** Layout-measured first-screen visible rate; null when not measured. */
    firstScreenVisibleRate: number | null;
    /** True only when the viewport + rows were measurable (real browser). */
    measured: boolean;
}

export type GateMetricsKey = 'elapsedMs' | 'sseLossRate' | 'replayLatencyMs' | 'firstScreenVisibleRate';

export const GATE_METRICS_KEYS: GateMetricsKey[] = [
    'elapsedMs',
    'sseLossRate',
    'replayLatencyMs',
    'firstScreenVisibleRate'
];

/**
 * Per-metric allowed drift from a stored baseline before a CI regression is
 * flagged. Timing values are absolute ms drifts (generous: they catch REAL
 * slowdowns, not CI jitter); rate values are absolute 0..1 drifts.
 */
export interface GateRegressionThresholds {
    elapsedMs?: number;
    sseLossRate?: number;
    replayLatencyMs?: number;
    firstScreenVisibleRate?: number;
}

export interface GateScenarioRegression {
    /** Scenario key like `dom/desktop-basic` (also the baseline map key). */
    scenarioKey: string;
    /** Current run metrics; null when a baselined scenario is no longer run. */
    metrics: GateScenarioMetrics | null;
    /** Stored baseline for this scenario; null when the scenario is new. */
    baseline: GateScenarioMetrics | null;
    /** Per-metric signed drift: current - baseline (negative = improved). */
    deltas: Partial<Record<GateMetricsKey, number>>;
    /** Per-metric boolean: true = drift exceeded the tolerance threshold. */
    regressions: Partial<Record<GateMetricsKey, boolean>>;
    regressed: boolean;
    /** 'missing-current' : baselined scenario absent from the current run. */
    reason?: 'missing-current' | 'new-scenario';
}

export interface GateRegressionResult {
    scenarios: GateScenarioRegression[];
    regressed: boolean;
}

const DEFAULT_THRESHOLDS: Required<GateRegressionThresholds> = {
    elapsedMs: 5000,
    sseLossRate: 0.01,
    replayLatencyMs: 3000,
    firstScreenVisibleRate: 0.05
};

/** Higher-is-better metrics regress when drift < -threshold; the rest when drift > threshold. */
const HIGHER_IS_BETTER: GateMetricsKey[] = ['firstScreenVisibleRate'];

export function scenarioKey(metrics: GateScenarioMetrics): string {
    return `${metrics.gate}/${metrics.scenarioId}`;
}

/** The scalar field of a metric used for regression comparison. */
function comparableValue(metrics: GateScenarioMetrics | null, key: GateMetricsKey): number | null {
    if (!metrics) {
        return null;
    }
    const value = metrics[key];
    return value === undefined || value === null ? null : value;
}

/**
 * Compare one scenario's current metrics against its stored baseline.
 * A metric is only flagged when:
 *  - both values are present, AND
 *  - `firstScreenVisibleRate` additionally requires `measured` on BOTH sides
 *    (JSDOM vs real-browser geometry is not comparable — report-only).
 * Missing baseline scenario => not regressed (new); missing current => regression.
 */
function compareScenario(
    metrics: GateScenarioMetrics,
    baseline: GateScenarioMetrics | undefined,
    thresholds: Required<GateRegressionThresholds>
): GateScenarioRegression {
    const key = scenarioKey(metrics);
    if (!baseline) {
        return {
            scenarioKey: key,
            metrics,
            baseline: null,
            deltas: {},
            regressions: {},
            regressed: false,
            reason: 'new-scenario'
        };
    }

    const deltas: Partial<Record<GateMetricsKey, number>> = {};
    const regressions: Partial<Record<GateMetricsKey, boolean>> = {};
    for (const metricKey of GATE_METRICS_KEYS) {
        const currentValue = comparableValue(metrics, metricKey);
        const baseValue = comparableValue(baseline, metricKey);
        if (currentValue === null || baseValue === null) {
            // Leave delta/regression unset -> rendered as `n/a`, never regresses.
            continue;
        }
        if (
            metricKey === 'firstScreenVisibleRate' &&
            !(metrics.measured && baseline.measured)
        ) {
            // Not comparable (JSDOM): value is reported via [METRICS], not gated.
            continue;
        }
        const drift = currentValue - baseValue;
        deltas[metricKey] = drift;
        const worse = HIGHER_IS_BETTER.includes(metricKey) ? drift < -thresholds[metricKey] : drift > thresholds[metricKey];
        regressions[metricKey] = worse;
    }

    return {
        scenarioKey: key,
        metrics,
        baseline,
        deltas,
        regressions,
        regressed: Object.values(regressions).some(Boolean)
    };
}

/**
 * Run the current gate metrics against a stored baseline (mirrors
 * `runPlanEvalRegression`). Set `thresholds` to override the defaults
 * (DEFAULT_THRESHOLDS are merged, not replaced).
 */
export function runGateRegression(
    current: GateScenarioMetrics[],
    baseline: GateScenarioMetrics[],
    thresholds: GateRegressionThresholds = {}
): GateRegressionResult {
    const merged = { ...DEFAULT_THRESHOLDS, ...thresholds };
    const baselineByKey = new Map(baseline.map(metrics => [scenarioKey(metrics), metrics] as const));
    const currentByKey = new Map(current.map(metrics => [scenarioKey(metrics), metrics] as const));

    const scenarios: GateScenarioRegression[] = [];
    for (const metrics of current) {
        scenarios.push(compareScenario(metrics, baselineByKey.get(scenarioKey(metrics)), merged));
    }
    // A baselined scenario that the current run no longer produces = regression.
    for (const base of baseline) {
        if (!currentByKey.has(scenarioKey(base))) {
            scenarios.push({
                scenarioKey: scenarioKey(base),
                metrics: null,
                baseline: base,
                deltas: {},
                regressions: {},
                regressed: true,
                reason: 'missing-current'
            });
        }
    }

    return {
        scenarios,
        regressed: scenarios.some(scenario => scenario.regressed)
    };
}

/** Snapshot taken for storage: no threshold applied, the raw metric rows. */
export function baselineFromMetrics(metrics: GateScenarioMetrics[]): GateScenarioMetrics[] {
    return metrics.map(metrics => ({ ...metrics }));
}

/** Merge multiple metric sets (e.g. dom + tui JSON files) keyed by scenario. */
export function mergeGateMetrics(...groups: Array<GateScenarioMetrics | GateScenarioMetrics[]>): GateScenarioMetrics[] {
    const byKey = new Map<string, GateScenarioMetrics>();
    for (const group of groups) {
        for (const metrics of Array.isArray(group) ? group : [group]) {
            byKey.set(scenarioKey(metrics), metrics);
        }
    }
    return [...byKey.values()];
}

function formatDelta(key: GateMetricsKey, delta: number | undefined): string {
    if (delta === undefined) {
        return 'n/a';
    }
    if (key === 'elapsedMs' || key === 'replayLatencyMs') {
        return `${delta >= 0 ? '+' : ''}${Math.round(delta)}ms`;
    }
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}`;
}

function formatValue(metrics: GateScenarioMetrics | null, key: GateMetricsKey): string {
    if (!metrics) {
        return 'missing';
    }
    const value = metrics[key];
    if (value === null || value === undefined) {
        return 'n/a';
    }
    if (key === 'elapsedMs' || key === 'replayLatencyMs') {
        return `${Math.round(value)}ms`;
    }
    return value.toFixed(3);
}

/**
 * Compact one-line summary of one scenario's observed values — the honesty
 * record (raw numbers, including measured=false so an unmeasurable value is
 * never mistaken for a real one). Used by both gates (`[METRICS] <key> ...`)
 * and by `renderGateRegression`.
 */
export function metricsSummary(metrics: GateScenarioMetrics): string {
    return `elapsedMs=${Math.round(metrics.elapsedMs)}ms ` +
        `sseLoss=${metrics.sseLossRate.toFixed(3)} ` +
        `replay=${formatValue(metrics, 'replayLatencyMs')} ` +
        `firstScreen=${formatValue(metrics, 'firstScreenVisibleRate')} ` +
        `(${metrics.measured ? 'measured' : 'measured=false'})`;
}

/**
 * Render a CI-consumable regression block: one `[METRICS]` line per scenario
 * (the raw observed values — the honesty record), one PASS/REGRESS line per
 * comparable metric with signed drift, and a final `[OK]`/`[REGRESSION]`
 * marker the gate stage can grep. Mirrors `renderPlanEvalRegression`.
 */
export function renderGateRegression(result: GateRegressionResult): string {
    const lines: string[] = ['Gate metrics regression vs baseline:'];

    for (const scenario of result.scenarios) {
        if (scenario.metrics === null) {
            lines.push(`  [METRICS] ${scenario.scenarioKey} MISSING (baselined scenario no longer runs)`);
            continue;
        }
        const m = scenario.metrics;
        if (scenario.reason === 'new-scenario') {
            lines.push(`  [METRICS] ${scenario.scenarioKey} NEW (no baseline yet)`);
            continue;
        }
        lines.push(`  [METRICS] ${scenario.scenarioKey} ${metricsSummary(m)}`);
        for (const key of GATE_METRICS_KEYS) {
            const delta = scenario.deltas[key];
            if (delta === undefined) {
                // Not comparable (missing value or measured=false) -> report-only.
                continue;
            }
            const flag = scenario.regressions[key] ? 'REGRESS' : 'PASS';
            lines.push(`  ${`${scenario.scenarioKey.replace('/', '.')}.${key}`.padEnd(38)} ${formatDelta(key, delta).padStart(12)}  ${flag}`);
        }
    }

    lines.push(
        result.regressed
            ? '[REGRESSION] gate metrics degraded vs baseline'
            : '[OK] gate metrics within baseline tolerance'
    );
    return lines.join('\n');
}

export interface GateCliArgs {
    /** Optional single scenario id (positional, not starting with `--`). */
    only?: string;
    /** `--json <path>` — write the collected metrics to this file. */
    jsonPath?: string;
}

/** Shared CLI arg parsing for both gates: positional scenario id + `--json <path>`. */
export function parseGateCliArgs(args: string[]): GateCliArgs {
    const out: GateCliArgs = {};
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--json') {
            out.jsonPath = args[i + 1];
            i += 1;
        } else if (!arg.startsWith('--') && !out.only) {
            out.only = arg;
        }
    }
    return out;
}