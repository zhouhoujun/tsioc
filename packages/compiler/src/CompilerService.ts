import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Injectable } from '@tsdi/ioc';
import * as globby from 'globby';
import * as esbuild from 'esbuild';
import { CompileOptions, CompileResult, DiagnosticInfo, SourceFile } from './CompileActivity';
import { ComponentCompileResult, ComponentInfo } from './ComponentCompileActivity';
import { EsbuildCompileOptions, EsbuildCompileResult } from './EsbuildCompileActivity';

export interface CompilerResult {
    success: boolean;
    compileResults?: CompileResult[];
    componentResults?: ComponentCompileResult[];
    esbuildResults?: EsbuildCompileResult;
    totalErrors: number;
    totalWarnings: number;
    duration: number;
    error?: Error;
}

@Injectable()
export class CompilerService {

    /**
     * Compile TypeScript files using esbuild (fast mode)
     */
    async compileWithEsbuild(
        src: string,
        options: EsbuildCompileOptions = {}
    ): Promise<CompilerResult> {
        const startTime = Date.now();

        try {
            const files = await this.getSourceFiles(src);
            
            const outDir = options.outdir || 'lib';
            const outfile = options.outfile || path.join(outDir, 'bundle.js');

            const buildOptions: esbuild.BuildOptions = {
                entryPoints: options.entryPoints || files.map(f => f.filePath),
                bundle: options.bundle ?? false,
                format: options.format ?? 'cjs',
                platform: options.platform ?? 'node',
                target: options.target ?? 'es2020',
                sourcemap: options.sourcemap ?? true,
                minify: options.minify ?? false,
                external: options.external || [],
                define: options.define || {},
                write: true
            };

            if (options.banner) {
                buildOptions.banner = { js: options.banner };
            }
            if (options.footer) {
                buildOptions.footer = { js: options.footer };
            }

            if (options.bundle) {
                buildOptions.outfile = outfile;
            } else {
                buildOptions.outdir = outDir;
            }

            const result = await esbuild.build(buildOptions);

            const errors: DiagnosticInfo[] = result.errors.map((e: esbuild.Message) => ({
                file: e.location?.file || '',
                line: e.location?.line || 0,
                character: e.location?.column || 0,
                message: e.text,
                severity: 'error' as const,
                code: 0
            }));

            const warnings: DiagnosticInfo[] = result.warnings.map((w: esbuild.Message) => ({
                file: w.location?.file || '',
                line: w.location?.line || 0,
                character: w.location?.column || 0,
                message: w.text,
                severity: 'warning' as const,
                code: 0
            }));

            if (options.declaration) {
                await this.generateDeclarations(files, outDir);
            }

            const duration = Date.now() - startTime;

            return {
                success: errors.length === 0,
                esbuildResults: {
                    success: errors.length === 0,
                    errors,
                    warnings,
                    outputFiles: result.outputFiles?.map((f: esbuild.OutputFile) => f.path) || [outfile],
                    metafile: result.metafile,
                    duration
                },
                totalErrors: errors.length,
                totalWarnings: warnings.length,
                duration
            };
        } catch (error: unknown) {
            return {
                success: false,
                totalErrors: 1,
                totalWarnings: 0,
                duration: Date.now() - startTime,
                error: error as Error
            };
        }
    }

    /**
     * Compile TypeScript files using tsc (standard mode)
     */
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
        const filePaths = await globby([pattern, '!node_modules', '!**/*.spec.ts']);

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath,
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }

    private async compileFile(sourceFile: SourceFile, options: CompileOptions): Promise<CompileResult> {
        const targetKey = (options.target || 'ES2020') as keyof typeof ts.ScriptTarget;
        const moduleKey = (options.module || 'CommonJS') as keyof typeof ts.ModuleKind;
        
        const compilerOptions: ts.CompilerOptions = {
            target: ts.ScriptTarget[targetKey],
            module: ts.ModuleKind[moduleKey],
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

        const diagnosticInfos: DiagnosticInfo[] = diagnostics.map((diag: ts.Diagnostic) => {
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
        const componentInfo = this.extractComponentInfo(sourceFile.content);

        const compilerOptions: ts.CompilerOptions = {
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

        const diagnosticInfos: DiagnosticInfo[] = diagnostics.map((diag: ts.Diagnostic) => {
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
        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
        let componentInfo: ComponentInfo | undefined;

        const visit = (node: ts.Node) => {
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

                            arg.properties.forEach((prop: ts.ObjectLiteralElementLike) => {
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

    private async generateDeclarations(files: SourceFile[], outDir: string): Promise<void> {
        const compilerOptions: ts.CompilerOptions = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            declaration: true,
            emitDeclarationOnly: true,
            outDir,
            declarationMap: true,
            skipLibCheck: true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        };

        const program = ts.createProgram(
            files.map(f => f.filePath),
            compilerOptions
        );

        program.emit();
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