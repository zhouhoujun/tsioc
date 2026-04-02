import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface TsConfig {
    compilerOptions: ts.CompilerOptions;
    include?: string[];
    exclude?: string[];
    files?: string[];
    extends?: string | string[];
    references?: { path: string }[];
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

export class TsConfigReader {
    private configPath: string;
    private config: TsConfig | null = null;

    constructor(configPath?: string) {
        this.configPath = configPath || ts.findConfigFile(process.cwd(), ts.sys.fileExists) || 'tsconfig.json';
    }

    read(): TsConfig {
        if (this.config) {
            return this.config;
        }

        const resolvedPath = path.resolve(this.configPath);
        
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`tsconfig.json not found at: ${resolvedPath}`);
        }

        const configDir = path.dirname(resolvedPath);
        const configFileName = path.basename(resolvedPath);

        const result = ts.readConfigFile(resolvedPath, (path) => fs.readFileSync(path, 'utf-8'));
        
        if (result.error) {
            throw new Error(`Failed to parse tsconfig: ${ts.flattenDiagnosticMessageText(result.error.messageText, '\n')}`);
        }

        const rawConfig = result.config;

        this.config = this.parseConfig(rawConfig, configDir);
        return this.config!;
    }

    private parseConfig(rawConfig: any, configDir: string): TsConfig {
        const result: TsConfig = {
            compilerOptions: {},
            include: rawConfig.include,
            exclude: rawConfig.exclude,
            files: rawConfig.files,
            extends: rawConfig.extends,
            references: rawConfig.references
        };

        if (rawConfig.extends) {
            const baseConfig = this.loadExtendsConfig(rawConfig.extends, configDir);
            result.compilerOptions = { ...baseConfig.compilerOptions, ...rawConfig.compilerOptions };
            result.include = result.include || baseConfig.include;
            result.exclude = result.exclude || baseConfig.exclude;
        } else {
            result.compilerOptions = rawConfig.compilerOptions || {};
        }

        return result;
    }

    private loadExtendsConfig(extendsPath: string | string[], configDir: string): TsConfig {
        const paths = Array.isArray(extendsPath) ? extendsPath : [extendsPath];
        let mergedConfig: TsConfig = { compilerOptions: {} };

        for (const extPath of paths) {
            const resolvedPath = this.resolveConfigPath(extPath, configDir);
            
            if (fs.existsSync(resolvedPath)) {
                const result = ts.readConfigFile(resolvedPath, (path) => fs.readFileSync(path, 'utf-8'));
                
                if (!result.error && result.config) {
                    const parsed = this.parseConfig(result.config, path.dirname(resolvedPath));
                    mergedConfig.compilerOptions = { ...mergedConfig.compilerOptions, ...parsed.compilerOptions };
                }
            }
        }

        return mergedConfig;
    }

    private resolveConfigPath(configPath: string, baseDir: string): string {
        if (path.isAbsolute(configPath)) {
            return configPath;
        }

        const localPath = path.resolve(baseDir, configPath);
        if (fs.existsSync(localPath)) {
            return localPath;
        }

        if (!configPath.endsWith('.json')) {
            const jsonPath = localPath + '.json';
            if (fs.existsSync(jsonPath)) {
                return jsonPath;
            }
        }

        return localPath;
    }

    getCompilerOptions(): ts.CompilerOptions {
        const config = this.read();
        return config.compilerOptions || {};
    }

    getIncludePatterns(): string[] {
        const config = this.read();
        return config.include || ['src/**/*.ts'];
    }

    getExcludePatterns(): string[] {
        const config = this.read();
        return config.exclude || ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
    }

    mergeWithRuntime(runtime: RuntimeEnvironment): MergedCompilerOptions {
        const config = this.read();
        const compilerOptions = config.compilerOptions || {};

        const target = this.normalizeTarget(
            runtime.target || compilerOptions.target || 'es2020'
        );

        const module = this.normalizeModule(
            runtime.module || this.moduleKindToString(compilerOptions.module) || 'cjs'
        );

        const platform = runtime.platform || 'node';
        const src = this.getSrcPattern(config.include);
        const outDir = compilerOptions.outDir || 'lib';

        return {
            src,
            outDir,
            target,
            format: module,
            platform,
            bundle: runtime.bundle ?? false,
            minify: runtime.minify ?? false,
            sourcemap: runtime.sourcemap ?? compilerOptions.sourceMap ?? true,
            declaration: runtime.declaration ?? compilerOptions.declaration ?? true,
            declarationMap: compilerOptions.declarationMap ?? true,
            sourceRoot: compilerOptions.sourceRoot,
            rootDir: compilerOptions.rootDir,
            strict: compilerOptions.strict ?? true,
            esModuleInterop: compilerOptions.esModuleInterop ?? true,
            skipLibCheck: compilerOptions.skipLibCheck ?? true,
            experimentalDecorators: compilerOptions.experimentalDecorators ?? true,
            emitDecoratorMetadata: compilerOptions.emitDecoratorMetadata ?? true,
            include: config.include || ['src/**/*.ts'],
            exclude: config.exclude || ['node_modules', '**/*.spec.ts', '**/*.test.ts']
        };
    }

    private normalizeTarget(target: string | ts.ScriptTarget | undefined): string {
        if (typeof target === 'number') {
            return ts.ScriptTarget[target].toLowerCase();
        }
        return (target || 'es2020').toLowerCase();
    }

    private normalizeModule(module: string | undefined): 'cjs' | 'esm' | 'iife' {
        if (!module) return 'cjs';
        if (module === 'commonjs' || module === 'cjs') return 'cjs';
        if (module.startsWith('es')) return 'esm';
        return module as 'cjs' | 'esm' | 'iife';
    }

    private moduleKindToString(kind: ts.ModuleKind | undefined): string | undefined {
        if (kind === undefined) return undefined;
        switch (kind) {
            case ts.ModuleKind.CommonJS: return 'cjs';
            case ts.ModuleKind.ES2015:
            case ts.ModuleKind.ES2020:
            case ts.ModuleKind.ES2022:
            case ts.ModuleKind.ESNext: return 'esm';
            case ts.ModuleKind.System: return 'system';
            default: return undefined;
        }
    }

    private getSrcPattern(include?: string[]): string {
        if (include && include.length > 0) {
            return include[0];
        }
        return 'src/**/*.ts';
    }

    static fromPath(configPath: string): TsConfigReader {
        return new TsConfigReader(configPath);
    }

    static fromCwd(): TsConfigReader {
        return new TsConfigReader();
    }
}