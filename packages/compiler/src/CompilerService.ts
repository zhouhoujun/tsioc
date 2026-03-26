/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@tsdi/ioc';
import { CompileOptions, CompileResult, DiagnosticInfo, SourceFile } from './CompileActivity';
import { ComponentCompileResult, ComponentInfo } from './ComponentCompileActivity';

export interface CompilerResult {
    success: boolean;
    compileResults?: CompileResult[];
    componentResults?: ComponentCompileResult[];
    totalErrors: number;
    totalWarnings: number;
    duration: number;
    error?: Error;
}

@Injectable()
export class CompilerService {

    async compile(
        src: string,
        options: CompileOptions = {}
    ): Promise<CompilerResult> {
        const startTime = Date.now();
        const results: CompileResult[] = [];

        try {
            const files = await this.getSourceFiles(src);
            
            for (const file of files) {
                const result = await this.compileFile(file, options);
                results.push(result);
            }

            const { errors, warnings } = this.aggregateDiagnostics(results);
            const duration = Date.now() - startTime;

            return {
                success: errors === 0,
                compileResults: results,
                totalErrors: errors,
                totalWarnings: warnings,
                duration
            };
        } catch (error) {
            return {
                success: false,
                totalErrors: 1,
                totalWarnings: 0,
                duration: Date.now() - startTime,
                error: error as Error
            };
        }
    }

    async compileComponents(
        src: string,
        options: CompileOptions = {}
    ): Promise<CompilerResult> {
        const startTime = Date.now();
        const results: ComponentCompileResult[] = [];

        try {
            const files = await this.getSourceFiles(src);
            
            for (const file of files) {
                const result = await this.compileComponent(file, options);
                results.push(result);
            }

            const { errors, warnings } = this.aggregateDiagnostics(results);
            const duration = Date.now() - startTime;

            return {
                success: errors === 0,
                componentResults: results,
                totalErrors: errors,
                totalWarnings: warnings,
                duration
            };
        } catch (error) {
            return {
                success: false,
                totalErrors: 1,
                totalWarnings: 0,
                duration: Date.now() - startTime,
                error: error as Error
            };
        }
    }

    private async getSourceFiles(pattern: string): Promise<SourceFile[]> {
        const globby = require('globby');
        const fs = require('fs');
        const path = require('path');

        const filePaths = await globby([pattern, '!node_modules', '!**/*.spec.ts']);

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath,
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }

    private async compileFile(sourceFile: SourceFile, options: CompileOptions): Promise<CompileResult> {
        const ts = require('typescript');

        const compilerOptions: any = {
            target: ts.ScriptTarget[options.target || 'ES2020'],
            module: ts.ModuleKind[options.module || 'CommonJS'],
            declaration: options.declaration ?? true,
            sourceMap: options.sourceMap ?? true,
            outDir: options.outDir || 'lib',
            strict: options.strict ?? true,
            skipLibCheck: options.skipLibCheck ?? true,
            esModuleInterop: options.esModuleInterop ?? true,
            experimentalDecorators: options.experimentalDecorators ?? true,
            emitDecoratorMetadata: options.emitDecoratorMetadata ?? true
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
                severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                code: diag.code
            };
        });

        const hasErrors = diagnosticInfos.some(d => d.severity === 'error');

        if (!hasErrors) {
            program.emit();
        }

        return {
            success: !hasErrors,
            file: sourceFile.filePath,
            diagnostics: diagnosticInfos,
            error: hasErrors ? new Error(`Compilation failed: ${sourceFile.filePath}`) : undefined
        };
    }

    private async compileComponent(sourceFile: SourceFile, options: CompileOptions): Promise<ComponentCompileResult> {
        const ts = require('typescript');

        const componentInfo = this.extractComponentInfo(sourceFile.content);

        const compilerOptions: any = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            declaration: options.declaration ?? true,
            sourceMap: options.sourceMap ?? true,
            outDir: options.outDir || 'lib',
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            skipLibCheck: true
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
                severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                code: diag.code
            };
        });

        const hasErrors = diagnosticInfos.some(d => d.severity === 'error');

        if (!hasErrors) {
            program.emit();
        }

        return {
            success: !hasErrors,
            file: sourceFile.filePath,
            componentInfo: componentInfo || undefined,
            diagnostics: diagnosticInfos,
            error: hasErrors ? new Error(`Component compilation failed: ${sourceFile.filePath}`) : undefined
        };
    }

    private extractComponentInfo(content: string): ComponentInfo | undefined {
        const ts = require('typescript');
        
        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
        let componentInfo: ComponentInfo | undefined;

        const visit = (node: any) => {
            if (ts.isDecorator(node)) {
                const expression = node.expression;
                if (ts.isCallExpression(expression)) {
                    const decoratorName = ts.isIdentifier(expression.expression) ? expression.expression.text : '';
                    
                    if (decoratorName === 'Component' && expression.arguments.length > 0) {
                        const arg = expression.arguments[0];
                        if (ts.isObjectLiteralExpression(arg)) {
                            componentInfo = {
                                selector: '',
                                inputs: [],
                                outputs: [],
                                providers: [],
                                declarations: []
                            };

                            arg.properties.forEach((prop: any) => {
                                if (ts.isPropertyAssignment(prop)) {
                                    const name = prop.name.getText();
                                    const value = prop.initializer.getText().replace(/['"]/g, '');

                                    switch (name) {
                                        case 'selector':
                                            componentInfo!.selector = value;
                                            break;
                                        case 'templateUrl':
                                            componentInfo!.templateUrl = value;
                                            break;
                                        case 'styleUrls':
                                            try {
                                                componentInfo!.styleUrls = JSON.parse(value.replace(/'/g, '"'));
                                            } catch {
                                                componentInfo!.styleUrls = [];
                                            }
                                            break;
                                    }
                                }
                            });
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return componentInfo;
    }

    private aggregateDiagnostics(results: { diagnostics?: DiagnosticInfo[] }[]): { errors: number; warnings: number } {
        let errors = 0;
        let warnings = 0;

        for (const result of results) {
            if (result.diagnostics) {
                for (const diag of result.diagnostics) {
                    if (diag.severity === 'error') {
                        errors++;
                    } else if (diag.severity === 'warning') {
                        warnings++;
                    }
                }
            }
        }

        return { errors, warnings };
    }
}