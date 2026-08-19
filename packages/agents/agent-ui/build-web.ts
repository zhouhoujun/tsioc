import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';

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
const BUNDLE_ENTRY = path.join(TSC_OUT, 'agents', 'agent-ui', 'web-console', 'web-console.js');

interface ResolveResult {
    path: string;
    namespace: string;
}

function compileWithTsc(): void {
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
    execSync(`npx tsc -p . --outDir ${TSC_OUT} --declaration false --sourceMap false`, {
        cwd: PACKAGE_DIR,
        stdio: 'pipe'
    });
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
                declaration: false,
                sourceMap: false,
                types: ['node'],
                typeRoots: [path.join(ROOT, 'node_modules', '@types')]
            },
            files: [webEntryTs]
        }, null, 2));
        execSync(`npx tsc -p ${webTsconfig}`, {
            cwd: PACKAGE_DIR,
            stdio: 'pipe'
        });
        if (!fs.existsSync(webEntryJs)) {
            throw new Error(`tsc failed to emit web-entry.js`);
        }
    }
    if (!fs.existsSync(BUNDLE_ENTRY)) {
        throw new Error(`tsc output missing web-console entry: ${BUNDLE_ENTRY}`);
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
        const stubRegex = new RegExp(`^(fs|fs/promises|stream|crypto|zlib|querystring|path|os|url|tty|util|events|net|http|https|dns|assert|child_process|vm|worker_threads|async_hooks|diagnostics_channel|sqlite|string_decoder|timers|punycode|node:path|node:os|node:url|node:util|node:events|node:stream|node:fs|node:fs/promises|node:crypto|node:net|node:http|node:https|node:assert|node:zlib|node:querystring|node:tty|node:dns|node:child_process|node:vm|node:worker_threads|node:async_hooks|node:diagnostics_channel|node:sqlite|node:string_decoder|node:timers|node:punycode|tls|node:tls)$`);
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

async function main(): Promise<void> {
    compileWithTsc();
    const distDir = path.join(PACKAGE_DIR, 'web', 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const sharedBuildOptions: esbuild.BuildOptions = {
        bundle: true,
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        legalComments: 'none',
        plugins: [tscOutputAliasPlugin, nodeBuiltinStubPlugin],
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
