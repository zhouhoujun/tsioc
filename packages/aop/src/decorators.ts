import { isString, createClassDecorator, ClassType, ClassMetadata, Type, DecoratorOption, createDecorator } from '@tsdi/ioc';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AspectMetadata, AroundMetadata, PointcutAnnotation } from './metadatas';
import { AdviceTypes, AopReflect } from './types';


/**
 * Aspect decorator
 *
 * @export
 * @interface IAspectDecorator
 */
export interface IAspectDecorator {
    /**
     * Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {string} annotation set pointcut in the class with the annotation decorator only.
     * @param {(ClassType | ClassType[])>} [within]  set pointcut in the class with the annotation decorator only.
     * @param {ClassMetadata} [append] append class metadata.
     */
    (annotation: string, within?: ClassType | ClassType[], append?: ClassMetadata): ClassDecorator;

    /**
     * Aspect decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {AspectMetadata} [metadata] metadata map.
     */
    (metadata?: AspectMetadata): ClassDecorator;

    /**
     * Aspect decorator, define for class.  use to define class as aspect.
     *
     * @Aspect
     */
    (target: Type): void;
}


/**
 * Aspect decorator. define aspect service.
 *
 * @Aspect
 */
export const Aspect: IAspectDecorator = createClassDecorator<AspectMetadata>('Aspect', {
    actionType: 'annoation',
    classHandle: (ctx, next) => {
        let rlt = ctx.reflect as AopReflect;
        rlt.aspect = ctx.matedata;
        return next();
    },
    metadata: (annotation: string, within?: ClassType | ClassType[], append?: ClassMetadata) => {
        return { annotation, within, ...append };
    }
}) as IAspectDecorator;


/**
 * none pointcut decorator.
 *
 * @export
 * @interface INonePointcutDecorator
 */
export interface INonePointcutDecorator {
    /**
     * NonePointcut decorator, define class not work with aop.
     *
     * @NonePointcut
     *
     */
    (): ClassDecorator;
    /**
     * NonePointcut decorator, define class not work with aop.
     *
     * @NonePointcut
     */
    (target: Type): void;

    /**
     * NonePointcut decorator, define class not work with aop.
     *
     * @NonePointcut
     */
    (target: Type): void;
}

/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut
 */
export const NonePointcut: INonePointcutDecorator = createClassDecorator<ClassMetadata>('NonePointcut', {
    classHandle: (ctx, next) => {
        const rlt = ctx.reflect as AopReflect;
        rlt.nonePointcut = true;
        return next();
    }
});


/**
 * advice decorator for method.
 *
 * @export
 * @interface IAdviceDecorator
 */
export interface IAdviceDecorator {
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
    options = options || {};
    const append = options.appendMetadata;
    return createDecorator<T>(adviceName, {
        metadata: (pointcut?: string | RegExp, annotation?: string | PointcutAnnotation) => {
            if (isString(annotation)) {
                return { pointcut, annotationName: annotation } as T;
            } else {
                return { pointcut, ...annotation } as T;
            }
        },
        ...options,
        methodHandle: (ctx, next) => {
            let ret = ctx.reflect as AopReflect;
            if (!ret.advices) {
                ret.advices = [];
            }
            ret.advices.push({ ...ctx.matedata, propertyKey: ctx.propertyKey });
            return next();
        },
        appendMetadata: (metadata) => {
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
export const Advice: IAdviceDecorator = createAdviceDecorator('Advice');

/**
 * Pointcut decorator for method.
 *
 * @export
 * @interface IPointcutDecorator
 */
export interface IPointcutDecorator {
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
export const Pointcut: IPointcutDecorator =
    createAdviceDecorator<AdviceMetadata>('Pointcut') as IPointcutDecorator;



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
 * @interface IAfterDecorator
 */
export interface IAfterDecorator {
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
export const After: IAfterDecorator = createAdviceDecorator<AdviceMetadata>('After') as IAfterDecorator;


export interface AroundAnnoation extends PointcutAnnotation {
    returning?: string;
    throwing?: string;
}

/**
 * aop around decorator.
 *
 * @export
 * @interface IAroundDecorator
 */
export interface IAroundDecorator {

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
export const Around: IAroundDecorator = createAdviceDecorator<AroundMetadata>('Around') as IAroundDecorator;


/**
 * aop after returning decorator.
 *
 * @export
 * @interface IAfterReturningDecorator
 */
export interface IAfterReturningDecorator {

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
export const AfterReturning: IAfterReturningDecorator =
    createAdviceDecorator<AfterReturningMetadata>('AfterReturning', {
        metadata: (pointcut: string | RegExp, returning: string, annotation?: string | PointcutAnnotation) => {
            if (isString(annotation)) {
                return { pointcut, returning, annotationName: annotation };
            } else {
                return { pointcut, ...annotation, returning };
            }
        }
    }) as IAfterReturningDecorator;

/**
 * aop after throwing decorator.
 *
 * @export
 * @interface IAfterThrowingDecorator
 */
export interface IAfterThrowingDecorator {

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
export const AfterThrowing: IAfterThrowingDecorator =
    createAdviceDecorator<AfterThrowingMetadata>('AfterThrowing', {
        metadata: (pointcut: string | RegExp, throwing: string, annotation?: string | PointcutAnnotation) => {
            if (isString(annotation)) {
                return { pointcut, throwing, annotationName: annotation };
            } else {
                return { pointcut, ...annotation, throwing };
            }
        }
    }) as IAfterThrowingDecorator;
