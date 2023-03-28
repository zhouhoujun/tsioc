import { chain, isFunction, lang } from '@tsdi/ioc';
import { defer, Observable } from 'rxjs';
import { Middleware, MiddlewareFn, MiddlewareLike } from './middleware';
import { FnEndpoint } from '../endpoints/fn.endpoint';
import { Endpoints } from '../endpoints/chain';
import { EndpointContext } from '../endpoints/context';
import { Interceptor } from '../Interceptor';
import { Backend } from '../Handler';



/**
 * parse to MiddewareFn if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareFnify<T extends EndpointContext>(m: MiddlewareLike<T>): MiddlewareFn<T> {
    return isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next));
}


/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends EndpointContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
    const middleFns = middlewares.filter(m => m).map(m => middlewareFnify<T>(m));
    return chain(middleFns)
}

/**
 * empty next.
 */
export const NEXT = () => Promise.resolve();


/**
 * middleware backend.
 */
export class MiddlewareBackend<Tx extends EndpointContext, TResponse> implements Backend<Tx, TResponse> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private middlewares: MiddlewareLike<Tx>[]) { }

    handle(context: Tx): Observable<TResponse> {
        return defer(async () => {
            if (!this._middleware) {
                this._middleware = compose(this.middlewares)
            }
            await this._middleware(context, NEXT);
            return context.payload.response;
        })
    }

    equals(target: any): boolean {
        return this.middlewares === target?.middlewares;
    }
}

/**
 * interceptor middleware.
 */
export class InterceptorMiddleware<Tx extends EndpointContext = EndpointContext, TResponse = any> implements Middleware {

    private _chainFn?: MiddlewareFn<Tx>;
    constructor(private readonly middleware: MiddlewareLike<Tx>, private readonly interceptors: Interceptor<Tx, TResponse>[]) { }

    invoke(ctx: Tx, next: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            const chain = new Endpoints<Tx, TResponse>(new FnEndpoint((ctx) => defer(async () => {
                await (isFunction(this.middleware)? this.middleware(ctx, next) :  this.middleware.invoke(ctx, next));
                return ctx.payload.response;
            })), this.interceptors);
            this._chainFn = (ctx: Tx) => {
                const defer = lang.defer<void>();
                const cancel = chain.handle(ctx)
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
