import expect = require('expect');
import { ApplicationContext } from '@tsdi/core';
import { Workflow } from '@tsdi/activities';
import {
    CompilerActivity,
    SourceFilesActivity,
    EsbuildBuildActivity,
    ComponentParseActivity,
    MetadataGenerateActivity,
    shouldKeepNames,
    createDefaultCompilerTemplate,
    createProductionCompilerTemplate,
    createDevelopmentCompilerTemplate
} from '../src';

describe('Compiler', () => {

    describe('CompilerActivity via Workflow.run', () => {
        it('should run with default options', async () => {
            const ctx = await Workflow.run(CompilerActivity, {
                src: 'nonexistent/**/*.ts'
            });
            expect(ctx).toBeDefined();
            expect(ctx.destroyed).toBe(false);
        });

        it('should run with custom options', async () => {
            const ctx = await Workflow.run(CompilerActivity, {
                src: 'nonexistent/**/*.ts',
                outDir: 'dist',
                target: 'es2017',
                format: 'cjs',
                platform: 'browser'
            });
            expect(ctx).toBeDefined();
        });

        it('should run with outputStyle esm2022', async () => {
            const ctx = await Workflow.run(CompilerActivity, {
                src: 'nonexistent/**/*.ts',
                outputStyle: 'esm2022'
            });
            expect(ctx).toBeDefined();
        });

        it('should run with outputStyle fesm2022', async () => {
            const ctx = await Workflow.run(CompilerActivity, {
                src: 'nonexistent/**/*.ts',
                outputStyle: 'fesm2022'
            });
            expect(ctx).toBeDefined();
        });
    });

    describe('SourceFilesActivity via Workflow.run', () => {
        it('should discover files', async () => {
            const ctx = await Workflow.run(SourceFilesActivity, {
                src: 'src/**/*.ts'
            });
            expect(ctx).toBeDefined();
            const ref = ctx.runners.getRef(SourceFilesActivity);
            expect(ref).toBeDefined();
        });

        it('should handle empty source', async () => {
            const ctx = await Workflow.run(SourceFilesActivity, {
                src: 'nonexistent/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });
    });

    describe('EsbuildBuildActivity via Workflow.run', () => {
        it('should build with default options', async () => {
            const ctx = await Workflow.run(EsbuildBuildActivity, {
                src: 'nonexistent/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });

        it('should build with esm2022 output', async () => {
            const ctx = await Workflow.run(EsbuildBuildActivity, {
                src: 'nonexistent/**/*.ts',
                outputStyle: 'esm2022'
            });
            expect(ctx).toBeDefined();
        });

        it('should build with fesm2022 output', async () => {
            const ctx = await Workflow.run(EsbuildBuildActivity, {
                src: 'nonexistent/**/*.ts',
                outputStyle: 'fesm2022'
            });
            expect(ctx).toBeDefined();
        });

        it('should build with bundle option', async () => {
            const ctx = await Workflow.run(EsbuildBuildActivity, {
                src: 'nonexistent/**/*.ts',
                bundle: true,
                minify: true
            });
            expect(ctx).toBeDefined();
        });
    });

    describe('ComponentParseActivity via Workflow.run', () => {
        it('should parse components', async () => {
            const ctx = await Workflow.run(ComponentParseActivity, {
                src: 'src/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });

        it('should handle empty source', async () => {
            const ctx = await Workflow.run(ComponentParseActivity, {
                src: 'nonexistent/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });
    });

    describe('MetadataGenerateActivity via Workflow.run', () => {
        it('should generate metadata', async () => {
            const ctx = await Workflow.run(MetadataGenerateActivity, {
                src: 'src/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });

        it('should handle empty source', async () => {
            const ctx = await Workflow.run(MetadataGenerateActivity, {
                src: 'nonexistent/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });
    });

    describe('annotation-compile step', () => {
        // The step only re-printed files and never injected `ƿAnn` metadata, so it
        // was removed from every compiler template. The activity itself stays
        // exported as an explicitly callable tool.
        const templateNames = (create: () => any): string[] =>
            create().nodes.map((node: any) => node.type?.name ?? '');

        it('is not part of the default template', () => {
            expect(templateNames(createDefaultCompilerTemplate)).not.toContain('AnnotationCompileActivity');
        });

        it('is not part of the production template', () => {
            expect(templateNames(createProductionCompilerTemplate)).not.toContain('AnnotationCompileActivity');
        });

        it('is not part of the development template', () => {
            expect(templateNames(createDevelopmentCompilerTemplate)).not.toContain('AnnotationCompileActivity');
        });

        it('keeps class names in minified bundles instead', () => {
            // Replacing the injection step: esbuild keeps `type.name` when asked,
            // which is what ClassRef.className / pointcut matching read.
            expect(shouldKeepNames(true)).toBe(true);
            expect(shouldKeepNames(undefined, true)).toBe(true);
            expect(shouldKeepNames(false)).toBe(false);
            expect(shouldKeepNames(undefined)).toBe(false);
        });
    });
});
