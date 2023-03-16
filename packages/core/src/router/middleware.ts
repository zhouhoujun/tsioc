import { chain, Handler, isFunction, lang, Type } from '@tsdi/ioc';
import { defer, Observable } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { Endpoints, EndpointBackend, FnEndpoint } from '../Endpoint';
import { EndpointContext } from '../filters/context';

/**
 * middleware context.
 */
export abstract class MiddlewareContext<TRequest = any, TResponse = any> extends EndpointContext {
    /**
     * url
     */
    abstract get url(): string;
    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport response.
     */
    abstract get response(): TResponse;

    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    abstract redirect?(url: string, alt?: string): void;
}


/**
 * Middleware is a chainable behavior modifier for context.
 */
export interface Middleware<T extends MiddlewareContext = MiddlewareContext> {
    /**
     * invoke the middleware.
     * @param ctx  context with request and response.
     * @param next The next middleware in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    invoke(ctx: T, next: () => Promise<void>): Promise<void>;
}
/**
 * middleware function
 */
export type MiddlewareFn<T extends MiddlewareContext = MiddlewareContext> = Handler<T, Promise<void>>;
/**
 * middleware like.
 */
export type MiddlewareLike<T extends MiddlewareContext = MiddlewareContext> = Middleware<T> | MiddlewareFn<T>;
/**
 * middleware type.
 */
export type MiddlewareType<T extends MiddlewareContext = MiddlewareContext> = Type<Middleware<T>> | MiddlewareLike<T>;



/**
 * create middleware
 * @param invoke 
 * @returns 
 */
export function createMiddleware<T extends MiddlewareContext>(invoke: MiddlewareFn<T>): Middleware<T> {
    return { invoke };
}

/**
 * parse to Middeware if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareify<T extends MiddlewareContext>(m: MiddlewareLike<T>): Middleware<T> {
    return isFunction(m) ? createMiddleware(m) : m;
}

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
export class Chain implements Middleware {

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
    constructor(private readonly middleware: Middleware, private readonly interceptors: Interceptor<TRequest, TResponse>[]) { }

    invoke<T extends MiddlewareContext>(ctx: T, next: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            const chain = new Endpoints(new FnEndpoint((req, ctx) => defer(async () => {
                await this.middleware.invoke(ctx as T, next);
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
