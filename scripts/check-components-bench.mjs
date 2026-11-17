#!/usr/bin/env node
/**
 * Components performance budget check.
 *
 * Runs `npm run bench` inside packages/components and fails when a metric
 * exceeds its budget. Budgets are intentionally generous so they catch
 * regressions (for example a removed view-scope teardown or an O(n) append
 * path) without failing on normal CI hardware variance.
 *
 * Usage:
 *   node scripts/check-components-bench.mjs
 *   COMPONENTS_BENCH_SCALE=2 node scripts/check-components-bench.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(root, 'packages', 'components');
const scale = Number(process.env.COMPONENTS_BENCH_SCALE || '1') || 1;

const budgets = {
    'proxy reads': 2000,
    'trigger 1 key (100 bindings)': 1500,
    'computed cache reads': 150,
    'v-for append': 250,
    'v-for middle insert': 400,
    'v-for middle remove': 400,
    'v-for reorder': 1000,
    'viewchild lookups': 1500,
    'viewchildren append': 800,
    'writes after 500 toggles': 100
};

const result = spawnSync('npm', ['run', 'bench'], {
    cwd: packageDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
});

if (result.error) {
    console.error(`[BENCH-FAIL] could not run bench: ${result.error.message}`);
    process.exit(1);
}
const output = `${result.stdout || ''}\n${result.stderr || ''}`;
if (result.status !== 0) {
    console.error('[BENCH-FAIL] npm run bench exited with', result.status);
    console.error(output.trim());
    process.exit(1);
}

const measured = new Map();
for (const line of output.split('\n')) {
    const match = line.match(/^(.+?)\s{2,}([\d.]+)\s+ms\b/);
    if (match) {
        measured.set(match[1].trim(), Number(match[2]));
    }
}

let failed = false;
for (const [name, base] of Object.entries(budgets)) {
    const value = measured.get(name);
    const budget = base * scale;
    if (value === undefined) {
        failed = true;
        console.error(`[BENCH-FAIL] missing metric: ${name}`);
        continue;
    }
    if (value > budget) {
        failed = true;
        console.error(`[BENCH-FAIL] ${name}: ${value.toFixed(2)}ms > ${budget.toFixed(2)}ms`);
        continue;
    }
    console.log(`[BENCH-OK] ${name}: ${value.toFixed(2)}ms (budget ${budget.toFixed(2)}ms)`);
}

if (failed) {
    console.error('\nComponents performance budget exceeded. Run `npm run bench` in packages/components for details.');
    process.exit(1);
}
console.log('\n[GATE-PASS] components-bench: performance budgets');
