#!/usr/bin/env node
/**
 * Unit entrypoint glob check.
 *
 * Every package runs its suites through a `unit.ts` file such as:
 *
 *     runTest('./test/**\/*.ts', { baseURL: __dirname });
 *
 * When that glob stops matching (renamed folder, wrong `baseURL`, typo) the
 * runner registers zero suites and exits successfully — a green run with no
 * tests. `@tsdi/unit` now rejects zero-suite runs by default, but a static
 * check catches the mistake without running every package.
 *
 * Usage:
 *   node scripts/check-unit-entrypoints.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import globby from 'globby';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');

/** Collect every `unit.ts` entrypoint (packages may nest one level deeper). */
function findEntrypoints(dir, out = []) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'lib') {
                continue;
            }
            findEntrypoints(full, out);
        } else if (entry.name === 'unit.ts') {
            out.push(full);
        }
    }
    return out;
}

/**
 * Entrypoints may pass the glob inline (`runTest('./test/**\/*.ts', ...)`) or
 * through a local array (`const tests: string[] = ['./a.spec.ts']; runTest(tests, ...)`).
 * Collect every `./`-relative string literal so both shapes are covered.
 */
const pathLiteralPattern = /(['"`])((?:\.\/)[^'"`]*)\1/g;

const failures = [];
let checked = 0;
const entrypoints = findEntrypoints(packagesDir);

for (const file of entrypoints) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('runTest(')) {
        continue;
    }
    const baseURL = dirname(file);
    const allowsEmpty = /allowEmpty\s*:\s*true/.test(source);
    const patterns = [...new Set([...source.matchAll(pathLiteralPattern)].map(match => match[2]))];
    if (!patterns.length) {
        if (!allowsEmpty) {
            failures.push(`${relative(root, file).split(sep).join('/')}: no test glob found in runTest entrypoint`);
        }
        continue;
    }
    for (const pattern of patterns) {
        const files = globby.sync(pattern, { cwd: baseURL, onlyFiles: true });
        checked += 1;
        if (files.length === 0 && !allowsEmpty) {
            failures.push(`${relative(root, file).split(sep).join('/')}: "${pattern}" matched no files`);
        }
    }
}

if (failures.length) {
    console.error('[UNIT-GLOB-FAIL] entrypoints with no matching test files:');
    for (const failure of failures) {
        console.error(`  - ${failure}`);
    }
    process.exit(1);
}

console.log(`unit entrypoints: OK (${checked} glob(s) across ${entrypoints.length} unit.ts file(s))`);
