"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsConfigReader = void 0;
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
class TsConfigReader {
    constructor(configPath) {
        this.config = null;
        this.configPath = configPath || ts.findConfigFile(process.cwd(), ts.sys.fileExists) || 'tsconfig.json';
    }
    read() {
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
        return this.config;
    }
    parseConfig(rawConfig, configDir) {
        const result = {
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
        }
        else {
            result.compilerOptions = rawConfig.compilerOptions || {};
        }
        return result;
    }
    loadExtendsConfig(extendsPath, configDir) {
        const paths = Array.isArray(extendsPath) ? extendsPath : [extendsPath];
        let mergedConfig = { compilerOptions: {} };
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
    resolveConfigPath(configPath, baseDir) {
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
    getCompilerOptions() {
        const config = this.read();
        return config.compilerOptions || {};
    }
    getIncludePatterns() {
        const config = this.read();
        return config.include || ['src/**/*.ts'];
    }
    getExcludePatterns() {
        const config = this.read();
        return config.exclude || ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
    }
    mergeWithRuntime(runtime) {
        const config = this.read();
        const compilerOptions = config.compilerOptions || {};
        const target = this.normalizeTarget(runtime.target || compilerOptions.target || 'es2020');
        const module = this.normalizeModule(runtime.module || this.moduleKindToString(compilerOptions.module) || 'cjs');
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
    normalizeTarget(target) {
        if (typeof target === 'number') {
            return ts.ScriptTarget[target].toLowerCase();
        }
        return (target || 'es2020').toLowerCase();
    }
    normalizeModule(module) {
        if (!module)
            return 'cjs';
        if (module === 'commonjs' || module === 'cjs')
            return 'cjs';
        if (module.startsWith('es'))
            return 'esm';
        return module;
    }
    moduleKindToString(kind) {
        if (kind === undefined)
            return undefined;
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
    getSrcPattern(include) {
        if (include && include.length > 0) {
            return include[0];
        }
        return 'src/**/*.ts';
    }
    static fromPath(configPath) {
        return new TsConfigReader(configPath);
    }
    static fromCwd() {
        return new TsConfigReader();
    }
}
exports.TsConfigReader = TsConfigReader;
//# sourceMappingURL=TsConfigReader.js.map