#!/usr/bin/env node
const path = require('path');
const packageRoot = path.join(__dirname, '..');
// Compile and resolve @tsdi/* against the CLI package, never the caller's
// working directory. Without this, running `tsdi-agent` inside a project that
// has its own tsconfig (or none) fails with TS5109 before the CLI starts.
process.env.TS_NODE_PROJECT = path.join(packageRoot, 'tsconfig.json');
require('ts-node/register/transpile-only');
require('tsconfig-paths').register({ cwd: packageRoot });

const { createAgentCli, normalizeCliArgv } = require('../src/cli.ts');
const { formatCliError, isCliDebugEnabled } = require('../src/cli-error-format.ts');
const argv = normalizeCliArgv(process.argv);

Promise.resolve(createAgentCli().parseAsync(argv)).catch(error => {
    process.stderr.write(`${formatCliError(error, { debug: isCliDebugEnabled() })}\n`);
    process.exitCode = 1;
});
