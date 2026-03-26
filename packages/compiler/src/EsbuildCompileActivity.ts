import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';
import * as esbuild from 'esbuild';
import { DiagnosticInfo, SourceFile } from './CompileActivity';

/**
 * esbuild compile options
 */
export interface EsbuildCompileOptions {
    /** Compilation target: es5, es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, esnext */
    target?: string;
    /** Output format: iife, cjs, esm */
    format?: 'iife' | 'cjs' | 'esm';
    /** Platform: browser, node, neutral */
    platform?: 'browser' | 'node' | 'neutral';
    /** Generate source maps */
    sourcemap?: boolean | 'linked' | 'external' | 'inline';
    /** Minify output */
    minify?: boolean;
    /** Generate declaration files (.d.ts) */
    declaration?: boolean;
    /** External dependencies to exclude from bundle */
    external?: string[];
    /** Define global constants */
    define?: Record<string, string>;
    /** Enable tree shaking */
    treeShaking?: boolean;
    /** Bundle mode - bundle all dependencies */
    bundle?: boolean;
    /** Split chunks for code splitting */
    splitting?: boolean;
    /** Output file name for bundle */
    outfile?: string;
    /** Output directory for multiple files */
    outdir?: string;
    /** Entry points for bundling */
    entryPoints?: string[];
    /** Metafile for analysis */
    metafile?: boolean;
    /** Banner to prepend */
    banner?: string;
    /** Footer to append */
    footer?: string;
    /** JSX mode */
    jsx?: 'transform' | 'preserve' | 'automatic';
    /** JSX factory function */
    jsxFactory?: string;
    /** JSX fragment function */
    jsxFragment?: string;
    /** Keep names for minification */
    keepNames?: boolean;
    /** Legal comments handling */
    legalComments?: 'none' | 'inline' | 'eof' | 'linked' | 'external';
    /** Main fields for resolution */
    mainFields?: string[];
    /** Conditions for resolution */
    conditions?: string[];
    /** Node modules directories */
    nodePaths?: string[];
    /** Plugins */
    plugins?: any[];
    /** Loader for file types */
    loader?: Record<string, 'js' | 'jsx' | 'ts' | 'tsx' | 'css' | 'json' | 'text' | 'base64' | 'dataurl' | 'file' | 'binary' | 'copy' | 'empty'>;
}

/**
 * esbuild compile result
 */
export interface EsbuildCompileResult {
    success: boolean;
    errors: DiagnosticInfo[];
    warnings: DiagnosticInfo[];
    outputFiles?: string[];
    metafile?: any;
    duration: number;
    error?: Error;
}

/**
 * EsbuildCompileActivity - High-performance TypeScript compiler using esbuild
 * 
 * Features:
 * - 10-100x faster than tsc
 * - Built-in bundling support
 * - Tree shaking
 * - Minification
 * - Source maps
 * - Code splitting
 * - JSX/TSX support
 */
@Component({ selector: 'esbuild' })
export class EsbuildCompileActivity extends Activity {

    /** Source files pattern */
    @Attribute()
    src = 'src/**/*.ts';

    /** Output directory */
    @Attribute()
    outDir = 'lib';

    /** Entry point for bundling (e.g., 'src/index.ts') */
    @Attribute()
    entryPoint?: string;

    /** Output file name for bundle (e.g., 'bundle.js') */
    @Attribute()
    outfile?: string;

    /** Enable bundling mode */
    @Attribute()
    bundle = false;

    /** Minify output */
    @Attribute()
    minify = false;

    /** Generate source maps */
    @Attribute()
    sourcemap: boolean | 'linked' | 'external' | 'inline' = true;

    /** Target environment */
    @Attribute()
    target: string = 'es2020';

    /** Output format */
    @Attribute()
    format: 'iife' | 'cjs' | 'esm' = 'cjs';

    /** Platform */
    @Attribute()
    platform: 'browser' | 'node' | 'neutral' = 'node';

    /** Generate declaration files */
    @Attribute()
    declaration = true;

    /** External dependencies */
    @Attribute()
    external: string[] = [];

    /** Define constants */
    @Attribute()
    define: Record<string, string> = {};

    /** Watch mode */
    @Attribute()
    watch = false;

    /** Exclude patterns */
    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    /** Additional esbuild options */
    @Attribute()
    options: EsbuildCompileOptions = {};

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();
        
        try {
            // Check if bundling mode
            if (this.bundle && this.entryPoint) {
                const result = await this.bundleFiles();
                return {
                    success: result.success,
                    data: result,
                    error: result.error
                };
            }

            // Standard compilation mode
            const files = await this.getSourceFiles();
            const results: EsbuildCompileResult[] = [];

            for (const file of files) {
                const result = await this.compileFile(file);
                results.push(result);
            }

            // Generate declarations if needed
            if (this.declaration) {
                await this.generateDeclarations();
            }

            const success = results.every(r => r.success);
            const allErrors = results.flatMap(r => r.errors);
            const allWarnings = results.flatMap(r => r.warnings);
            const duration = Date.now() - startTime;

            return {
                success,
                data: {
                    totalFiles: results.length,
                    successCount: results.filter(r => r.success).length,
                    errorCount: allErrors.length,
                    warningCount: allWarnings.length,
                    errors: allErrors,
                    warnings: allWarnings,
                    duration
                },
                error: !success ? new Error(`${allErrors.length} file(s) failed to compile`) : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    /**
     * Get source files matching pattern
     */
    private async getSourceFiles(): Promise<SourceFile[]> {
        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns, { cwd: process.cwd() });

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath: path.resolve(filePath),
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }

    /**
     * Compile a single file using esbuild
     */
    private async compileFile(sourceFile: SourceFile): Promise<EsbuildCompileResult> {
        const startTime = Date.now();
        const outFile = path.join(this.outDir, sourceFile.fileName.replace(/\.ts$/, '.js'));

        try {
            const result = await esbuild.build({
                entryPoints: [sourceFile.filePath],
                outfile: outFile,
                bundle: false,
                format: this.format,
                platform: this.platform,
                target: this.target,
                sourcemap: this.sourcemap,
                minify: this.minify,
                external: this.external,
                define: this.define,
                write: true
            });

            const errors: DiagnosticInfo[] = result.errors.map((e: esbuild.Message) => ({
                file: e.location?.file || sourceFile.filePath,
                line: e.location?.line || 0,
                character: e.location?.column || 0,
                message: e.text,
                severity: 'error' as const,
                code: 0
            }));

            const warnings: DiagnosticInfo[] = result.warnings.map((w: esbuild.Message) => ({
                file: w.location?.file || sourceFile.filePath,
                line: w.location?.line || 0,
                character: w.location?.column || 0,
                message: w.text,
                severity: 'warning' as const,
                code: 0
            }));

            return {
                success: errors.length === 0,
                errors,
                warnings,
                outputFiles: [outFile],
                duration: Date.now() - startTime
            };
        } catch (error: unknown) {
            return {
                success: false,
                errors: [{
                    file: sourceFile.filePath,
                    line: 0,
                    character: 0,
                    message: (error as Error).message,
                    severity: 'error' as const,
                    code: 0
                }],
                warnings: [],
                duration: Date.now() - startTime,
                error: error as Error
            };
        }
    }

    /**
     * Bundle files into a single output
     */
    private async bundleFiles(): Promise<EsbuildCompileResult> {
        const startTime = Date.now();

        const outfile = this.outfile 
            ? path.join(this.outDir, this.outfile)
            : path.join(this.outDir, 'bundle.js');

        try {
            const result = await esbuild.build({
                entryPoints: this.entryPoint ? [this.entryPoint] : undefined,
                outfile,
                bundle: true,
                format: this.format,
                platform: this.platform,
                target: this.target,
                sourcemap: this.sourcemap,
                minify: this.minify,
                external: this.external,
                define: this.define,
                metafile: true,
                write: true
            });

            const errors: DiagnosticInfo[] = result.errors.map((e: esbuild.Message) => ({
                file: e.location?.file || '',
                line: e.location?.line || 0,
                character: e.location?.column || 0,
                message: e.text,
                severity: 'error' as const,
                code: 0
            }));

            const warnings: DiagnosticInfo[] = result.warnings.map((w: esbuild.Message) => ({
                file: w.location?.file || '',
                line: w.location?.line || 0,
                character: w.location?.column || 0,
                message: w.text,
                severity: 'warning' as const,
                code: 0
            }));

            return {
                success: errors.length === 0,
                errors,
                warnings,
                outputFiles: [outfile],
                metafile: result.metafile,
                duration: Date.now() - startTime
            };
        } catch (error: unknown) {
            return {
                success: false,
                errors: [{
                    file: '',
                    line: 0,
                    character: 0,
                    message: (error as Error).message,
                    severity: 'error' as const,
                    code: 0
                }],
                warnings: [],
                duration: Date.now() - startTime,
                error: error as Error
            };
        }
    }

    /**
     * Generate TypeScript declaration files using tsc
     */
    private async generateDeclarations(): Promise<void> {
        const files = await this.getSourceFiles();
        
        const compilerOptions: ts.CompilerOptions = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            declaration: true,
            emitDeclarationOnly: true,
            outDir: this.outDir,
            declarationMap: this.sourcemap === true || this.sourcemap === 'linked',
            skipLibCheck: true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true
        };

        const program = ts.createProgram(
            files.map(f => f.filePath),
            compilerOptions
        );

        const emitResult = program.emit();
        
        const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        
        if (diagnostics.length > 0) {
            const messages = diagnostics.map(d => {
                const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
                if (d.file) {
                    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start!);
                    return `${d.file.fileName} (${line + 1},${character + 1}): ${message}`;
                }
                return message;
            });
            console.warn('Declaration generation warnings:', messages.join('\n'));
        }
    }
}