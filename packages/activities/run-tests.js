#!/usr/bin/env node
/**
 * Test entry point with a larger V8 heap.
 *
 * The activities suite boots many JSDOM applications and CodeMirror editors in
 * one process; the UI specs alone now exceed Node's default ~2 GB old-space
 * limit. Keep the runner cross-platform by re-spawning ts-node with an explicit
 * heap size (override with ACTIVITIES_TEST_HEAP_MB).
 */
const { spawnSync } = require('node:child_process');

const heapMb = String(process.env.ACTIVITIES_TEST_HEAP_MB || '4096');
const tsNode = require.resolve('ts-node/dist/bin.js');
const args = [
    `--max-old-space-size=${heapMb}`,
    tsNode,
    '-r',
    'tsconfig-paths/register',
    'unit.ts',
    ...process.argv.slice(2)
];
// Type checking is covered by the tsc gate; skipping it here removes a
// per-process TS program build from every test run (ts-node otherwise
// type-checks the whole activities + components graph before the first test).
const env = { ...process.env, TS_NODE_TRANSPILE_ONLY: process.env.TS_NODE_TRANSPILE_ONLY || '1' };
const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: __dirname, env });
process.exit(result.status ?? 1);
