import expect = require('expect');
import { 
    CompileActivity, ComponentCompileActivity, TestGenerateActivity,
    CompilerService, CompileOptions, DiagnosticInfo
} from '../src';

describe('Compiler', () => {
    
    describe('CompileActivity', () => {
        it('should create instance', () => {
            const activity = new CompileActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new CompileActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new CompileActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should accept custom options', () => {
            const activity = new CompileActivity();
            activity.src = 'lib/**/*.ts';
            activity.outDir = 'dist';
            activity.options = {
                target: 'es2017',
                declaration: true,
                sourceMap: true
            };

            expect(activity.src).toBe('lib/**/*.ts');
            expect(activity.outDir).toBe('dist');
            expect(activity.options.target).toBe('es2017');
        });

        it('should handle empty results', async () => {
            const activity = new CompileActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('ComponentCompileActivity', () => {
        it('should create instance', () => {
            const activity = new ComponentCompileActivity();
            expect(activity).toBeDefined();
        });

        it('should have default settings', () => {
            const activity = new ComponentCompileActivity();
            expect(activity.src).toBe('src/**/*.ts');
            expect(activity.outDir).toBe('lib');
            expect(activity.inlineStyles).toBe(false);
            expect(activity.viewEncapsulation).toBe('Emulated');
        });

        it('should accept custom view encapsulation', () => {
            const activity = new ComponentCompileActivity();
            activity.viewEncapsulation = 'ShadowDom';
            expect(activity.viewEncapsulation).toBe('ShadowDom');
        });
    });

    describe('TestGenerateActivity', () => {
        it('should create instance', () => {
            const activity = new TestGenerateActivity();
            expect(activity).toBeDefined();
        });

        it('should have default settings', () => {
            const activity = new TestGenerateActivity();
            expect(activity.src).toBe('src/**/*.ts');
            expect(activity.outputDir).toBe('test');
        });

        it('should accept custom output directory', () => {
            const activity = new TestGenerateActivity();
            activity.outputDir = '__tests__';
            expect(activity.outputDir).toBe('__tests__');
        });

        it('should handle empty source', async () => {
            const activity = new TestGenerateActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('CompilerService', () => {
        it('should create instance', () => {
            const service = new CompilerService();
            expect(service).toBeDefined();
        });

        it('should compile with default options', async () => {
            const service = new CompilerService();
            
            const result = await service.compile('nonexistent/**/*.ts', {});
            
            expect(result.success).toBe(true);
            expect(result.totalErrors).toBe(0);
        });

        it('should compile components with default options', async () => {
            const service = new CompilerService();
            
            const result = await service.compileComponents('nonexistent/**/*.ts', {});
            
            expect(result.success).toBe(true);
            expect(result.totalErrors).toBe(0);
        });

        it('should report duration', async () => {
            const service = new CompilerService();
            
            const result = await service.compile('nonexistent/**/*.ts');
            
            expect(result.duration).toBeDefined();
            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should accept compile options', async () => {
            const service = new CompilerService();
            const options: CompileOptions = {
                target: 'es2017',
                module: 'es2015',
                declaration: true,
                sourceMap: true,
                strict: true
            };
            
            const result = await service.compile('nonexistent/**/*.ts', options);
            
            expect(result.success).toBe(true);
        });
    });

    describe('CompileOptions', () => {
        it('should support es5 target', () => {
            const options: CompileOptions = {
                target: 'es5'
            };
            expect(options.target).toBe('es5');
        });

        it('should support es2020 target', () => {
            const options: CompileOptions = {
                target: 'es2020'
            };
            expect(options.target).toBe('es2020');
        });

        it('should support commonjs module', () => {
            const options: CompileOptions = {
                module: 'commonjs'
            };
            expect(options.module).toBe('commonjs');
        });

        it('should support es2020 module', () => {
            const options: CompileOptions = {
                module: 'es2020'
            };
            expect(options.module).toBe('es2020');
        });

        it('should support declaration option', () => {
            const options: CompileOptions = {
                declaration: true
            };
            expect(options.declaration).toBe(true);
        });

        it('should support sourceMap option', () => {
            const options: CompileOptions = {
                sourceMap: true
            };
            expect(options.sourceMap).toBe(true);
        });

        it('should support strict mode', () => {
            const options: CompileOptions = {
                strict: true
            };
            expect(options.strict).toBe(true);
        });
    });

    describe('DiagnosticInfo', () => {
        it('should create diagnostic info', () => {
            const diag: DiagnosticInfo = {
                file: 'test.ts',
                line: 10,
                character: 5,
                message: 'Test error',
                severity: 'error',
                code: 1234
            };
            
            expect(diag.file).toBe('test.ts');
            expect(diag.line).toBe(10);
            expect(diag.severity).toBe('error');
            expect(diag.code).toBe(1234);
        });

        it('should support warning severity', () => {
            const diag: DiagnosticInfo = {
                file: 'test.ts',
                line: 10,
                character: 5,
                message: 'Test warning',
                severity: 'warning',
                code: 5678
            };
            
            expect(diag.severity).toBe('warning');
        });

        it('should support info severity', () => {
            const diag: DiagnosticInfo = {
                file: 'test.ts',
                line: 10,
                character: 5,
                message: 'Test info',
                severity: 'info',
                code: 9999
            };
            
            expect(diag.severity).toBe('info');
        });
    });
});