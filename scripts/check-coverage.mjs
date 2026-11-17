#!/usr/bin/env node
/**
 * Coverage ratchet for the framework packages.
 *
 * Runs `npm run test:coverage` per package and compares the reported totals
 * with `scripts/coverage-baseline.json`. Coverage may only go up: a drop larger
 * than COVERAGE_TOLERANCE (default 0.5 percentage points, for V8/ts-node drift)
 * fails the check.
 *
 * Usage:
 *   node scripts/check-coverage.mjs
 *   node scripts/check-coverage.mjs --only logger,repository
 *   COVERAGE_TOLERANCE=1 node scripts/check-coverage.mjs
 *
 * Baselines are recorded manually after a reviewed run:
 *   node scripts/check-coverage.mjs --write   # rewrites the baseline file
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'scripts', 'coverage-baseline.json');
const tolerance = Number(process.env.COVERAGE_TOLERANCE ?? '0.5') || 0.5;
const args = process.argv.slice(2);
const write = args.includes('--write');
const onlyArg = args.find(arg => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(name => name.trim()).filter(Boolean)) : undefined;

const baseline = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf8'))
    : {};

/**
 * `│ Total        │ 77.6%   │ 72.5%   │ 82.1%   │ 79.9%   │` followed by
 * ` Coverage: ... 43 files`.
 *
 * A package may print several summaries (a suite that itself collects coverage,
 * or a `test:coverage` script that runs two entrypoints). Keep the one covering
 * the most files: that is the outermost/full run rather than a nested sample.
 */
function parseTotal(output) {
    const lines = output.split('\n');
    let best;
    for (let index = 0; index < lines.length; index++) {
        if (!/│\s*Total\s*│/.test(lines[index])) {
            continue;
        }
        const values = [...lines[index].matchAll(/([\d.]+)%/g)].map(match => Number(match[1]));
        if (values.length < 4) {
            continue;
        }
        let files = 0;
        for (let lookahead = index + 1; lookahead < Math.min(index + 4, lines.length); lookahead++) {
            const match = lines[lookahead].match(/(\d+)\s+files?/);
            if (match) {
                files = Number(match[1]);
                break;
            }
        }
        const [statements, branches, functions, coverageLines] = values;
        // Keep the last row: a suite may print summaries while it runs (nested
        // coverage collection), and the final one reflects the finished run.
        best = { statements, branches, functions, lines: coverageLines, files };
    }
    return best;
}

// `--only` may name packages that have no baseline yet (record them with
// `--write`); without it only the recorded packages are checked.
const packages = only ? [...only] : Object.keys(baseline);
if (!packages.length) {
    console.error('[COVERAGE-FAIL] no packages to check');
    process.exit(1);
}

const results = {};
let failed = false;

for (const name of packages) {
    const packageDir = join(root, 'packages', name);
    const run = spawnSync('npm', ['run', 'test:coverage'], {
        cwd: packageDir,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' }
    });
    const output = `${run.stdout || ''}${run.stderr || ''}`;
    const measured = run.status === 0 ? parseTotal(output) : undefined;
    if (!measured) {
        console.error(`[COVERAGE-FAIL] ${name}: could not read coverage totals`);
        const tail = output.trim().split('\n').slice(-12).join('\n');
        console.error(tail.replace(/^/gm, '        '));
        failed = true;
        continue;
    }
    results[name] = measured;
    const expected = baseline[name];
    if (!expected) {
        if (write) {
            console.log(`  new   ${name} (lines ${measured.lines.toFixed(1)}%, statements ${measured.statements.toFixed(1)}%)`);
            continue;
        }
        console.error(`[COVERAGE-FAIL] ${name}: no baseline recorded (run with --write to record it)`);
        failed = true;
        continue;
    }
    const regressions = [];
    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
        const drop = expected[metric] - measured[metric];
        if (drop > tolerance) {
            regressions.push(`${metric} ${expected[metric].toFixed(1)}% -> ${measured[metric].toFixed(1)}% (-${drop.toFixed(1)})`);
        }
    }
    if (regressions.length) {
        console.error(`[COVERAGE-FAIL] ${name}: ${regressions.join(', ')}`);
        failed = true;
    } else {
        console.log(`  ok    ${name} (lines ${measured.lines.toFixed(1)}%, statements ${measured.statements.toFixed(1)}%)`);
    }
}

if (write) {
    // Recording must not silently lower the gate: adding code with uncovered
    // branches is legitimate, but it needs an explicit --force.
    const lowered = [];
    for (const [name, measured] of Object.entries(results)) {
        const expected = baseline[name];
        if (!expected) continue;
        for (const metric of ['statements', 'branches', 'functions', 'lines']) {
            if (measured[metric] < expected[metric]) {
                lowered.push(`${name}.${metric} ${expected[metric].toFixed(1)}% -> ${measured[metric].toFixed(1)}%`);
            }
        }
    }
    if (lowered.length && !args.includes('--force')) {
        console.error('[COVERAGE-FAIL] refusing to lower the baseline without --force:');
        lowered.forEach(item => console.error(`  - ${item}`));
        process.exit(1);
    }
    const merged = { ...baseline, ...results };
    const ordered = Object.fromEntries(Object.keys(merged).sort().map(key => [key, merged[key]]));
    writeFileSync(baselinePath, `${JSON.stringify(ordered, null, 4)}\n`);
    console.log(`baseline written: ${baselinePath}`);
    process.exit(0);
}

if (failed) {
    console.error('\n[COVERAGE-FAIL] coverage dropped below the recorded baseline');
    process.exit(1);
}

console.log(`\n[COVERAGE-OK] ${packages.length} package(s) at or above baseline (tolerance ${tolerance}pp)`);
