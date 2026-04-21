import * as esbuild from 'esbuild';
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
export declare class BrowserTestCompiler {
    /**
     * Compile TypeScript test files for browser execution.
     * 编译 TypeScript 测试文件以供浏览器执行
     */
    compile(options: BrowserTestCompileOptions): Promise<BrowserTestCompileResult>;
    /**
     * Compile tests with Istanbul coverage instrumentation.
     * 使用 Istanbul 覆盖率插桩编译测试
     */
    compileWithCoverage(options: BrowserTestCompileOptions): Promise<BrowserTestCompileResult>;
    /**
     * Resolve entry points from options.
     * 从选项解析入口点
     */
    private resolveEntryPoints;
    /**
     * Find test files in directory.
     * 在目录中查找测试文件
     */
    private findTestFiles;
    /**
     * Simple glob pattern matching.
     * 简单的 glob 模式匹配
     */
    private matchGlob;
    /**
     * Convert glob pattern to regex.
     * 将 glob 模式转换为正则表达式
     */
    private globToRegex;
    /**
     * Convert glob part to regex.
     * 将 glob 部分转换为正则表达式
     */
    private globPartToRegex;
    /**
     * Get esbuild plugins for compilation.
     * 获取编译用的 esbuild 插件
     */
    private getPlugins;
    /**
     * Create Istanbul coverage instrumentation plugin.
     * 创建 Istanbul 覆盖率插桩插件
     */
    private createCoveragePlugin;
    /**
     * Clean output directory.
     * 清理输出目录
     */
    clean(outDir: string): Promise<void>;
}
