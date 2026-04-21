import { ActivityContext, ActivityResult, SequenceActivity } from '@tsdi/activities';
import { DiagnosticInfo } from './activities/EsbuildBuildActivity';
import { ComponentCompileInfo } from './activities/ComponentParseActivity';
import { OutputStyle } from './activities/EsbuildBuildActivity';
import { MergedCompilerOptions } from './TsConfigReader';
import { CompilerTemplate } from './CompilerTemplate';
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
export declare class CompilerActivity extends SequenceActivity {
    src: string;
    outDir: string;
    target: string;
    format: 'cjs' | 'esm' | 'iife';
    platform: 'browser' | 'node';
    bundle: boolean;
    minify: boolean;
    sourcemap: boolean;
    declaration: boolean;
    generateMetadata: boolean;
    flatModuleOutFile?: string;
    inlineStyles: boolean;
    inlineTemplate: boolean;
    exclude: string[];
    outputStyle?: OutputStyle;
    tsconfig?: string;
    useTsconfig: boolean;
    template?: CompilerTemplate;
    private files;
    private componentInfos;
    private tsConfigReader?;
    private templateExecutor?;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private executeWithTemplate;
    private executeDefault;
    private loadTsConfigOptions;
    private applyMergedOptions;
    private createDefaultTemplate;
    setTemplate(template: CompilerTemplate): void;
    setTsConfigPath(path: string): void;
    getMergedOptions(): MergedCompilerOptions;
}
