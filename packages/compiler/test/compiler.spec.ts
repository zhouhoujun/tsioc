import expect = require('expect');
import { ApplicationContext } from '@tsdi/core';
import { Workflow } from '@tsdi/activities';
import {
    CompilerActivity,
    SourceFilesActivity,
    EsbuildBuildActivity,
    ComponentParseActivity,
    MetadataGenerateActivity,
    AnnotationCompileActivity
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

    describe('AnnotationCompileActivity via Workflow.run', () => {
        it('should compile annotations', async () => {
            const ctx = await Workflow.run(AnnotationCompileActivity, {
                src: 'src/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });

        it('should handle empty source', async () => {
            const ctx = await Workflow.run(AnnotationCompileActivity, {
                src: 'nonexistent/**/*.ts'
            });
            expect(ctx).toBeDefined();
        });
    });
});
