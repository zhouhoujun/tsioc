import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';
import * as esbuild from 'esbuild';
import { DiagnosticInfo, SourceFile } from '../CompileActivity';

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

export interface EsbuildBuildResult {
    success: boolean;
    errors: DiagnosticInfo[];
    warnings: DiagnosticInfo[];
    outputFiles?: string[];
    metafile?: any;
    duration: number;
}

@Directive({ selector: 'esbuild-build' })
export class EsbuildBuildActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    entryPoint?: string;

    @Attribute()
    outfile?: string;

    @Attribute()
    bundle = false;

    @Attribute()
    minify = false;

    @Attribute()
    sourcemap: boolean | 'linked' | 'external' | 'inline' = true;

    @Attribute()
    target = 'es2020';

    @Attribute()
    format: 'iife' | 'cjs' | 'esm' = 'cjs';

    @Attribute()
    platform: 'browser' | 'node' | 'neutral' = 'node';

    @Attribute()
    external: string[] = [];

    @Attribute()
    define: Record<string, string> = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    options: EsbuildBuildOptions = {};

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();

        try {
            if (this.bundle && this.entryPoint) {
                const result = await this.bundleFiles();
                return {
                    success: result.success,
                    data: { ...result, duration: Date.now() - startTime },
                    error: result.success ? undefined : new Error(`${result.errors.length} build error(s)`)
                };
            }

            const files = await this.getSourceFiles();
            const results: EsbuildBuildResult[] = [];

            for (const file of files) {
                const result = await this.compileFile(file);
                results.push(result);
            }

            const success = results.every(r => r.success);
            const allErrors = results.flatMap(r => r.errors);
            const allWarnings = results.flatMap(r => r.warnings);

            return {
                success,
                data: {
                    totalFiles: results.length,
                    successCount: results.filter(r => r.success).length,
                    errorCount: allErrors.length,
                    warningCount: allWarnings.length,
                    errors: allErrors,
                    warnings: allWarnings,
                    duration: Date.now() - startTime
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

    private async compileFile(sourceFile: SourceFile): Promise<EsbuildBuildResult> {
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
                duration: Date.now() - startTime
            };
        }
    }

    private async bundleFiles(): Promise<EsbuildBuildResult> {
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
                duration: Date.now() - startTime
            };
        }
    }
}
