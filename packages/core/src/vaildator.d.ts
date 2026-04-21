import { HandleResult, RunContext } from '@tsdi/ioc';
export interface ValidateResult {
    status: boolean;
    message?: string;
}
/**
 * Vaildator
 */
export interface Vaildator<T = any, TContext extends RunContext = RunContext> {
    /**
     * vaild input throw execption ify.
     * @param req
     * @param context
     */
    vaild(input: T, context: TContext): HandleResult<ValidateResult>;
}
/**
 * hander vaild fn.
 */
export type VaildatorFn<T = any, TContext extends RunContext = RunContext> = (input: T, contex: TContext) => HandleResult<ValidateResult>;
/**
 * Vaildator Like.
 *
 */
export type VaildatorLike<T = any, TContext extends RunContext = RunContext> = Vaildator<T, TContext> | VaildatorFn<T, TContext>;
