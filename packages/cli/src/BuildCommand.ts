#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

/**
 * Build command options.
 * 构建命令选项
 */
export interface BuildOptions {
    /** Target type: 'components' | 'core' | 'boot' */
    target?: 'components' | 'core' | 'boot';
    /** Source files pattern */
    src?: string;
    /** Output directory */
    outDir?: string;
    /** TypeScript config file path */
    tsconfig?: string;
    /** Enable bundling */
    bundle?: boolean;
    /** Enable minification */
    minify?: boolean;
    /** Generate source maps */
    sourcemap?: boolean;
    /** Generate declaration files */
    declaration?: boolean;
    /** Output style for Angular-style builds */
    outputStyle?: 'esm2020' | 'esm2022' | 'fesm2020' | 'fesm2022';
    /** Target environment */
    platform?: 'browser' | 'node';
    /** Watch mode */
    watch?: boolean;
    /** Clean output directory before build */
    clean?: boolean;
    /** Debug mode */
    debug?: boolean;
    /** Entry point for bundling */
    entryPoint?: string;
    /** Configuration file path */
    config?: string;
}

/**
 * Build command handler.
 * 构建命令处理器
 */
export async function handleBuild(options: BuildOptions, processRoot: string): Promise<void> {
    const startTime = Date.now();

    console.log(chalk.gray('Starting build...'));

    // Determine build target based on package.json or options
    const target = options.target || detectBuildTarget(processRoot);

    console.log(chalk.blue(`Build target: ${target}`));

    // Load appropriate compiler based on target
    try {
        switch (target) {
            case 'components':
                await buildComponents(options, processRoot);
                break;
            case 'core':
                await buildCore(options, processRoot);
                break;
            case 'boot':
                await buildBoot(options, processRoot);
                break;
            default:
                await buildDefault(options, processRoot);
        }

        const duration = Date.now() - startTime;
        console.log(chalk.green(`Build completed in ${duration}ms`));
    } catch (error) {
        console.error(chalk.red(`Build failed: ${(error as Error).message}`));
        process.exit(1);
    }
}

/**
 * Detect build target from package.json dependencies.
 * 从 package.json 依赖检测构建目标
 */
function detectBuildTarget(processRoot: string): 'components' | 'core' | 'boot' | 'default' {
    const pkgPath = path.join(processRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        return 'default';
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Check for @tsdi/components
    if (deps['@tsdi/components'] || pkg.name?.includes('components')) {
        return 'components';
    }

    // Check for @tsdi/boot
    if (deps['@tsdi/boot'] || pkg.name?.includes('boot')) {
        return 'boot';
    }

    // Check for @tsdi/core
    if (deps['@tsdi/core'] || pkg.name?.includes('core')) {
        return 'core';
    }

    return 'default';
}

/**
 * Build components package.
 * 构建组件包
 */
async function buildComponents(options: BuildOptions, processRoot: string): Promise<void> {
    console.log(chalk.gray('Building components...'));

    // Try to use @tsdi/compiler if available
    const compilerPath = path.join(processRoot, 'node_modules/@tsdi/compiler');
    if (fs.existsSync(compilerPath)) {
        const { CompilerActivity, CompilerModule } = require(compilerPath);
        const { WorkflowModule } = require(path.join(processRoot, 'node_modules/@tsdi/activities'));
        const { Application } = require(path.join(processRoot, 'node_modules/@tsdi/core'));

        // Create and configure compiler activity
        const activity = new CompilerActivity();
        activity.src = options.src || 'src/**/*.ts';
        activity.outDir = options.outDir || 'lib';
        activity.target = 'es2022';
        activity.platform = options.platform || 'browser';
        activity.bundle = options.bundle ?? false;
        activity.minify = options.minify ?? false;
        activity.sourcemap = options.sourcemap ?? true;
        activity.declaration = options.declaration ?? true;

        if (options.outputStyle) {
            activity.outputStyle = options.outputStyle;
        }

        if (options.tsconfig) {
            activity.setTsConfigPath(options.tsconfig);
        }

        // Clean output directory if requested
        if (options.clean) {
            const outDir = path.join(processRoot, activity.outDir);
            if (fs.existsSync(outDir)) {
                fs.rmSync(outDir, { recursive: true, force: true });
                console.log(chalk.gray(`Cleaned output directory: ${outDir}`));
            }
        }

        // Run compiler via workflow
        await Application.run(CompilerModule);
        const result = await activity.execute({});

        if (result.success) {
            console.log(chalk.green(`Components built successfully`));
            console.log(chalk.gray(`Output: ${activity.outDir}`));
        } else {
            throw result.error || new Error('Build failed');
        }
    } else {
        // Fallback to esbuild directly
        await buildWithEsbuild(options, processRoot);
    }
}

/**
 * Build core/boot package.
 * 构建核心/启动包
 */
async function buildCore(options: BuildOptions, processRoot: string): Promise<void> {
    console.log(chalk.gray('Building core package...'));
    await buildWithEsbuild(options, processRoot);
}

async function buildBoot(options: BuildOptions, processRoot: string): Promise<void> {
    console.log(chalk.gray('Building boot package...'));
    await buildWithEsbuild(options, processRoot);
}

async function buildDefault(options: BuildOptions, processRoot: string): Promise<void> {
    console.log(chalk.gray('Building with default configuration...'));
    await buildWithEsbuild(options, processRoot);
}

/**
 * Build using esbuild directly.
 * 直接使用 esbuild 构建
 */
async function buildWithEsbuild(options: BuildOptions, processRoot: string): Promise<void> {
    const esbuildPath = path.join(processRoot, 'node_modules/esbuild');
    if (!fs.existsSync(esbuildPath)) {
        throw new Error('esbuild is not installed. Please install it with: npm install esbuild');
    }

    const esbuild = require(esbuildPath);
    const src = options.src || 'src/**/*.ts';
    const outDir = options.outDir || 'lib';

    // Clean output directory if requested
    if (options.clean) {
        const fullOutDir = path.join(processRoot, outDir);
        if (fs.existsSync(fullOutDir)) {
            fs.rmSync(fullOutDir, { recursive: true, force: true });
            console.log(chalk.gray(`Cleaned output directory: ${fullOutDir}`));
        }
    }

    // Find source files
    const globbyPath = path.join(processRoot, 'node_modules/globby');
    const globby = fs.existsSync(globbyPath) ? require(globbyPath) : { globby: async (p: string[]) => [src] };
    const files = await globby.globby([src, '!node_modules', '!**/*.spec.ts', '!**/*.test.ts']);

    console.log(chalk.gray(`Found ${files.length} source files`));

    // Build each file
    const results = [];
    for (const file of files) {
        const outFile = path.join(outDir, file.replace(/^src\//, '').replace(/\.ts$/, '.js'));

        try {
            const result = await esbuild.build({
                entryPoints: [path.join(processRoot, file)],
                outfile: path.join(processRoot, outFile),
                bundle: options.bundle ?? false,
                minify: options.minify ?? false,
                sourcemap: options.sourcemap ?? true,
                format: 'cjs',
                platform: options.platform || 'node',
                target: 'es2020',
                external: ['@tsdi/*'],
                write: true
            });

            if (result.errors.length > 0) {
                console.error(chalk.yellow(`Warnings in ${file}:`));
                result.warnings.forEach((w: { text: string }) => console.log(chalk.gray(`  ${w.text}`)));
            }

            results.push({ file, success: result.errors.length === 0 });
        } catch (error) {
            console.error(chalk.red(`Error building ${file}: ${(error as Error).message}`));
            results.push({ file, success: false });
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(chalk.gray(`Built ${successCount}/${results.length} files`));

    if (successCount < results.length) {
        throw new Error(`${results.length - successCount} files failed to build`);
    }

    // Generate declarations if requested
    if (options.declaration) {
        await generateDeclarations(options, processRoot);
    }
}

/**
 * Generate TypeScript declaration files.
 * 生成 TypeScript 声明文件
 */
async function generateDeclarations(options: BuildOptions, processRoot: string): Promise<void> {
    const tscPath = path.join(processRoot, 'node_modules/typescript/bin/tsc');
    const tsconfigPath = options.tsconfig || path.join(processRoot, 'tsconfig.json');

    if (fs.existsSync(tsconfigPath)) {
        console.log(chalk.gray('Generating declaration files...'));

        const { execSync } = require('child_process');

        try {
            if (fs.existsSync(tscPath)) {
                execSync(`node ${tscPath} --emitDeclarationOnly --declaration`, {
                    cwd: processRoot,
                    stdio: 'inherit'
                });
            } else {
                // Use system tsc
                execSync(`tsc --emitDeclarationOnly --declaration`, {
                    cwd: processRoot,
                    stdio: 'inherit'
                });
            }
            console.log(chalk.green('Declaration files generated'));
        } catch (error) {
            console.log(chalk.yellow('Declaration generation failed (optional)'));
        }
    }
}