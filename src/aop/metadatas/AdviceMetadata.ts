import { MethodMetadata } from '../../core/index';

export interface AdviceMetadata extends MethodMetadata {
    /**
     * path or module name, match express
     * execution(moduelName.*.*(..)")
     */
    pointcut?: string | RegExp;

    adviceName?: string;
}
