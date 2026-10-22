#!/usr/bin/env node
const path = require('path');
const packageRoot = path.join(__dirname, '..');
const { resolveBundle } = require('./bundle-state');

// Prefer the pre-bundled CLI (`npm run bundle`): a warm start reads and
// evaluates ~2100 modules, which dominates the remaining startup time. The
// bundle is used only while every input still matches the build manifest;
// otherwise (or with TSDI_AGENT_BUNDLE=0) this falls back to the source path
// below, so editing sources never runs stale code.
let bundleFailure = null;
let useBundle = false;
try {
    useBundle = resolveBundle({ packageRoot }).mode === 'bundle';
} catch (error) {
    bundleFailure = error;
}
if (bundleFailure) {
    process.stderr.write(`${bundleFailure && bundleFailure.message ? bundleFailure.message : bundleFailure}\n`);
    process.exitCode = 1;
} else if (useBundle) {
    require(path.join(packageRoot, 'bundle', 'tsdi-agent.cjs'));
} else {
    // Compile and resolve @tsdi/* against the CLI package, never the caller's
    // working directory. Without this, running `tsdi-agent` inside a project that
    // has its own tsconfig (or none) fails with TS5109 before the CLI starts.
    process.env.TS_NODE_PROJECT = path.join(packageRoot, 'tsconfig.json');
    // SWC is a fast, optional transpiler (see @swc/core); fall back to ts-node's
    // TypeScript transpiler when it is absent or explicitly disabled with
    // TSDI_AGENT_TRANSPILER=ts-node. Both paths keep decorator metadata enabled.
    // Measured (warm transpile cache, this machine): a hand-written SWC `.ts`
    // loader was *slower* than ts-node+swc (median 2069ms vs 1634ms) and lazily
    // stubbing typeorm's `cli-highlight` made no measurable difference
    // (2088ms vs 2039ms), so both shortcuts were reverted.
    const transpiler = String(process.env.TSDI_AGENT_TRANSPILER || '').trim().toLowerCase();
    let registered = false;
    if (transpiler !== 'ts-node') {
        try {
            require.resolve('@swc/core', { paths: [packageRoot] });
            require.resolve('@swc/helpers', { paths: [packageRoot] });
            require('ts-node').register({ transpileOnly: true, swc: true, project: process.env.TS_NODE_PROJECT });
            registered = true;
        } catch {
            // optional fast path
        }
    }
    if (!registered) {
        require('ts-node/register/transpile-only');
    }
    require('tsconfig-paths').register({ cwd: packageRoot });
    // Reuse the transpiled output across CLI starts (ts-node keeps no on-disk
    // cache), so warm starts skip re-compiling the whole dependency graph.
    require('./transpile-cache').install({
        packageRoot,
        tsconfig: process.env.TS_NODE_PROJECT
    });

    require('../src/cli-entry.ts');
}
