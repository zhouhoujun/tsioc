import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { build, Plugin } from 'esbuild';
import * as ts from 'typescript';

/**
 * Build the visual microservice admin browser bundle.
 *
 * TypeScript is first emitted with `@tsdi/compiler` (AOT manifests included),
 * then esbuild bundles the `web/main.ts` entry and code-splits lazy chunks.
 */
const PACKAGE_DIR = path.resolve(__dirname);
const WEB_DIR = path.join(PACKAGE_DIR, 'web');
const ROOT = path.resolve(PACKAGE_DIR, '../../..');
const TSC_OUT = path.join(require('os').tmpdir(), 'tsdi-microservice-admin-tsc');
const BUNDLE_ENTRY = path.join(TSC_OUT, 'packages', 'microservices', 'admin', 'web', 'main.js');
const DEV = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const SOURCE_MAP = process.env.SOURCE_MAP === '1';
const INITIAL_JS_BUDGET = Number(process.env.ADMIN_JS_BUDGET || 1_000_000);
const INITIAL_GZIP_BUDGET = Number(process.env.ADMIN_GZIP_BUDGET || 250_000);

async function compile(): Promise<void> {
    fs.rmSync(TSC_OUT, { recursive: true, force: true });
    const { emitAotProject } = await import('@tsdi/compiler');
    const result = emitAotProject({
        configPath: path.join(PACKAGE_DIR, 'tsconfig.web.json'),
        rootDir: ROOT,
        emitAll: true,
        compilerOptions: {
            outDir: TSC_OUT,
            // The AOT transformer injects `applyPrecompiledDecorators` as an
            // ESM import. CommonJS emit leaves the `__aotDeco` call unresolved
            // in the browser bundle, so emit ES modules for the web build.
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            declaration: false,
            sourceMap: false,
            noEmit: false,
            noEmitOnError: false
        },
        throwOnError: true
    });
    console.log(`AOT precompiled ${result.outputFiles.length} module(s)`);
    if (!fs.existsSync(BUNDLE_ENTRY)) {
        throw new Error(`TypeScript output missing admin entry: ${BUNDLE_ENTRY}`);
    }
}

const tsdiAliasPlugin: Plugin = {
    name: 'tsdi-tsc-output-alias',
    setup(build) {
        build.onResolve({ filter: /^@tsdi\// }, args => {
            // Console/XML/JSON renderers are lazy branches in bootstrapComponent;
            // the admin host always mounts HTML, so stub them for every import kind
            // (TypeScript compiles `await import()` to a `require` inside `.then`).
            if (/^@tsdi\/components\/(console|xml|json)$/.test(args.path)) {
                return { path: 'browser-stub', namespace: 'browser-stub' };
            }
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

const browserStubPlugin: Plugin = {
    name: 'browser-leaf-stubs',
    setup(build) {
        const stubRegex = /^(jsdom|node:.+|fs|path|os|util|stream|events|net|http|https|tty|crypto|zlib|assert|url|child_process|worker_threads|async_hooks|diagnostics_channel|string_decoder|timers|punycode|tls)$/;
        build.onResolve({ filter: stubRegex }, () => ({
            path: 'browser-stub',
            namespace: 'browser-stub'
        }));
        build.onResolve({ filter: /^@tsdi\/components\/(console|xml|json)$/ }, () => ({
            path: 'browser-stub',
            namespace: 'browser-stub'
        }));
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
    const mainFile = path.join(WEB_DIR, 'main.js');
    const files = initialFiles(mainFile);
    const initialBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    const initialGzip = gzipBytes(files);
    console.log(`admin initial JS: ${(initialBytes / 1024).toFixed(1)} KiB (gzip ${(initialGzip / 1024).toFixed(1)} KiB)`);
    if (initialBytes > INITIAL_JS_BUDGET || initialGzip > INITIAL_GZIP_BUDGET) {
        console.error(
            `admin bundle budget exceeded: ${initialBytes} > ${INITIAL_JS_BUDGET} bytes or ` +
            `${initialGzip} > ${INITIAL_GZIP_BUDGET} gzip bytes. ` +
            'Set ADMIN_JS_BUDGET / ADMIN_GZIP_BUDGET to override intentionally.'
        );
        process.exitCode = 1;
    }
}

async function main(): Promise<void> {
    fs.rmSync(path.join(WEB_DIR, 'chunks'), { recursive: true, force: true });
    fs.rmSync(path.join(WEB_DIR, 'main.js'), { force: true });

    await compile();

    await build({
        entryPoints: [BUNDLE_ENTRY],
        outdir: WEB_DIR,
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
        plugins: [tsdiAliasPlugin, browserStubPlugin],
        define: {
            'process.env.NODE_ENV': DEV ? '"development"' : '"production"'
        },
        metafile: true
    });
    const oldMap = path.join(WEB_DIR, 'main.js.map');
    if (!SOURCE_MAP && fs.existsSync(oldMap)) {
        fs.unlinkSync(oldMap);
    }
    reportSizes();
    console.log(`admin bundle written to ${path.join(WEB_DIR, 'main.js')}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
