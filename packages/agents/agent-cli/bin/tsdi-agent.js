#!/usr/bin/env node
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

const { createAgentCli } = require('../src/cli.ts');

const argv = process.argv.length <= 2
    ? [...process.argv, 'chat']
    : process.argv;

Promise.resolve(createAgentCli().parseAsync(argv)).catch(error => {
    process.stderr.write(`${error?.stack || error?.message || error}\n`);
    process.exitCode = 1;
});
