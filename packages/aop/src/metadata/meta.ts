import { MethodMetadata, AbstractType, AnnotationMetadata, MethodPropMetadata } from '@tsdi/ioc';
import { MatchExpress } from '../Advicer';


/**
 * JoinPoint state.
 */
export type AdviceTypes = 'Before' | 'Pointcut' | 'After' | 'AfterReturning' | 'AfterThrowing' | 'Advice' | 'Around';

/**
 * pointcut annotation
 */
export interface PointcutAnnotation {

    /**
     * is sync execute advice or not.
     */
    sync?: boolean;

    /**
     * method with specail decortor.
     *
     * @type {(Function | string)}
     */
    annotation?: Function | string;

    /**
     * annotation name, special annotation metadata for annotation advices.
     *
     * @type {string}
     */
    annotationName?: string;

    /**
     * set name provider of annotation metadata for annotation advices.
     *
     * @type {string}
     */
    annotationArgName?: string;
}


/**
 * advice metadata.
 *
 * @export
 * @interface AdviceMetadata
 * @extends {MethodMetadata}
 */
export interface AdviceMetadata extends PointcutAnnotation, MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     * match method with a decorator annotation.
     * @annotation(DecoratorName)
     */
    pointcut: string | RegExp;
    /**
     * set name provider of pointcut metadata for advices.
     *
     * @type {string}
     **/
    accessor?: 'get' | 'set' | 'value';
    /**
     * math only the object.
     *
     * @type {*}
     */
    target?: any;

    /**
     * advice within.
     *
     * @type {(AbstractType | AbstractType[])}
     */
    within?: AbstractType | AbstractType[];

    without?: AbstractType | AbstractType[];

    /**
     * advice type name.
     * eg. `Before`, `Pointcut`, `Around`, `After`, `AfterThrowing`, `AfterReturning`
     *
     * @type {string}
     */
    adviceName?: AdviceTypes;

    matchFn?: MatchExpress|null;
}

/**
 * after returning metadata.
 *
 * @export
 * @interface AfterReturningMetadata
 * @extends {AdviceMetadata}
 */
export interface AfterReturningMetadata extends AdviceMetadata {
    /**
     * set name provider of pointcut returing data for advices.
     *
     * @type {string}
     */
    returning?: string;
}

/**
 * after throwing metadata.
 */
export interface AfterThrowingMetadata extends AdviceMetadata {
    /**
     * set name provider of pointcut throwing error for advices.
     *
     * @type {string}
     */
    throwing?: string;
}

/**
 * around metadata.
 */
export interface AroundMetadata extends AfterReturningMetadata, AfterThrowingMetadata {
    /**
     * set name provider of annotation metadata for advices.
     *
     * @type {string}
     */
    args?: string;
    /**
     * set name provider of pointcut returing data for advices.
     *
     * @type {string}
     */
    returning?: string;
}

/**
 * aspect metadata.
 */
export interface AspectMetadata extends AnnotationMetadata {
    /**
     * set pointcut in the type only.
     *
     * @type {(AbstractType | AbstractType[])}
     */
    within?: AbstractType | AbstractType[];
    /**
     * aspnet with out.
     */
    without?: AbstractType | AbstractType[];
    /**
     *  aspect way for method.
     *  default static.
     *  
     *  invocation: only in Invocation
     *  class: replace instance method.
     */
    way?: 'invocation' | 'class';
    /**
     * set pointcut in the class with the annotation decorator only.
     *
     * @type {string}
     */
    annotation?: string | Function;

}

/**
 * pointcut metadata.
 */
export type PointcutMetadata = MethodPropMetadata;
