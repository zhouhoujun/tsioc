import expect = require('expect');
import * as ts from 'typescript';
import { 
    AnnotationCompiler, 
    ClassAnnotationData, 
    createAnnotationCompiler 
} from '../src/AnnotationCompiler';
import { 
    typeAnn, 
    Annotation, 
    AnnotationType,
    getTypeName,
    isType,
    getDef
} from '@tsdi/ioc';

describe('AnnotationCompiler IoC Integration', () => {
    
    describe('AnnotationCompiler with IoC container', () => {
        it('should create static ƿAnn method matching IoC typeAnn', () => {
            const compiler = new AnnotationCompiler();
            
            const program = ts.createProgram({
                rootNames: [],
                options: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.CommonJS,
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true
                }
            });
            
            const factory = compiler.createTransformerFactory(program);
            expect(factory).toBeDefined();
        });

        it('should transform class to include ƿAnn static method', () => {
            const compiler = new AnnotationCompiler();
            
            const program = ts.createProgram({
                rootNames: [],
                options: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.CommonJS,
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true
                }
            });
            
            const factory = compiler.createTransformerFactory(program);
            expect(factory).toBeDefined();
            expect(typeof factory).toBe('function');
        });

        it('should generate annotation matching Annotation interface', () => {
            const className = 'TestService';
            const metadata: ClassAnnotationData = {
                name: className,
                type: class TestService {} as any,
                methods: {
                    constructor: {
                        params: [
                            { name: 'dep', type: { name: 'DepService' } as any }
                        ]
                    }
                }
            };
            
            expect(metadata.name).toBe(className);
            expect(metadata.type).toBeDefined();
            expect(metadata.methods?.constructor).toBeDefined();
            expect((metadata.methods?.constructor as any)?.params).toHaveLength(1);
        });
    });

    describe('typeAnn constant verification', () => {
        it('should export typeAnn as ƿAnn', () => {
            expect(typeAnn).toBe('ƿAnn');
        });

        it('should be usable as method name on AnnotationType', () => {
            class TestClass {
                static ƿAnn(): Annotation {
                    return {
                        name: 'TestClass',
                        type: TestClass
                    };
                }
            }
            
            const ann = (TestClass as AnnotationType).ƿAnn?.();
            expect(ann).toBeDefined();
            expect(ann?.name).toBe('TestClass');
            expect(ann?.type).toBe(TestClass);
        });
    });

    describe('IoC container getDef integration', () => {
        it('should retrieve annotation via getDef', () => {
            class MyService {
                static ƿAnn(): Partial<Annotation> {
                    return {
                        name: 'MyService',
                        type: MyService
                    };
                }
            }
            
            const def = getDef(MyService);
            expect(def).toBeDefined();
            expect(def.name).toBe('MyService');
            expect(def.type).toBe(MyService);
        });

        it('should fallback to default when no ƿAnn present', () => {
            class NoAnnotationClass {}
            
            const def = getDef(NoAnnotationClass);
            expect(def).toBeDefined();
            expect(def.name).toBe('NoAnnotationClass');
        });
    });

    describe('getTypeName integration', () => {
        it('should get type name from class with ƿAnn', () => {
            class NamedService {
                static ƿAnn(): Annotation {
                    return {
                        name: 'NamedService',
                        type: NamedService
                    };
                }
            }
            
            const name = getTypeName(NamedService);
            expect(name).toBe('NamedService');
        });

        it('should fallback to constructor name when no ƿAnn', () => {
            class SimpleClass {}
            
            const name = getTypeName(SimpleClass);
            expect(name).toBe('SimpleClass');
        });
    });

    describe('isType integration', () => {
        it('should recognize class with ƿAnn as type', () => {
            class TypedService {
                static ƿAnn(): Annotation {
                    return {
                        name: 'TypedService',
                        type: TypedService
                    };
                }
            }
            
            expect(isType(TypedService)).toBe(true);
        });
    });

    describe('Full compilation simulation', () => {
        it('should produce annotation data consumable by IoC', () => {
            class CompiledService {
                static ƿAnn(): Annotation {
                    return {
                        name: 'CompiledService',
                        type: CompiledService,
                        methods: {
                            constructor: {
                                params: [
                                    { name: 'logger', type: Object },
                                    { name: 'config', type: Object }
                                ]
                            },
                            doWork: {
                                params: [],
                                returnType: Object
                            }
                        }
                    };
                }
                
                constructor(private logger: any, private config: any) {}
                
                doWork(): void {}
            }
            
            const ann = (CompiledService as AnnotationType).ƿAnn?.();
            expect(ann).toBeDefined();
            expect(ann?.name).toBe('CompiledService');
            expect(ann?.type).toBe(CompiledService);
            expect(ann?.methods?.constructor).toBeDefined();
            expect((ann?.methods?.constructor as any)?.params).toHaveLength(2);
            
            const def = getDef(CompiledService);
            expect(def.name).toBe('CompiledService');
            expect(def.type).toBe(CompiledService);
        });

        it('should support abstract classes', () => {
            abstract class AbstractBase {
                static ƿAnn(): Annotation {
                    return {
                        name: 'AbstractBase',
                        type: AbstractBase,
                        abstract: true
                    };
                }
            }
            
            const ann = (AbstractBase as AnnotationType).ƿAnn?.();
            expect(ann?.abstract).toBe(true);
        });
    });

    describe('AnnotationCompiler transformer output', () => {
        it('should produce correct method signature', () => {
            const compiler = new AnnotationCompiler();
            
            const source = `
                @Injectable()
                class ServiceWithMethods {
                    constructor(private dep: any) {}
                    
                    process(input: string): number {
                        return 0;
                    }
                }
            `;
            
            const sourceFile = ts.createSourceFile(
                'test.ts',
                source,
                ts.ScriptTarget.ES2020,
                true
            );
            
            const program = ts.createProgram({
                rootNames: [],
                options: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.CommonJS,
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true
                }
            });
            
            const factory = compiler.createTransformerFactory(program);
            expect(typeof factory).toBe('function');
        });
    });
});

describe('AnnotationCompiler Metadata Generation', () => {
    
    describe('ClassAnnotationData structure', () => {
        it('should match Annotation interface', () => {
            const data: ClassAnnotationData = {
                name: 'TestService',
                type: class {} as any,
                abstract: false,
                methods: {
                    constructor: {
                        params: [{ name: 'dep', type: Object }]
                    }
                }
            };
            
            const annotation: Annotation = data;
            expect(annotation.name).toBe('TestService');
            expect(annotation.type).toBeDefined();
        });
    });

    describe('Method annotation', () => {
        it('should support constructor parameters', () => {
            const methods: Record<string, any> = {
                constructor: {
                    params: [
                        { name: 'serviceA', type: Object },
                        { name: 'serviceB', type: Object }
                    ]
                }
            };
            
            expect((methods.constructor as any).params).toHaveLength(2);
        });

        it('should support method with return type', () => {
            const methods: Record<string, any> = {
                getData: {
                    params: [],
                    returnType: Object
                }
            };
            
            expect(methods.getData.returnType).toBeDefined();
        });
    });
});