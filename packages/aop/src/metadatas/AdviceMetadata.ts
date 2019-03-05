import { MethodMetadata, Type } from '@ts-ioc/ioc';

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
     * @type {(Type<any> | Type<any>[])}
     * @memberof AdviceMetadata
     */
    within?: Type<any> | Type<any>[];

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
    adviceName?: string;
}
