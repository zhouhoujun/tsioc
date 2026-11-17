import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { createAotTransformer } from './activities/AotTransformer';

export interface AotProjectOptions {
    /** Path to a tsconfig file. Its include/files and compiler options are used. */
    configPath?: string;
    /** Explicit root files. Overrides the files selected by the config. */
    rootNames?: string[];
    /** Compiler option overrides applied on top of the config. */
    compilerOptions?: ts.CompilerOptions;
    /** Directory used to resolve output paths (default: process.cwd()). */
    rootDir?: string;
    /** Emit every program source file, not only the requested roots (browser bundles). */
    emitAll?: boolean;
    /** Emit declarations (default: config value). */
    declaration?: boolean;
    /** Emit linked source maps (default: config value). */
    sourceMap?: boolean;
    /** Throw when TypeScript reports errors or skips emit. */
    throwOnError?: boolean;
}

export interface AotProjectResult {
    success: boolean;
    emitSkipped: boolean;
    diagnostics: ts.Diagnostic[];
    errors: ts.Diagnostic[];
    outputFiles: string[];
}

function readConfig(configPath: string): ts.ParsedCommandLine {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) {
        throw new Error(formatAotDiagnostics([config.error]));
    }
    return ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        path.dirname(configPath),
        undefined,
        configPath
    );
}

/** TS6059: a dependency outside rootDir is expected because only package roots are emitted. */
function isRootDirDiagnostic(diagnostic: ts.Diagnostic): boolean {
    return diagnostic.code === 6059;
}

/**
 * Re-map a TypeScript output file to the package layout: `src/**` is emitted at
 * the outDir root (src/index.ts -> index.js) and extra source roots keep their
 * directory structure.
 */
function remapOutput(fileName: string, absOutDir: string, rootDir: string): string {
    const absolute = path.isAbsolute(fileName) ? fileName : path.resolve(fileName);
    let relative = path.relative(absOutDir, absolute).replace(/\\/g, '/');
    if (relative.startsWith('../')) {
        relative = path.relative(rootDir, absolute).replace(/\\/g, '/');
    }
    return path.join(absOutDir, relative.startsWith('src/') ? relative.slice('src/'.length) : relative);
}

function emittedSuffix(fileName: string): string {
    const base = path.basename(fileName);
    if (base.endsWith('.d.ts.map')) return '.d.ts.map';
    if (base.endsWith('.d.ts')) return '.d.ts';
    if (base.endsWith('.js.map')) return '.js.map';
    if (base.endsWith('.jsx')) return '.jsx';
    if (base.endsWith('.js')) return '.js';
    return path.extname(base);
}

function outputPathFor(sourceFileName: string, emittedFileName: string, rootDir: string, absOutDir: string): string {
    const relative = path.relative(rootDir, sourceFileName).replace(/\\/g, '/');
    if (relative.startsWith('../')) {
        return remapOutput(emittedFileName, absOutDir, rootDir);
    }
    const stem = relative.replace(/\.(ts|tsx|mts|cts)$/, '');
    const flattened = stem.startsWith('src/') ? stem.slice('src/'.length) : stem;
    return path.join(absOutDir, flattened + emittedSuffix(emittedFileName));
}

/**
 * Shared AOT project compiler.
 *
 * Reads a tsconfig (or explicit root files), creates a TypeScript program with
 * full type information and emits JavaScript with decorators precompiled by
 * `createAotTransformer`. Only the requested root files are written; imported
 * workspace dependencies are type-checked but not copied into the output.
 *
 * Subprojects call this instead of duplicating the program/emit boilerplate.
 */

/**
 * Reuse the TypeScript program across repeated emits in the same process.
 *
 * Building a program (parse + bind + type-check) dominates an AOT run, and
 * watch-style flows (dev server, repeated `npm run build`) invoke
 * `emitAotProject` repeatedly with the same inputs. Reuse is only safe while no
 * input changed: the cached entry records the newest modification time of every
 * file in the program, and a newer file forces a rebuild. `NO_CACHE=1` opts out.
 */
interface CachedProgram {
    program: ts.Program;
    stamp: number;
}

const PROGRAM_CACHE_LIMIT = 4;
const programCache = new Map<string, CachedProgram>();

function programStamp(program: ts.Program): number {
    let stamp = 0;
    for (const sourceFile of program.getSourceFiles()) {
        const modified = ts.sys.getModifiedTime?.(sourceFile.fileName);
        const time = modified ? modified.getTime() : 0;
        if (time > stamp) {
            stamp = time;
        }
    }
    return stamp;
}

function programKey(rootNames: string[], options: ts.CompilerOptions): string {
    // Only options that affect program construction take part in the key; the
    // emit-only ones (outDir/declaration/sourceMap) reuse the same program.
    const relevant = {
        rootNames,
        strict: options.strict,
        target: options.target,
        module: options.module,
        moduleResolution: options.moduleResolution,
        experimentalDecorators: options.experimentalDecorators,
        emitDecoratorMetadata: options.emitDecoratorMetadata,
        jsx: options.jsx,
        paths: options.paths,
        baseUrl: options.baseUrl,
        types: options.types,
        lib: options.lib
    };
    return JSON.stringify(relevant);
}

function acquireProgram(rootNames: string[], options: ts.CompilerOptions): ts.Program {
    if (process.env.NO_CACHE === '1') {
        return ts.createProgram({ rootNames, options });
    }
    const key = programKey(rootNames, options);
    const cached = programCache.get(key);
    if (cached && programStamp(cached.program) === cached.stamp) {
        return cached.program;
    }
    // Cross-process reuse via `.tsbuildinfo` was measured: it did not beat a
    // plain program because the emit path still needs full pre-emit diagnostics
    // (measured 3.97s vs 3.99s on a 40-file fixture), so the extra build-info
    // state was dropped instead of carried.
    const program = ts.createProgram({ rootNames, options });
    if (programCache.size >= PROGRAM_CACHE_LIMIT) {
        const oldest = programCache.keys().next().value;
        if (oldest !== undefined) {
            programCache.delete(oldest);
        }
    }
    programCache.set(key, { program, stamp: programStamp(program) });
    return program;
}

export function emitAotProject(options: AotProjectOptions = {}): AotProjectResult {
    const parsed = options.configPath ? readConfig(options.configPath) : undefined;
    const rootDir = path.resolve(
        options.rootDir
        ?? options.compilerOptions?.rootDir
        ?? parsed?.options.rootDir
        ?? process.cwd()
    );
    const rootNames = (options.rootNames ?? parsed?.fileNames ?? []).map(file => path.resolve(file));
    const absOutDir = path.resolve(
        options.compilerOptions?.outDir
        ?? (parsed?.options.outDir || 'lib')
    );
    const compilerOptions: ts.CompilerOptions = {
        experimentalDecorators: true,
        // The AOT transformer writes design:* metadata itself.
        emitDecoratorMetadata: false,
        ...(parsed?.options ?? {}),
        ...(options.declaration === undefined ? {} : { declaration: options.declaration, declarationMap: options.declaration ? parsed?.options.declarationMap : false }),
        ...(options.sourceMap === undefined ? {} : { sourceMap: options.sourceMap }),
        ...(options.compilerOptions ?? {}),
        outDir: absOutDir,
        rootDir
    };

    const rootSet = new Set(rootNames);
    const outputFiles: string[] = [];
    const program = acquireProgram(rootNames, compilerOptions);
    const transformers: ts.CustomTransformers = {
        before: [createAotTransformer({ typeChecker: program.getTypeChecker(), moduleKind: compilerOptions.module })]
    };

    const emitResult = program.emit(undefined, (fileName, text, writeByteOrderMark, _onError, sourceFiles) => {
        const sourceFile = sourceFiles?.find(item => rootSet.has(path.resolve(item.fileName)))
            ?? (options.emitAll ? sourceFiles?.find(item => !item.isDeclarationFile) : undefined);
        if (!sourceFile) {
            if (sourceFiles && !options.emitAll) {
                return;
            }
            if (!options.emitAll) {
                return;
            }
        }
        if (sourceFile && /[\\/]node_modules[\\/]/.test(sourceFile.fileName)) {
            return;
        }
        const target = sourceFile
            ? outputPathFor(sourceFile.fileName, fileName, rootDir, absOutDir)
            : remapOutput(fileName, absOutDir, rootDir);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text, writeByteOrderMark ? 'utf-8' : undefined);
        if (!target.endsWith('.map')) {
            outputFiles.push(target);
        }
    }, undefined, false, transformers);

    const diagnostics = ts.getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics)
        .filter(diagnostic => !isRootDirDiagnostic(diagnostic));
    const errors = diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
    const result: AotProjectResult = {
        success: !emitResult.emitSkipped && errors.length === 0,
        emitSkipped: emitResult.emitSkipped,
        diagnostics,
        errors,
        outputFiles
    };

    if (options.throwOnError && !result.success) {
        throw new Error(formatAotDiagnostics(errors.length ? errors : diagnostics));
    }

    return result;
}

export function formatAotDiagnostics(diagnostics: ts.Diagnostic[], cwd = process.cwd()): string {
    return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: file => file,
        getCurrentDirectory: () => cwd,
        getNewLine: () => '\n'
    });
}
