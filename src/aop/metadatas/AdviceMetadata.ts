import { MethodMetadata } from '../../core/index';

export interface AdviceMetadata extends MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     * match method with a decorator annotation.
     * @annotation(DecoratorName)
     */
    pointcut?: string | RegExp;

    adviceName?: string;
}
