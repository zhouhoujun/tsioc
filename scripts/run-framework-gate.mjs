#!/usr/bin/env node
/**
 * Framework gate for the non-UI, non-agent packages.
 *
 * Runs, in order:
 *   1. static checks (unit entrypoint globs, source size);
 *   2. `tsc --noEmit` per package;
 *   3. `npm test` per package;
 *   4. optionally the ioc/aop performance budget (RUN_BENCH=1).
 *
 * Scope: ioc / aop / core / common / compiler / i18n / logger / repository /
 * security / oidc-auth / unit / unit-console / unit-karma / platform-server /
 * typeorm-adapter. `components*`, `microservices`, `agents` and `workflow-admin`
 * have their own gates.
 *
 * Usage:
 *   npm run gate:framework
 *   npm run gate:framework -- --skip-tsc
 *   RUN_BENCH=1 npm run gate:framework
 *   REQUIRE_DB=1 npm run gate:framework      # fail instead of skipping the DB suites
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const skipTsc = args.has('--skip-tsc');
const skipTests = args.has('--skip-tests');
const strictTsc = args.has('--strict-tsc');
const runBench = process.env.RUN_BENCH === '1' || args.has('--bench');
const runCoverage = process.env.RUN_COVERAGE === '1' || args.has('--coverage');

/**
 * Packages with type errors that predate this gate (verified by running the same
 * `tsc --noEmit` on the base commit). They are reported as `skip` so the gate
 * stays usable; pass `--strict-tsc` to include them again once fixed.
 */
const TSC_KNOWN_FAILURES = {};

/** Type-checked but without a `test` script of their own. */
const TSC_ONLY = ['platform-browser', 'cli'];

const PACKAGES = [
    'ioc',
    'aop',
    'core',
    'common',
    'compiler',
    'i18n',
    'logger',
    'repository',
    'security',
    'oidc-auth',
    'unit',
    'unit-console',
    'unit-karma',
    'platform-server',
    'typeorm-adapter'
];

const failures = [];

function run(label, command, commandArgs, cwd) {
    const started = Date.now();
    const result = spawnSync(command, commandArgs, {
        cwd,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' }
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (result.status === 0) {
        console.log(`  ok    ${label} (${seconds}s)`);
        return true;
    }
    console.error(`  FAIL  ${label} (${seconds}s)`);
    const tail = output.trim().split('\n').slice(-25).join('\n');
    console.error(tail.replace(/^/gm, '        '));
    failures.push(label);
    return false;
}

function staticCheck(script) {
    return run(script, process.execPath, [join(root, 'scripts', script)], root);
}

console.log('framework gate: static checks');
staticCheck('check-unit-entrypoints.mjs');
staticCheck('check-source-size.mjs');

if (skipTsc) {
    console.log('framework gate: tsc skipped (--skip-tsc)');
} else {
    console.log('framework gate: tsc');
    for (const name of PACKAGES) {
        const known = TSC_KNOWN_FAILURES[name];
        if (known && !strictTsc) {
            console.log(`  skip  tsc ${name} (known pre-existing: ${known})`);
            continue;
        }
        const packageDir = join(root, 'packages', name);
        run(`tsc ${name}`, process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '-p', join(packageDir, 'tsconfig.json')], root);
    }
    for (const name of TSC_ONLY) {
        const packageDir = join(root, 'packages', name);
        run(`tsc ${name}`, process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '-p', join(packageDir, 'tsconfig.json')], root);
    }
}

if (skipTests) {
    console.log('framework gate: package tests skipped (--skip-tests)');
} else {
    console.log('framework gate: package tests');
    for (const name of PACKAGES) {
        const packageDir = join(root, 'packages', name);
        run(`test ${name}`, 'npm', ['test'], packageDir);
    }
}

if (runBench) {
    console.log('framework gate: ioc/aop performance budgets');
    run('bench:check:core', process.execPath, [join(root, 'scripts', 'check-core-bench.mjs')], root);
} else {
    console.log('framework gate: performance budgets skipped (RUN_BENCH=1 to enable)');
}

if (runCoverage) {
    console.log('framework gate: coverage ratchet');
    run('check-coverage.mjs', process.execPath, [join(root, 'scripts', 'check-coverage.mjs')], root);
} else {
    console.log('framework gate: coverage ratchet skipped (RUN_COVERAGE=1 to enable)');
}

console.log('');
if (failures.length) {
    console.error(`framework gate FAILED: ${failures.length} step(s) — ${failures.join(', ')}`);
    process.exit(1);
}
console.log('framework gate PASSED');
