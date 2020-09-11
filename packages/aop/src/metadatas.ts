import { MethodMetadata, ClassType, ClassMetadata, MethodPropMetadata } from '@tsdi/ioc';
import { AdviceTypes } from './types';

/**
 * advice metadata.
 *
 * @export
 * @interface AdviceMetadata
 * @extends {MethodMetadata}
 */
export interface AdviceMetadata extends MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     * match method with a decorator annotation.
     * @annotation(DecoratorName)
     */
    pointcut: string | RegExp;

    /**
     * method with specail decortor.
     *
     * @type {(Function | string)}
     * @memberof AdviceMetadata
     */
    annotation?: Function | string;

    /**
     * math only the object.
     *
     * @type {*}
     * @memberof AdviceMetadata
     */
    target?: any;

    /**
     * advice within.
     *
     * @type {(ClassType | ClassType[])}
     * @memberof AdviceMetadata
     */
    within?: ClassType | ClassType[];

    /**
     * annotation name, special annotation metadata for annotation advices.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    annotationName?: string;

    /**
     * set name provider of annotation metadata for annotation advices.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    annotationArgName?: string;

    /**
     * advice type name.
     * eg. `Before`, `Pointcut`, `Around`, `After`, `AfterThrowing`, `AfterReturning`
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    adviceName?: AdviceTypes;
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
     * @memberof AfterReturningMetadata
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
     * @memberof AfterThrowingMetadata
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
     * @memberof AroundMetadata
     */
    args?: string;
    /**
     * set name provider of pointcut returing data for advices.
     *
     * @type {string}
     * @memberof AroundMetadata
     */
    returning?: string;
}

/**
 * aspect metadata.
 */
export interface AspectMetadata extends ClassMetadata {
    /**
     * set pointcut in the type only.
     *
     * @type {(ClassType | ClassType[])}
     * @memberof AspectMetadata
     */
    within?: ClassType | ClassType[];

    without?: ClassType | ClassType[];

    /**
     * set pointcut in the class with the annotation decorator only.
     *
     * @type {string}
     * @memberof AspectMetadata
     */
    annotation?: string | Function;

}

/**
 * pointcut metadata.
 */
export interface PointcutMetadata extends MethodPropMetadata {

}
