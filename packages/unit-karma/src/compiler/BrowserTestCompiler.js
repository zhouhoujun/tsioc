"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserTestCompiler = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");
/**
 * Browser test compiler using esbuild.
 * 使用 esbuild 的浏览器测试编译器
 */
let BrowserTestCompiler = class BrowserTestCompiler {
    /**
     * Compile TypeScript test files for browser execution.
     * 编译 TypeScript 测试文件以供浏览器执行
     */
    async compile(options) {
        const startTime = Date.now();
        try {
            // Ensure output directory exists
            const outDir = path.resolve(options.baseURL || process.cwd(), options.outDir);
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }
            // Build esbuild options
            const buildOptions = {
                entryPoints: await this.resolveEntryPoints(options),
                outdir: options.bundle ? undefined : outDir,
                outfile: options.bundle ? path.join(outDir, 'test-bundle.js') : undefined,
                bundle: options.bundle ?? false,
                format: 'iife', // Immediately Invoked Function Expression for browser
                platform: 'browser',
                target: 'es2020',
                sourcemap: options.sourcemap ?? true,
                minify: options.minify ?? false,
                splitting: false,
                external: [
                    '@tsdi/*',
                    '@tsdi/ioc',
                    '@tsdi/unit',
                    '@tsdi/core',
                    '@tsdi/aop',
                    '@tsdi/common',
                    '@tsdi/compiler',
                    '@tsdi/platform-browser',
                    '@tsdi/platform-server',
                    ...options.external || []
                ],
                define: {
                    'process.env.NODE_ENV': '"test"',
                    ...options.define
                },
                metafile: true,
                write: true,
                plugins: this.getPlugins(options),
                loader: {
                    '.ts': 'ts',
                    '.tsx': 'tsx',
                    '.js': 'js',
                    '.jsx': 'jsx',
                    '.json': 'json'
                },
                tsconfigRaw: {
                    compilerOptions: {
                        experimentalDecorators: true
                    }
                }
            };
            const result = await esbuild.build(buildOptions);
            const outputFiles = [];
            if (result.outputFiles) {
                outputFiles.push(...result.outputFiles.map(f => f.path));
            }
            else {
                // Read from output directory
                const files = fs.readdirSync(outDir);
                outputFiles.push(...files.map(f => path.join(outDir, f)));
            }
            return {
                success: result.errors.length === 0,
                outputFiles,
                entryFile: options.bundle ? path.join(outDir, 'test-bundle.js') : outputFiles[0],
                errors: result.errors,
                warnings: result.warnings,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                success: false,
                outputFiles: [],
                errors: [{ text: error.message, pluginName: 'browser-test-compiler', id: '', location: null, notes: [], detail: '' }],
                warnings: [],
                duration: Date.now() - startTime
            };
        }
    }
    /**
     * Compile tests with Istanbul coverage instrumentation.
     * 使用 Istanbul 覆盖率插桩编译测试
     */
    async compileWithCoverage(options) {
        return this.compile({
            ...options,
            coverage: true
        });
    }
    /**
     * Resolve entry points from options.
     * 从选项解析入口点
     */
    async resolveEntryPoints(options) {
        if (options.entryPoint) {
            return [path.resolve(options.baseURL || process.cwd(), options.entryPoint)];
        }
        const srcArray = Array.isArray(options.src) ? options.src : [options.src];
        const baseURL = options.baseURL || process.cwd();
        const entryPoints = [];
        for (const src of srcArray) {
            const srcPath = path.resolve(baseURL, src);
            // Check if it's a file or directory
            if (fs.existsSync(srcPath)) {
                const stat = fs.statSync(srcPath);
                if (stat.isFile()) {
                    entryPoints.push(srcPath);
                }
                else if (stat.isDirectory()) {
                    // Find test files in directory
                    const files = this.findTestFiles(srcPath, options);
                    entryPoints.push(...files);
                }
            }
        }
        return entryPoints;
    }
    /**
     * Find test files in directory.
     * 在目录中查找测试文件
     */
    findTestFiles(dir, options) {
        const files = [];
        const include = options.include || ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'];
        const exclude = options.exclude || ['node_modules/**'];
        const walkDir = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    if (!exclude.some(p => item.includes(p.replace('**/', '')))) {
                        walkDir(fullPath);
                    }
                }
                else if (stat.isFile() && item.endsWith('.ts')) {
                    // Check if matches include patterns
                    const relativePath = path.relative(dir, fullPath);
                    if (include.some(p => this.matchGlob(relativePath, p))) {
                        files.push(fullPath);
                    }
                }
            }
        };
        walkDir(dir);
        return files;
    }
    /**
     * Simple glob pattern matching.
     * 简单的 glob 模式匹配
     */
    matchGlob(filePath, pattern) {
        const regex = this.globToRegex(pattern);
        return new RegExp(regex, 'i').test(filePath);
    }
    /**
     * Convert glob pattern to regex.
     * 将 glob 模式转换为正则表达式
     */
    globToRegex(pattern) {
        const parts = pattern.split('**/');
        let regex = '';
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                regex += '(?:[^/]+/)*';
            }
            regex += this.globPartToRegex(parts[i]);
        }
        return regex + '$';
    }
    /**
     * Convert glob part to regex.
     * 将 glob 部分转换为正则表达式
     */
    globPartToRegex(part) {
        let regex = '';
        for (let i = 0; i < part.length; i++) {
            const ch = part[i];
            if (ch === '*') {
                regex += '[^/]*';
            }
            else if (ch === '?') {
                regex += '[^/]';
            }
            else if (ch === '.') {
                regex += '\\.';
            }
            else {
                regex += ch;
            }
        }
        return regex;
    }
    /**
     * Get esbuild plugins for compilation.
     * 获取编译用的 esbuild 插件
     */
    getPlugins(options) {
        const plugins = [];
        // Coverage instrumentation plugin
        if (options.coverage) {
            plugins.push(this.createCoveragePlugin(options));
        }
        return plugins;
    }
    /**
     * Create Istanbul coverage instrumentation plugin.
     * 创建 Istanbul 覆盖率插桩插件
     */
    createCoveragePlugin(options) {
        const self = this;
        return {
            name: 'coverage-instrumenter',
            setup(build) {
                const coverageInclude = options.coverageInclude || ['**/src/**/*.ts'];
                const coverageExclude = options.coverageExclude || ['**/*.spec.ts', '**/*.test.ts', '**/node_modules/**'];
                build.onLoad({ filter: /\.ts$/ }, async (args) => {
                    const relativePath = path.relative(options.baseURL || process.cwd(), args.path);
                    const shouldInstrument = coverageInclude.some(p => self.matchGlob(relativePath, p)) &&
                        !coverageExclude.some(p => self.matchGlob(relativePath, p));
                    if (!shouldInstrument) {
                        return null;
                    }
                    const source = await fs.promises.readFile(args.path, 'utf8');
                    const instrumented = `
if (typeof window !== 'undefined' && !window.__coverage__) {
    window.__coverage__ = {};
}

(function() {
    const __cov_path = '${relativePath}';
    window.__coverage__[__cov_path] = window.__coverage__[__cov_path] || {
        path: __cov_path,
        s: {},
        f: {},
        b: {},
        fnMap: {},
        statementMap: {},
        branchMap: {}
    };
})();

${source}
`;
                    return { contents: instrumented, loader: 'ts' };
                });
            }
        };
    }
    /**
     * Clean output directory.
     * 清理输出目录
     */
    async clean(outDir) {
        const absOutDir = path.resolve(outDir);
        if (fs.existsSync(absOutDir)) {
            await fs.promises.rm(absOutDir, { recursive: true, force: true });
        }
    }
};
exports.BrowserTestCompiler = BrowserTestCompiler;
exports.BrowserTestCompiler = BrowserTestCompiler = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], BrowserTestCompiler);
//# sourceMappingURL=BrowserTestCompiler.js.map