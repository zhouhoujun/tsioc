#!/usr/bin/env node
/**
 * Compare a microservice benchmark report against the committed baseline.
 *
 * The benchmark harness itself is host-dependent, so the gate leads with the
 * robust signal: median latency (p50) must not regress, and matching must not
 * degrade as the route table grows. Throughput is checked as a secondary
 * signal that only fails when p50 moved as well, which filters out noisy CI
 * hosts without hiding real algorithmic regressions.
 *
 * Usage:
 *   node scripts/check-ms-bench.mjs --current /tmp/ms-bench.json
 *   node scripts/check-ms-bench.mjs --current out.json --update
 *   node scripts/check-ms-bench.mjs --current out.json --max-p50-regression 0.5
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULTS = {
    baseline: 'packages/microservices/benchmarks/results/baseline.json',
    maxP50Regression: Number(process.env.MS_BENCH_MAX_P50_REGRESSION ?? 1),
    maxOpsRegression: Number(process.env.MS_BENCH_MAX_OPS_REGRESSION ?? 0.4),
    maxScaling: Number(process.env.MS_BENCH_MAX_SCALING ?? 6),
    // Sub-microsecond timings wobble by more than 2x run to run; only count a
    // p50 regression when it also moves by a meaningful absolute amount.
    minP50DeltaMs: Number(process.env.MS_BENCH_MIN_P50_DELTA_MS ?? 0.01)
};

/**
 * End-to-end network scenarios are much noisier than in-process loops. Give
 * them a wider budget so a busy host does not fail the gate, while still
 * catching structural regressions (2.5x p50).
 */
const SCENARIO_BUDGETS = {
    'gateway-forward': { maxP50Regression: 1.5, maxOpsRegression: 0.6 }
};

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) {
            continue;
        }
        const name = token.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) {
            args[name] = true;
        } else {
            args[name] = next;
            i++;
        }
    }
    return args;
}

function loadReport(path) {
    const report = JSON.parse(readFileSync(resolve(path), 'utf8'));
    if (!Array.isArray(report?.results)) {
        throw new Error(`${path} is not a benchmark report (missing results[])`);
    }
    return report;
}

function paramsKey(params) {
    const entries = Object.entries(params ?? {}).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([key, value]) => `${key}=${value}`).join(',');
}

function resultKey(result) {
    return `${result.scenario}|${paramsKey(result.params)}`;
}

function groupKey(result) {
    const params = { ...(result.params ?? {}) };
    delete params.routes;
    return `${result.scenario}|${paramsKey(params)}`;
}

function fmt(value, digits = 4) {
    return Number.isFinite(value) ? Number(value.toFixed(digits)) : String(value);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const currentPath = args.current;
    if (!currentPath) {
        console.error('ms-bench: --current <report.json> is required');
        process.exit(2);
    }

    const baselinePath = resolve(args.baseline ?? DEFAULTS.baseline);
    const maxP50Regression = Number(args['max-p50-regression'] ?? DEFAULTS.maxP50Regression);
    const maxOpsRegression = Number(args['max-ops-regression'] ?? DEFAULTS.maxOpsRegression);
    const maxScaling = Number(args['max-scaling'] ?? DEFAULTS.maxScaling);
    const minP50DeltaMs = Number(args['min-p50-delta'] ?? DEFAULTS.minP50DeltaMs);

    const current = loadReport(currentPath);

    if (args.update) {
        writeFileSync(baselinePath, `${JSON.stringify(current, null, 4)}\n`);
        console.log(`ms-bench: baseline updated (${current.results.length} scenarios) -> ${baselinePath}`);
        return;
    }

    const baseline = loadReport(baselinePath);
    const currentByKey = new Map(current.results.map(result => [resultKey(result), result]));
    const failures = [];
    let compared = 0;

    for (const expected of baseline.results) {
        const actual = currentByKey.get(resultKey(expected));
        if (!actual) {
            continue;
        }
        compared++;

        const expectedP50 = Math.max(expected.p50Ms, 0.0001);
        const p50Ratio = actual.p50Ms / expectedP50;
        const opsRatio = actual.opsPerSecond / Math.max(expected.opsPerSecond, 1);

        const budget = SCENARIO_BUDGETS[expected.scenario] ?? {};
        const scenarioP50Regression = Number(
            args['max-p50-regression'] ?? budget.maxP50Regression ?? maxP50Regression
        );
        const scenarioOpsRegression = Number(
            args['max-ops-regression'] ?? budget.maxOpsRegression ?? maxOpsRegression
        );
        const p50Delta = actual.p50Ms - expected.p50Ms;
        const p50Moved = p50Ratio > 1 + scenarioP50Regression && p50Delta > minP50DeltaMs;
        const opsRegressed = opsRatio < 1 - scenarioOpsRegression;
        // Throughput alone is noisy on shared machines; require p50 to move too.
        const throughputRegression = opsRegressed && p50Ratio > 1.2 && p50Delta > minP50DeltaMs;

        console.log(
            `ms-bench: ${expected.scenario} ${paramsKey(expected.params)} ` +
            `p50 x${fmt(p50Ratio, 2)} ops x${fmt(opsRatio, 2)}`
        );

        if (p50Moved || throughputRegression) {
            failures.push(
                `${expected.scenario} ${paramsKey(expected.params)}: ` +
                `p50 ${fmt(expected.p50Ms)}ms -> ${fmt(actual.p50Ms)}ms (x${fmt(p50Ratio, 2)}), ` +
                `ops ${expected.opsPerSecond} -> ${actual.opsPerSecond} (x${fmt(opsRatio, 2)})`
            );
        }
    }

    const groups = new Map();
    for (const result of current.results) {
        const routes = Number(result.params?.routes);
        if (!Number.isFinite(routes)) {
            continue;
        }
        const key = groupKey(result);
        let group = groups.get(key);
        if (!group) {
            group = [];
            groups.set(key, group);
        }
        group.push(result);
    }

    for (const [key, results] of groups) {
        if (results.length < 2) {
            continue;
        }
        results.sort((left, right) => Number(left.params.routes) - Number(right.params.routes));
        const smallest = results[0];
        const largest = results[results.length - 1];
        const ratio = largest.p50Ms / Math.max(smallest.p50Ms, 0.0001);
        console.log(
            `ms-bench: scaling ${key} p50 ${fmt(smallest.p50Ms)}ms@${smallest.params.routes} -> ` +
            `${fmt(largest.p50Ms)}ms@${largest.params.routes} (x${fmt(ratio, 2)})`
        );
        if (ratio > maxScaling) {
            failures.push(
                `${key}: p50 grows x${fmt(ratio, 2)} from ${smallest.params.routes} to ${largest.params.routes} ` +
                `routes (limit x${maxScaling}) - matching is not index-backed`
            );
        }
    }

    if (!compared) {
        console.error('ms-bench: no scenario matched the baseline (did the harness change?)');
        process.exit(2);
    }

    if (failures.length) {
        console.error('');
        console.error('ms-bench: REGRESSION');
        for (const failure of failures) {
            console.error(`  - ${failure}`);
        }
        process.exit(1);
    }

    console.log(`ms-bench: OK (${compared} scenarios, p50/ops/scaling within budget)`);
}

try {
    main();
} catch (error) {
    console.error(`ms-bench: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
}
