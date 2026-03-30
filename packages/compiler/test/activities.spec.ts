import expect = require('expect');
import {
    SourceFilesActivity,
    EsbuildBuildActivity,
    DeclarationGenerateActivity,
    ComponentParseActivity,
    MetadataGenerateActivity,
    CompileActivity,
    ComponentCompileActivity,
    TestGenerateActivity,
    EsbuildCompileActivity,
    EsbuildComponentCompileOptions,
    EsbuildComponentCompilerActivity
} from '../src';

describe('Reusable Activities', () => {

    describe('SourceFilesActivity', () => {
        it('should create instance', () => {
            const activity = new SourceFilesActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new SourceFilesActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default exclude patterns', () => {
            const activity = new SourceFilesActivity();
            expect(activity.exclude).toContain('node_modules');
            expect(activity.exclude).toContain('**/*.spec.ts');
        });

        it('should handle empty source', async () => {
            const activity = new SourceFilesActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.count).toBe(0);
        });
    });

    describe('EsbuildBuildActivity', () => {
        it('should create instance', () => {
            const activity = new EsbuildBuildActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new EsbuildBuildActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new EsbuildBuildActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should have default target', () => {
            const activity = new EsbuildBuildActivity();
            expect(activity.target).toBe('es2020');
        });

        it('should have default format', () => {
            const activity = new EsbuildBuildActivity();
            expect(activity.format).toBe('cjs');
        });

        it('should have default platform', () => {
            const activity = new EsbuildBuildActivity();
            expect(activity.platform).toBe('node');
        });

        it('should handle empty source', async () => {
            const activity = new EsbuildBuildActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('DeclarationGenerateActivity', () => {
        it('should create instance', () => {
            const activity = new DeclarationGenerateActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new DeclarationGenerateActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new DeclarationGenerateActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should handle empty source', async () => {
            const activity = new DeclarationGenerateActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
        });
    });

    describe('ComponentParseActivity', () => {
        it('should create instance', () => {
            const activity = new ComponentParseActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new ComponentParseActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have inlineTemplate default false', () => {
            const activity = new ComponentParseActivity();
            expect(activity.inlineTemplate).toBe(false);
        });

        it('should handle empty source', async () => {
            const activity = new ComponentParseActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('MetadataGenerateActivity', () => {
        it('should create instance', () => {
            const activity = new MetadataGenerateActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new MetadataGenerateActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new MetadataGenerateActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should handle empty source', async () => {
            const activity = new MetadataGenerateActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
        });
    });

    describe('EsbuildComponentCompilerActivity (Composite)', () => {
        it('should create instance', () => {
            const activity = new EsbuildComponentCompilerActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new EsbuildComponentCompilerActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new EsbuildComponentCompilerActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should have default outputStyle', () => {
            const activity = new EsbuildComponentCompilerActivity();
            expect(activity.outputStyle).toBe('esm2020');
        });

        it('should have generateMetadata default true', () => {
            const activity = new EsbuildComponentCompilerActivity();
            expect(activity.generateMetadata).toBe(true);
        });

        it('should handle empty source', async () => {
            const activity = new EsbuildComponentCompilerActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
        });
    });
});

describe('Backward Compatible Exports', () => {

    describe('CompileActivity', () => {
        it('should be exported and createable', () => {
            const activity = new CompileActivity();
            expect(activity).toBeDefined();
            expect(activity.src).toBe('src/**/*.ts');
        });
    });

    describe('ComponentCompileActivity', () => {
        it('should be exported and createable', () => {
            const activity = new ComponentCompileActivity();
            expect(activity).toBeDefined();
            expect(activity.src).toBe('src/**/*.ts');
        });
    });

    describe('TestGenerateActivity', () => {
        it('should be exported and createable', () => {
            const activity = new TestGenerateActivity();
            expect(activity).toBeDefined();
            expect(activity.src).toBe('src/**/*.ts');
        });
    });

    describe('EsbuildCompileActivity', () => {
        it('should be exported and createable', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity).toBeDefined();
            expect(activity.src).toBe('src/**/*.ts');
        });
    });

    describe('EsbuildComponentCompileOptions', () => {
        it('should support flatModuleOutFile option', () => {
            const options: EsbuildComponentCompileOptions = {
                flatModuleOutFile: 'index.metadata.json'
            };
            expect(options.flatModuleOutFile).toBe('index.metadata.json');
        });

        it('should support generateMetadata option', () => {
            const options: EsbuildComponentCompileOptions = {
                generateMetadata: false
            };
            expect(options.generateMetadata).toBe(false);
        });
    });
});
