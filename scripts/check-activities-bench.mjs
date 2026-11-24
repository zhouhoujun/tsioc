#!/usr/bin/env node
/**
 * Activities performance budget check.
 *
 * Runs `npm run bench` inside packages/activities and fails when a metric
 * exceeds its budget. Budgets are intentionally generous (roughly 2-4x the
 * idle-host measurement) so they catch structural regressions — a removed
 * incremental cache, an O(n^2) validation path — without failing on normal
 * hardware variance.
 *
 * Usage:
 *   node scripts/check-activities-bench.mjs
 *   ACTIVITIES_BENCH_SCALE=2 node scripts/check-activities-bench.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(root, 'packages', 'activities');
const scale = Number(process.env.ACTIVITIES_BENCH_SCALE || '1') || 1;

/** Idle-host calibration reference (ms) for the bench's memory-access loop. */
const CALIBRATION_REFERENCE_MS = 130;

const budgets = {
    'registry lookups': 15,
    'palette 200x': 80,
    'canvas 200 nodes rebuild': 140,
    'canvas 200 nodes incremental': 260,
    'inspector 1000x': 100,
    'config validation 100 nodes': 700,
    'typed value decode 100k': 25,
    'typed value resolve 100k': 150,
    'execute 6 function nodes 100x': 140
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

const calibration = measured.get('calibration');
if (!calibration) {
    console.error('[BENCH-FAIL] missing metric: calibration');
    process.exit(1);
}
const loadFactor = Math.max(1, calibration / CALIBRATION_REFERENCE_MS);
if (loadFactor > 1.05) {
    console.log(`[BENCH-INFO] host calibration ${calibration.toFixed(2)}ms -> budgets scaled x${loadFactor.toFixed(2)}`);
}

let failed = false;
for (const [name, base] of Object.entries(budgets)) {
    const value = measured.get(name);
    const budget = base * scale * loadFactor;
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
    console.error('\nActivities performance budget exceeded. Run `npm run bench` in packages/activities for details.');
    process.exit(1);
}
console.log('\n[GATE-PASS] activities-bench: performance budgets');
