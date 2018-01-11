import { MethodMetadata } from '../../core/index';

export interface AdviceMetadata extends MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     */
    pointcut?: string | RegExp;
    /**
     * match point with a decorator annotationl
     * eg. @annotation(DecoratorName)
     * @type {string}
     * @memberof AdviceMetadata
     */
    annotation?: string;

    adviceName?: string;
}
