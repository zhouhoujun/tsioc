import expect = require('expect');
import * as fs from 'fs';
import * as path from 'path';
import { 
    TsConfigReader, 
    RuntimeEnvironment, 
    MergedCompilerOptions,
    CompilerTemplateBuilder,
    CompilerTemplate,
    CompilerTemplateExecutor,
    CompilerDirectives,
    createDefaultCompilerTemplate,
    createProductionCompilerTemplate,
    createDevelopmentCompilerTemplate
} from '../src';

describe('TsConfigReader', () => {
    let reader: TsConfigReader;
    const testTsconfigPath = path.join(__dirname, 'fixtures', 'test-tsconfig.json');
    const fixturesDir = path.join(__dirname, 'fixtures');

    before(() => {
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true });
        }
    });

    after(() => {
        if (fs.existsSync(testTsconfigPath)) {
            fs.unlinkSync(testTsconfigPath);
        }
    });

    describe('read', () => {
        it('should read tsconfig.json from current directory', () => {
            reader = new TsConfigReader();
            const config = reader.read();
            
            expect(config).toBeDefined();
            expect(config.compilerOptions).toBeDefined();
        });

        it('should read from specified path', () => {
            const testConfig = {
                compilerOptions: {
                    target: 'es2020',
                    module: 'commonjs',
                    outDir: './dist',
                    declaration: true
                },
                include: ['src/**/*.ts'],
                exclude: ['node_modules']
            };

            fs.writeFileSync(testTsconfigPath, JSON.stringify(testConfig, null, 2));
            
            reader = new TsConfigReader(testTsconfigPath);
            const config = reader.read();

            expect(config.compilerOptions.target).toBe('es2020');
            expect(config.compilerOptions.outDir).toBe('./dist');
        });

        it('should throw error if tsconfig not found', () => {
            expect(() => {
                new TsConfigReader('/nonexistent/path/tsconfig.json').read();
            }).toThrow();
        });
    });

    describe('getCompilerOptions', () => {
        it('should return compiler options', () => {
            reader = new TsConfigReader();
            const options = reader.getCompilerOptions();
            
            expect(options).toBeDefined();
        });
    });

    describe('getIncludePatterns', () => {
        it('should return include patterns', () => {
            reader = new TsConfigReader();
            const patterns = reader.getIncludePatterns();
            
            expect(Array.isArray(patterns)).toBe(true);
            expect(patterns.length).toBeGreaterThan(0);
        });
    });

    describe('getExcludePatterns', () => {
        it('should return exclude patterns', () => {
            reader = new TsConfigReader();
            const patterns = reader.getExcludePatterns();
            
            expect(Array.isArray(patterns)).toBe(true);
        });
    });

    describe('mergeWithRuntime', () => {
        it('should merge with empty runtime environment', () => {
            reader = new TsConfigReader();
            const merged = reader.mergeWithRuntime({});

            expect(merged.src).toBeDefined();
            expect(merged.outDir).toBeDefined();
            expect(merged.target).toBeDefined();
        });

        it('should merge with runtime environment', () => {
            reader = new TsConfigReader();
            const runtime: RuntimeEnvironment = {
                platform: 'browser',
                mode: 'production',
                bundle: true,
                minify: true
            };

            const merged = reader.mergeWithRuntime(runtime);

            expect(merged.platform).toBe('browser');
            expect(merged.bundle).toBe(true);
            expect(merged.minify).toBe(true);
        });

        it('should override tsconfig options with runtime options', () => {
            reader = new TsConfigReader();
            const runtime: RuntimeEnvironment = {
                target: 'es2017',
                module: 'cjs',
                declaration: false
            };

            const merged = reader.mergeWithRuntime(runtime);

            expect(merged.target).toBe('es2017');
            expect(merged.format).toBe('cjs');
            expect(merged.declaration).toBe(false);
        });
    });

    describe('normalizeTarget', () => {
        it('should normalize target string', () => {
            reader = new TsConfigReader();
            const merged = reader.mergeWithRuntime({ target: 'es2022' });
            
            expect(merged.target).toBe('es2022');
        });
    });

    describe('normalizeModule', () => {
        it('should normalize module kind', () => {
            reader = new TsConfigReader();
            const merged = reader.mergeWithRuntime({ module: 'esm' });
            
            expect(merged.format).toBe('esm');
        });
    });

    describe('static methods', () => {
        it('should create reader from path', () => {
            const r = TsConfigReader.fromPath('tsconfig.json');
            expect(r).toBeInstanceOf(TsConfigReader);
        });

        it('should create reader from cwd', () => {
            const r = TsConfigReader.fromCwd();
            expect(r).toBeInstanceOf(TsConfigReader);
        });
    });
});

describe('CompilerTemplateBuilder', () => {
    describe('create', () => {
        it('should create a template builder', () => {
            const builder = CompilerTemplateBuilder.create('Test Template');
            expect(builder).toBeDefined();
        });
    });

    describe('builder methods', () => {
        it('should build a template with all options', () => {
            const template = CompilerTemplateBuilder
                .create('Complete Template')
                .id('template-001')
                .description('A complete template')
                .version('1.0.0')
                .runtime({ platform: 'node', mode: 'production' })
                .defaultOptions({ outDir: 'dist', target: 'es2020' })
                .build();

            expect(template.id).toBe('template-001');
            expect(template.name).toBe('Complete Template');
            expect(template.description).toBe('A complete template');
            expect(template.version).toBe('1.0.0');
            expect(template.runtime?.platform).toBe('node');
            expect(template.defaultOptions?.outDir).toBe('dist');
        });
    });

    describe('addActivity', () => {
        it('should add activity to template', () => {
            class TestActivity {
                async execute() { return { success: true }; }
            }

            const template = CompilerTemplateBuilder
                .create('Test')
                .addActivity(TestActivity as any, { testProp: 'value' })
                .build();

            expect(template.nodes.length).toBe(1);
            expect(template.nodes[0].type).toBe(TestActivity);
            expect(template.nodes[0].config?.testProp).toBe('value');
        });
    });

    describe('addIfActivity', () => {
        it('should add conditional activity', () => {
            class TestActivity {
                async execute() { return { success: true }; }
            }

            const template = CompilerTemplateBuilder
                .create('Conditional Test')
                .addIfActivity(
                    (ctx) => ctx.options.declaration === true,
                    TestActivity as any
                )
                .build();

            expect(template.nodes.length).toBe(1);
            expect(template.nodes[0].directive?.if).toBeDefined();
        });
    });

    describe('addUnlessActivity', () => {
        it('should add unless activity', () => {
            class TestActivity {
                async execute() { return { success: true }; }
            }

            const template = CompilerTemplateBuilder
                .create('Unless Test')
                .addUnlessActivity(
                    (ctx) => ctx.options.bundle === true,
                    TestActivity as any
                )
                .build();

            expect(template.nodes.length).toBe(1);
            expect(template.nodes[0].directive?.unless).toBeDefined();
        });
    });
});

describe('CompilerDirectives', () => {
    let mockContext: any;

    beforeEach(() => {
        mockContext = {
            options: {
                declaration: true,
                bundle: false,
                minify: false,
                platform: 'node',
                format: 'cjs'
            },
            runtime: {
                mode: 'development'
            },
            files: ['test.ts']
        };
    });

    it('should evaluate ifDeclaration', () => {
        expect(CompilerDirectives.ifDeclaration(mockContext)).toBe(true);
        mockContext.options.declaration = false;
        expect(CompilerDirectives.ifDeclaration(mockContext)).toBe(false);
    });

    it('should evaluate ifNoDeclaration', () => {
        expect(CompilerDirectives.ifNoDeclaration(mockContext)).toBe(false);
        mockContext.options.declaration = false;
        expect(CompilerDirectives.ifNoDeclaration(mockContext)).toBe(true);
    });

    it('should evaluate ifBundle', () => {
        expect(CompilerDirectives.ifBundle(mockContext)).toBe(false);
        mockContext.options.bundle = true;
        expect(CompilerDirectives.ifBundle(mockContext)).toBe(true);
    });

    it('should evaluate ifProduction', () => {
        expect(CompilerDirectives.ifProduction(mockContext)).toBe(false);
        mockContext.runtime.mode = 'production';
        expect(CompilerDirectives.ifProduction(mockContext)).toBe(true);
    });

    it('should evaluate ifDevelopment', () => {
        expect(CompilerDirectives.ifDevelopment(mockContext)).toBe(true);
        mockContext.runtime.mode = 'production';
        expect(CompilerDirectives.ifDevelopment(mockContext)).toBe(false);
    });

    it('should evaluate ifBrowser', () => {
        expect(CompilerDirectives.ifBrowser(mockContext)).toBe(false);
        mockContext.options.platform = 'browser';
        expect(CompilerDirectives.ifBrowser(mockContext)).toBe(true);
    });

    it('should evaluate ifNode', () => {
        expect(CompilerDirectives.ifNode(mockContext)).toBe(true);
        mockContext.options.platform = 'browser';
        expect(CompilerDirectives.ifNode(mockContext)).toBe(false);
    });

    it('should evaluate ifESM', () => {
        expect(CompilerDirectives.ifESM(mockContext)).toBe(false);
        mockContext.options.format = 'esm';
        expect(CompilerDirectives.ifESM(mockContext)).toBe(true);
    });

    it('should evaluate ifCJS', () => {
        expect(CompilerDirectives.ifCJS(mockContext)).toBe(true);
        mockContext.options.format = 'esm';
        expect(CompilerDirectives.ifCJS(mockContext)).toBe(false);
    });

    it('should evaluate ifHasComponents', () => {
        expect(CompilerDirectives.ifHasComponents(mockContext)).toBe(true);
        mockContext.files = [];
        expect(CompilerDirectives.ifHasComponents(mockContext)).toBe(false);
    });
});

describe('CompilerTemplateExecutor', () => {
    let executor: CompilerTemplateExecutor;

    beforeEach(() => {
        executor = new CompilerTemplateExecutor();
    });

    describe('execute', () => {
        it('should execute empty template', async () => {
            const template: CompilerTemplate = {
                name: 'Empty Template',
                nodes: []
            };

            const result = await executor.execute(template);

            expect(result.success).toBe(true);
            expect(result.executedNodes).toEqual([]);
            expect(result.skippedNodes).toEqual([]);
        });

        it('should execute template with runtime', async () => {
            const template = CompilerTemplateBuilder
                .create('Runtime Test')
                .build();

            const result = await executor.execute(template, { platform: 'node' });

            expect(result.success).toBe(true);
        });

        it('should track executed nodes', async () => {
            const template = CompilerTemplateBuilder
                .create('Tracking Test')
                .addActivity(
                    class TestActivity {
                        async execute() { return { success: true }; }
                    } as any,
                    { name: 'test-activity' }
                )
                .build();

            const result = await executor.execute(template);

            expect(result.executedNodes.length).toBe(1);
            expect(result.executedNodes[0]).toBe('test-activity');
        });

        it('should track skipped nodes based on directive', async () => {
            const template = CompilerTemplateBuilder
                .create('Skip Test')
                .addActivity(
                    class SkipActivity {
                        async execute() { return { success: true }; }
                    } as any,
                    { name: 'skip-activity' },
                    { if: (ctx) => false }
                )
                .build();

            const result = await executor.execute(template);

            expect(result.skippedNodes.length).toBe(1);
            expect(result.skippedNodes[0]).toBe('skip-activity');
        });
    });

    describe('getMergedOptions', () => {
        it('should return merged options', () => {
            const options = executor.getMergedOptions();

            expect(options).toBeDefined();
            expect(options.src).toBeDefined();
            expect(options.outDir).toBeDefined();
        });

        it('should merge with runtime', () => {
            const options = executor.getMergedOptions({ platform: 'browser', bundle: true });

            expect(options.platform).toBe('browser');
            expect(options.bundle).toBe(true);
        });
    });

    describe('setTsConfigPath', () => {
        it('should set tsconfig path', () => {
            executor.setTsConfigPath('custom-tsconfig.json');
            const reader = executor.getTsConfigReader();
            expect(reader).toBeDefined();
        });
    });
});

describe('Default Templates', () => {
    describe('createDefaultCompilerTemplate', () => {
        it('should create default template', () => {
            const template = createDefaultCompilerTemplate();

            expect(template.name).toBe('Default Compiler');
            expect(template.nodes.length).toBeGreaterThan(0);
        });

        it('should create template with custom name', () => {
            const template = createDefaultCompilerTemplate('Custom Name');

            expect(template.name).toBe('Custom Name');
        });
    });

    describe('createProductionCompilerTemplate', () => {
        it('should create production template', () => {
            const template = createProductionCompilerTemplate();

            expect(template.name).toBe('Production Compiler');
            expect(template.runtime?.mode).toBe('production');
            expect(template.runtime?.minify).toBe(true);
            expect(template.runtime?.bundle).toBe(true);
        });
    });

    describe('createDevelopmentCompilerTemplate', () => {
        it('should create development template', () => {
            const template = createDevelopmentCompilerTemplate();

            expect(template.name).toBe('Development Compiler');
            expect(template.runtime?.mode).toBe('development');
            expect(template.runtime?.sourcemap).toBe(true);
        });
    });
});

describe('CompilerActivity with Template', () => {
    describe('template integration', () => {
        it('should use template when provided', async () => {
            const { CompilerActivity } = await import('../src/CompilerActivity');
            const activity = new CompilerActivity();

            const template = CompilerTemplateBuilder
                .create('Integration Test')
                .build();

            activity.setTemplate(template);
            expect(activity.template).toBeDefined();
        });

        it('should set tsconfig path', async () => {
            const { CompilerActivity } = await import('../src/CompilerActivity');
            const activity = new CompilerActivity();

            activity.setTsConfigPath('tsconfig.json');
            expect(activity.tsconfig).toBe('tsconfig.json');
        });

        it('should get merged options', async () => {
            const { CompilerActivity } = await import('../src/CompilerActivity');
            const activity = new CompilerActivity();

            const options = activity.getMergedOptions();
            expect(options).toBeDefined();
        });
    });
});