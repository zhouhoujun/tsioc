import * as ts from 'typescript';
import * as path from 'path';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';
import { emitAotProject, formatAotDiagnostics } from '../AotCompiler';
import { DiagnosticInfo } from './EsbuildBuildActivity';

function normalizeTarget(target: string): ts.ScriptTarget {
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

function normalizeModule(format: string): ts.ModuleKind {
    switch (format) {
        case 'cjs': return ts.ModuleKind.CommonJS;
        case 'iife':
        case 'esm':
        default: return ts.ModuleKind.ESNext;
    }
}

/**
 * Shared AOT compile activity.
 *
 * Creates one TypeScript program for the package source set, emits JavaScript
 * and declarations in a single pass, and applies `createAotTransformer` so
 * decorators become precompiled metadata. Package taskfiles get this through
 * `runCompiler`; custom builds can use `emitAotProject` directly.
 */
@Directive({ selector: 'aot-compile' })
export class AotCompileActivity extends Activity {

    @Attribute()
    src: string | string[] = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    target = 'es2022';

    @Attribute()
    format: 'cjs' | 'esm' | 'iife' = 'esm';

    @Attribute()
    platform: 'browser' | 'node' = 'node';

    @Attribute()
    declaration = true;

    @Attribute()
    sourcemap = true;

    @Attribute()
    tsconfig?: string;

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts', '**/*.d.ts'];

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();
        try {
            const patterns = Array.isArray(this.src) ? this.src : [this.src];
            const files = await globby([...patterns, ...this.exclude.map(e => `!${e}`)], { cwd: process.cwd() });
            if (!files.length) {
                return { success: true, data: { files: [], errors: [], warnings: [], duration: Date.now() - startTime } };
            }

            const configPath = this.tsconfig || ts.findConfigFile(process.cwd(), ts.sys.fileExists);
            const result = emitAotProject({
                configPath,
                rootDir: process.cwd(),
                rootNames: files.map(file => path.resolve(file)),
                declaration: this.declaration,
                sourceMap: this.sourcemap,
                compilerOptions: {
                    outDir: this.outDir,
                    target: normalizeTarget(this.target),
                    module: normalizeModule(this.format),
                    moduleResolution: ts.ModuleResolutionKind.NodeJs,
                    skipLibCheck: true,
                    esModuleInterop: true,
                    resolveJsonModule: true,
                    experimentalDecorators: true,
                    // The AOT transformer emits design:* metadata itself.
                    emitDecoratorMetadata: false,
                    noEmitOnError: false
                }
            });

            const diagnostics = this.toDiagnosticInfo(result.diagnostics);
            const errors = diagnostics.filter(item => item.severity === 'error');
            return {
                success: result.success,
                data: {
                    files,
                    errors,
                    warnings: diagnostics.filter(item => item.severity === 'warning'),
                    emitSkipped: result.emitSkipped,
                    duration: Date.now() - startTime
                },
                error: errors.length
                    ? new Error(formatAotDiagnostics(result.errors))
                    : undefined
            };
        } catch (error) {
            return { success: false, error: error as Error };
        }
    }

    private toDiagnosticInfo(diagnostics: readonly ts.Diagnostic[]): DiagnosticInfo[] {
        return diagnostics.map(diagnostic => {
            const severity = diagnostic.category === ts.DiagnosticCategory.Error
                ? 'error'
                : diagnostic.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info';
            if (!diagnostic.file || diagnostic.start === undefined) {
                return {
                    file: '',
                    line: 0,
                    character: 0,
                    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                    severity,
                    code: diagnostic.code
                };
            }
            const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            return {
                file: diagnostic.file.fileName,
                line: position.line + 1,
                character: position.character + 1,
                message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                severity,
                code: diagnostic.code
            };
        });
    }
}
