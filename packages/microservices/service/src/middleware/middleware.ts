import { Exception, HandlerFn, isFunction } from '@tsdi/ioc';
import { from, lastValueFrom, map, Observable } from 'rxjs';
import { RequestContext, RequestInterceptorFn } from '@tsdi/common';


/**
 * Middleware is a chainable behavior modifier for context.
 *
 * 中间件, 可以可链接上下文的行为修饰符。
 */
export interface Middleware<Tx extends RequestContext = RequestContext> {
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
export type MiddlewareFn<T extends RequestContext = RequestContext> = (ctx: T, next: () => Promise<void>) => Promise<void>;
/**
 * middleware like. instance of middleware or middleware function.
 *
 * 类中间件，中间件或中间件函数。
 */
export type MiddlewareLike<T extends RequestContext = RequestContext> = Middleware<T> | MiddlewareFn<T>;

/**
 * convert middleware to interceptor.
 * @param middleware
 * @returns
 */
export function convertToInterceptor<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext>(middleware: MiddlewareLike): RequestInterceptorFn<TInput, TOutput, TContext> {
    return (input: TInput, next: HandlerFn<TInput, Observable<TOutput>, TContext>, context: TContext) => {
        let nextCalled = false;
        let nextResult: TOutput | undefined;
        const nextFn = async () => {
            nextCalled = true;
            nextResult = await lastValueFrom(next(input, context) as any);
        };

        return from(isFunction(middleware) ? middleware(context, nextFn) : middleware.invoke(context, nextFn)).pipe(
            map(() => {
                if (nextCalled) {
                    return nextResult as TOutput;
                }
                return undefined as unknown as TOutput;
            })
        ) as Observable<TOutput>;
    };
}

/**
 * compose middleware in chain.
 * @param middlewares
 */
export function composeMiddleware<T extends RequestContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
    return (ctx: T, next: () => Promise<void>) => {
        return dispatchChain(middlewares, ctx, next);
    };
}

/**
 * dispatch middleware in chain.
 *
 * @export
 * @template T input context type.
 * @template TR returnning type.
 * @param {Handler<T>[]} middlewares to run handlers in chain. array of {@link Handler}.
 * @param {T} ctx input context.
 * @param {() => Promise<void>} [next] the next step.
 */
function dispatchChain<T extends RequestContext>(middlewares: MiddlewareLike<T>[], ctx: T, next?: () => Promise<void>): Promise<void> {
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
        return isFunction(handle) ? handle(ctx, gnext) : handle.invoke(ctx, gnext);
    }
    return dispatch(0);
}
