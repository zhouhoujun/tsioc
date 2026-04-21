import { RequestInterceptorFn } from '@tsdi/common';
import { AbstractRequestContext } from '../AbstractRequestContext';
/**
 * Middleware is a chainable behavior modifier for context.
 *
 * 中间件, 可以可链接上下文的行为修饰符。
 */
export interface Middleware<Tx extends AbstractRequestContext = AbstractRequestContext> {
    /**
     * invoke the middleware.
     * @param ctx  context with request and response.
     * @param next The next middleware in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    invoke(ctx: Tx, next: () => Promise<void>): Promise<void>;
}
/**
 * middleware function
 *
 * 中间件函数
 */
export type MiddlewareFn<T extends AbstractRequestContext = AbstractRequestContext> = (ctx: T, next: () => Promise<void>) => Promise<void>;
/**
 * middleware like. instance of middleware or middleware function.
 *
 * 类中间件，中间件或中间件函数。
 */
export type MiddlewareLike<T extends AbstractRequestContext = AbstractRequestContext> = Middleware<T> | MiddlewareFn<T>;
/**
 * convert middleware to interceptor.
 * @param middleware
 * @returns
 */
export declare function convertToInterceptor<TInput = any, TOutput = any, TContext extends AbstractRequestContext = AbstractRequestContext>(middleware: MiddlewareLike): RequestInterceptorFn<TInput, TOutput, TContext>;
/**
 * compose middleware in chain.
 * @param middlewares
 */
export declare function composeMiddleware<T extends AbstractRequestContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T>;
