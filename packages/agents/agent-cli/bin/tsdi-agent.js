#!/usr/bin/env node
const path = require('path');
const packageRoot = path.join(__dirname, '..');
// Compile and resolve @tsdi/* against the CLI package, never the caller's
// working directory. Without this, running `tsdi-agent` inside a project that
// has its own tsconfig (or none) fails with TS5109 before the CLI starts.
process.env.TS_NODE_PROJECT = path.join(packageRoot, 'tsconfig.json');
// SWC is a fast, optional transpiler (see @swc/core); fall back to ts-node's
// TypeScript transpiler when it is absent or explicitly disabled with
// TSDI_AGENT_TRANSPILER=ts-node. Both paths keep decorator metadata enabled.
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

const { createAgentCli, normalizeCliArgv } = require('../src/cli.ts');
const { formatCliError, isCliDebugEnabled } = require('../src/cli-error-format.ts');
const argv = normalizeCliArgv(process.argv);

Promise.resolve(createAgentCli().parseAsync(argv)).catch(error => {
    process.stderr.write(`${formatCliError(error, { debug: isCliDebugEnabled() })}\n`);
    process.exitCode = 1;
});
