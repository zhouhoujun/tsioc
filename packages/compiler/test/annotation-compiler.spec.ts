import expect = require('expect');
import * as ts from 'typescript';
import { 
    AnnotationCompiler, 
    CompiledTypeDef,
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
    
    describe('AnnotationCompiler', () => {
        it('should create transformer factory', () => {
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

        it('should create CompiledTypeDef structure', () => {
            const typeDef: CompiledTypeDef = {
                name: 'TestService',
                type: {} as any,
                compiled: true,
                provides: ['TestToken'],
                providers: [],
                classDefs: [{
                    decorType: 'class',
                    decorator: 'Injectable',
                    metadata: { providedIn: 'root' }
                }],
                propDefs: [],
                methodDefs: [],
                paramDefs: {}
            };
            
            expect(typeDef.name).toBe('TestService');
            expect(typeDef.compiled).toBe(true);
            expect(typeDef.provides).toContain('TestToken');
            expect(typeDef.classDefs).toHaveLength(1);
        });
    });

    describe('typeAnn constant', () => {
        it('should export typeAnn as ƿAnn', () => {
            expect(typeAnn).toBe('ƿAnn');
        });

        it('should be usable as method name', () => {
            class TestClass {
                static ƿAnn(): Annotation {
                    return { name: 'TestClass', type: TestClass };
                }
            }
            
            const ann = (TestClass as AnnotationType).ƿAnn?.();
            expect(ann).toBeDefined();
            expect(ann?.name).toBe('TestClass');
        });
    });

    describe('IoC container getDef', () => {
        it('should retrieve annotation via getDef', () => {
            class MyService {
                static ƿAnn(): Partial<Annotation> {
                    return { name: 'MyService', type: MyService };
                }
            }
            
            const def = getDef(MyService);
            expect(def).toBeDefined();
            expect(def.name).toBe('MyService');
            expect(def.type).toBe(MyService);
        });

        it('should fallback when no ƿAnn present', () => {
            class NoAnnotationClass {}
            
            const def = getDef(NoAnnotationClass);
            expect(def).toBeDefined();
            expect(def.name).toBe('NoAnnotationClass');
        });
    });

    describe('getTypeName', () => {
        it('should get type name from class with ƿAnn', () => {
            class NamedService {
                static ƿAnn(): Annotation {
                    return { name: 'NamedService', type: NamedService };
                }
            }
            
            expect(getTypeName(NamedService)).toBe('NamedService');
        });

        it('should fallback to constructor name', () => {
            class SimpleClass {}
            expect(getTypeName(SimpleClass)).toBe('SimpleClass');
        });
    });

    describe('isType', () => {
        it('should recognize class with ƿAnn', () => {
            class TypedService {
                static ƿAnn(): Annotation {
                    return { name: 'TypedService', type: TypedService };
                }
            }
            expect(isType(TypedService)).toBe(true);
        });
    });

    describe('Full annotation with decorator metadata', () => {
        it('should include compiled flag', () => {
            class CompiledService {
                static ƿAnn(): CompiledTypeDef {
                    return {
                        name: 'CompiledService',
                        type: CompiledService,
                        compiled: true,
                        provides: ['ServiceToken'],
                        classDefs: [{
                            decorType: 'class',
                            decorator: 'Injectable'
                        }],
                        propDefs: [],
                        methodDefs: [],
                        paramDefs: {}
                    };
                }
            }
            
            const ann = (CompiledService as AnnotationType).ƿAnn?.() as CompiledTypeDef;
            expect(ann?.compiled).toBe(true);
            expect(ann?.provides).toContain('ServiceToken');
        });

        it('should support singleton flag', () => {
            class SingletonService {
                static ƿAnn(): CompiledTypeDef {
                    return {
                        name: 'SingletonService',
                        type: SingletonService,
                        compiled: true,
                        singleton: true,
                        classDefs: [{
                            decorType: 'class',
                            decorator: 'Singleton'
                        }],
                        propDefs: [],
                        methodDefs: [],
                        paramDefs: {}
                    };
                }
            }
            
            const ann = (SingletonService as AnnotationType).ƿAnn?.() as CompiledTypeDef;
            expect(ann?.singleton).toBe(true);
        });

        it('should include method parameters', () => {
            class ServiceWithParams {
                static ƿAnn(): CompiledTypeDef {
                    return {
                        name: 'ServiceWithParams',
                        type: ServiceWithParams,
                        compiled: true,
                        methods: {
                            constructor: {
                                params: [
                                    { name: 'logger', type: Object as any },
                                    { name: 'config', type: Object as any }
                                ]
                            }
                        },
                        paramDefs: {
                            constructor: [{
                                decorType: 'parameter' as const,
                                decorator: 'Inject',
                                paramName: 'logger',
                                paramType: 'Logger'
                            }]
                        },
                        classDefs: [],
                        propDefs: [],
                        methodDefs: []
                    };
                }
            }
            
            const ann = (ServiceWithParams as AnnotationType).ƿAnn?.() as CompiledTypeDef;
            expect(ann?.methods?.constructor).toBeDefined();
            expect((ann?.methods?.constructor as any)?.params).toHaveLength(2);
        });

        it('should include property decorators', () => {
            class ServiceWithProps {
                static ƿAnn(): CompiledTypeDef {
                    return {
                        name: 'ServiceWithProps',
                        type: ServiceWithProps,
                        compiled: true,
                        propDefs: [{
                            decorType: 'property',
                            decorator: 'Autowired',
                            propertyKey: 'depService',
                            type: 'DepService'
                        }],
                        classDefs: [],
                        methodDefs: [],
                        paramDefs: {}
                    };
                }
            }
            
            const ann = (ServiceWithProps as AnnotationType).ƿAnn?.() as CompiledTypeDef;
            expect(ann?.propDefs).toHaveLength(1);
            expect(ann?.propDefs?.[0].propertyKey).toBe('depService');
        });

        it('should support abstract classes', () => {
            abstract class AbstractService {
                static ƿAnn(): CompiledTypeDef {
                    return {
                        name: 'AbstractService',
                        type: AbstractService,
                        compiled: true,
                        abstract: true,
                        classDefs: [],
                        propDefs: [],
                        methodDefs: [],
                        paramDefs: {}
                    };
                }
            }
            
            const ann = (AbstractService as AnnotationType).ƿAnn?.() as CompiledTypeDef;
            expect(ann?.abstract).toBe(true);
        });
    });

    describe('CompiledTypeDef structure', () => {
        it('should match Annotation interface', () => {
            const typeDef: CompiledTypeDef = {
                name: 'TestService',
                type: class {} as any,
                compiled: true,
                abstract: false,
                classDefs: [],
                propDefs: [],
                methodDefs: [],
                paramDefs: {}
            };
            
            const annotation: Annotation = typeDef;
            expect(annotation.name).toBe('TestService');
        });
    });
});