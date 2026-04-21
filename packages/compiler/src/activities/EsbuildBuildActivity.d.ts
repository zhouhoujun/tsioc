import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
export interface DiagnosticInfo {
    file: string;
    line: number;
    character: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: number;
}
export interface EsbuildBuildOptions {
    target?: string;
    format?: 'iife' | 'cjs' | 'esm';
    platform?: 'browser' | 'node' | 'neutral';
    sourcemap?: boolean | 'linked' | 'external' | 'inline';
    minify?: boolean;
    bundle?: boolean;
    splitting?: boolean;
    outfile?: string;
    outdir?: string;
    external?: string[];
    define?: Record<string, string>;
    metafile?: boolean;
}
export interface BuildOutput {
    success: boolean;
    errors: DiagnosticInfo[];
    warnings: DiagnosticInfo[];
    outputFiles?: string[];
    metafile?: any;
    duration: number;
}
export type OutputStyle = 'esm2020' | 'esm2022' | 'fesm2020' | 'fesm2022';
export declare class EsbuildBuildActivity extends Activity {
    src: string;
    outDir: string;
    entryPoint?: string;
    outfile?: string;
    bundle: boolean;
    minify: boolean;
    sourcemap: boolean | 'linked' | 'external' | 'inline';
    target: string;
    format: 'iife' | 'cjs' | 'esm';
    platform: 'browser' | 'node' | 'neutral';
    external: string[];
    define: Record<string, string>;
    exclude: string[];
    options: EsbuildBuildOptions;
    outputStyle?: OutputStyle;
    execute(context: ActivityContext): Promise<ActivityResult>;
    private buildAngularStyle;
    private getSourceFiles;
    private compileFile;
    private bundleFiles;
    private getPackageName;
}
