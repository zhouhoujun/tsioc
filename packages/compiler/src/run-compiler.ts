import * as path from 'path';
import * as ts from 'typescript';
import * as globby from 'globby';
import { emitAotProject } from './AotCompiler';
import { compileAotAspectManifest } from './activities/AotAspectCompileActivity';

export interface RunCompilerResult {
    success: boolean;
    data?: Record<string, any>;
    error?: Error;
}

export interface RunCompilerOptions {
    src?: string | string[];
    outDir?: string;
    target?: string;
    format?: 'cjs' | 'esm' | 'iife';
    platform?: 'browser' | 'node';
    declaration?: boolean;
    sourcemap?: boolean;
    bundle?: boolean;
    minify?: boolean;
    aot?: boolean;
    aotManifest?: string;
    tsconfig?: string;
    exclude?: string[];
    /** Legacy taskfile block (`module`, `sourceMap`, ...). */
    options?: Record<string, any>;
    baseURL?: string;
}

function normalizeTarget(target: string): ts.ScriptTarget {
    switch ((target || 'es2022').toLowerCase()) {
        case 'es5': return ts.ScriptTarget.ES5;
        case 'es2015':
        case 'es6': return ts.ScriptTarget.ES2015;
        case 'es2016': return ts.ScriptTarget.ES2016;
        case 'es2017': return ts.ScriptTarget.ES2017;
        case 'es2018': return ts.ScriptTarget.ES2018;
        case 'es2019': return ts.ScriptTarget.ES2019;
        case 'es2020': return ts.ScriptTarget.ES2020;
        case 'es2021': return ts.ScriptTarget.ES2021;
        case 'es2022': return ts.ScriptTarget.ES2022;
        case 'esnext': return ts.ScriptTarget.ESNext;
        default: return ts.ScriptTarget.ES2022;
    }
}

/**
 * Compile a package directly with the shared AOT compiler.
 *
 * This intentionally does not bootstrap the activity workflow: package builds
 * only need a TypeScript program plus AOT emit. `CompilerActivity` remains for
 * callers that want the activity/template pipeline, and is used lazily as the
 * legacy fallback when `aot` is disabled.
 */
export async function runCompiler(options: RunCompilerOptions = {}): Promise<RunCompilerResult> {
    const legacy = options.options || {};
    const aot = options.aot !== undefined
        ? options.aot !== false
        : legacy.aot !== undefined ? legacy.aot !== false : true;
    const emitAspects = aot;

    if (!aot) {
        const { CompilerActivity } = await import('./CompilerActivity');
        const activity = new CompilerActivity();
        Object.assign(activity, options, {
            src: options.src ?? legacy.src,
            outDir: options.outDir,
            target: options.target ?? legacy.target,
            format: options.format ?? legacy.format ?? (String(legacy.module || '').toLowerCase().includes('es') ? 'esm' : 'cjs'),
            platform: options.platform ?? legacy.platform,
            bundle: options.bundle ?? legacy.bundle,
            minify: options.minify ?? legacy.minify,
            declaration: options.declaration ?? legacy.declaration,
            sourcemap: options.sourcemap ?? legacy.sourceMap,
            aot: false,
            aotManifest: options.aotManifest ?? legacy.aotManifest
        });
        return activity.execute({} as any) as Promise<RunCompilerResult>;
    }

    const src = options.src ?? 'src/**/*.ts';
    const patterns = Array.isArray(src) ? src : [src];
    const exclude = options.exclude ?? legacy.exclude ?? ['node_modules', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'];
    const cwd = process.cwd();
    const outDir = path.resolve(cwd, options.outDir || 'lib');
    const target = options.target ?? legacy.target ?? 'es2022';
    const format = options.format ?? legacy.format ?? (String(legacy.module || '').toLowerCase().includes('es') ? 'esm' : 'cjs');
    const declaration = options.declaration !== undefined
        ? options.declaration !== false
        : legacy.declaration !== undefined ? legacy.declaration !== false : true;
    const sourceMap = options.sourcemap !== undefined
        ? options.sourcemap !== false
        : legacy.sourceMap !== undefined ? legacy.sourceMap !== false : true;

    try {
        const files = await globby([...patterns, ...exclude.map((item: string) => `!${item}`)], { cwd });
        if (!files.length) {
            return { success: true, data: { files: [], options: { src, outDir, aot } } };
        }

        const configPath = options.tsconfig || ts.findConfigFile(cwd, ts.sys.fileExists);
        const result = emitAotProject({
            configPath,
            rootDir: cwd,
            rootNames: files.map(file => path.resolve(cwd, file)),
            declaration,
            sourceMap,
            compilerOptions: {
                outDir,
                target: normalizeTarget(target),
                module: format === 'cjs' ? ts.ModuleKind.CommonJS : ts.ModuleKind.ESNext,
                moduleResolution: ts.ModuleResolutionKind.NodeJs,
                skipLibCheck: true,
                esModuleInterop: true,
                resolveJsonModule: true,
                experimentalDecorators: true,
                // AOT emits design:* metadata itself.
                emitDecoratorMetadata: false,
                noEmitOnError: false
            }
        });

        let manifestFile: string | undefined;
        if (emitAspects) {
            const manifest = await compileAotAspectManifest({
                src,
                outDir,
                outFile: options.aotManifest || legacy.aotManifest || 'aot-manifest.json',
                exclude
            });
            manifestFile = manifest.data?.manifestFile;
        }

        return {
            success: result.success,
            data: {
                files,
                outputFiles: result.outputFiles,
                errors: result.errors,
                diagnostics: result.diagnostics,
                manifestFile,
                options: { src, outDir, target, format, aot, aotManifest: options.aotManifest || legacy.aotManifest || 'aot-manifest.json', declaration, sourceMap }
            },
            error: result.success ? undefined : new Error(`${result.errors.length} compile error(s)`)
        };
    } catch (error) {
        console.error('[tsdi-compiler] build failed:', error);
        return { success: false, error: error as Error };
    }
}
