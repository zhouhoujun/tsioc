#!/usr/bin/env node
/**
 * ioc/aop performance budget check.
 *
 * Runs the `@tsdi/ioc` benchmark harness and fails when a scenario exceeds its
 * budget. Budgets are deliberately generous (4-8x the reference best-of-N
 * figure) so normal hardware/GC variance does not fail the gate, while real
 * regressions still do: a resurrected AOP joinpoint leak or a per-call linear
 * scan pushes `JoinPoint.create` / `advised method call` up by an order of
 * magnitude, which is exactly what these numbers catch.
 *
 * Usage:
 *   node scripts/check-core-bench.mjs
 *   CORE_BENCH_SCALE=2 node scripts/check-core-bench.mjs   # slower host
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(root, 'packages', 'ioc');
const scale = Number(process.env.CORE_BENCH_SCALE || '1') || 1;

/** best-of-N ns/op budgets, generous headroom over the reference run. */
const budgets = {
    'injector.get singleton (same injector)': 200,
    'injector.get singleton (child -> parent)': 250,
    'injector.get transient (same injector)': 400,
    'injector.get transient (deps chain)': 450,
    'injector.has singleton': 200,
    'injector.resolve token': 2000,
    'ClassRef.getParameters(ctor)': 200,
    'ClassRef.hasMetadata(@Injectable)': 400,
    'ClassRef.getDefines(@Injectable)': 1500,
    'ClassRef.getMethodDefines(doWork)': 200,
    'ClassRef.resolveArguments(doWork)': 800,
    'JoinPoint.create': 6000,
    'plain method call': 60,
    'advisor.match(doWork)': 600,
    'advisor.getBefore(doWork)': 1500,
    'advised property read': 700,
    'advised method call (before)': 40000,
    'advised method call (no-arg before)': 25000
};

const reportDir = mkdtempSync(join(tmpdir(), 'core-bench-'));
const reportPath = join(reportDir, 'bench.json');

const result = spawnSync(
    'npm',
    ['run', 'bench', '--', '--rounds', '5', '--samples', '20000', '--json', reportPath],
    { cwd: packageDir, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } }
);

if (result.error) {
    console.error(`[BENCH-FAIL] could not run bench: ${result.error.message}`);
    process.exit(1);
}
if (result.status !== 0) {
    console.error('[BENCH-FAIL] npm run bench exited with', result.status);
    console.error(`${result.stdout || ''}\n${result.stderr || ''}`.trim());
    process.exit(1);
}

let report;
try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (err) {
    console.error(`[BENCH-FAIL] could not read report ${reportPath}: ${err.message}`);
    process.exit(1);
}

const measured = new Map(report.results.map(entry => [entry.scenario, entry.bestNsPerOp]));

let failed = false;
for (const [scenario, budget] of Object.entries(budgets)) {
    const value = measured.get(scenario);
    if (value === undefined) {
        console.error(`[BENCH-FAIL] missing scenario: ${scenario}`);
        failed = true;
        continue;
    }
    const limit = budget * scale;
    if (value > limit) {
        console.error(`[BENCH-FAIL] ${scenario}: ${value} ns > ${limit.toFixed(1)} ns budget`);
        failed = true;
    }
}

if (failed) {
    console.error(`\nreport: ${reportPath}`);
    process.exit(1);
}

console.log(`[BENCH-OK] ${Object.keys(budgets).length} scenarios within budget (scale x${scale})`);
console.log(`report: ${reportPath}`);
