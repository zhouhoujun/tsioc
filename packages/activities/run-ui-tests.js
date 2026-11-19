#!/usr/bin/env node
/**
 * Designer UI suite runner.
 *
 * The UI spec boots a real JSDOM application per test (~3 s each), so one
 * process needs minutes. It is split into three independent files that run in
 * parallel processes; the exit code is non-zero when any part fails.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const parts = (process.env.ACTIVITIES_UI_PARTS
    ? String(process.env.ACTIVITIES_UI_PARTS).split(',')
    : ['a', 'b', 'c']
).map(part => part.trim()).filter(Boolean);

function run(part) {
    return new Promise(resolve => {
        const child = spawn(
            process.execPath,
            [path.join(__dirname, 'run-tests.js'), `unit-ui-${part}.ts`],
            { cwd: __dirname, stdio: 'inherit', env: process.env }
        );
        child.on('exit', code => resolve({ part, code: code ?? 1 }));
        child.on('error', () => resolve({ part, code: 1 }));
    });
}

Promise.all(parts.map(run)).then(results => {
    const failed = results.filter(result => result.code !== 0);
    if (failed.length) {
        console.error(`[ui-tests] failed parts: ${failed.map(item => item.part).join(', ')}`);
        process.exit(1);
    }
    console.log(`[ui-tests] all ${results.length} parts passed`);
});
