import { Exception, HandlerFn, InterceptorFn, isFunction } from '@tsdi/ioc';
import { from, lastValueFrom } from 'rxjs';
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
export function convertToInterceptor<TInput = any, TContext extends AbstractRequestContext = AbstractRequestContext>(middleware: MiddlewareLike<TContext>): InterceptorFn<TInput> {
    return (input: TInput, next: HandlerFn<TInput>, context: TContext) => {
        if (isFunction(middleware)) {
            return from(middleware(context, () => lastValueFrom(next(input, context))))
        } else {
            return from(middleware.invoke(context, () => lastValueFrom(next(input, context))))
        }
    }
}


/**
 * compose middleware in chain.
 * @param middlewares 
 */
export function composeMiddleware<T extends AbstractRequestContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
    return (ctx: T, next: () => Promise<void>) => {
        return dispatchChain(middlewares, ctx, next);
    }
}

/**
 * dispatch middleware in chain.
 *
 * @export
 * @template T input context type.
 * @template TR returnning type.
 * @param {Handler<T>[]} middlewares to run handlers in chain. array of {@link Handler}.
 * @param {T} ctx input context.
 * @param {() => Promise<void> [next] the next step.
 */
function dispatchChain<T extends AbstractRequestContext>(middlewares: MiddlewareLike<T>[], ctx: T, next?: () => Promise<void>): Promise<void> {
    if (!middlewares.length) return null!;
    let index = -1;
    function dispatch(i: number): Promise<void> {
        if (i <= index) {
            throw new Exception('next called mutiple times.');
        }
        index = i;
        let handle = middlewares[i];
        if (i === middlewares.length) {
            handle = next!
        }
        if (!handle) {
            return Promise.resolve(next?.());
        }
        const gnext = dispatch.bind(null, i + 1);
        return isFunction(handle) ? handle(ctx, gnext) : handle.invoke(ctx, gnext)
    }
    return dispatch(0)
}
