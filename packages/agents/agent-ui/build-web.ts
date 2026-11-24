import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as esbuild from 'esbuild';
import { emitAotProject } from '../../compiler/src/AotCompiler';

/**
 * Builds the browser console as a site:
 * - `web/dist/agent-console.js` + `web/dist/chunks/*-<hash>.js` (entry and
 *   lazy chunks, ESM + code splitting, like packages/microservices/admin);
 * - `web/dist/assets.json` (the service-worker precache manifest);
 * - `web/dist/agent-console.standalone.js` (single-file IIFE for the VS Code
 *   webview and Electron hosts, which load a classic <script>).
 *
 * Two-stage pipeline (same shape as packages/workflow-admin):
 * 1. `emitAotProject` precompiles the reachable graph as **ES modules**.
 *    AOT's synthetic helper/type imports cannot be linked by CommonJS emit,
 *    and ESM lets esbuild tree-shake renderer/service dead branches.
 * 2. `esbuild` bundles the ESM output, aliasing @tsdi/* to the tsc output
 *    directory and stubbing node-only modules.
 */

const ROOT = path.resolve(__dirname, '../../..');
const PACKAGE_DIR = path.resolve(__dirname);
const TSC_OUT = path.join('/tmp', `tsdi-agent-web-tsc-${Date.now()}`);
const BUNDLE_ENTRY = path.join(TSC_OUT, 'agents', 'agent-ui', 'web', 'browser-entry.js');

interface ResolveResult {
    path: string;
    namespace: string;
}

function emitProject(configPath: string, overrides: Record<string, unknown>, emitAll = false): void {
    const result = emitAotProject({
        configPath,
        emitAll,
        declaration: false,
        sourceMap: false,
        compilerOptions: {
            emitDecoratorMetadata: false,
            experimentalDecorators: true,
            noEmitOnError: false,
            ...overrides
        },
        throwOnError: true
    });
    console.log(`web console AOT precompiled ${result.outputFiles.length} module(s) (${path.basename(configPath)})`);
}

/**
 * AOT emits `import { applyPrecompiledType } from "@tsdi/ioc"` in every module,
 * including the ioc package itself. That self-import closes a barrel cycle for
 * every ioc module and makes esbuild unable to order `ModuleRef extends
 * Injector` when code splitting is enabled. Point ioc's own modules at the
 * helper module directly (other packages keep importing the public barrel).
 */
function rewriteIocSelfImports(): void {
    const iocSrc = path.join(TSC_OUT, 'ioc', 'src');
    if (!fs.existsSync(iocSrc)) {
        return;
    }
    const helper = path.join(iocSrc, 'metadata', 'precompiled.js');
    const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith('.js')) {
                const source = fs.readFileSync(full, 'utf8');
                const relative = path.relative(path.dirname(full), helper).split(path.sep).join('/');
                const target = relative.startsWith('.') ? relative : `./${relative}`;
                const rewritten = source.replace(/(['"])@tsdi\/ioc\1/g, `'${target}'`);
                if (rewritten !== source) {
                    fs.writeFileSync(full, rewritten);
                }
            }
        }
    };
    walk(iocSrc);
}

function compileWithTsc(): void {
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
    emitProject(path.join(PACKAGE_DIR, 'tsconfig.web.json'), {
        outDir: TSC_OUT,
        rootDir: path.join(ROOT, 'packages'),
        declaration: false,
        sourceMap: false
    }, true);
    const webEntryJs = path.join(TSC_OUT, 'agents', 'agent', 'src', 'web-entry.js');
    if (!fs.existsSync(webEntryJs)) {
        const webEntryTs = path.join(ROOT, 'packages', 'agents', 'agent', 'src', 'web-entry.ts');
        const webTsconfig = path.join(TSC_OUT, 'web-entry.tsconfig.json');
        const rootTsconfig = path.join(PACKAGE_DIR, 'tsconfig.web.json');
        fs.mkdirSync(TSC_OUT, { recursive: true });
        fs.writeFileSync(webTsconfig, JSON.stringify({
            extends: rootTsconfig,
            compilerOptions: {
                outDir: TSC_OUT,
                rootDir: path.join(ROOT, 'packages'),
                declaration: false,
                sourceMap: false,
                types: ['node'],
                typeRoots: [path.join(ROOT, 'node_modules', '@types')]
            },
            files: [webEntryTs]
        }, null, 2));
        emitProject(webTsconfig, { outDir: TSC_OUT, declaration: false, sourceMap: false }, true);
        if (!fs.existsSync(webEntryJs)) {
            throw new Error(`tsc failed to emit web-entry.js`);
        }
    }
    rewriteIocSelfImports();
    if (!fs.existsSync(BUNDLE_ENTRY)) {
        throw new Error(`tsc output missing web console browser entry: ${BUNDLE_ENTRY}`);
    }
}

const tscOutputAliasPlugin: esbuild.Plugin = {
    name: 'tsdi-tsc-output-alias',
    setup(build) {
        build.onResolve({ filter: /^@tsdi\// }, (args): ResolveResult | null => {
            const specifier = args.path.slice('@tsdi/'.length);
            if (specifier === 'agent') {
                const webEntry = path.join(TSC_OUT, 'agents', 'agent', 'src', 'web-entry.js');
                if (fs.existsSync(webEntry)) {
                    return { path: webEntry, namespace: 'file' };
                }
            }
            if (specifier === 'agent-tools') {
                // The browser only needs the background-task DI class; the
                // package index pulls fs/globby tool implementations.
                const browserSafe = path.join(TSC_OUT, 'agents', 'agent-tools', 'src', 'background-task-manager.js');
                if (fs.existsSync(browserSafe)) {
                    return { path: browserSafe, namespace: 'file' };
                }
            }
            const candidates = [
                path.join(TSC_OUT, 'packages', specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', 'agents', specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', 'microservices', specifier, 'index.js'),
                path.join(TSC_OUT, specifier, 'index.js'),
                path.join(TSC_OUT, 'agents', specifier, 'index.js'),
                path.join(TSC_OUT, 'microservices', specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', specifier),
                path.join(TSC_OUT, 'packages', 'agents', specifier),
                path.join(TSC_OUT, 'packages', 'microservices', specifier),
                path.join(TSC_OUT, specifier),
                path.join(TSC_OUT, 'agents', specifier),
                path.join(TSC_OUT, 'microservices', specifier)
            ];
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    return { path: candidate, namespace: 'file' };
                }
            }
            return null;
        });
        build.onResolve({ filter: /^@tsdi$/ }, (): ResolveResult | null => {
            const candidate = path.join(TSC_OUT, 'packages', 'ioc', 'index.js');
            if (fs.existsSync(candidate)) {
                return { path: candidate, namespace: 'file' };
            }
            const flatCandidate = path.join(TSC_OUT, 'ioc', 'index.js');
            return fs.existsSync(flatCandidate)
                ? { path: flatCandidate, namespace: 'file' }
                : null;
        });
        build.onResolve({ filter: /^\.\.?\// }, (args): ResolveResult | null => {
            const resolved = path.resolve(path.dirname(args.importer), args.path);
            const withExt = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
            if (fs.existsSync(withExt)) {
                return { path: withExt, namespace: 'file' };
            }
            return null;
        });
    }
};

/**
 * The browser console talks to the gateway over RPC and never opens a local
 * database, but `AgentModule` statically pulls the TypeOrm stores. TypeORM's
 * browser build imports `cli-highlight` (all of highlight.js + parse5) and
 * every SQL driver; together that is ~2MB of dead initial payload. The stores
 * are never instantiated in the browser, so a decorator/operator stub is
 * enough to let the entity modules load.
 */
const TYPEORM_STUB = `
const decorator = () => () => undefined;
export class DataSource {
    constructor(options) { this.options = options; this.isInitialized = false; }
    getRepository() { return new Repository(); }
    getTreeRepository() { return new TreeRepository(); }
    getMongoRepository() { return new MongoRepository(); }
    getMetadata() { return []; }
    initialize() { this.isInitialized = true; return Promise.resolve(this); }
    destroy() { this.isInitialized = false; return Promise.resolve(); }
}
export class EntityManager {}
export class Repository {}
export class TreeRepository extends Repository {}
export class MongoRepository extends Repository {}
export class EntitySchema {
    constructor(options) { this.options = options; }
    setOptions(options) { this.options = options; }
}
export const getMetadataArgsStorage = () => new Proxy(function () { return []; }, {
    get: () => []
});
export const Entity = decorator;
export const Column = decorator;
export const Index = decorator;
export const PrimaryColumn = decorator;
export const PrimaryGeneratedColumn = decorator;
export const In = value => ({ _type: 'in', _value: value });
export const LessThan = value => ({ _type: 'lessThan', _value: value });
export const MoreThan = value => ({ _type: 'moreThan', _value: value });
`;

const typeormBrowserStubPlugin: esbuild.Plugin = {
    name: 'typeorm-browser-stub',
    setup(build) {
        build.onResolve({ filter: /^typeorm(\/.*)?$/ }, (): ResolveResult => ({
            path: 'typeorm-browser-stub',
            namespace: 'typeorm-browser-stub'
        }));
        build.onLoad({ filter: /.*/, namespace: 'typeorm-browser-stub' }, (): esbuild.OnLoadResult => ({
            contents: TYPEORM_STUB,
            loader: 'js'
        }));
    }
};

const nodeBuiltinStubPlugin: esbuild.Plugin = {
    name: 'node-builtin-stub',
    setup(build) {
        const stubRegex = new RegExp(`^(fs|fs/promises|dns/promises|node:dns/promises|stream|crypto|zlib|querystring|path|os|url|tty|util|events|net|http|https|dns|assert|child_process|vm|worker_threads|async_hooks|diagnostics_channel|sqlite|string_decoder|timers|punycode|node:path|node:os|node:url|node:util|node:events|node:stream|node:fs|node:fs/promises|node:crypto|node:net|node:http|node:https|node:assert|node:zlib|node:querystring|node:tty|node:dns|node:child_process|node:vm|node:worker_threads|node:async_hooks|node:diagnostics_channel|node:sqlite|node:string_decoder|node:timers|node:punycode|tls|node:tls)$`);
        build.onResolve({ filter: stubRegex }, (): ResolveResult => {
            return { path: 'node-builtin-stub', namespace: 'node-builtin-stub' };
        });
        build.onResolve({ filter: /^app-root-path$/ }, (): ResolveResult => {
            return { path: 'app-root-path-stub', namespace: 'app-root-path-stub' };
        });
        build.onLoad({ filter: /.*/, namespace: 'app-root-path-stub' }, (): esbuild.OnLoadResult => {
            return {
                contents: 'module.exports = { path: "/", resolve: (p) => "/" + p, require: () => ({}) };',
                loader: 'js'
            };
        });
        build.onLoad({ filter: /.*/, namespace: 'node-builtin-stub' }, (): esbuild.OnLoadResult => {
            return {
                contents: 'module.exports = {};',
                loader: 'js'
            };
        });
    }
};

/**
 * Node-only third-party leaf stubs (mirrors nodeBuiltinStubPlugin).
 *
 * `AgentModule` statically imports the TypeOrm stores, dragging `typeorm`
 * into the bundle; its inert driver deps (pg, ioredis, mkdirp, ...) execute
 * bare `process.*` at module scope and crash the IIFE on load. Typeorm is
 * intentionally NOT stubbed: `memory/entities.js` applies its decorators.
 */
const nodeOnlyThirdPartyStubPlugin: esbuild.Plugin = {
    name: 'node-only-third-party-stub',
    setup(build) {
        // `ssh2` (via @tsdi/agent-ssh) pulls the optional native `cpu-features`
        // binding, which cannot exist in a browser bundle. AgentConsoleComponent
        // needs the SshConnectionManager *token* for @Inject, so the package is
        // reachable; the browser never opens SSH sockets, so stub the leaves.
        const stubRegex = /^(mkdirp|glob|rimraf|path-scurry|graceful-fs|pg|pgpass|pg-connection-string|ioredis|redis|redis-errors|denque|cluster-key-slot|standard-as-callback|chokidar|ssh2|cpu-features)$/;
        build.onResolve({ filter: stubRegex }, (): ResolveResult => {
            return { path: 'node-only-third-party-stub', namespace: 'node-only-third-party-stub' };
        });
        // TypeORM's browser MongoDB driver re-exports BSON without a binding;
        // the console only uses sql.js, so the driver is dead code here.
        build.onResolve({ filter: /bson(\.typings)?(\.js)?$/i }, (): ResolveResult => {
            return { path: 'node-only-third-party-stub', namespace: 'node-only-third-party-stub' };
        });
        build.onLoad({ filter: /.*/, namespace: 'node-only-third-party-stub' }, (): esbuild.OnLoadResult => {
            return {
                contents: 'module.exports = {};',
                loader: 'js'
            };
        });
    }
};

function gzipBytes(files: string[]): number {
    const buffers = files.filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file));
    return zlib.gzipSync(Buffer.concat(buffers)).length;
}

/** Entry plus statically imported chunks (lazy `import()` chunks are excluded). */
function initialSiteFiles(entry: string): string[] {
    const files: string[] = [];
    const visit = (file: string): void => {
        if (!fs.existsSync(file) || files.includes(file)) {
            return;
        }
        files.push(file);
        const source = fs.readFileSync(file, 'utf-8');
        const patterns = [
            /\bfrom\s*["'](\.\/[^"']+)["']/g,
            /\bimport\s*["'](\.\/[^"']+)["']/g
        ];
        for (const pattern of patterns) {
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(source))) {
                visit(path.resolve(path.dirname(file), match[1]));
            }
        }
    };
    visit(entry);
    return files;
}

/**
 * Fail the build when the site layout is inconsistent: the manifest must point
 * at real files, the entry's static imports must resolve, and the embedder
 * bundle must stay a classic script (no top-level ESM syntax).
 */
function verifySiteBuild(distDir: string, assets: string[], standalone: string): void {
    const webRoot = path.join(PACKAGE_DIR, 'web');
    const missing = assets.filter(asset => !fs.existsSync(path.join(webRoot, asset)));
    if (missing.length) {
        throw new Error(`web site manifest points at missing files: ${missing.join(', ')}`);
    }
    const entry = path.join(distDir, 'agent-console.js');
    if (!fs.existsSync(entry)) {
        throw new Error(`web site entry missing: ${entry}`);
    }
    const checkImports = (file: string): void => {
        const source = fs.readFileSync(file, 'utf-8');
        const pattern = /\b(?:from|import)\s*["'](\.\/[^"']+)["']/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(source))) {
            const target = path.resolve(path.dirname(file), match[1]);
            if (!fs.existsSync(target)) {
                throw new Error(`web site chunk import missing: ${match[1]} (from ${path.basename(file)})`);
            }
        }
    };
    checkImports(entry);
    const chunksDir = path.join(distDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
        for (const chunk of fs.readdirSync(chunksDir)) {
            if (chunk.endsWith('.js')) {
                checkImports(path.join(chunksDir, chunk));
            }
        }
    }
    if (fs.existsSync(standalone)) {
        const source = fs.readFileSync(standalone, 'utf-8');
        if (/^\s*(?:import|export)\s/m.test(source)) {
            throw new Error('standalone embedder bundle must not contain top-level import/export');
        }
    }
}

function reportSiteSizes(distDir: string, siteFiles: string[]): void {
    const entry = path.join(distDir, 'agent-console.js');
    const initial = initialSiteFiles(entry);
    const initialBytes = initial.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    const lazy = siteFiles.filter(file => !initial.includes(file));
    const lazyBytes = lazy.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    const initialGzipBytes = gzipBytes(initial);
    const lazyGzipBytes = gzipBytes(lazy);
    console.log(`web console initial JS: ${(initialBytes / 1024).toFixed(1)} KiB (gzip ${(initialGzipBytes / 1024).toFixed(1)} KiB)`);
    if (lazy.length) {
        console.log(`web console lazy chunks: ${(lazyBytes / 1024).toFixed(1)} KiB (gzip ${(lazyGzipBytes / 1024).toFixed(1)} KiB) in ${lazy.length} file(s)`);
    }
    const report = {
        initialBytes,
        initialGzipBytes,
        lazyBytes,
        lazyGzipBytes,
        lazyChunkCount: lazy.length,
        largestLazyGzipBytes: lazy.length ? Math.max(...lazy.map(file => gzipBytes([file]))) : 0
    };
    fs.writeFileSync(path.join(distDir, 'size-report.json'), JSON.stringify(report, null, 2));
    checkSiteBudget(report);
}

interface WebSizeReport {
    initialBytes: number;
    initialGzipBytes: number;
    lazyBytes: number;
    lazyGzipBytes: number;
    lazyChunkCount: number;
    largestLazyGzipBytes: number;
}

/**
 * Regression budget: the committed baseline is the measured build. Growth is
 * allowed up to 3% / 16 KiB (gzip) so dependency updates do not flap, while a
 * real regression fails the production build (and the agents gate).
 * The optimization-plan targets are enforced unconditionally: initial gzip
 * <= 500 KiB and largest lazy chunk <= 150 KiB gzip. Features stay; heavier
 * optional surfaces must become lazy chunks instead of being removed.
 */
function checkSiteBudget(report: WebSizeReport): void {
    const baselinePath = path.join(PACKAGE_DIR, 'web-size-baseline.json');
    if (!fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, JSON.stringify(report, null, 2));
        console.log(`web size baseline written to ${baselinePath}`);
        return;
    }
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as WebSizeReport;
    const gzipLimit = Math.max(16 * 1024, Math.ceil(baseline.initialGzipBytes * 1.03));
    const rawLimit = Math.max(64 * 1024, Math.ceil(baseline.initialBytes * 1.03));
    if (report.initialGzipBytes > gzipLimit || report.initialBytes > rawLimit) {
        throw new Error(
            `web console initial bundle exceeded the regression budget: `
            + `${(report.initialBytes / 1024).toFixed(1)} KiB / gzip ${(report.initialGzipBytes / 1024).toFixed(1)} KiB `
            + `(baseline ${(baseline.initialBytes / 1024).toFixed(1)} KiB / gzip ${(baseline.initialGzipBytes / 1024).toFixed(1)} KiB). `
            + `Update web-size-baseline.json only with an intentional bundle change.`
        );
    }
    const initialTarget = 500 * 1024;
    const lazyChunkTarget = 150 * 1024;
    if (report.initialGzipBytes > initialTarget) {
        throw new Error(`web console initial gzip ${(report.initialGzipBytes / 1024).toFixed(1)} KiB exceeds the 500 KiB target; move optional features to lazy chunks instead of removing them.`);
    }
    if (report.largestLazyGzipBytes > lazyChunkTarget) {
        throw new Error(`largest lazy chunk gzip ${(report.largestLazyGzipBytes / 1024).toFixed(1)} KiB exceeds the 150 KiB target.`);
    }
}

async function main(): Promise<void> {
    compileWithTsc();
    const distDir = path.join(PACKAGE_DIR, 'web', 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const sharedBuildOptions: esbuild.BuildOptions = {
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        define: { global: 'globalThis' },
        sourcemap: true,
        legalComments: 'none',
        // Ship a compact browser bundle; pass --dev for readable stack traces.
        minify: !process.argv.includes('--dev'),
        drop: process.argv.includes('--dev') ? [] : ['console', 'debugger'],
        plugins: [typeormBrowserStubPlugin, nodeOnlyThirdPartyStubPlugin, tscOutputAliasPlugin, nodeBuiltinStubPlugin],
        nodePaths: [path.join(ROOT, 'node_modules')],
        external: [
            'jsdom',
            'express',
            'body-parser',
            'cookie-signature',
            'destroy'
        ],
        logLevel: 'info'
    };

    const workerEntry = path.join(TSC_OUT, 'agents', 'agent-ui', 'src', 'AgentConsoleMarkdownWorker.js');
    const workerOutfile = path.join(distDir, 'agent-console-markdown-worker.js');
    if (fs.existsSync(workerEntry)) {
        await esbuild.build({
            ...sharedBuildOptions,
            entryPoints: [workerEntry],
            outfile: workerOutfile,
        });
        console.log(`markdown worker bundle written to ${workerOutfile}`);
    } else {
        console.warn(`markdown worker entry not found at ${workerEntry}, skipping worker bundle`);
    }

    // Embedders (VS Code webview, Electron) load a classic <script> from a
    // single file, so keep a bundled IIFE artifact next to the site entry.
    const standaloneOutfile = path.join(distDir, 'agent-console.standalone.js');
    await esbuild.build({
        ...sharedBuildOptions,
        format: 'iife',
        entryPoints: [BUNDLE_ENTRY],
        outfile: standaloneOutfile,
    });
    console.log(`standalone embedder bundle written to ${standaloneOutfile}`);

    // Site layout: the entry is emitted into the web directory with an asset
    // manifest. `splitting` stays off: the shared ioc/component graph has ESM
    // cycles (`ModuleRef extends Injector`), and esbuild hoists them into a
    // shared chunk whose evaluation order is undefined (`Class extends value
    // undefined`). The standalone embedder bundle and the TypeORM stub below
    // still keep the entry small; real lazy feature chunks are tracked in
    // docs/agent-ui-optimization-plan-2026-11.md (needs the cycles broken).
    fs.rmSync(path.join(distDir, 'chunks'), { recursive: true, force: true });
    const result = await esbuild.build({
        ...sharedBuildOptions,
        entryPoints: { 'agent-console': BUNDLE_ENTRY, 'agent-framework': path.join(TSC_OUT, 'agents', 'agent-ui', 'web', 'framework-entry.js') },
        outdir: distDir,
        entryNames: '[name]',
        chunkNames: 'chunks/[name]-[hash]',
        splitting: true,
        metafile: true,
    });
    const outputFiles = Object.keys(result.metafile?.outputs || {})
        .map(file => path.resolve(file))
        .filter(file => file.startsWith(distDir) && file.endsWith('.js'))
        .sort();
    const outputs = outputFiles
        .map(file => `./dist/${path.relative(distDir, file).split(path.sep).join('/')}`);
    fs.writeFileSync(
        path.join(distDir, 'bundle-meta.json'),
        JSON.stringify(result.metafile, null, 2)
    );

    // P4 lazy feature chunk: `/voice` is loaded on demand as its own ESM module.
    const chunksDir = path.join(distDir, 'chunks');
    fs.mkdirSync(chunksDir, { recursive: true });
    const voiceEntry = path.join(TSC_OUT, 'agents', 'agent-ui', 'src', 'AgentConsoleVoiceHandlers.js');
    const voiceOutfile = path.join(chunksDir, 'agent-console-voice.js');
    if (fs.existsSync(voiceEntry)) {
        await esbuild.build({
            ...sharedBuildOptions,
            entryPoints: [voiceEntry],
            outfile: voiceOutfile,
            sourcemap: true,
            splitting: false,
        });
        console.log(`lazy voice chunk written to ${voiceOutfile}`);
    }

    // The worker is built separately (classic worker entry); include it so the
    // service worker can precache everything the page may load.
    const workerAsset = fs.existsSync(workerOutfile) ? './dist/agent-console-markdown-worker.js' : undefined;
    const voiceAsset = fs.existsSync(voiceOutfile) ? './dist/chunks/agent-console-voice.js' : undefined;
    const assets = Array.from(new Set([
        ...outputs,
        ...(workerAsset ? [workerAsset] : []),
        ...(voiceAsset ? [voiceAsset] : [])
    ])).sort();
    fs.writeFileSync(
        path.join(distDir, 'assets.json'),
        `${JSON.stringify({ version: 1, entry: './dist/agent-console.js', assets }, null, 2)}\n`
    );
    console.log(`web console site written to ${distDir} (${assets.length} javascript asset(s))`);
    verifySiteBuild(distDir, assets, standaloneOutfile);
    const siteFiles = [...outputFiles, ...(fs.existsSync(voiceOutfile) ? [voiceOutfile] : [])];
    reportSiteSizes(distDir, siteFiles);
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
}


if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
