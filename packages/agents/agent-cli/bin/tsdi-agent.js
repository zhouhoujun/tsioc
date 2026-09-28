#!/usr/bin/env node
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

const { createAgentCli, normalizeCliArgv } = require('../src/cli.ts');
const { formatCliError, isCliDebugEnabled } = require('../src/cli-error-format.ts');
const argv = normalizeCliArgv(process.argv);

Promise.resolve(createAgentCli().parseAsync(argv)).catch(error => {
    process.stderr.write(`${formatCliError(error, { debug: isCliDebugEnabled() })}\n`);
    process.exitCode = 1;
});
