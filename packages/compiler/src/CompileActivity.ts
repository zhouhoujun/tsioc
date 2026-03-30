/* eslint-disable @typescript-eslint/no-var-requires */
import { Type, Injectable, token } from '@tsdi/ioc';
import { Attribute, Component, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';

export interface CompileOptions {
    target?: 'es5' | 'es2017' | 'es2020' | 'esnext';
    module?: 'commonjs' | 'es2015' | 'es2020' | 'esnext';
    declaration?: boolean;
    sourceMap?: boolean;
    outDir?: string;
    rootDir?: string;
    strict?: boolean;
    skipLibCheck?: boolean;
    esModuleInterop?: boolean;
    experimentalDecorators?: boolean;
    emitDecoratorMetadata?: boolean;
}

export interface CompileResult {
    success: boolean;
    file: string;
    outputFiles?: string[];
    diagnostics?: DiagnosticInfo[];
    error?: Error;
}

export interface DiagnosticInfo {
    file: string;
    line: number;
    character: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: number;
}

export interface SourceFile {
    fileName: string;
    filePath: string;
    content: string;
    mtime?: number;
}

export const COMPILER_OPTIONS = token<CompileOptions>('COMPILER_OPTIONS');

@Directive({ selector: 'compile' })
export class CompileActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: CompileOptions = {};

    @Attribute()
    watch = false;

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: CompileResult[] = [];

        try {
            const files = await this.getSourceFiles();
            
            for (const file of files) {
                const result = await this.compileFile(file);
                results.push(result);
            }

            const success = results.every(r => r.success);
            const errors = results.filter(r => !r.success);

            return {
                success,
                data: {
                    totalFiles: results.length,
                    successCount: results.filter(r => r.success).length,
                    errorCount: errors.length,
                    results
                },
                error: errors.length > 0 ? new Error(`${errors.length} file(s) failed to compile`) : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private async getSourceFiles(): Promise<SourceFile[]> {
        const globby = require('globby');
        const fs = require('fs');
        const path = require('path');

        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns);

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath,
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }

    private async compileFile(sourceFile: SourceFile): Promise<CompileResult> {
        const ts = require('typescript');
        const path = require('path');

        const compilerOptions: any = {
            target: ts.ScriptTarget[this.options.target || 'ES2020'],
            module: ts.ModuleKind[this.options.module || 'CommonJS'],
            declaration: this.options.declaration ?? true,
            sourceMap: this.options.sourceMap ?? true,
            outDir: this.options.outDir || this.outDir,
            rootDir: this.options.rootDir,
            strict: this.options.strict ?? true,
            skipLibCheck: this.options.skipLibCheck ?? true,
            esModuleInterop: this.options.esModuleInterop ?? true,
            experimentalDecorators: this.options.experimentalDecorators ?? true,
            emitDecoratorMetadata: this.options.emitDecoratorMetadata ?? true,
            ...this.options
        };

        const program = ts.createProgram([sourceFile.filePath], compilerOptions);
        const diagnostics = ts.getPreEmitDiagnostics(program);

        const diagnosticInfos: DiagnosticInfo[] = diagnostics.map((diag: any) => {
            const position = diag.file?.getLineAndCharacterOfPosition(diag.start || 0) || { line: 0, character: 0 };
            return {
                file: diag.file?.fileName || sourceFile.filePath,
                line: position.line + 1,
                character: position.character + 1,
                message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 
                          diag.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info',
                code: diag.code
            };
        });

        const hasErrors = diagnosticInfos.some(d => d.severity === 'error');

        if (!hasErrors) {
            const emitResult = program.emit();
            emitResult.diagnostics.forEach((diag: any) => {
                const position = diag.file?.getLineAndCharacterOfPosition(diag.start || 0) || { line: 0, character: 0 };
                diagnosticInfos.push({
                    file: diag.file?.fileName || sourceFile.filePath,
                    line: position.line + 1,
                    character: position.character + 1,
                    message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                    severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                    code: diag.code
                });
            });
        }

        return {
            success: !hasErrors && diagnosticInfos.filter(d => d.severity === 'error').length === 0,
            file: sourceFile.filePath,
            diagnostics: diagnosticInfos,
            error: hasErrors ? new Error(`Compilation failed: ${sourceFile.filePath}`) : undefined
        };
    }
}