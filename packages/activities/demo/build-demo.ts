import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { build, Plugin } from 'esbuild';

/**
 * Build the standalone browser demo:
 *   1. `tsc` emits the demo plus imported @tsdi packages (decorator metadata).
 *   2. `esbuild` bundles the emitted CommonJS output for the browser.
 *
 * Run from packages/activities:
 *   npx ts-node -r tsconfig-paths/register demo/build-demo.ts
 */
const DEMO_DIR = path.resolve(__dirname);
const PACKAGE_DIR = path.resolve(DEMO_DIR, '..');
const ROOT = path.resolve(PACKAGE_DIR, '../..');
const TSC_OUT = path.join('/tmp', `tsdi-workflow-demo-tsc-${Date.now()}`);
const BUNDLE_ENTRY = path.join(TSC_OUT, 'packages', 'activities', 'demo', 'main.js');

function compile(): void {
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
    execSync(
        `npx tsc -p "${path.join(DEMO_DIR, 'tsconfig.demo.json')}" --outDir "${TSC_OUT}"`,
        { cwd: PACKAGE_DIR, stdio: 'pipe' }
    );
    if (!fs.existsSync(BUNDLE_ENTRY)) {
        throw new Error(`tsc output missing demo entry: ${BUNDLE_ENTRY}`);
    }
}

const tsdiAliasPlugin: Plugin = {
    name: 'tsdi-tsc-output-alias',
    setup(build) {
        build.onResolve({ filter: /^@tsdi\// }, args => {
            const specifier = args.path.slice('@tsdi/'.length);
            const candidates = [
                path.join(TSC_OUT, 'packages', specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', 'components', specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', 'agents', specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', 'microservices', specifier, 'index.js'),
                path.join(TSC_OUT, specifier, 'index.js'),
                path.join(TSC_OUT, 'packages', specifier),
                path.join(TSC_OUT, 'packages', 'components', specifier),
                path.join(TSC_OUT, specifier)
            ];
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    return { path: candidate, namespace: 'file' };
                }
            }
            return null;
        });
        build.onResolve({ filter: /^\.\.?\// }, args => {
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
 * The HTML renderer lazy-requires jsdom only when no DOCUMENT is injected; the
 * demo injects the real browser document, so the module can be stubbed.
 */
const browserStubPlugin: Plugin = {
    name: 'browser-leaf-stubs',
    setup(build) {
        const stubRegex = /^(jsdom|node:.+|fs|path|os|util|stream|events|net|http|https|tty|crypto|zlib|assert|url|child_process|worker_threads|async_hooks|diagnostics_channel|string_decoder|timers|punycode|tls)$/;
        build.onResolve({ filter: stubRegex }, () => ({
            path: 'browser-stub',
            namespace: 'browser-stub'
        }));
        build.onLoad({ filter: /.*/, namespace: 'browser-stub' }, () => ({
            contents: 'module.exports = {};',
            loader: 'js'
        }));
    }
};

compile();

build({
    entryPoints: [BUNDLE_ENTRY],
    outfile: path.join(DEMO_DIR, 'main.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2020',
    sourcemap: true,
    logLevel: 'info',
    nodePaths: [path.join(ROOT, 'node_modules')],
    plugins: [tsdiAliasPlugin, browserStubPlugin],
    define: {
        'process.env.NODE_ENV': '"production"'
    }
}).then(() => {
    const css = require.resolve('codemirror/lib/codemirror.css');
    fs.copyFileSync(css, path.join(DEMO_DIR, 'codemirror.css'));
    console.log(`demo bundle written to ${path.join(DEMO_DIR, 'main.js')}`);
}).catch(error => {
    console.error(error);
    process.exit(1);
});
