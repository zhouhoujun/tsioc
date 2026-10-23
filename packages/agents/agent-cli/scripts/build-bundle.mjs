#!/usr/bin/env node
/**
 * Build the pre-bundled CLI (`bundle/tsdi-agent.cjs`).
 *
 * Why a bundle: a warm CLI start still reads + evaluates ~2100 modules (the
 * workspace sources plus typeorm/rxjs/highlight.js), which is the dominant
 * remaining startup cost. Bundling collapses them into one file.
 *
 * Why SWC first: the project relies on `emitDecoratorMetadata`
 * (`design:paramtypes` drives IoC resolution), which esbuild does not emit.
 * The runtime already transpiles with SWC (`ts-node/swc`), so transforming
 * each `.ts` with the same decorator settings keeps behaviour identical.
 *
 * Usage (from packages/agents/agent-cli):
 *   npm run bundle           # build bundle + manifest
 *   node scripts/build-bundle.mjs --watch?  (not supported on purpose)
 */
import { build } from 'esbuild';
import { transform } from '@swc/core';
import { cp, mkdir, readFile, readdir, stat, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_VERSION = 1;
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(packageRoot, 'bundle');
const outFile = path.join(outDir, 'tsdi-agent.cjs');

/**
 * Packages that must stay external: native addons, runtime-loaded assets
 * (sql.js wasm), optional drivers typeorm requires dynamically, and the
 * transpiler stack that the source path (not the bundle) needs.
 */
const EXTERNALS = [
    'sql.js',
    'better-sqlite3',
    'sqlite3',
    'pg',
    'pg-native',
    'mysql',
    'mysql2',
    'oracledb',
    'mssql',
    'tedious',
    'redis',
    'ioredis',
    'ssh2',
    'cpu-features',
    // Only the HTML renderer needs jsdom, and it requires it lazily; bundling
    // it would add a browser DOM implementation to the terminal CLI.
    'jsdom',
    '@swc/core',
    '@swc/helpers',
    'typescript',
    'ts-node',
    'tsconfig-paths',
    'electron',
    '@vscode/ripgrep'
];

const swcPlugin = {
    name: 'tsdi-swc',
    setup(api) {
        api.onLoad({ filter: /\.ts$/ }, async args => {
            const source = await readFile(args.path, 'utf8');
            const { code } = await transform(source, {
                filename: args.path,
                sourceMaps: true,
                jsc: {
                    parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
                    target: 'es2020',
                    transform: { legacyDecorator: true, decoratorMetadata: true },
                    externalHelpers: false,
                    keepClassNames: true
                },
                // CJS output: the sources use `import x = require(...)` in a
                // few places, which is illegal when targeting ES modules.
                module: { type: 'commonjs', ignoreDynamic: true }
            });
            return { contents: code, loader: 'js' };
        });
    }
};

async function stamp(file) {
    const info = await stat(file);
    return { file, mtimeMs: info.mtimeMs, size: info.size };
}

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await listFiles(full));
        } else if (entry.isFile()) {
            files.push(full);
        }
    }
    return files;
}

const started = Date.now();
await mkdir(outDir, { recursive: true });
// Remove stale outputs first so a failed build can never leave a bundle the
// freshness check would accept.
for (const stale of [outFile, `${outFile}.map`, path.join(outDir, 'manifest.json')]) {
    await rm(stale, { force: true });
}

const result = await build({
    entryPoints: [path.join(packageRoot, 'src/cli-entry.ts')],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    tsconfig: path.join(packageRoot, 'tsconfig.json'),
    external: EXTERNALS,
    // `tr46`/`whatwg-url` require the deprecated built-in `punycode`, which
    // prints a stderr DeprecationWarning on the first URL parse (visible in the
    // TUI). Resolve to the userland implementation bundled with the tree.
    alias: { punycode: 'punycode/' },
    sourcemap: 'external',
    metafile: true,
    logLevel: 'warning',
    plugins: [swcPlugin]
});

/**
 * `getBuiltinSkills()` resolves `__dirname/builtin`; inside the bundle that is
 * `bundle/builtin`, so the skill assets are copied next to the output (they are
 * loaded from disk, not imported). Without them the bundled CLI loses every
 * builtin skill (`skill_list` returned 0 while the source path returned 4).
 */
const builtinSkillsSource = path.resolve(packageRoot, '../agent-tools/skills/builtin');
const builtinSkillsTarget = path.join(outDir, 'builtin');
await rm(builtinSkillsTarget, { recursive: true, force: true });
let builtinSkills = [];
try {
    await cp(builtinSkillsSource, builtinSkillsTarget, { recursive: true });
    builtinSkills = await listFiles(builtinSkillsSource);
} catch {
    // No builtin skills in this checkout; the bundle simply has none.
}

const inputs = [...Object.keys(result.metafile.inputs).map(file => path.resolve(packageRoot, file)), ...builtinSkills]
    .sort();
const stamps = [];
for (const file of inputs) {
    try {
        stamps.push(await stamp(file));
    } catch {
        // A file that vanished between build and stamping must not make the
        // manifest claim freshness; record it as missing.
        stamps.push({ file, mtimeMs: 0, size: -1 });
    }
}

const manifest = {
    version: MANIFEST_VERSION,
    entry: 'src/cli-entry.ts',
    output: 'bundle/tsdi-agent.cjs',
    createdAt: Date.now(),
    inputs: stamps.map(item => ({
        file: path.relative(packageRoot, item.file).split(path.sep).join('/'),
        mtimeMs: item.mtimeMs,
        size: item.size
    }))
};
await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const size = (await stat(outFile)).size;
console.log(`[bundle] ${manifest.inputs.length} inputs, ${(size / 1024 / 1024).toFixed(1)} MiB, ${Date.now() - started}ms -> ${path.relative(packageRoot, outFile)}`);
