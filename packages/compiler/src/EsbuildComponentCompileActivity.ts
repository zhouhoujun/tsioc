/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from 'path';
import * as fs from 'fs';
import * as ts from 'typescript';
import * as globby from 'globby';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { DiagnosticInfo, SourceFile } from './CompileActivity';
import { MetadataCompiler, ClassMetadata, ModuleMetadata } from './MetadataCompiler';

export type DecoratorType = 'Component' | 'Directive' | 'Pipe' | 'Injectable' | 'Service' | 'Module';

export interface ComponentCompileInfo {
    name: string;
    decoratorType: DecoratorType;
    selector?: string;
    templateUrl?: string;
    template?: string;
    styleUrls?: string[];
    styles?: string[];
    viewEncapsulation?: 'None' | 'Emulated' | 'ShadowDom';
    changeDetection?: 'Default' | 'OnPush';
    inputs?: string[];
    outputs?: string[];
    providers?: string[];
    imports?: string[];
    exports?: string[];
    declarations?: string[];
}

export interface OutputFileTypes {
    jsFile?: string;
    dtsFile?: string;
    metadataFile?: string;
    jsMapFile?: string;
    dtsMapFile?: string;
}

export interface EsbuildComponentCompileResult {
    success: boolean;
    file: string;
    outputFiles: OutputFileTypes;
    componentInfo?: ComponentCompileInfo;
    classMetadata?: ClassMetadata;
    diagnostics: DiagnosticInfo[];
    error?: Error;
}

export interface EsbuildComponentCompileOptions {
    target?: 'es5' | 'es2017' | 'es2020' | 'esnext';
    format?: 'cjs' | 'esm' | 'iife';
    platform?: 'browser' | 'node';
    outDir?: string;
    bundle?: boolean;
    declaration?: boolean;
    sourcemap?: boolean;
    minify?: boolean;
    external?: string[];
    define?: Record<string, string>;
    moduleName?: string;
    skipLibCheck?: boolean;
    generateMetadata?: boolean;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    inlineStyles?: boolean;
    inlineTemplate?: boolean;
}

export interface AngularOutputStyle {
    esm: string;
    fesm: string;
    dts: string;
    metadata: string;
}

@Directive({ selector: 'esbuild-component-compile' })
export class EsbuildComponentCompileActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: EsbuildComponentCompileOptions = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    generateMetadata = true;

    @Attribute()
    inlineStyles = false;

    @Attribute()
    inlineTemplate = false;

    @Attribute()
    outputStyle: 'esm2020' | 'fesm2020' | 'esm2025' | 'fesm2025' = 'esm2020';

    private metadataCompiler: MetadataCompiler;

    constructor() {
        super();
        this.metadataCompiler = new MetadataCompiler();
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: EsbuildComponentCompileResult[] = [];

        try {
            const files = await this.getSourceFiles();
            
            const componentInfos: Map<string, ComponentCompileInfo> = new Map();
            for (const file of files) {
                const info = this.extractComponentInfo(file.content);
                if (info) {
                    componentInfos.set(file.filePath, info);
                }
            }

            const { success, errors, outputFiles } = await this.compileWithEsbuild(files, componentInfos);

            if (this.generateMetadata && success) {
                await this.generateMetadataFiles(files, componentInfos);
            }

            for (const file of files) {
                const info = componentInfos.get(file.filePath);
                const outputs = outputFiles.get(file.filePath) || {};
                
                results.push({
                    success: !errors.some(e => e.file === file.filePath),
                    file: file.filePath,
                    outputFiles: outputs,
                    componentInfo: info,
                    diagnostics: errors.filter(e => e.file === file.filePath),
                    error: errors.some(e => e.file === file.filePath) 
                        ? new Error(`Compilation failed: ${file.filePath}`) 
                        : undefined
                });
            }

            const successResults = results.filter(r => r.success);
            const errorResults = results.filter(r => !r.success);

            return {
                success: errorResults.length === 0,
                data: {
                    totalFiles: results.length,
                    successCount: successResults.length,
                    errorCount: errorResults.length,
                    results,
                    components: results.filter(r => r.componentInfo),
                    directives: results.filter(r => r.componentInfo?.decoratorType === 'Directive'),
                    pipes: results.filter(r => r.componentInfo?.decoratorType === 'Pipe'),
                    services: results.filter(r => r.componentInfo?.decoratorType === 'Injectable' || r.componentInfo?.decoratorType === 'Service')
                },
                error: errorResults.length > 0 
                    ? new Error(`${errorResults.length} file(s) failed to compile`) 
                    : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private getAngularOutputDirs(baseOutDir: string): AngularOutputStyle {
        const style = this.outputStyle;
        const isFesm = style.startsWith('fesm');
        let version: string;
        if (isFesm) {
            version = style.replace('fesm', '');
        } else {
            version = style.replace('esm', '');
        }
        
        return {
            esm: path.join(baseOutDir, `esm${version}`),
            fesm: path.join(baseOutDir, `fesm${version}`),
            dts: path.join(baseOutDir, `esm${version}`),
            metadata: path.join(baseOutDir, `esm${version}`)
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

    private extractComponentInfo(content: string): ComponentCompileInfo | undefined {
        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
        let componentInfo: ComponentCompileInfo | undefined;

        const visit = (node: ts.Node) => {
            if (ts.isDecorator(node)) {
                const expression = node.expression;
                let decoratorName = '';
                let decoratorType: DecoratorType | undefined;

                if (ts.isIdentifier(expression)) {
                    decoratorName = expression.text;
                } else if (ts.isCallExpression(expression)) {
                    decoratorName = ts.isIdentifier(expression.expression) ? expression.expression.text : '';
                }

                if (decoratorName === 'Component') {
                    decoratorType = 'Component';
                } else if (decoratorName === 'Directive') {
                    decoratorType = 'Directive';
                } else if (decoratorName === 'Pipe') {
                    decoratorType = 'Pipe';
                } else if (decoratorName === 'Injectable') {
                    decoratorType = 'Injectable';
                } else if (decoratorName === 'Service') {
                    decoratorType = 'Service';
                }

                if (decoratorType && ts.isCallExpression(expression) && expression.arguments.length > 0) {
                    const arg = expression.arguments[0];
                    if (ts.isObjectLiteralExpression(arg)) {
                        componentInfo = this.parseDecoratorOptions(decoratorType, arg);
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return componentInfo;
    }

    private parseDecoratorOptions(decoratorType: DecoratorType, arg: ts.ObjectLiteralExpression): ComponentCompileInfo {
        const info: ComponentCompileInfo = {
            name: '',
            decoratorType
        };

        arg.properties.forEach((prop: ts.ObjectLiteralElementLike) => {
            if (!ts.isPropertyAssignment(prop)) return;
            
            const name = prop.name.getText();
            const value = prop.initializer;

            switch (name) {
                case 'selector':
                    if (ts.isStringLiteral(value)) {
                        info.selector = value.text;
                    }
                    break;
                case 'templateUrl':
                    if (ts.isStringLiteral(value)) {
                        if (!this.inlineTemplate) {
                            info.templateUrl = value.text;
                        }
                    }
                    break;
                case 'template':
                    if (ts.isStringLiteral(value)) {
                        info.template = value.text;
                    }
                    break;
                case 'styleUrls':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.styleUrls = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'styles':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.styles = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'viewEncapsulation':
                    if (ts.isIdentifier(value)) {
                        info.viewEncapsulation = value.text as any;
                    }
                    break;
                case 'changeDetection':
                    if (ts.isIdentifier(value)) {
                        info.changeDetection = value.text as any;
                    }
                    break;
                case 'inputs':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.inputs = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'outputs':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.outputs = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'providers':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.providers = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
                case 'imports':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.imports = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
                case 'exports':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.exports = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
                case 'declarations':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.declarations = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
            }
        });

        return info;
    }

    private async compileWithEsbuild(
        files: SourceFile[],
        componentInfos: Map<string, ComponentCompileInfo>
    ): Promise<{
        success: boolean;
        errors: DiagnosticInfo[];
        outputFiles: Map<string, OutputFileTypes>;
    }> {
        const esbuild = require('esbuild');
        const baseOutDir = this.options.outDir || this.outDir;
        const angularDirs = this.getAngularOutputDirs(baseOutDir);
        
        const errors: DiagnosticInfo[] = [];
        const outputFiles: Map<string, OutputFileTypes> = new Map();

        for (const dir of [angularDirs.esm, angularDirs.fesm]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        const isFesm = this.outputStyle.startsWith('fesm');
        
        const buildOptions: any = {
            entryPoints: files.map(f => f.filePath),
            bundle: this.options.bundle ?? isFesm,
            format: this.options.format ?? (isFesm ? 'esm' : 'esm'),
            platform: this.options.platform ?? 'node',
            target: this.options.target ?? 'es2020',
            sourcemap: this.options.sourcemap ?? true,
            minify: this.options.minify ?? isFesm,
            external: this.options.external || [],
            define: this.options.define || {
                'process.env.NODE_ENV': '"development"'
            },
            outdir: isFesm ? angularDirs.fesm : angularDirs.esm,
            write: true,
            splitting: isFesm,
            metafile: true,
            ...this.options
        };

        delete buildOptions.sourcemap;

        const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
        if (fs.existsSync(tsconfigPath)) {
            buildOptions.tsconfig = tsconfigPath;
        }

        try {
            const result = await esbuild.build(buildOptions);

            for (const file of files) {
                const baseName = path.basename(file.filePath, '.ts');
                
                const outputs: OutputFileTypes = {
                    jsFile: path.join(isFesm ? angularDirs.fesm : angularDirs.esm, baseName + '.mjs'),
                    jsMapFile: path.join(isFesm ? angularDirs.fesm : angularDirs.esm, baseName + '.mjs.map')
                };

                if (!fs.existsSync(outputs.jsFile!)) {
                    const altJsFile = path.join(isFesm ? angularDirs.fesm : angularDirs.esm, baseName + '.mjs');
                    if (fs.existsSync(altJsFile)) {
                        outputs.jsFile = altJsFile;
                        outputs.jsMapFile = path.join(isFesm ? angularDirs.fesm : angularDirs.esm, baseName + '.mjs.map');
                    }
                }

                outputFiles.set(file.filePath, outputs);
            }

            for (const e of result.errors) {
                errors.push({
                    file: e.location?.file || '',
                    line: e.location?.line || 0,
                    character: e.location?.column || 0,
                    message: e.text,
                    severity: 'error',
                    code: 0
                });
            }

            if (this.options.declaration !== false) {
                await this.generateDeclarations(files, angularDirs.dts);
            }

            return {
                success: result.errors.length === 0,
                errors,
                outputFiles
            };
        } catch (error: any) {
            errors.push({
                file: '',
                line: 0,
                character: 0,
                message: error.message || 'Build failed',
                severity: 'error',
                code: 0
            });
            return { success: false, errors, outputFiles };
        }
    }

    private async generateDeclarations(files: SourceFile[], outDir: string): Promise<void> {
        const compilerOptions: ts.CompilerOptions = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
            declaration: true,
            emitDeclarationOnly: true,
            outDir,
            declarationMap: true,
            skipLibCheck: this.options.skipLibCheck ?? true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            moduleResolution: ts.ModuleResolutionKind.NodeJs
        };

        const program = ts.createProgram(
            files.map(f => f.filePath),
            compilerOptions
        );

        program.emit();
    }

    private async generateMetadataFiles(
        files: SourceFile[],
        componentInfos: Map<string, ComponentCompileInfo>
    ): Promise<void> {
        const baseOutDir = this.options.outDir || this.outDir;
        const angularDirs = this.getAngularOutputDirs(baseOutDir);
        const flatMetadata: Record<string, ClassMetadata> = {};
        
        for (const file of files) {
            const info = componentInfos.get(file.filePath);
            if (!info) continue;

            const baseName = path.basename(file.filePath, '.ts');
            const relativePath = path.relative(process.cwd(), file.filePath);
            
            const compilerOptions: ts.CompilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ES2020,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                skipLibCheck: true
            };

            const moduleMetadata = this.metadataCompiler.compileModule(file.filePath, compilerOptions);
            
            if (moduleMetadata.metadata) {
                for (const [className, classMeta] of Object.entries(moduleMetadata.metadata)) {
                    if (info.decoratorType === 'Component' || info.decoratorType === 'Directive') {
                        classMeta.decorators = classMeta.decorators || [];
                        
                        if (info.decoratorType === 'Component') {
                            classMeta.decorators.push(
                                { name: info.decoratorType, arguments: [{ selector: info.selector }] }
                            );
                            if (info.templateUrl) {
                                classMeta.decorators.push({ name: 'templateUrl', arguments: [info.templateUrl] });
                            }
                            if (info.styleUrls?.length) {
                                classMeta.decorators.push({ name: 'styleUrls', arguments: [info.styleUrls] });
                            }
                        } else {
                            classMeta.decorators.push(
                                { name: info.decoratorType, arguments: [{ selector: info.selector }] }
                            );
                        }
                    }

                    flatMetadata[className] = classMeta;
                }
            }

            if (Object.keys(moduleMetadata.metadata).length > 0) {
                const metadataPath = path.join(angularDirs.metadata, relativePath.replace(/\.ts$/, '.metadata.json'));
                const metadataDir = path.dirname(metadataPath);
                
                if (!fs.existsSync(metadataDir)) {
                    fs.mkdirSync(metadataDir, { recursive: true });
                }

                fs.writeFileSync(metadataPath, JSON.stringify(moduleMetadata, null, 2), 'utf-8');
            }
        }

        if (this.options.flatModuleOutFile && Object.keys(flatMetadata).length > 0) {
            const flatModulePath = path.join(baseOutDir, this.options.flatModuleOutFile);
            const flatModuleId = this.options.flatModuleId || path.basename(this.options.flatModuleOutFile, '.metadata.json');
            
            const flatModule: ModuleMetadata = {
                __symbolic: 'module',
                version: 4,
                metadata: flatMetadata,
                origins: Object.keys(flatMetadata).reduce((acc, key) => {
                    acc[key] = `./${key}`;
                    return acc;
                }, {} as Record<string, string>)
            };

            const flatModuleDir = path.dirname(flatModulePath);
            if (!fs.existsSync(flatModuleDir)) {
                fs.mkdirSync(flatModuleDir, { recursive: true });
            }

            fs.writeFileSync(flatModulePath, JSON.stringify(flatModule, null, 2), 'utf-8');
        }
    }
}

export interface ComponentCompileSummary {
    totalFiles: number;
    successCount: number;
    errorCount: number;
    results: EsbuildComponentCompileResult[];
    components: EsbuildComponentCompileResult[];
    directives: EsbuildComponentCompileResult[];
    pipes: EsbuildComponentCompileResult[];
    services: EsbuildComponentCompileResult[];
}
