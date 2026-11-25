#!/usr/bin/env node
/**
 * Common widget benchmark budget check.
 *
 * Runs `npm run bench` inside packages/components/common and scales generous
 * budgets by the calibration metric so a busy host does not fail the gate.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(root, 'packages', 'components', 'common');
const CALIBRATION_REFERENCE_MS = 250;

const budgets = {
    'data-table filter 5k rows': 300,
    'data-table sort 5k rows': 200,
    'data-table format 100k cells': 1500,
    'spring 200k steps': 800
};

const result = spawnSync('npm', ['run', 'bench'], {
    cwd: packageDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
});
const output = `${result.stdout || ''}\n${result.stderr || ''}`;
if (result.error || result.status !== 0) {
    console.error('[COMMON-BENCH-FAIL] benchmark exited with', result.status, result.error?.message || '');
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
    console.error('[COMMON-BENCH-FAIL] missing calibration metric');
    process.exit(1);
}
const loadFactor = Math.max(1, calibration / CALIBRATION_REFERENCE_MS);
const failures = [];
for (const [name, budget] of Object.entries(budgets)) {
    const value = measured.get(name);
    if (value == null) {
        failures.push(`${name}: missing`);
        continue;
    }
    const scaled = budget * loadFactor;
    if (value > scaled) {
        failures.push(`${name}: ${value.toFixed(2)}ms > ${scaled.toFixed(2)}ms`);
    }
}
if (failures.length) {
    console.error(`[COMMON-BENCH-FAIL] calibration ${calibration.toFixed(2)}ms (x${loadFactor.toFixed(2)})`);
    failures.forEach(item => console.error(`  - ${item}`));
    console.error(output.trim());
    process.exit(1);
}
console.log(`[COMMON-BENCH-OK] calibration ${calibration.toFixed(2)}ms (x${loadFactor.toFixed(2)})`);
