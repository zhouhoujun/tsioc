import expect = require('expect');
import {
    CompileActivity, ComponentCompileActivity, TestGenerateActivity,
    CompileOptions, DiagnosticInfo,
    EsbuildCompileActivity, EsbuildCompileOptions, EsbuildCompileResult,
    EsbuildComponentCompileActivity, EsbuildComponentCompileOptions,
    ComponentCompileInfo, AngularOutputStyle
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

    describe('EsbuildCompileActivity', () => {
        it('should create instance', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should have default target', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.target).toBe('es2020');
        });

        it('should have default format', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.format).toBe('cjs');
        });

        it('should have default platform', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.platform).toBe('node');
        });

        it('should have default bundle setting', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.bundle).toBe(false);
        });

        it('should have default minify setting', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.minify).toBe(false);
        });

        it('should have default sourcemap setting', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.sourcemap).toBe(true);
        });

        it('should have default declaration setting', () => {
            const activity = new EsbuildCompileActivity();
            expect(activity.declaration).toBe(true);
        });

        it('should accept custom options', () => {
            const activity = new EsbuildCompileActivity();
            activity.src = 'lib/**/*.ts';
            activity.outDir = 'dist';
            activity.target = 'es2017';
            activity.format = 'esm';
            activity.platform = 'browser';
            activity.bundle = true;
            activity.minify = true;
            activity.entryPoint = 'src/index.ts';
            activity.outfile = 'bundle.js';
            activity.external = ['lodash', 'rxjs'];

            expect(activity.src).toBe('lib/**/*.ts');
            expect(activity.outDir).toBe('dist');
            expect(activity.target).toBe('es2017');
            expect(activity.format).toBe('esm');
            expect(activity.platform).toBe('browser');
            expect(activity.bundle).toBe(true);
            expect(activity.minify).toBe(true);
            expect(activity.entryPoint).toBe('src/index.ts');
            expect(activity.outfile).toBe('bundle.js');
            expect(activity.external).toEqual(['lodash', 'rxjs']);
        });

        it('should handle empty source', async () => {
            const activity = new EsbuildCompileActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('EsbuildCompileOptions', () => {
        it('should support target option', () => {
            const options: EsbuildCompileOptions = {
                target: 'es2020'
            };
            expect(options.target).toBe('es2020');
        });

        it('should support format option', () => {
            const options: EsbuildCompileOptions = {
                format: 'esm'
            };
            expect(options.format).toBe('esm');
        });

        it('should support platform option', () => {
            const options: EsbuildCompileOptions = {
                platform: 'browser'
            };
            expect(options.platform).toBe('browser');
        });

        it('should support bundle option', () => {
            const options: EsbuildCompileOptions = {
                bundle: true
            };
            expect(options.bundle).toBe(true);
        });

        it('should support minify option', () => {
            const options: EsbuildCompileOptions = {
                minify: true
            };
            expect(options.minify).toBe(true);
        });

        it('should support sourcemap option', () => {
            const options: EsbuildCompileOptions = {
                sourcemap: true
            };
            expect(options.sourcemap).toBe(true);
        });

        it('should support external option', () => {
            const options: EsbuildCompileOptions = {
                external: ['lodash', 'rxjs']
            };
            expect(options.external).toEqual(['lodash', 'rxjs']);
        });

        it('should support define option', () => {
            const options: EsbuildCompileOptions = {
                define: { 'process.env.NODE_ENV': '"production"' }
            };
            expect(options.define).toEqual({ 'process.env.NODE_ENV': '"production"' });
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

    describe('EsbuildComponentCompileActivity', () => {
        it('should create instance', () => {
            const activity = new EsbuildComponentCompileActivity();
            expect(activity).toBeDefined();
        });

        it('should have default src pattern', () => {
            const activity = new EsbuildComponentCompileActivity();
            expect(activity.src).toBe('src/**/*.ts');
        });

        it('should have default outDir', () => {
            const activity = new EsbuildComponentCompileActivity();
            expect(activity.outDir).toBe('lib');
        });

        it('should have default outputStyle', () => {
            const activity = new EsbuildComponentCompileActivity();
            expect(activity.outputStyle).toBe('esm2020');
        });

        it('should accept custom outputStyle', () => {
            const activity = new EsbuildComponentCompileActivity();
            activity.outputStyle = 'esm2025';
            expect(activity.outputStyle).toBe('esm2025');
        });

        it('should accept fesm2025 outputStyle', () => {
            const activity = new EsbuildComponentCompileActivity();
            activity.outputStyle = 'fesm2025';
            expect(activity.outputStyle).toBe('fesm2025');
        });

        it('should have generateMetadata default true', () => {
            const activity = new EsbuildComponentCompileActivity();
            expect(activity.generateMetadata).toBe(true);
        });

        it('should accept custom options', () => {
            const activity = new EsbuildComponentCompileActivity();
            activity.src = 'lib/**/*.ts';
            activity.outDir = 'dist';
            activity.outputStyle = 'fesm2025';
            activity.generateMetadata = false;
            activity.inlineStyles = true;
            activity.inlineTemplate = true;

            expect(activity.src).toBe('lib/**/*.ts');
            expect(activity.outDir).toBe('dist');
            expect(activity.outputStyle).toBe('fesm2025');
            expect(activity.generateMetadata).toBe(false);
            expect(activity.inlineStyles).toBe(true);
            expect(activity.inlineTemplate).toBe(true);
        });

        it('should handle empty source', async () => {
            const activity = new EsbuildComponentCompileActivity();
            activity.src = 'nonexistent/**/*.ts';
            
            const result = await activity.execute({});
            
            expect(result.success).toBe(true);
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('EsbuildComponentCompileOptions', () => {
        it('should support esm2020 output style', () => {
            const options: EsbuildComponentCompileOptions = {
                outDir: 'dist'
            };
            expect(options.outDir).toBe('dist');
        });

        it('should support target option', () => {
            const options: EsbuildComponentCompileOptions = {
                target: 'es2020'
            };
            expect(options.target).toBe('es2020');
        });

        it('should support format option', () => {
            const options: EsbuildComponentCompileOptions = {
                format: 'esm'
            };
            expect(options.format).toBe('esm');
        });

        it('should support bundle option', () => {
            const options: EsbuildComponentCompileOptions = {
                bundle: true
            };
            expect(options.bundle).toBe(true);
        });

        it('should support minify option', () => {
            const options: EsbuildComponentCompileOptions = {
                minify: true
            };
            expect(options.minify).toBe(true);
        });

        it('should support generateMetadata option', () => {
            const options: EsbuildComponentCompileOptions = {
                generateMetadata: false
            };
            expect(options.generateMetadata).toBe(false);
        });

        it('should support flatModuleOutFile option', () => {
            const options: EsbuildComponentCompileOptions = {
                flatModuleOutFile: 'index.metadata.json'
            };
            expect(options.flatModuleOutFile).toBe('index.metadata.json');
        });
    });

    describe('ComponentCompileInfo', () => {
        it('should create component info', () => {
            const info: ComponentCompileInfo = {
                name: 'MyComponent',
                decoratorType: 'Component',
                selector: 'app-my',
                templateUrl: './my.component.html',
                styleUrls: ['./my.component.css'],
                inputs: ['title'],
                outputs: ['change']
            };
            
            expect(info.name).toBe('MyComponent');
            expect(info.decoratorType).toBe('Component');
            expect(info.selector).toBe('app-my');
            expect(info.templateUrl).toBe('./my.component.html');
            expect(info.styleUrls).toHaveLength(1);
            expect(info.inputs).toContain('title');
            expect(info.outputs).toContain('change');
        });

        it('should create directive info', () => {
            const info: ComponentCompileInfo = {
                name: 'MyDirective',
                decoratorType: 'Directive',
                selector: '[myAttr]'
            };
            
            expect(info.decoratorType).toBe('Directive');
            expect(info.selector).toBe('[myAttr]');
        });

        it('should create pipe info', () => {
            const info: ComponentCompileInfo = {
                name: 'MyPipe',
                decoratorType: 'Pipe',
                inputs: ['value']
            };
            
            expect(info.decoratorType).toBe('Pipe');
        });

        it('should create service info', () => {
            const info: ComponentCompileInfo = {
                name: 'MyService',
                decoratorType: 'Injectable'
            };
            
            expect(info.decoratorType).toBe('Injectable');
        });
    });

    describe('AngularOutputStyle', () => {
        it('should create output style dirs for esm2020', () => {
            const activity = new EsbuildComponentCompileActivity();
            (activity as any).outputStyle = 'esm2020';
            const dirs = (activity as any).getAngularOutputDirs('dist');
            
            expect(dirs.esm).toBe('dist/esm2020');
            expect(dirs.fesm).toBe('dist/fesm2020');
            expect(dirs.dts).toBe('dist/esm2020');
            expect(dirs.metadata).toBe('dist/esm2020');
        });

        it('should create output style dirs for fesm2025', () => {
            const activity = new EsbuildComponentCompileActivity();
            (activity as any).outputStyle = 'fesm2025';
            const dirs = (activity as any).getAngularOutputDirs('dist');
            
            expect(dirs.esm).toBe('dist/esm2025');
            expect(dirs.fesm).toBe('dist/fesm2025');
        });
    });
});