import { HandleResult, RunContext } from '@tsdi/ioc';

/**
 * Vaildator
 */
export interface Vaildator<T = any, TContext extends RunContext = RunContext> {
    /**
     * vaild input throw execption ify.
     * @param req 
     * @param context 
     */
    vaild(input: T, context: TContext): HandleResult<boolean>;
}

/**
 * hander vaild fn.
 */
export type VaildatorFn<T = any, TContext extends RunContext = RunContext> = (input: T, contex: TContext) => HandleResult<boolean>;

/**
 * Vaildator Like.
 * 
 */
export type VaildatorLike<T = any, TContext extends RunContext = RunContext> = Vaildator<T, TContext> | VaildatorFn<T, TContext>;
