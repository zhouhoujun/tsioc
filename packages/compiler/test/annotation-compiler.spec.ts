import expect = require('expect');
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import {
    MetadataGenerator,
    ClassMetadata,
    DecoratorMetadata,
    MemberMetadata,
    ModuleMetadata,
    MetadataCompilerOptions
} from '../src/activities/MetadataGenerator';
import { AnnotationCompileActivity, AnnotationCompileOptions } from '../src/activities/AnnotationCompileActivity';

describe('MetadataGenerator', () => {
    describe('constructor', () => {
        it('should create MetadataGenerator with default options', () => {
            const generator = new MetadataGenerator();
            expect(generator).toBeDefined();
        });

        it('should accept custom options', () => {
            const options: MetadataCompilerOptions = {
                version: 5,
                includeClassMetadata: false,
                includeDecoratorArgs: false,
                flattenDeclarations: false
            };
            const generator = new MetadataGenerator(options);
            expect(generator).toBeDefined();
        });
    });

    describe('compile', () => {
        it('should extract class metadata from source file', () => {
            const sourceCode = `
                @Injectable()
                class TestService {
                    @Autowired()
                    dependency: DependencyService;
                    
                    doWork(): void {}
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata).toBeDefined();
            expect(metadata.length).toBeGreaterThan(0);
            expect(metadata[0].name).toBe('TestService');
        });

        it('should skip anonymous classes in compile (requires node.name)', () => {
            const sourceCode = `class {}`;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata).toBeDefined();
            expect(metadata.length).toBe(0);
        });

        it('should extract decorators', () => {
            const sourceCode = `
                @Injectable({ providedIn: 'root' })
                class DecoratedService {}
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator({ includeDecoratorArgs: true });
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].decorators).toBeDefined();
            expect(metadata[0].decorators!.length).toBeGreaterThan(0);
            expect(metadata[0].decorators![0].name).toBe('Injectable');
        });

        it('should extract constructor parameters', () => {
            const sourceCode = `
                class ServiceWithCtor {
                    constructor(private logger: Logger, config: Config) {}
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].members).toBeDefined();
            expect(metadata[0].members!['__ctor__']).toBeDefined();
            expect(metadata[0].members!['__ctor__'][0].parameters).toBeDefined();
            expect(metadata[0].members!['__ctor__'][0].parameters!.length).toBe(2);
        });

        it('should extract method decorators', () => {
            const sourceCode = `
                class ServiceWithMethods {
                    @Before('execution(* doWork)')
                    doWork(): void {}
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].members).toBeDefined();
            expect(metadata[0].members!['doWork']).toBeDefined();
            expect(metadata[0].members!['doWork'][0].decorators).toBeDefined();
            expect(metadata[0].members!['doWork'][0].decorators![0].name).toBe('Before');
        });
    });

    describe('compileAnnotation', () => {
        it('should compile annotation from class declaration', () => {
            const sourceCode = `
                abstract class AbstractService {
                    constructor(private logger: Logger) {}
                    abstract doWork(): void;
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            let result: any = null;
            
            ts.forEachChild(sourceFile, (node) => {
                if (ts.isClassDeclaration(node)) {
                    result = generator.compileAnnotation(node, sourceFile);
                }
            });
            
            expect(result).toBeDefined();
            expect(result.name).toBe('AbstractService');
            expect(result.abstract).toBe(true);
            expect(result.methods).toBeDefined();
            expect(result.methods!['constructor']).toBeDefined();
        });

        it('should extract method parameters', () => {
            const sourceCode = `
                class MethodService {
                    doSomething(arg1: string, arg2: number): boolean {
                        return true;
                    }
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            let result: any = null;
            
            ts.forEachChild(sourceFile, (node) => {
                if (ts.isClassDeclaration(node)) {
                    result = generator.compileAnnotation(node, sourceFile);
                }
            });
            
            expect(result.methods!['doSomething']).toBeDefined();
            expect(result.methods!['doSomething'].params).toHaveLength(2);
            expect(result.methods!['doSomething'].returnType).toBeDefined();
        });
    });

    describe('writeMetadataFile', () => {
        it('should write module metadata to file', () => {
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const outputPath = path.join(tempDir, 'metadata.json');
            const moduleMeta: ModuleMetadata = {
                __symbolic: 'module',
                version: 4,
                metadata: {
                    TestClass: {
                        __symbolic: 'class',
                        name: 'TestClass',
                        decorators: [{ name: 'Injectable' }]
                    }
                },
                origins: {
                    TestClass: './test'
                }
            };
            
            const generator = new MetadataGenerator();
            generator.writeMetadataFile(moduleMeta, outputPath);
            
            expect(fs.existsSync(outputPath)).toBe(true);
            
            const written = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            expect(written.__symbolic).toBe('module');
            expect(written.metadata.TestClass).toBeDefined();
            
            fs.unlinkSync(outputPath);
            fs.rmdirSync(tempDir);
        });
    });

    describe('decorator parsing', () => {
        it('should parse simple decorator without arguments', () => {
            const sourceCode = `@Injectable class SimpleDecorated {}`;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].decorators).toHaveLength(1);
            expect(metadata[0].decorators![0].name).toBe('Injectable');
            expect(metadata[0].decorators![0].arguments).toBeUndefined();
        });

        it('should parse decorator with object arguments', () => {
            const sourceCode = `@Component({ selector: 'app-test', template: '<div></div>' }) class TestComp {}`;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator({ includeDecoratorArgs: true });
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].decorators![0].name).toBe('Component');
            expect(metadata[0].decorators![0].arguments).toBeDefined();
        });

        it('should parse decorator with array arguments', () => {
            const sourceCode = `@Providers([ServiceA, ServiceB]) class TestClass {}`;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator({ includeDecoratorArgs: true });
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].decorators![0].name).toBe('Providers');
            expect(metadata[0].decorators![0].arguments).toBeDefined();
        });
    });

    describe('property decorators', () => {
        it('should extract property decorators', () => {
            const sourceCode = `
                class PropertyClass {
                    @Inject()
                    private service: Service;
                    
                    @Autowired('optional')
                    config: Config;
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            expect(metadata[0].members!['service']).toBeDefined();
            expect(metadata[0].members!['service'][0].decorators).toHaveLength(1);
            expect(metadata[0].members!['service'][0].decorators![0].name).toBe('Inject');
            
            expect(metadata[0].members!['config']).toBeDefined();
            expect(metadata[0].members!['config'][0].decorators![0].name).toBe('Autowired');
        });
    });

    describe('parameter decorators', () => {
        it('should extract constructor parameter decorators', () => {
            const sourceCode = `
                class ParamClass {
                    constructor(
                        @Inject() service: Service,
                        @Optional() config?: Config
                    ) {}
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const generator = new MetadataGenerator();
            const metadata = generator.compile(sourceFile, {} as ts.TypeChecker);
            
            const ctorParams = metadata[0].members!['__ctor__'][0].parameters;
            expect(ctorParams).toHaveLength(2);
            expect(ctorParams![0].decorators![0].name).toBe('Inject');
            expect(ctorParams![1].optional).toBe(true);
        });
    });
});

describe('AnnotationCompileActivity', () => {
    describe('constructor', () => {
        it('should create AnnotationCompileActivity with default values', () => {
            const activity = new AnnotationCompileActivity();
            expect(activity).toBeDefined();
            expect(activity.src).toBe('src/**/*.ts');
            expect(activity.outDir).toBe('lib');
        });

        it('should accept custom attributes', () => {
            const activity = Object.assign(new AnnotationCompileActivity(), {
                src: 'custom/**/*.ts',
                outDir: 'custom-out',
                exclude: ['node_modules']
            } as Partial<AnnotationCompileActivity>);
            
            expect(activity.src).toBe('custom/**/*.ts');
            expect(activity.outDir).toBe('custom-out');
        });
    });

    describe('execute', () => {
        it('should return success result with metadata', async () => {
            const tempDir = path.join(__dirname, 'temp-anno-test');
            const testFile = path.join(tempDir, 'test.ts');
            
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            fs.writeFileSync(testFile, `
                @Injectable()
                class TestService {
                    doWork(): void {}
                }
            `);
            
            const activity = Object.assign(new AnnotationCompileActivity(), {
                src: testFile,
                outDir: path.join(tempDir, 'out'),
                exclude: []
            } as Partial<AnnotationCompileActivity>);
            
            const result = await activity.execute({} as any);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            
            // Cleanup
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
            const outDir = path.join(tempDir, 'out');
            if (fs.existsSync(outDir)) {
                const rimraf = (dir: string) => {
                    if (fs.existsSync(dir)) {
                        const entries = fs.readdirSync(dir);
                        for (const entry of entries) {
                            const entryPath = path.join(dir, entry);
                            if (fs.statSync(entryPath).isDirectory()) {
                                rimraf(entryPath);
                            } else {
                                fs.unlinkSync(entryPath);
                            }
                        }
                        fs.rmdirSync(dir);
                    }
                };
                rimraf(outDir);
            }
            fs.rmdirSync(tempDir);
        });

        it('should return empty results for non-matching patterns', async () => {
            const activity = Object.assign(new AnnotationCompileActivity(), {
                src: '/nonexistent/**/*.ts',
                outDir: '/nonexistent-out'
            } as Partial<AnnotationCompileActivity>);
            
            const result = await activity.execute({} as any);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.totalFiles).toBe(0);
        });
    });

    describe('processSourceFile', () => {
        it('should count classes in source file', () => {
            const sourceCode = `
                class ClassOne {}
                class ClassTwo {}
                interface NotCounted {}
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const activity = new AnnotationCompileActivity();
            const count = activity['processSourceFile'](sourceFile);
            
            expect(count).toBe(2);
        });

        it('should not count anonymous classes', () => {
            const sourceCode = `
                class {}
                class Named {}
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const activity = new AnnotationCompileActivity();
            const count = activity['processSourceFile'](sourceFile);
            
            expect(count).toBe(1);
        });
    });

    describe('transformSourceFile', () => {
        it('should print source file content', () => {
            const sourceCode = `class TestClass { method(): void {} }`;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            const activity = new AnnotationCompileActivity();
            const result = activity['transformSourceFile'](sourceFile);
            
            expect(result).toContain('class TestClass');
        });
    });
});
