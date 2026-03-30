import * as ts from 'typescript';
import * as path from 'path';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { DiagnosticInfo, SourceFile } from '../CompileActivity';

export interface DeclarationGenerateOptions {
    declaration?: boolean;
    declarationMap?: boolean;
    emitDeclarationOnly?: boolean;
}

@Directive({ selector: 'declaration-generate' })
export class DeclarationGenerateActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: DeclarationGenerateOptions = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const globby = require('globby');

        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns, { cwd: process.cwd() });

            const files: SourceFile[] = filePaths.map((filePath: string) => ({
                fileName: path.basename(filePath),
                filePath: path.resolve(filePath),
                content: '',
                mtime: 0
            }));

            const compilerOptions: ts.CompilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ES2020,
                declaration: this.options.declaration ?? true,
                emitDeclarationOnly: this.options.emitDeclarationOnly ?? true,
                outDir: this.outDir,
                declarationMap: this.options.declarationMap ?? true,
                skipLibCheck: true,
                esModuleInterop: true,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                moduleResolution: ts.ModuleResolutionKind.NodeJs
            };

            const program = ts.createProgram(
                filePaths,
                compilerOptions
            );

            const emitResult = program.emit();

            const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

            const diagnosticInfos: DiagnosticInfo[] = diagnostics.map((diag: ts.Diagnostic) => {
                if (diag.file) {
                    const position = diag.file.getLineAndCharacterOfPosition(diag.start || 0);
                    return {
                        file: diag.file.fileName,
                        line: position.line + 1,
                        character: position.character + 1,
                        message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                        severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                        code: diag.code
                    };
                }
                return {
                    file: '',
                    line: 0,
                    character: 0,
                    message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                    severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                    code: diag.code
                };
            });

            const errors = diagnosticInfos.filter(d => d.severity === 'error');

            return {
                success: errors.length === 0,
                data: {
                    totalFiles: files.length,
                    diagnostics: diagnosticInfos,
                    errors,
                    warnings: diagnosticInfos.filter(d => d.severity === 'warning')
                },
                error: errors.length > 0 ? new Error(`${errors.length} declaration generation error(s)`) : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }
}
