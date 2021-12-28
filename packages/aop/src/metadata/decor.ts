import { isString, ClassType, ClassMetadata, DecoratorOption, createDecorator, EMPTY_OBJ, ActionTypes, lang, OperationFactoryResolver } from '@tsdi/ioc';
import { Advisor } from '../Advisor';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AspectMetadata, AroundMetadata, PointcutAnnotation, AdviceTypes } from './meta';
import { AopReflect } from './ref';


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
     * @param {(ClassType | ClassType[])>} [within]  set pointcut in the class with the annotation decorator only.
     * @param {ClassMetadata} [append] append class metadata.
     */
    (annotation: string, within?: ClassType | ClassType[], append?: ClassMetadata): ClassDecorator;

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
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as AopReflect).aspect = ctx.metadata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            let advisor = ctx.injector.platform().getActionValue(Advisor);
            if (advisor) {
                const { type, injector } = ctx;
                
                const factory = injector.get(OperationFactoryResolver).resolve(type, injector);
                injector.onDestroy(()=> {
                    advisor.remove(factory);
                    lang.cleanObj(factory);
                });
                advisor.add(factory);
            } else {
                console.error('aop module not registered. make sure register before', ctx.type);
            }
            next();
        }
    },
    props: (annotation: string, within?: ClassType | ClassType[], append?: ClassMetadata) =>
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
export const NonePointcut: NonePointcut = createDecorator<ClassMetadata>('NonePointcut', {
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as AopReflect).nonePointcut = true;
            return next();
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Advice('"execution(moduelName.*.*(..)")')
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Advice('"execution(moduelName.*.*(..)")')
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
    (metadata: AdviceMetadata): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(adviceName: string, options?: DecoratorOption<T>) {
    options = options || EMPTY_OBJ;
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
        reflect: {
            method: (ctx, next) => {
                if (!(ctx.reflect as AopReflect).advices) {
                    (ctx.reflect as AopReflect).advices = [];
                }
                (ctx.reflect as AopReflect).advices.push({ ...ctx.metadata, propertyKey: ctx.propertyKey });
                return next();
            }
        },
        appendProps: (metadata) => {
            if (append) {
                append(metadata);
            }
            metadata.adviceName = adviceName as AdviceTypes;
            return metadata;
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Pointcut('"execution(moduelName.*.*(..)")')
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Pointcut('"execution(moduelName.*.*(..)")')
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
     * @param {(string | RegExp)} pointcut define pointcut advice match express for pointcut.
     * @param { (PointcutAnnotation) } [annotation] annotation option.
     */
    (pointcut: string | RegExp, annotation?: PointcutAnnotation): MethodDecorator;

    /**
     * Pointcut advice with metadata map.
     *
     * @param {AdviceMetadata} [metadata]
     */
    (metadata: AdviceMetadata): MethodDecorator;
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Before('"execution(moduelName.*.*(..)")')
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Before('"execution(moduelName.*.*(..)")')
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
    (metadata: AdviceMetadata): MethodDecorator;
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @After('"execution(moduelName.*.*(..)")')
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @After('"execution(moduelName.*.*(..)")')
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
    (metadata?: AdviceMetadata): MethodDecorator;
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @Around('"execution(moduelName.*.*(..)")')
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
    (metadata?: AroundMetadata): MethodDecorator;
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @AfterReturning('"execution(moduelName.*.*(..)")')
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
    (metadata?: AfterReturningMetadata): MethodDecorator;
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
                return { pointcut, returning, annotationName: annotation };
            } else {
                return { pointcut, ...annotation, returning };
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
     * - path or module name, match express.
     *  - `execution(moduelName.*.*(..)) || @annotation(DecortorName) || @within(ClassName)`
     *  - `execution(moduelName.*.*(..)) && @annotation(DecortorName) && @within(ClassName)`
     *
     * ```
     * @Aspect()
     * class AspectClass {
     *   @AfterThrowing('"execution(moduelName.*.*(..)")')
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
    (metadata?: AfterThrowingMetadata): MethodDecorator;
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
                return { pointcut, throwing, annotationName: annotation };
            } else {
                return { pointcut, ...annotation, throwing };
            }
        }
    });
