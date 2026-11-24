import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { execSync } from 'child_process';
import { build, Plugin } from 'esbuild';

/**
 * Build the product designer browser bundle.
 *
 * Pipeline:
 *   1. TypeScript emits every imported `@tsdi/*` package with ES modules so
 *      esbuild can tree-shake unused exports (renderer modules, services, ...).
 *   2. esbuild bundles, minifies, drops debug output and code-splits lazy
 *      chunks (the CodeMirror code editor is loaded on demand).
 *   3. The initial-load size is measured and checked against a budget.
 *
 * Run from packages/activities:
 *   npx ts-node -r tsconfig-paths/register designer/build.ts
 *   SOURCE_MAP=1 ... (linked source maps for debugging)
 */
const DESIGNER_DIR = path.resolve(__dirname);
const PACKAGE_DIR = DESIGNER_DIR;
const ROOT = path.resolve(PACKAGE_DIR, '../..');
const TSC_OUT = path.join(require('os').tmpdir(), 'tsdi-workflow-admin-tsc');
const BUNDLE_ENTRY = path.join(TSC_OUT, 'packages', 'workflow-admin', 'main.js');
const { minifyInlineCode } = require(path.join(ROOT, 'scripts', 'minify-inline-templates.js'));

const inlineMinifyPlugin: Plugin = {
    name: 'inline-template-minify',
    setup(build) {
        // AOT output keeps HTML templates and `*_CSS` strings verbatim; esbuild
        // only minifies the surrounding JavaScript, so minify these literals
        // before bundling (see scripts/minify-inline-templates.js).
        build.onLoad({ filter: /\.js$/ }, async args => {
            if (!args.path.startsWith(TSC_OUT)) {
                return null;
            }
            const source = await fs.promises.readFile(args.path, 'utf-8');
            const minified = await minifyInlineCode(source);
            return minified === source ? null : { contents: minified, loader: 'js' };
        });
    }
};

const DEV = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const SOURCE_MAP = process.env.SOURCE_MAP === '1';
// Raw budget raised from 780 KB (2026-11) with the publish confirmation and
// version-history UI; the gzip budget below is the meaningful transfer gate.
// Raised from 985 KB (2026-11) with the shared config-node picker: broker
// create/edit dialog, reference field actions and the delete guard.
// Raised again for the configuration-node index panel (~1.4 KB raw).
// Raised to 1015 KB for the extracted publish/settings/deployments/rename
// dialog components (~6 KB raw). Raised to 1020 KB for the toast strip and
// its queue; keeps ~4 KB of headroom.
// Raised to 1100 KB (2026-11) after AOT template plans ship as object
// literals instead of JSON strings: repeated plan keys add raw bytes but are
// highly compressible, and parsing them at startup is skipped. The gzip
// budget below stays the transfer gate. Raised to 1150 KB for the standalone
// Plugins / Sessions / Audit pages, 1160 KB for mustache sections/YAML
// template output, 1175 KB for shared protocol endpoints, 1180 KB for node
// status lines, 1185 KB for the typed-value expression source, 1205 KB for the
// expression editor overlay (panel, styles, config-path helper and the
// list-row action hook), 1210 KB for the CSV/XML parity options, and 1215 KB
// for the unified Change value editor, 1216 KB for the subflow source picker
// and Node-RED status shape/fill, 1218 KB for inline inspector issues, and 1219 KB
// for live expression completion paths and 1221 KB for fixed dialog chrome in
// the browser preview; it keeps ~1 KB of headroom over the preview page's
// inlined bootstrap bytes. JSONata itself is a lazy chunk (~81 KB) loaded on
// first evaluation, so the initial budget only carries the wiring; the gzip
// budget remains the gate.
const INITIAL_JS_BUDGET = Number(process.env.DESIGNER_JS_BUDGET || 1_221_000);
// Raised from 200 KB (2026-11) with the explicit save/publish workflow: version
// history, diff, publish confirmation and run-history controls add ~5 KB gzip.
// Raised from 233 KB (2026-11): the previous value sat within 40 bytes of the
// measured size (no headroom at all), and the ioc/aop correctness + AOP hot-path
// work (joinpoint disposal, optional resolution, advisor resolution rewrite)
// adds ~5.7 KB gzip to the bundled framework code.
// Raised from 250 KB (2026-11) for the config-node reference picker (~2 KB)
// and the config-node index panel (~2 KB), keeping ~3 KB of headroom.
// Raised to 258 KB for the extracted designer dialogs (~2.5 KB gzip) and
// 264 KB for the toast strip; keeps ~2 KB of headroom.
// Raised to 272 KB (2026-11) with the AOT plan payload (object literals,
// ~5.5 KB gzip) and the Node-RED parity panels. Raised to 278 KB for the
// standalone admin pages and shared protocol endpoints, 284 KB for the
// typed-value expression source plus inline-secret migration, 285 KB for
// publish-time expression validation, 289 KB for the expression editor
// overlay, 290 KB for multi-output function routing plus the code-editor host
// cleanup, 291 KB for the sub-workflow menu actions, 292 KB for the
// library-backed subflow source picker, and 293 KB for inline inspector
// issues. JSONata itself is a lazy chunk and
// does not count; the gzip budget stays the transfer gate.
const INITIAL_GZIP_BUDGET = Number(process.env.DESIGNER_GZIP_BUDGET || 293_000);

async function compile(): Promise<void> {
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
    const { emitAotProject } = await import('@tsdi/compiler');
    const result = emitAotProject({
        configPath: path.join(DESIGNER_DIR, 'tsconfig.app.json'),
        emitAll: true,
        compilerOptions: {
            outDir: TSC_OUT,
            declaration: false,
            sourceMap: false,
            noEmit: false,
            noEmitOnError: false
        },
        throwOnError: true
    });
    console.log(`AOT precompiled ${result.outputFiles.length} module(s) via emitAotProject`);
    if (!fs.existsSync(BUNDLE_ENTRY)) {
        throw new Error(`TypeScript output missing designer entry: ${BUNDLE_ENTRY}`);
    }
}

const tsdiAliasPlugin: Plugin = {
    name: 'tsdi-tsc-output-alias',
    setup(build) {
        build.onResolve({ filter: /^@tsdi\// }, args => {
            // `bootstrapComponent` lazy-loads non-HTML renderers. The designer
            // always mounts HTML; keep those dead branches out of the bundle.
            if (args.kind === 'dynamic-import' && /^@tsdi\/components\/(console|xml|json)$/.test(args.path)) {
                return { path: 'browser-stub', namespace: 'browser-stub' };
            }
            const specifier = args.path.slice('@tsdi/'.length);
            const candidates = [
                path.join(TSC_OUT, 'packages', `${specifier}.js`),
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
 * Browser leaf stubs. The designer injects the real document, so Node-only
 * renderer leaves (jsdom, fs, ...) never run in the browser.
 */
const browserStubPlugin: Plugin = {
    name: 'browser-leaf-stubs',
    setup(build) {
        const stubRegex = /^(jsdom|node:.+|fs|path|os|util|stream|events|net|http|https|tty|crypto|zlib|assert|url|child_process|worker_threads|async_hooks|diagnostics_channel|string_decoder|timers|punycode|tls)$/;
        build.onResolve({ filter: stubRegex }, () => ({
            path: 'browser-stub',
            namespace: 'browser-stub'
        }));
        // `bootstrapComponent` lazy-loads non-HTML renderers. The designer always
        // mounts the HTML renderer, so these branches are dead code in this host.
        build.onResolve({ filter: /^@tsdi\/components\/(console|xml|json)$/ }, args => {
            if (args.kind === 'dynamic-import') {
                return { path: 'browser-stub', namespace: 'browser-stub' };
            }
            return null;
        });
        build.onLoad({ filter: /.*/, namespace: 'browser-stub' }, () => ({
            contents: 'module.exports = {};',
            loader: 'js'
        }));
    }
};


function gzipBytes(files: string[]): number {
    const buffers = files.filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file));
    return zlib.gzipSync(Buffer.concat(buffers)).length;
}

function initialFiles(mainFile: string): string[] {
    const files: string[] = [];
    const visit = (file: string): void => {
        if (!fs.existsSync(file) || files.includes(file)) {
            return;
        }
        files.push(file);
        const source = fs.readFileSync(file, 'utf-8');
        // Esbuild emits `import{...}from"./chunks/x.js"` and bare
        // `import"./chunks/y.js"` on the same line; dynamic imports use
        // `import("./chunks/z.js")` and must not count as initial load.
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
    visit(mainFile);
    return files;
}

function reportSizes(): void {
    const mainFile = path.join(DESIGNER_DIR, 'main.js');
    const files = initialFiles(mainFile);
    const initialBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    const initialGzip = gzipBytes(files);
    const chunkDir = path.join(DESIGNER_DIR, 'chunks');
    const lazy = fs.existsSync(chunkDir)
        ? fs.readdirSync(chunkDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(chunkDir, file))
            .filter(file => !files.includes(file))
        : [];
    const lazyBytes = lazy.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    const lazyGzip = gzipBytes(lazy);

    console.log(`designer initial JS: ${(initialBytes / 1024).toFixed(1)} KiB (gzip ${(initialGzip / 1024).toFixed(1)} KiB)`);
    if (lazy.length) {
        console.log(`designer lazy chunks: ${(lazyBytes / 1024).toFixed(1)} KiB (gzip ${(lazyGzip / 1024).toFixed(1)} KiB) in ${lazy.length} file(s)`);
    }

    if (initialBytes > INITIAL_JS_BUDGET || initialGzip > INITIAL_GZIP_BUDGET) {
        console.error(
            `designer bundle budget exceeded: ${initialBytes} > ${INITIAL_JS_BUDGET} bytes or ` +
            `${initialGzip} > ${INITIAL_GZIP_BUDGET} gzip bytes. ` +
            'Set DESIGNER_JS_BUDGET / DESIGNER_GZIP_BUDGET to override intentionally.'
        );
        process.exitCode = 1;
    }
}

async function main(): Promise<void> {
    fs.rmSync(path.join(DESIGNER_DIR, 'chunks'), { recursive: true, force: true });
    fs.rmSync(path.join(DESIGNER_DIR, 'main.js'), { force: true });

    await compile();

    const result = await build({
        entryPoints: [BUNDLE_ENTRY],
        outdir: DESIGNER_DIR,
        entryNames: 'main',
        chunkNames: 'chunks/[name]-[hash]',
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        minify: !DEV,
        treeShaking: true,
        sourcemap: SOURCE_MAP ? 'linked' : false,
        legalComments: 'none',
        drop: DEV ? [] : ['console', 'debugger'],
        logLevel: 'info',
        nodePaths: [path.join(ROOT, 'node_modules')],
        plugins: [tsdiAliasPlugin, browserStubPlugin, inlineMinifyPlugin],
        define: {
            'process.env.NODE_ENV': DEV ? '"development"' : '"production"'
        },
        metafile: true
    });
    const oldMap = path.join(DESIGNER_DIR, 'main.js.map');
    if (!SOURCE_MAP && fs.existsSync(oldMap)) {
        fs.unlinkSync(oldMap);
    }
    fs.writeFileSync(path.join(DESIGNER_DIR, 'bundle-meta.json'), JSON.stringify(result.metafile, null, 2));
    reportSizes();
    console.log(`designer bundle written to ${path.join(DESIGNER_DIR, 'main.js')}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
