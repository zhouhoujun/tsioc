import { isString, Type, AnnotationMetadata, DecoratorOption, createDecorator, ActionTypes, noPointcut, AnnotationType } from '@tsdi/ioc';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AspectMetadata, AroundMetadata, PointcutAnnotation, AdviceTypes } from './meta';
import { Advisor } from '../Advisor';
import { AopDef } from './ref';


/**
 * Aspect decorator
 *
 * @export
 * @interface Aspect
 */
export interface Aspect {
    /**
     * Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.
     *
     * @Aspect()
     *
     * @param {string} annotation set pointcut in the class with the annotation decorator only.
     * @param {(Type | Type[])>} [within]  set pointcut in the class with the annotation decorator only.
     * @param {AnnotationMetadata} [append] append class metadata.
     */
    (annotation: string, within?: Type | Type[], append?: AnnotationMetadata): ClassDecorator;

    /**
     * Aspect decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Aspect()
     *
     * @param {AspectMetadata} [metadata] metadata map.
     */
    (metadata?: AspectMetadata): ClassDecorator;
}


/**
 * Aspect decorator. define aspect service.
 *
 * @Aspect()
 */
export const Aspect: Aspect = createDecorator<AspectMetadata>('Aspect', {
    actionType: ActionTypes.annoation,
    def: {
        class: (ctx) => {
            ctx.class.getAnnotation<AopDef>().aspect = ctx.define.metadata;
        }
    },
    design: {
        afterAnnoation: (ctx) => {
            const advisor = ctx.platform.context.get(Advisor);
            if (advisor) {
                const { injector, platform } = ctx;

                const invocation = platform.getInvocationFactory(ctx.class, injector).create();
                injector.onDestroy(() => {
                    advisor.remove(invocation);
                    invocation.destroy();
                });
                advisor.add(invocation)
            } else {
                console.error('aop module not registered. make sure register before', ctx.type)
            }
        }
    },
    props: (annotation: string, within?: Type | Type[], append?: AnnotationMetadata) =>
        ({ annotation, within, ...append })
});


/**
 * none pointcut decorator.
 *
 * @export
 * @interface NonePointcut
 */
export interface NonePointcut {
    /**
     * NonePointcut decorator, define class not work with aop.
     *
     * @NonePointcut()
     *
     */
    (): ClassDecorator;
}

/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut()
 */
export const NonePointcut: NonePointcut = createDecorator<AnnotationMetadata>('NonePointcut', {
    def: {
        class: (ctx) => {
            (ctx.class.type as AnnotationType)[noPointcut] = true;
        }
    }
});


/**
 * advice decorator for method.
 *
 * @export
 * @interface AdviceDecorator
 */
export interface AdviceDecorator {
    /**
     * define advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Advice('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Advice('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, annotation?: string): MethodDecorator;

    /**
     * define advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Advice('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Advice('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param { PointcutAnnotation } [annotation] annotation option, special annotation metadata for annotation advices.
     */
    (pointcut: string | RegExp, annotation?: PointcutAnnotation): MethodDecorator;


    /**
     * define advice with metadata map.
     * @param {AdviceMetadata} [metadata]
     */
    (metadata: Omit<AdviceMetadata, 'matchFn'>): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(adviceName: string, options?: DecoratorOption<T>) {
    options = options ?? {};
    const append = options.appendProps;
    return createDecorator<T>(adviceName, {
        props: (pointcut?: string | RegExp, annotation?: string | PointcutAnnotation) => {
            if (isString(annotation)) {
                return { pointcut, annotationArgName: annotation } as T;
            } else {
                return { pointcut, ...annotation } as T;
            }
        },
        ...options,
        def: {
            method: (ctx) => {
                if (!ctx.class.getAnnotation<AopDef>().advices) {
                    ctx.class.getAnnotation<AopDef>().advices = []
                }
                if (!ctx.define.metadata.name) {
                    ctx.define.metadata.name = ctx.define.propertyKey;
                }
                ctx.class.getAnnotation<AopDef>().advices.push(ctx.define.metadata);
            }
        },
        appendProps: (metadata) => {
            if (append) {
                append(metadata)
            }
            metadata.adviceName = adviceName as AdviceTypes;
            return metadata
        }
    });
}

/**
 * aop advice decorator.
 *
 * @Advice
 */
export const Advice: AdviceDecorator = createAdviceDecorator('Advice');

/**
 * Pointcut decorator for method.
 *
 * @export
 * @interface Pointcut
 */
export interface Pointcut {
    /**
     * Pointcut advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Pointcut('"execution(className.*.*(..)")')
     *   @Pointcut('@annotation(DecortorName:class)')
     *   @Pointcut('@annotation(DecortorName:method)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Pointcut('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define pointcut advice match express for pointcut.
     * @param { (string) } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, annotation?: string): MethodDecorator;

    /**
     * Pointcut advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Pointcut('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Pointcut('@annotation(DecoratorName)')
     *   @Pointcut('@annotation(DecortorName:class)')
     *   @Pointcut('@annotation(DecortorName:method)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} pointcut define pointcut advice match express for pointcut.
     * @param { (PointcutAnnotation) } [annotation] annotation option.
     */
    (pointcut: string | RegExp, annotation?: PointcutAnnotation): MethodDecorator;

    /**
     * Pointcut advice with metadata map.
     *
     * @param {AdviceMetadata} [metadata]
     */
    (metadata: Omit<AdviceMetadata, 'matchFn'>): MethodDecorator;
}

/**
 * aop Pointcut advice decorator.
 *
 * @Pointcut
 */
export const Pointcut: Pointcut = createAdviceDecorator<AdviceMetadata>('Pointcut');


/**
 * Before decorator for method.
 *
 * @export
 * @interface IBeforeDecorator
 */
export interface IBeforeDecorator {
    /**
     * Before advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Before('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Before('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define before advice match express for pointcut.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, annotation?: string): MethodDecorator;

    /**
     * Before advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Before('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Before('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define before advice match express for pointcut.
     * @param { PointcutAnnotation } [annotation] annotation option.
     */
    (pointcut?: string | RegExp, annotation?: PointcutAnnotation): MethodDecorator;

    /**
     * Before advice with metadata map.
     *
     * @param {AdviceMetadata} metadata
     */
    (metadata: Omit<AdviceMetadata, 'matchFn'>): MethodDecorator;
}

/**
 * aop Before advice decorator.
 *
 * @Before
 */
export const Before: IBeforeDecorator = createAdviceDecorator<AdviceMetadata>('Before') as IBeforeDecorator;


/**
 * After decorator for method.
 *
 * @export
 * @interface After
 */
export interface After {
    /**
     * After advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @After('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @After('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define after advice match express for pointcut.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, annotation?: string): MethodDecorator;

    /**
     * After advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @After('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @After('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define after advice match express for pointcut.
     * @param { PointcutAnnotation } [annotation] annotation option.
     */
    (pointcut?: string | RegExp, annotation?: PointcutAnnotation): MethodDecorator;

    /**
     * After advice with metadata map.
     *
     * @param {AdviceMetadata} [metadata]
     */
    (metadata?: Omit<AdviceMetadata, 'matchFn'>): MethodDecorator;
}

/**
 * aop after advice decorator.
 *
 * @After
 */
export const After: After = createAdviceDecorator<AdviceMetadata>('After');


export interface AroundAnnoation extends PointcutAnnotation {
    returning?: string;
    throwing?: string;
}

/**
 * aop around decorator.
 *
 * @export
 * @interface Around
 */
export interface Around {

    /**
     * Around advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Around('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Around('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define around advice match express for pointcut.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, annotation?: string): MethodDecorator;

    /**
     * Around advice.
     *
     * @param {(string | RegExp)} pointcut define around advice match express for pointcut.
     * @param {AroundAnnoation} option `args` set name provider of pointcut returing data for advices.
     * `throwing` set name provider of pointcut throwing error for advices. `annotation` annotation name, special annotation metadata for annotation advices.
     * `returning` set advice returning.
     */
    (pointcut: string | RegExp, option: AroundAnnoation): MethodDecorator;

    /**
     * Around advice with metadata map.
     *
     * @param {AroundMetadata} [metadata]
     */
    (metadata?: Omit<AroundMetadata, 'matchFn'>): MethodDecorator;
}

/**
 * aop Around advice decorator.
 *
 * @Around
 */
export const Around: Around = createAdviceDecorator<AroundMetadata>('Around');


/**
 * aop after returning decorator.
 *
 * @export
 * @interface AfterReturning
 */
export interface AfterReturning {

    /**
     * AfterReturning advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @AfterReturning('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @AfterReturning('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define after returning advice match express for pointcut.
     * @param {string} [returning] set name provider of pointcut returing data for advices.
     */
    (pointcut?: string | RegExp, returning?: string): MethodDecorator;


    /**
     * define aop after returning advice.
     *
     * @param {(string | RegExp)} pointcut define after returning advice match express for pointcut.
     * @param {string} returning set name provider of pointcut returing data for advices.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut: string | RegExp, returning: string, annotation?: string): MethodDecorator;

    /**
     * define aop after returning advice.
     *
     * @param {(string | RegExp)} pointcut define after returning advice match express for pointcut.
     * @param {string} returning set name provider of pointcut returing data for advices.
     * @param { PointcutAnnotation } annotation] annotation option.
     */
    (pointcut: string | RegExp, returning: string, annotation: PointcutAnnotation): MethodDecorator;

    /**
     * AfterReturning advice with metadata.
     *
     * @param {AfterReturningMetadata} [metadata]
     */
    (metadata?: Omit<AfterReturningMetadata, 'matchFn'>): MethodDecorator;
}

/**
 * aop after returning advice decorator.
 *
 * @AfterReturning
 */
export const AfterReturning: AfterReturning =
    createAdviceDecorator<AfterReturningMetadata>('AfterReturning', {
        props: (pointcut: string | RegExp, returning: string, annotation?: string | PointcutAnnotation) => {
            if (isString(annotation)) {
                return { pointcut, returning, annotationName: annotation }
            } else {
                return { pointcut, ...annotation, returning }
            }
        }
    });

/**
 * aop after throwing decorator.
 *
 * @export
 * @interface AfterThrowing
 */
export interface AfterThrowing {

    /**
     * AfterThrowing advice with params.
     *
     * ### Usage
     * - path name, match express.
     *  - `execution(className.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(className.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *  - `execution(className.*.*(..)) && (@annotation(DecortorName) || @within(ClassName))`
     *  - `get(*.filedname.*)`
     *  - `get(className.filedname.*)`
     *  - `set(*.filedname.*)`
     *  - `set(className.filedname.*)`
     *  - `value(*.filedname.*)`  get set
     *  - `value(className.filedname.*)` get set
     *  - `@annotation(DecortorName:class|method|property|parameter)
     * 
     * ```
     * @Aspect()
     * class AspectClass {
     *   @AfterThrowing('"execution(className.*.*(..)")')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * - match method with a decorator annotation.
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @AfterThrowing('@annotation(DecoratorName)')
     *   process(joinPoint: JointPoint){
     *   }
     * }
     * ```
     *
     * @param {(string | RegExp)} [pointcut] define after throwing advice match express for pointcut.
     * @param {string} [throwing] set name provider of pointcut throwing error for advices.
     */
    (pointcut: string | RegExp, throwing?: string): MethodDecorator;


    /**
     * define aop after throwing advice.
     *
     * @param {(string | RegExp)} pointcut define after throwing advice match express for pointcut.
     * @param {string} throwing set name provider of pointcut throwing error for advices.
     * @param { string } annotation annotation name, special annotation metadata for annotation advices.
     */
    (pointcut: string | RegExp, throwing: string, annotation?: string): MethodDecorator;


    /**
     * define aop after throwing advice.
     *
     * @param {(string | RegExp)} pointcut define after throwing advice match express for pointcut.
     * @param {string} throwing set name provider of pointcut throwing error for advices.
     * @param { PointcutAnnotation } annotation annotation option.
     */
    (pointcut: string | RegExp, throwing: string, annotation: PointcutAnnotation): MethodDecorator;


    /**
     * AfterThrowing advice with metadata.
     *
     * @param {AfterThrowingMetadata} [metadata]
     */
    (metadata?: Omit<AfterThrowingMetadata, 'matchFn'>): MethodDecorator;
}

/**
 * aop after throwing advice decorator.
 *
 * @AfterThrowing
 */
export const AfterThrowing: AfterThrowing =
    createAdviceDecorator<AfterThrowingMetadata>('AfterThrowing', {
        props: (pointcut: string | RegExp, throwing: string, annotation?: string | PointcutAnnotation) => {
            if (isString(annotation)) {
                return { pointcut, throwing, annotationName: annotation }
            } else {
                return { pointcut, ...annotation, throwing }
            }
        }
    });
