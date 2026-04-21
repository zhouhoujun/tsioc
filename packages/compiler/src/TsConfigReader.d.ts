import * as ts from 'typescript';
export interface TsConfig {
    compilerOptions: ts.CompilerOptions;
    include?: string[];
    exclude?: string[];
    files?: string[];
    extends?: string | string[];
    references?: {
        path: string;
    }[];
}
export interface RuntimeEnvironment {
    platform?: 'browser' | 'node';
    mode?: 'development' | 'production';
    target?: string;
    module?: 'cjs' | 'esm' | 'iife';
    bundle?: boolean;
    minify?: boolean;
    sourcemap?: boolean;
    declaration?: boolean;
}
export interface MergedCompilerOptions {
    src: string;
    outDir: string;
    target: string;
    format: 'cjs' | 'esm' | 'iife';
    platform: 'browser' | 'node';
    bundle: boolean;
    minify: boolean;
    sourcemap: boolean;
    declaration: boolean;
    declarationMap: boolean;
    sourceRoot?: string;
    rootDir?: string;
    strict: boolean;
    esModuleInterop: boolean;
    skipLibCheck: boolean;
    experimentalDecorators: boolean;
    emitDecoratorMetadata: boolean;
    include: string[];
    exclude: string[];
    [key: string]: any;
}
export declare class TsConfigReader {
    private configPath;
    private config;
    constructor(configPath?: string);
    read(): TsConfig;
    private parseConfig;
    private loadExtendsConfig;
    private resolveConfigPath;
    getCompilerOptions(): ts.CompilerOptions;
    getIncludePatterns(): string[];
    getExcludePatterns(): string[];
    mergeWithRuntime(runtime: RuntimeEnvironment): MergedCompilerOptions;
    private normalizeTarget;
    private normalizeModule;
    private moduleKindToString;
    private getSrcPattern;
    static fromPath(configPath: string): TsConfigReader;
    static fromCwd(): TsConfigReader;
}
