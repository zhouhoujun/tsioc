import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CACHE_MODULE = require.resolve('../bin/transpile-cache.js');

/**
 * The CLI re-transpiles its whole dependency graph on every start; the cache
 * makes warm starts skip that. It must never serve stale output: a changed
 * source file has to be recompiled, and any cache failure falls back to the
 * loader.
 */
@Suite('CLI transpile cache')
export class TranspileCacheTest {
    @Test('reuses compiled output and invalidates when the source changes')
    async cachesAndInvalidates() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-cache-test-'));
        const cacheDir = path.join(dir, 'cache');
        const previousCacheDir = process.env.TSDI_AGENT_TRANSPILE_CACHE_DIR;
        const original = require.extensions['.ts'];
        let compiles = 0;
        process.env.TSDI_AGENT_TRANSPILE_CACHE_DIR = cacheDir;
        // Stand-in for ts-node: "compiling" simply echoes the source text.
        require.extensions['.ts'] = function (module: any, filename: string) {
            compiles += 1;
            const source = fs.readFileSync(filename, 'utf8');
            module._compile(`module.exports = ${JSON.stringify(source)};`, filename);
        };
        try {
            delete require.cache[CACHE_MODULE];
            const cache = require(CACHE_MODULE);
            expect(cache.install({ packageRoot: dir, tsconfig: path.join(dir, 'tsconfig.json') })).toBe(true);

            const file = path.join(dir, 'sample.ts');
            fs.writeFileSync(file, 'first');
            delete require.cache[file];
            expect(require(file)).toEqual('first');
            delete require.cache[file];
            expect(require(file)).toEqual('first');
            // Second load must not reach the transpiler.
            expect(compiles).toEqual(1);

            fs.writeFileSync(file, 'second');
            delete require.cache[file];
            expect(require(file)).toEqual('second');
            expect(compiles).toEqual(2);
        } finally {
            require.extensions['.ts'] = original;
            if (previousCacheDir === undefined) {
                delete process.env.TSDI_AGENT_TRANSPILE_CACHE_DIR;
            } else {
                process.env.TSDI_AGENT_TRANSPILE_CACHE_DIR = previousCacheDir;
            }
            delete require.cache[CACHE_MODULE];
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('is disabled by TSDI_AGENT_TRANSPILE_CACHE=0')
    async canBeDisabled() {
        const original = require.extensions['.ts'];
        const previous = process.env.TSDI_AGENT_TRANSPILE_CACHE;
        process.env.TSDI_AGENT_TRANSPILE_CACHE = '0';
        try {
            delete require.cache[CACHE_MODULE];
            const cache = require(CACHE_MODULE);
            const before = require.extensions['.ts'];
            expect(cache.install({ packageRoot: process.cwd() })).toBe(false);
            expect(require.extensions['.ts']).toBe(before);
        } finally {
            require.extensions['.ts'] = original;
            if (previous === undefined) {
                delete process.env.TSDI_AGENT_TRANSPILE_CACHE;
            } else {
                process.env.TSDI_AGENT_TRANSPILE_CACHE = previous;
            }
            delete require.cache[CACHE_MODULE];
        }
    }
}
