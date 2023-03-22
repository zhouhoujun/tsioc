import { chain, isFunction, lang } from '@tsdi/ioc';
import { defer, Observable } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { Endpoints, EndpointBackend, FnEndpoint } from '../Endpoint';
import { Middleware, MiddlewareContext, MiddlewareFn, MiddlewareLike } from './middleware';



/**
 * parse to MiddewareFn if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareFnify<T extends MiddlewareContext>(m: MiddlewareLike<T>): MiddlewareFn<T> {
    return isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next));
}


/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends MiddlewareContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
    const middleFns = middlewares.filter(m => m).map(m => middlewareFnify<T>(m));
    return chain(middleFns)
}

/**
 * empty next.
 */
export const NEXT = () => Promise.resolve();

/**
 * middleware chain.
 */
export class MiddlewareChain implements Middleware {

    private _chainFn?: MiddlewareFn;
    constructor(private middlewares: (Middleware | MiddlewareFn)[]) { }

    invoke<T extends MiddlewareContext>(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            this._chainFn = compose(this.middlewares)
        }
        return this._chainFn(ctx, next ?? NEXT)
    }

}


/**
 * middleware backend.
 */
export class MiddlewareBackend<TRequest, TResponse, Tx extends MiddlewareContext = MiddlewareContext> implements EndpointBackend<TRequest, TResponse> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private middlewares: MiddlewareLike<Tx>[]) { }

    handle(req: TRequest, context: Tx): Observable<TResponse> {
        return defer(async () => {
            if (!this._middleware) {
                this._middleware = compose(this.middlewares)
            }
            await this._middleware(context, NEXT);
            return context.response as TResponse;
        })
    }

    equals(target: any): boolean {
        return this.middlewares === target?.middlewares;
    }
}

/**
 * interceptor middleware.
 */
export class InterceptorMiddleware<TRequest = any, TResponse = any> implements Middleware {

    private _chainFn?: MiddlewareFn;
    constructor(private readonly middleware: MiddlewareLike, private readonly interceptors: Interceptor<TRequest, TResponse>[]) { }

    invoke<T extends MiddlewareContext>(ctx: T, next: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            const chain = new Endpoints(new FnEndpoint((req, ctx) => defer(async () => {
                await (isFunction(this.middleware)? this.middleware(ctx as T, next) :  this.middleware.invoke(ctx as T, next));
                return (ctx as T).response as TResponse;
            })), this.interceptors);
            this._chainFn = (ctx: MiddlewareContext) => {
                const defer = lang.defer<void>();
                const cancel = chain.handle(ctx.request as TRequest, ctx)
                    .subscribe({
                        error: (err) => {
                            defer.reject(err);
                        },
                        next: (val) => {
                            defer.resolve();
                        }
                    });
                ctx.onDestroy(() => cancel?.unsubscribe());

                return defer.promise;
            }
        }
        return this._chainFn(ctx, next ?? NEXT)
    }
}
