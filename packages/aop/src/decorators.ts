import { createMethodDecorator, IMethodDecorator, MetadataExtends, isString, isRegExp, ArgsIteratorAction, isArray, createClassDecorator, isClass, ITypeDecorator, ClassType, Registration, ClassMetadata, Type } from '@tsdi/ioc';
import { AdviceMetadata, AfterReturningMetadata, AfterThrowingMetadata, AspectMetadata, AroundMetadata } from './metadatas';
import { AdviceTypes } from './AdviceTypes';


/**
 * Aspect decorator
 *
 * @export
 * @interface IAspectDecorator
 * @extends {ITypeDecorator<AspectMetadata>}
 */
export interface IAspectDecorator extends ITypeDecorator<AspectMetadata> {
    /**
     * Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {string} annotation set pointcut in the class with the annotation decorator only.
     * @param {(ClassType | ClassType[])>} [within]  set pointcut in the class with the annotation decorator only.
     * @param {(Registration | symbol | string)} [provide] define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {number} [cache]  define class cahce expris when is not singlton.
     */
    (annotation: string, within?: ClassType | ClassType[], provide?: Registration | symbol | string, alias?: string, singlton?: boolean, cache?: number): ClassDecorator;

    /**
     * Aspect decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Aspect
     *
     * @param {AspectMetadata} [metadata] metadata map.
     */
    (metadata?: AspectMetadata): ClassDecorator;
}


/**
 * Aspect decorator. define aspect service.
 *
 * @Aspect
 */
export const Aspect: IAspectDecorator = createClassDecorator<AspectMetadata>('Aspect',
    [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.annotation = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isArray(arg) || isClass(arg)) {
                ctx.metadata.within = arg;
                ctx.next(next);
            }
        }
    ], true) as IAspectDecorator;



/**
 * none pointcut decorator.
 *
 * @export
 * @interface INonePointcutDecorator
 * @extends {ITypeDecorator<ClassMetadata>}
 */
export interface INonePointcutDecorator extends ITypeDecorator<ClassMetadata> {
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
}

/**
 * NonePointcut decorator, define class not work with aop.
 *
 * @NonePointcut
 */
export const NonePointcut: INonePointcutDecorator = createClassDecorator<ClassMetadata>('NonePointcut');


/**
 * advice decorator for method.
 *
 * @export
 * @interface IAdviceDecorator
 * @extends {IMethodDecorator<T>}
 * @template T
 */
export interface IAdviceDecorator<T extends AdviceMetadata> extends IMethodDecorator<T> {
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
     * define advice with metadata map.
     * @param {T} [metadata]
     */
    (metadata?: T): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(adviceName: string,
    actions?: ArgsIteratorAction<T>[],
    afterPointcutActions?: ArgsIteratorAction<T> | ArgsIteratorAction<T>[],
    metadataExtends?: MetadataExtends<T>): IAdviceDecorator<T> {
    actions = actions || [];

    actions.push((ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg) || isRegExp(arg)) {
            ctx.metadata.pointcut = arg;
            ctx.next(next);
        }
    });
    if (afterPointcutActions) {
        if (isArray(afterPointcutActions)) {
            actions.push(...afterPointcutActions);
        } else {
            actions.push(afterPointcutActions);
        }
    }

    actions.push(
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg) && ctx.args.indexOf(arg) === 1) {
                ctx.metadata.annotationArgName = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.annotationName = arg;
                ctx.next(next);
            }
        }
    );

    return createMethodDecorator<AdviceMetadata>('Advice',
        actions,
        metadata => {
            if (metadataExtends) {
                metadataExtends(metadata as T);
            }
            metadata.adviceName = adviceName as AdviceTypes;
            return metadata;
        }) as IAdviceDecorator<T>;
}

/**
 * aop advice decorator.
 *
 * @Advice
 */
export const Advice: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator('Advice');

/**
 * aop Pointcut advice decorator.
 *
 * @Pointcut
 */
export const Pointcut: IAdviceDecorator<AdviceMetadata> =
    createAdviceDecorator<AdviceMetadata>('Pointcut') as IAdviceDecorator<AdviceMetadata>;


/**
 * aop Before advice decorator.
 *
 * @Before
 */
export const Before: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Before') as IAdviceDecorator<AdviceMetadata>;

/**
 * aop after advice decorator.
 *
 * @After
 */
export const After: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('After') as IAdviceDecorator<AdviceMetadata>;



/**
 * aop around decorator.
 *
 * @export
 * @interface IAroundDecorator
 * @extends {IAdviceDecorator<T>}
 * @template T
 */
export interface IAroundDecorator<T extends AroundMetadata> extends IAdviceDecorator<T> {
    /**
     * define aop around advice.
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param {string} [returning] set name provider of pointcut returing data for advices.
     * @param {string} [throwing] set name provider of pointcut throwing error for advices.
     * @param {string} [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, args?: string, returning?: string, throwing?: string, annotation?: string): MethodDecorator
}

/**
 * aop Around advice decorator.
 *
 * @Around
 */
export const Around: IAroundDecorator<AroundMetadata> =
    createAdviceDecorator<AroundMetadata>(
        'Around',
        null,
        [
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.args = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.returning = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.throwing = arg;
                    ctx.next(next);
                }
            }
        ]) as IAroundDecorator<AroundMetadata>;


/**
 * aop after returning decorator.
 *
 * @export
 * @interface IAfterReturningDecorator
 * @extends {IAdviceDecorator<T>}
 * @template T
 */
export interface IAfterReturningDecorator<T extends AfterReturningMetadata> extends IAdviceDecorator<T> {
    /**
     * define aop after returning advice.
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param {string} [returning] set name provider of pointcut returing data for advices.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, returning?: string, annotation?: string): MethodDecorator;
}

/**
 * aop after returning advice decorator.
 *
 * @AfterReturning
 */
export const AfterReturning: IAfterReturningDecorator<AfterReturningMetadata> =
    createAdviceDecorator<AfterReturningMetadata>(
        'AfterReturning',
        null,
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.returning = arg;
                ctx.next(next);
            }
        }
    ) as IAfterReturningDecorator<AfterReturningMetadata>;

/**
 * aop after throwing decorator.
 *
 * @export
 * @interface IAfterThrowingDecorator
 * @extends {IAdviceDecorator<T>}
 * @template T
 */
export interface IAfterThrowingDecorator<T extends AfterThrowingMetadata> extends IAdviceDecorator<T> {
    /**
     * define aop after throwing advice.
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param {string} [throwing] set name provider of pointcut throwing error for advices.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, throwing?: string, annotation?: string): MethodDecorator
}

/**
 * aop after throwing advice decorator.
 *
 * @AfterThrowing
 */
export const AfterThrowing: IAfterThrowingDecorator<AfterThrowingMetadata> =
    createAdviceDecorator<AfterThrowingMetadata>(
        'AfterThrowing',
        null,
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.throwing = arg;
                ctx.next(next);
            }
        }
    ) as IAfterThrowingDecorator<AfterThrowingMetadata>;
