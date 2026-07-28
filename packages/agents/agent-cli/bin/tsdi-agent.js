#!/usr/bin/env node
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

const { createAgentCli, normalizeCliArgv } = require('../src/cli.ts');
const argv = normalizeCliArgv(process.argv);

Promise.resolve(createAgentCli().parseAsync(argv)).catch(error => {
    process.stderr.write(`${error?.stack || error?.message || error}\n`);
    process.exitCode = 1;
});
