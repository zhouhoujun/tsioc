import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';
import { DiagnosticInfo, SourceFile } from './CompileActivity';
import { MetadataCompiler, ModuleMetadata, ClassMetadata } from './MetadataCompiler';
import { AnnotationCompiler } from './AnnotationCompiler';

export interface AnnotationCompileOptions {
    target?: 'es5' | 'es2017' | 'es2020' | 'esnext';
    module?: 'commonjs' | 'es2015' | 'es2020' | 'esnext';
    declaration?: boolean;
    sourceMap?: boolean;
    outDir?: string;
    strict?: boolean;
    skipLibCheck?: boolean;
    esModuleInterop?: boolean;
    generateMetadata?: boolean;
    metadataVersion?: number;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    enableAnnotations?: boolean;
}

export interface AnnotationCompileResult {
    success: boolean;
    file: string;
    jsFile?: string;
    dtsFile?: string;
    metadataFile?: string;
    diagnostics?: DiagnosticInfo[];
    metadata?: ModuleMetadata;
    error?: Error;
}

export interface FlatModuleIndex {
    __symbolic: 'module';
    version: number;
    metadata: Record<string, string>;
}

@Component({ selector: 'annotation-compile' })
export class AnnotationCompileActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: AnnotationCompileOptions = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    generateMetadata = true;

    @Attribute()
    enableAnnotations = true;

    @Attribute()
    flatModuleOutFile?: string;

    @Attribute()
    flatModuleId?: string;

    private metadataCompiler: MetadataCompiler;

    constructor() {
        super();
        this.metadataCompiler = new MetadataCompiler();
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: AnnotationCompileResult[] = [];

        try {
            const files = await this.getSourceFiles();
            
            const compilerOptions = this.getCompilerOptions();
            const program = ts.createProgram(
                files.map(f => f.filePath),
                compilerOptions
            );
            const typeChecker = program.getTypeChecker();

            const allMetadata: Record<string, ClassMetadata> = {};
            const origins: Record<string, string> = {};

            for (const file of files) {
                const result = await this.compileFile(file, program, typeChecker, compilerOptions);
                results.push(result);

                if (result.metadata?.metadata) {
                    Object.assign(allMetadata, result.metadata.metadata);
                }
                if (result.metadata?.origins) {
                    Object.assign(origins, result.metadata.origins);
                }
            }

            if (this.flatModuleOutFile && Object.keys(allMetadata).length > 0) {
                await this.generateFlatModuleBundle(allMetadata, origins);
            }

            const success = results.every(r => r.success);
            const errors = results.filter(r => !r.success);

            return {
                success,
                data: {
                    totalFiles: results.length,
                    successCount: results.filter(r => r.success).length,
                    errorCount: errors.length,
                    results,
                    metadataGenerated: this.generateMetadata,
                    annotationsEnabled: this.enableAnnotations
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

    private getCompilerOptions(): ts.CompilerOptions {
        const targetKey = (this.options.target || 'ES2020') as keyof typeof ts.ScriptTarget;
        const moduleKey = (this.options.module || 'CommonJS') as keyof typeof ts.ModuleKind;
        
        return {
            target: ts.ScriptTarget[targetKey],
            module: ts.ModuleKind[moduleKey],
            declaration: this.options.declaration ?? true,
            sourceMap: this.options.sourceMap ?? true,
            outDir: this.options.outDir || this.outDir,
            strict: this.options.strict ?? true,
            skipLibCheck: this.options.skipLibCheck ?? true,
            esModuleInterop: this.options.esModuleInterop ?? true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            declarationMap: true
        };
    }

    private async getSourceFiles(): Promise<SourceFile[]> {
        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns, { cwd: process.cwd() });

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath: path.resolve(filePath),
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }

    private async compileFile(
        sourceFile: SourceFile,
        program: ts.Program,
        typeChecker: ts.TypeChecker,
        compilerOptions: ts.CompilerOptions
    ): Promise<AnnotationCompileResult> {
        const tsSourceFile = program.getSourceFile(sourceFile.filePath);
        
        const diagnostics = [
            ...ts.getPreEmitDiagnostics(program, tsSourceFile),
        ];

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

        let metadata: ModuleMetadata | undefined;
        const relativePath = path.relative(process.cwd(), sourceFile.filePath);
        const baseName = relativePath.replace(/\.ts$/, '');
        const metadataPath = path.join(this.outDir, baseName + '.metadata.json');

        if (this.generateMetadata && !hasErrors && tsSourceFile) {
            metadata = this.metadataCompiler.compileModule(sourceFile.filePath, compilerOptions);
            
            const outMetadataDir = path.dirname(metadataPath);
            if (!fs.existsSync(outMetadataDir)) {
                fs.mkdirSync(outMetadataDir, { recursive: true });
            }
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        }

        if (!hasErrors) {
            const transformers: ts.CustomTransformers = { before: [], after: [] };
            
            if (this.enableAnnotations) {
                const annotationCompiler = new AnnotationCompiler();
                transformers.before!.push(annotationCompiler.createTransformerFactory(program));
            }

            const emitResult = program.emit(tsSourceFile, undefined, undefined, undefined, transformers);
            
            emitResult.diagnostics.forEach((diag: ts.Diagnostic) => {
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

        const jsPath = path.join(this.outDir, baseName + '.js');
        const dtsPath = path.join(this.outDir, baseName + '.d.ts');

        return {
            success: !hasErrors && diagnosticInfos.filter(d => d.severity === 'error').length === 0,
            file: sourceFile.filePath,
            jsFile: fs.existsSync(jsPath) ? jsPath : undefined,
            dtsFile: fs.existsSync(dtsPath) ? dtsPath : undefined,
            metadataFile: fs.existsSync(metadataPath) ? metadataPath : undefined,
            metadata,
            diagnostics: diagnosticInfos,
            error: hasErrors ? new Error(`Compilation failed: ${sourceFile.filePath}`) : undefined
        };
    }

    private async generateFlatModuleBundle(
        allMetadata: Record<string, ClassMetadata>,
        origins: Record<string, string>
    ): Promise<void> {
        const flatModulePath = path.join(this.outDir, this.flatModuleOutFile!);
        const flatModuleId = this.flatModuleId || path.basename(this.flatModuleOutFile!, '.metadata.json');
        
        const flatMetadata: Record<string, string> = {};
        for (const [name, classMeta] of Object.entries(allMetadata)) {
            flatMetadata[name] = origins[name] || `./${name}`;
        }

        const flatModule: FlatModuleIndex = {
            __symbolic: 'module',
            version: 4,
            metadata: flatMetadata
        };

        const outDir = path.dirname(flatModulePath);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        
        fs.writeFileSync(flatModulePath, JSON.stringify(flatModule, null, 2), 'utf-8');
    }
}