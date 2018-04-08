import { MethodMetadata } from '@tsioc/core';

export interface AdviceMetadata extends MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     * match method with a decorator annotation.
     * @annotation(DecoratorName)
     */
    pointcut: string | RegExp;

    /**
     * annotation name, special annotation metadata for annotation advices.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    annotation?: string;

    /**
     * set name provider of annotation metadata for annotation advices.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    annotationArgName?: string;

    /**
     * advice name.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    adviceName?: string;
}
