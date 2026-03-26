/* eslint-disable @typescript-eslint/no-var-requires */
import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { CompileOptions, CompileResult, DiagnosticInfo, SourceFile } from './CompileActivity';

export interface ComponentInfo {
    selector: string;
    templateUrl?: string;
    styleUrls?: string[];
    inputs: string[];
    outputs: string[];
    providers: string[];
    declarations: string[];
}

export interface ComponentCompileResult extends CompileResult {
    componentInfo?: ComponentInfo;
    template?: string;
    styles?: string[];
}

@Component({ selector: 'component-compile' })
export class ComponentCompileActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: CompileOptions = {};

    @Attribute()
    inlineStyles = false;

    @Attribute()
    viewEncapsulation: 'None' | 'Emulated' | 'ShadowDom' = 'Emulated';

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: ComponentCompileResult[] = [];

        try {
            const files = await this.getSourceFiles();
            
            for (const file of files) {
                const result = await this.compileComponent(file);
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
                    components: results.filter(r => r.componentInfo),
                    results
                },
                error: errors.length > 0 ? new Error(`${errors.length} component(s) failed to compile`) : undefined
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

        const patterns = [this.src, '!**/*.spec.ts', '!**/*.test.ts', '!node_modules'];
        const filePaths = await globby(patterns);

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath,
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }

    private async compileComponent(sourceFile: SourceFile): Promise<ComponentCompileResult> {
        const ts = require('typescript');
        const path = require('path');

        const componentInfo = this.extractComponentInfo(sourceFile.content);
        
        const compilerOptions: any = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            declaration: this.options.declaration ?? true,
            sourceMap: this.options.sourceMap ?? true,
            outDir: this.options.outDir || this.outDir,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            skipLibCheck: true,
            esModuleInterop: true,
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
                severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                code: diag.code
            };
        });

        const hasErrors = diagnosticInfos.some(d => d.severity === 'error');

        let template: string | undefined;
        let styles: string[] | undefined;

        if (!hasErrors && componentInfo) {
            if (componentInfo.templateUrl) {
                const templatePath = path.join(path.dirname(sourceFile.filePath), componentInfo.templateUrl);
                try {
                    const fs = require('fs');
                    template = fs.readFileSync(templatePath, 'utf-8');
                } catch {
                    diagnosticInfos.push({
                        file: sourceFile.filePath,
                        line: 1,
                        character: 1,
                        message: `Template file not found: ${componentInfo.templateUrl}`,
                        severity: 'warning',
                        code: 6001
                    });
                }
            }

            if (componentInfo.styleUrls && componentInfo.styleUrls.length > 0) {
                styles = [];
                for (const styleUrl of componentInfo.styleUrls) {
                    const stylePath = path.join(path.dirname(sourceFile.filePath), styleUrl);
                    try {
                        const fs = require('fs');
                        styles.push(fs.readFileSync(stylePath, 'utf-8'));
                    } catch {
                        diagnosticInfos.push({
                            file: sourceFile.filePath,
                            line: 1,
                            character: 1,
                            message: `Style file not found: ${styleUrl}`,
                            severity: 'warning',
                            code: 6002
                        });
                    }
                }
            }

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
            componentInfo: componentInfo || undefined,
            template,
            styles,
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
        return componentInfo || undefined;
    }
}