import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { SourceFilesActivity } from './SourceFilesActivity';
import { EsbuildBuildActivity } from './EsbuildBuildActivity';
import { DeclarationGenerateActivity } from './DeclarationGenerateActivity';
import { ComponentParseActivity } from './ComponentParseActivity';
import { MetadataGenerateActivity } from './MetadataGenerateActivity';
import { DiagnosticInfo } from '../CompileActivity';
import { ComponentCompileInfo } from './ComponentParseActivity';
import { MetadataCompiler, ClassMetadata, ModuleMetadata } from '../MetadataCompiler';

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

export interface EsbuildComponentCompilerOptions {
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
    skipLibCheck?: boolean;
    generateMetadata?: boolean;
    flatModuleOutFile?: string;
    flatModuleId?: string;
    inlineStyles?: boolean;
    inlineTemplate?: boolean;
    outputStyle?: 'esm2020' | 'fesm2020' | 'esm2025' | 'fesm2025';
}

export interface AngularOutputStyle {
    esm: string;
    fesm: string;
    dts: string;
    metadata: string;
}

@Component({
    selector: 'esbuild-component-compiler',
    template: `
        <source-files [src]="src" [exclude]="exclude" (done)="onSourceFiles($event)"></source-files>
        <component-parse [src]="src" [exclude]="exclude" [inlineTemplate]="inlineTemplate" (done)="onComponentParsed($event)"></component-parse>
        <esbuild-build [src]="src" [outDir]="outDir" [options]="buildOptions" [bundle]="bundle" [target]="target" [format]="format" (done)="onBuildDone($event)"></esbuild-build>
        <declaration-generate [src]="src" [outDir]="outDir" (done)="onDeclarationsDone($event)"></declaration-generate>
        <metadata-generate [src]="src" [outDir]="outDir" [componentInfos]="componentInfos" [options]="metadataOptions" (done)="onMetadataDone($event)"></metadata-generate>
    `
})
export class EsbuildComponentCompilerActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: EsbuildComponentCompilerOptions = {};

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

    @Attribute()
    bundle = false;

    @Attribute()
    target = 'es2020';

    @Attribute()
    format: 'cjs' | 'esm' | 'iife' = 'esm';

    @Attribute()
    platform: 'browser' | 'node' = 'node';

    private sourceFiles: any[] = [];
    private componentInfos: Map<string, ComponentCompileInfo> = new Map();
    private buildErrors: DiagnosticInfo[] = [];

    get buildOptions(): any {
        return {
            target: this.options.target || this.target,
            format: this.options.format || this.format,
            platform: this.options.platform || this.platform,
            sourcemap: this.options.sourcemap ?? true,
            minify: this.options.minify ?? false,
            external: this.options.external || [],
            define: this.options.define || {
                'process.env.NODE_ENV': '"development"'
            },
            ...this.options
        };
    }

    get metadataOptions(): any {
        return {
            generateMetadata: this.options.generateMetadata ?? this.generateMetadata,
            flatModuleOutFile: this.options.flatModuleOutFile,
            flatModuleId: this.options.flatModuleId
        };
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            const sourceFilesActivity = new SourceFilesActivity();
            sourceFilesActivity.src = this.src;
            sourceFilesActivity.exclude = this.exclude;
            const sourceResult = await sourceFilesActivity.execute(context);
            this.sourceFiles = sourceResult.data?.files || [];

            const parseActivity = new ComponentParseActivity();
            parseActivity.src = this.src;
            parseActivity.exclude = this.exclude;
            parseActivity.inlineTemplate = this.inlineTemplate;
            const parseResult = await parseActivity.execute(context);

            if (parseResult.data?.results) {
                for (const r of parseResult.data.results) {
                    if (r.componentInfo) {
                        this.componentInfos.set(r.file, r.componentInfo);
                    }
                }
            }

            const buildActivity = new EsbuildBuildActivity();
            buildActivity.src = this.src;
            buildActivity.outDir = this.outDir;
            buildActivity.bundle = this.bundle;
            buildActivity.target = this.target;
            buildActivity.format = this.format;
            buildActivity.platform = this.platform;
            buildActivity.exclude = this.exclude;
            buildActivity.options = this.buildOptions;
            const buildResult = await buildActivity.execute(context);

            this.buildErrors = buildResult.data?.errors || [];

            if (this.options.declaration !== false) {
                const declActivity = new DeclarationGenerateActivity();
                declActivity.src = this.src;
                declActivity.outDir = this.outDir;
                declActivity.exclude = this.exclude;
                await declActivity.execute(context);
            }

            if (this.generateMetadata) {
                const metadataActivity = new MetadataGenerateActivity();
                metadataActivity.src = this.src;
                metadataActivity.outDir = this.outDir;
                metadataActivity.exclude = this.exclude;
                metadataActivity.componentInfos = this.componentInfos;
                metadataActivity.options = this.metadataOptions;
                await metadataActivity.execute(context);
            }

            const results: EsbuildComponentCompileResult[] = [];
            for (const file of this.sourceFiles) {
                const info = this.componentInfos.get(file.filePath);
                const baseName = path.basename(file.filePath, '.ts');

                results.push({
                    success: !this.buildErrors.some(e => e.file === file.filePath),
                    file: file.filePath,
                    outputFiles: {
                        jsFile: path.join(this.outDir, baseName + '.js'),
                        dtsFile: path.join(this.outDir, baseName + '.d.ts'),
                        metadataFile: path.join(this.outDir, baseName + '.metadata.json')
                    },
                    componentInfo: info,
                    diagnostics: this.buildErrors.filter(e => e.file === file.filePath),
                    error: this.buildErrors.some(e => e.file === file.filePath)
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
                    components: results.filter(r => r.componentInfo?.decoratorType === 'Component'),
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

    onSourceFiles(event: any): void {
        this.sourceFiles = event.data?.files || [];
    }

    onComponentParsed(event: any): void {
        if (event.data?.results) {
            for (const r of event.data.results) {
                if (r.componentInfo) {
                    this.componentInfos.set(r.file, r.componentInfo);
                }
            }
        }
    }

    onBuildDone(event: any): void {
        this.buildErrors = event.data?.errors || [];
    }

    onDeclarationsDone(event: any): void {
    }

    onMetadataDone(event: any): void {
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
