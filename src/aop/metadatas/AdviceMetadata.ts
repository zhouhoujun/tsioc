import { MethodMetadata } from '../../core/index';

export interface AdviceMetadata extends MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     * match method with a decorator annotation.
     * @annotation(DecoratorName)
     */
    pointcut: string | RegExp;

    /**
     * set name provider of annotation metadata for annotation advices.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    annotation?: string;

    /**
     * advice name.
     *
     * @type {string}
     * @memberof AdviceMetadata
     */
    adviceName?: string;
}
