import { Injectable, Destroyable, OnDestroy, Injector, Inject, Optional } from '@tsdi/ioc';
import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule, ActivityContext } from '@tsdi/activities';
import { CompileActivity } from './CompileActivity';
import { ComponentCompileActivity } from './ComponentCompileActivity';
import { TestGenerateActivity } from './TestGenerateActivity';
import { EsbuildCompileActivity } from './EsbuildCompileActivity';
import { CompilerService } from './CompilerService';

export interface CompilerOptions {
    src?: string;
    outDir?: string;
    options?: Record<string, any>;
    entryPoint?: string;
    outfile?: string;
    bundle?: boolean;
    minify?: boolean;
    declaration?: boolean;
    target?: string;
    format?: 'iife' | 'cjs' | 'esm';
    platform?: 'browser' | 'node' | 'neutral';
}

@Injectable()
export class CompilerRunner implements OnDestroy {
    
    constructor(
        private service: CompilerService,
        @Optional() @Inject('COMPILER_OPTIONS') private options?: CompilerOptions
    ) {}

    async run(): Promise<void> {
        const opts = this.options || {};
        const src = opts.src || 'src/**/*.ts';
        const outDir = opts.outDir || 'lib';
        
        console.log(`Compiling ${src} to ${outDir}...`);
        
        const result = await this.service.compileWithEsbuild(src, {
            outdir: outDir,
            target: opts.target || 'es2020',
            format: opts.format || 'cjs',
            platform: opts.platform || 'node',
            bundle: opts.bundle ?? false,
            minify: opts.minify ?? false,
            declaration: opts.declaration ?? true,
            sourcemap: true,
            ...opts.options
        });
        
        if (result.success) {
            console.log(`Compilation completed in ${result.duration}ms`);
            if (result.esbuildResults) {
                console.log(`  Files: ${result.esbuildResults.outputFiles?.length || 0}`);
                console.log(`  Errors: ${result.totalErrors}`);
                console.log(`  Warnings: ${result.totalWarnings}`);
            }
        } else {
            console.error('Compilation failed:', result.error);
            if (result.esbuildResults?.errors.length) {
                result.esbuildResults.errors.forEach(e => {
                    console.error(`  ${e.file}:${e.line}:${e.character}: ${e.message}`);
                });
            }
            process.exit(1);
        }
    }

    onDestroy(): void {
    }
}

@Module({
    imports: [
        ComponentsModule,
        WorkflowModule
    ],
    providers: [
        CompilerService,
        CompilerRunner
    ],
    declarations: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity,
        EsbuildCompileActivity
    ],
    exports: [
        CompileActivity,
        ComponentCompileActivity,
        TestGenerateActivity,
        EsbuildCompileActivity,
        CompilerService,
        CompilerRunner
    ],
    bootstrap: [CompilerRunner]
})
export class CompilerModule {}