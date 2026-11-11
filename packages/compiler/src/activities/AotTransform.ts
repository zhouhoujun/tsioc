import * as ts from 'typescript';
import { createAotTransformer, AotPrecompileOptions } from './AotTransformer';

export interface AotTransformOptions extends AotPrecompileOptions {
    /** TypeScript target used for the intermediate emit (default es2020). */
    target?: string | ts.ScriptTarget;
    /** Module kind used for the intermediate emit (default CommonJS). */
    module?: ts.ModuleKind;
    /** Keep source maps in the emitted JavaScript. */
    sourceMap?: boolean;
    /** Inline the sourcesContent into the source map. */
    inlineSources?: boolean;
}

function normalizeTarget(target: AotTransformOptions['target']): ts.ScriptTarget {
    if (typeof target === 'number') {
        return target;
    }
    switch ((target || 'es2020').toLowerCase()) {
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
        default: return ts.ScriptTarget.ES2020;
    }
}

/**
 * AOT precompile a single TypeScript source file.
 *
 * Decorators are collected and lowered at build time by
 * `createAotTransformer`; the returned code contains no
 * decorator syntax and only one `applyPrecompiledDecorators` call per class.
 */
export function transpileAot(
    fileName: string,
    source: string,
    options: AotTransformOptions = {}
): string {
    const compilerOptions: ts.CompilerOptions = {
        target: normalizeTarget(options.target),
        module: options.module ?? ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
        // The transformer writes design:* metadata itself, so the compiler must
        // not add a second set of Reflect.metadata calls.
        emitDecoratorMetadata: false,
        sourceMap: options.sourceMap ?? false,
        inlineSources: options.inlineSources ?? false,
        isolatedModules: true,
        skipLibCheck: true,
        esModuleInterop: true
    };

    return ts.transpileModule(source, {
        fileName,
        compilerOptions,
        transformers: {
            before: [createAotTransformer({
                designMetadata: options.designMetadata,
                typeChecker: options.typeChecker
            })]
        }
    }).outputText;
}
