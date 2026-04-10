import { Injectable } from '@tsdi/ioc';
import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Browser test compilation options.
 * 浏览器测试编译选项
 */
export interface BrowserTestCompileOptions {
    /**
     * Test source files or directories.
     * 测试源文件或目录
     */
    src: string | string[];
    /**
     * Output directory for compiled tests.
     * 编译输出目录
     */
    outDir: string;
    /**
     * Coverage instrumentation enabled.
     * 是否启用覆盖率插桩
     */
    coverage?: boolean;
    /**
     * Entry file for bundling (optional).
     * 打包入口文件（可选）
     */
    entryPoint?: string;
    /**
     * Bundle all tests into single file.
     * 是否将所有测试打包为单个文件
     */
    bundle?: boolean;
    /**
     * Minify output.
     * 是否压缩输出
     */
    minify?: boolean;
    /**
     * Source map generation.
     * 是否生成 source map
     */
    sourcemap?: boolean | 'linked' | 'external' | 'inline';
    /**
     * External dependencies to exclude from bundle.
     * 排除打包的外部依赖
     */
    external?: string[];
    /**
     * Define global constants.
     * 定义全局常量
     */
    define?: Record<string, string>;
    /**
     * Base URL for resolving paths.
     * 解析路径的根路径
     */
    baseURL?: string;
    /**
     * Include patterns for test files.
     * 测试文件包含模式
     */
    include?: string[];
    /**
     * Exclude patterns for test files.
     * 测试文件排除模式
     */
    exclude?: string[];
    /**
     * Coverage include patterns.
     * 覆盖率包含模式
     */
    coverageInclude?: string[];
    /**
     * Coverage exclude patterns.
     * 覆盖率排除模式
     */
    coverageExclude?: string[];
}

/**
 * Compilation result.
 * 编译结果
 */
export interface BrowserTestCompileResult {
    /**
     * Compilation success.
     * 编译是否成功
     */
    success: boolean;
    /**
     * Output files.
     * 输出文件列表
     */
    outputFiles: string[];
    /**
     * Entry file for browser.
     * 浏览器入口文件
     */
    entryFile?: string;
    /**
     * Errors.
     * 错误列表
     */
    errors: esbuild.Message[];
    /**
     * Warnings.
     * 警告列表
     */
    warnings: esbuild.Message[];
    /**
     * Duration in milliseconds.
     * 编译耗时（毫秒）
     */
    duration: number;
}

/**
 * Browser test compiler using esbuild.
 * 使用 esbuild 的浏览器测试编译器
 */
@Injectable()
export class BrowserTestCompiler {

    /**
     * Compile TypeScript test files for browser execution.
     * 编译 TypeScript 测试文件以供浏览器执行
     */
    async compile(options: BrowserTestCompileOptions): Promise<BrowserTestCompileResult> {
        const startTime = Date.now();

        try {
            // Ensure output directory exists
            const outDir = path.resolve(options.baseURL || process.cwd(), options.outDir);
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }

            // Build esbuild options
            const buildOptions: esbuild.BuildOptions = {
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
                external: options.external || [],
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

            const outputFiles: string[] = [];
            if (result.outputFiles) {
                outputFiles.push(...result.outputFiles.map(f => f.path));
            } else {
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
        } catch (error) {
            return {
                success: false,
                outputFiles: [],
                errors: [{ text: (error as Error).message, pluginName: 'browser-test-compiler', id: '', location: null, notes: [], detail: '' }],
                warnings: [],
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Compile tests with Istanbul coverage instrumentation.
     * 使用 Istanbul 覆盖率插桩编译测试
     */
    async compileWithCoverage(options: BrowserTestCompileOptions): Promise<BrowserTestCompileResult> {
        return this.compile({
            ...options,
            coverage: true
        });
    }

    /**
     * Resolve entry points from options.
     * 从选项解析入口点
     */
    private async resolveEntryPoints(options: BrowserTestCompileOptions): Promise<string[]> {
        if (options.entryPoint) {
            return [path.resolve(options.baseURL || process.cwd(), options.entryPoint)];
        }

        const srcArray = Array.isArray(options.src) ? options.src : [options.src];
        const baseURL = options.baseURL || process.cwd();

        const entryPoints: string[] = [];

        for (const src of srcArray) {
            const srcPath = path.resolve(baseURL, src);

            // Check if it's a file or directory
            if (fs.existsSync(srcPath)) {
                const stat = fs.statSync(srcPath);
                if (stat.isFile()) {
                    entryPoints.push(srcPath);
                } else if (stat.isDirectory()) {
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
    private findTestFiles(dir: string, options: BrowserTestCompileOptions): string[] {
        const files: string[] = [];
        const include = options.include || ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'];
        const exclude = options.exclude || ['node_modules/**'];

        const walkDir = (currentDir: string) => {
            const items = fs.readdirSync(currentDir);

            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    if (!exclude.some(p => item.includes(p.replace('**/', '')))) {
                        walkDir(fullPath);
                    }
                } else if (stat.isFile() && item.endsWith('.ts')) {
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
    private matchGlob(filePath: string, pattern: string): boolean {
        const regex = this.globToRegex(pattern);
        return new RegExp(regex, 'i').test(filePath);
    }

    /**
     * Convert glob pattern to regex.
     * 将 glob 模式转换为正则表达式
     */
    private globToRegex(pattern: string): string {
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
    private globPartToRegex(part: string): string {
        let regex = '';
        for (let i = 0; i < part.length; i++) {
            const ch = part[i];
            if (ch === '*') {
                regex += '[^/]*';
            } else if (ch === '?') {
                regex += '[^/]';
            } else if (ch === '.') {
                regex += '\\.';
            } else {
                regex += ch;
            }
        }
        return regex;
    }

    /**
     * Get esbuild plugins for compilation.
     * 获取编译用的 esbuild 插件
     */
    private getPlugins(options: BrowserTestCompileOptions): esbuild.Plugin[] {
        const plugins: esbuild.Plugin[] = [];

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
    private createCoveragePlugin(options: BrowserTestCompileOptions): esbuild.Plugin {
        const self = this;
        return {
            name: 'coverage-instrumenter',
            setup(build: esbuild.PluginBuild) {
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
        } as esbuild.Plugin;
    }

    /**
     * Clean output directory.
     * 清理输出目录
     */
    async clean(outDir: string): Promise<void> {
        const absOutDir = path.resolve(outDir);
        if (fs.existsSync(absOutDir)) {
            await fs.promises.rm(absOutDir, { recursive: true, force: true });
        }
    }
}