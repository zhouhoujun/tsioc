import { Attribute, Component } from '@tsdi/components';
import { ActivityContext, ActivityResult, SequenceActivity } from '@tsdi/activities';
import { DiagnosticInfo } from './activities/EsbuildBuildActivity';
import { ComponentCompileInfo } from './activities/ComponentParseActivity';
import { OutputStyle } from './activities/EsbuildBuildActivity';
import { TsConfigReader, RuntimeEnvironment, MergedCompilerOptions } from './TsConfigReader';
import { CompilerTemplate, CompilerTemplateResult } from './CompilerTemplate';
import { CompilerTemplateExecutor } from './CompilerTemplateExecutor';

export interface CompilerOptions {
    src?: string;
    outDir?: string;
    target?: string;
    format?: 'cjs' | 'esm' | 'iife';
    platform?: 'browser' | 'node';
    bundle?: boolean;
    minify?: boolean;
    sourcemap?: boolean;
    declaration?: boolean;
    generateMetadata?: boolean;
    flatModuleOutFile?: string;
    inlineStyles?: boolean;
    inlineTemplate?: boolean;
    outputStyle?: OutputStyle;
    tsconfig?: string;
    useTsconfig?: boolean;
}

export interface CompileResult {
    success: boolean;
    files: string[];
    errors: DiagnosticInfo[];
    warnings: DiagnosticInfo[];
    outputFiles: string[];
    components: ComponentCompileInfo[];
    duration: number;
}

@Component({
    selector: 'compiler',
    template: `
        <sequence>
            <source-files [src]="src" (done)="onFiles($event)"></source-files>
            <component-parse [src]="src" (done)="onParsed($event)"></component-parse>
            <annotation-compile [src]="src" [outDir]="outDir"></annotation-compile>
            <esbuild-build [src]="src" [outDir]="outDir" [outputStyle]="outputStyle" [target]="target"></esbuild-build>
            <declaration-generate [src]="src" [outDir]="outDir"></declaration-generate>
        </sequence>
    `
})
export class CompilerActivity extends SequenceActivity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    target = 'es2022';

    @Attribute()
    format: 'cjs' | 'esm' | 'iife' = 'esm';

    @Attribute()
    platform: 'browser' | 'node' = 'node';

    @Attribute()
    bundle = false;

    @Attribute()
    minify = false;

    @Attribute()
    sourcemap = true;

    @Attribute()
    declaration = true;

    @Attribute()
    generateMetadata = true;

    @Attribute()
    flatModuleOutFile?: string;

    @Attribute()
    inlineStyles = false;

    @Attribute()
    inlineTemplate = false;

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    outputStyle?: OutputStyle;

    @Attribute()
    tsconfig?: string;

    @Attribute()
    useTsconfig = true;

    @Attribute()
    template?: CompilerTemplate;

    private files: string[] = [];
    private componentInfos: Map<string, ComponentCompileInfo> = new Map();
    private tsConfigReader?: TsConfigReader;
    private templateExecutor?: CompilerTemplateExecutor;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (this.template || this.useTsconfig) {
            return this.executeWithTemplate(context);
        }

        return this.executeDefault(context);
    }

    private async executeWithTemplate(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();

        const executor = new CompilerTemplateExecutor(this.tsconfig);
        const runtime: RuntimeEnvironment = {
            platform: this.platform,
            bundle: this.bundle,
            minify: this.minify,
            sourcemap: this.sourcemap,
            declaration: this.declaration,
            target: this.target,
            module: this.format
        };

        const template = this.template || this.createDefaultTemplate();
        const result = await executor.execute(template, runtime);

        return {
            success: result.success,
            data: {
                files: this.files,
                components: Array.from(this.componentInfos.values()),
                errors: [],
                warnings: [],
                outputFiles: [],
                duration: Date.now() - startTime,
                executedNodes: result.executedNodes,
                skippedNodes: result.skippedNodes,
                options: result.data?.options
            },
            error: result.error
        };
    }

    private async executeDefault(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();

        if (this.useTsconfig && !this.tsconfig) {
            const merged = this.loadTsConfigOptions();
            this.applyMergedOptions(merged);
        }

        return {
            success: true,
            data: {
                files: this.files,
                components: Array.from(this.componentInfos.values()),
                errors: [],
                warnings: [],
                outputFiles: [],
                duration: Date.now() - startTime
            }
        };
    }

    private loadTsConfigOptions(): MergedCompilerOptions {
        if (!this.tsConfigReader) {
            this.tsConfigReader = new TsConfigReader(this.tsconfig);
        }

        const runtime: RuntimeEnvironment = {
            platform: this.platform,
            bundle: this.bundle,
            minify: this.minify,
            sourcemap: this.sourcemap,
            declaration: this.declaration
        };

        return this.tsConfigReader.mergeWithRuntime(runtime);
    }

    private applyMergedOptions(merged: MergedCompilerOptions): void {
        this.src = merged.src;
        this.outDir = merged.outDir;
        this.target = merged.target;
        this.format = merged.format;
        this.platform = merged.platform;
        this.bundle = merged.bundle;
        this.minify = merged.minify;
        this.sourcemap = merged.sourcemap;
        this.declaration = merged.declaration;
        this.exclude = merged.exclude;
    }

    private createDefaultTemplate(): CompilerTemplate {
        const { createDefaultCompilerTemplate } = require('./CompilerTemplate');
        return createDefaultCompilerTemplate('Compiler Activity Template');
    }

    setTemplate(template: CompilerTemplate): void {
        this.template = template;
    }

    setTsConfigPath(path: string): void {
        this.tsconfig = path;
        this.tsConfigReader = new TsConfigReader(path);
    }

    getMergedOptions(): MergedCompilerOptions {
        return this.loadTsConfigOptions();
    }
}
