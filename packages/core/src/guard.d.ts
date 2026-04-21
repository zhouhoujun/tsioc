import { HandleResult } from '@tsdi/ioc';
/**
 * Handler Guard.
 *
 * 处理器守卫
 */
export interface CanHandle<T = any, TContext = any> {
    /**
     * handler guard. can invoke handler or not.
     *
     * 处理器守卫, 验证可以调用处理器与否。
     * @param input input data.
     * @param context guard with context.
     * @returns can activate or not. type of boolean, Promise<boolean> or Observable<boolean>.
     */
    canHandle(input: T, context?: TContext): HandleResult<boolean>;
}
/**
 * hander guard fn.
 */
export type CanHandleFn<T = any, TContext = any> = (input: T, context?: TContext) => HandleResult<boolean>;
/**
 * Handler Guard.
 *
 * 处理器守卫
 */
export type GuardLike<T = any, TContext = any> = CanHandle<T, TContext> | CanHandleFn<T, TContext>;
/**
 *  guards multi token
 *
 *  处理器守卫组的标记令牌
 */
export declare const GUARDS_TOKEN: import("@tsdi/ioc").InjectToken<CanHandle<any, any>[]>;
