import * as path from 'path';
import * as fs from 'fs';
import * as esbuild from 'esbuild';
import { emitAotProject } from '../../compiler/src/AotCompiler';

/**
 * Bundles the web console entry (src/web-console.ts) into a single browser
 * script (web/dist/agent-console.js).
 *
 * Two-stage pipeline:
 * 1. `tsc` compiles the monorepo sources with `experimentalDecorators` +
 *    `emitDecoratorMetadata` so TypeORM entity decorators receive runtime
 *    design:type metadata (esbuild cannot emit decorator metadata).
 * 2. `esbuild` bundles the compiled output, aliasing @tsdi/* to the tsc
 *    output directory and stubbing node-only modules.
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

function compileWithTsc(): void {
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
    emitProject(path.join(PACKAGE_DIR, 'tsconfig.json'), {
        outDir: TSC_OUT,
        rootDir: path.join(ROOT, 'packages'),
        declaration: false,
        sourceMap: false
    }, true);
    const webEntryJs = path.join(TSC_OUT, 'agents', 'agent', 'src', 'web-entry.js');
    if (!fs.existsSync(webEntryJs)) {
        const webEntryTs = path.join(ROOT, 'packages', 'agents', 'agent', 'src', 'web-entry.ts');
        const webTsconfig = path.join(TSC_OUT, 'web-entry.tsconfig.json');
        const rootTsconfig = path.join(ROOT, 'tsconfig.json');
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
        build.onLoad({ filter: /.*/, namespace: 'node-only-third-party-stub' }, (): esbuild.OnLoadResult => {
            return {
                contents: 'module.exports = {};',
                loader: 'js'
            };
        });
    }
};

async function main(): Promise<void> {
    compileWithTsc();
    const distDir = path.join(PACKAGE_DIR, 'web', 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const sharedBuildOptions: esbuild.BuildOptions = {
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        define: { global: 'globalThis' },
        sourcemap: true,
        legalComments: 'none',
        // Ship a compact browser bundle; pass --dev for readable stack traces.
        minify: !process.argv.includes('--dev'),
        plugins: [tscOutputAliasPlugin, nodeBuiltinStubPlugin, nodeOnlyThirdPartyStubPlugin],
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

    const outfile = path.join(distDir, 'agent-console.js');
    await esbuild.build({
        ...sharedBuildOptions,
        entryPoints: [BUNDLE_ENTRY],
        outfile,
    });
    console.log(`web console bundle written to ${outfile}`);
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
}


if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
