import { Abstract, Handler, isFunction, Type, chain, lang } from '@tsdi/ioc';
import { Observable, defer } from 'rxjs';
import { EndpointContext, ConnectionContext } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TRequest = any, TResponse = any> {
    /**
     * transport endpoint handle.
     * @param req request input.
     * @param context request context.
     */
    handle(req: TRequest, context: EndpointContext): Observable<TResponse>;
}

/**
 * Endpoint funcation.
 */
export type EndpointFn<TRequest, TResponse> = (req: TRequest, context: EndpointContext) => Observable<TResponse>;

/**
 * endpoint like.
 */
export type EndpointLike<TRequest, TResponse> = Endpoint<TRequest, TResponse> | EndpointFn<TRequest, TResponse>;

/**
 * A final {@link Endpoint} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Middleware sit between the `Client|Server` interface and the `EndpointBackend`.
 *
 * When injected, `EndpointBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
@Abstract()
export abstract class EndpointBackend<TRequest = any, TResponse = any> implements Endpoint<TRequest, TResponse> {
    /**
     * transport endpoint handle.
     * @param req request input.
     * @param context request context.
     */
    abstract handle(req: TRequest, context: EndpointContext): Observable<TResponse>;
}

/**
 * Interceptor is a chainable behavior modifier for `endpoints`.
 */
export interface Interceptor<TRequest = any, TResponse = any> {
    /**
     * the method to implemet interceptor.
     * @param req  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, context: EndpointContext): Observable<TResponse>;
}

/**
 * interceptor function.
 */
export type InterceptorFn<TRequest, TResponse> = (req: TRequest, next: Endpoint<TRequest, TResponse>, context: EndpointContext) => Observable<TResponse>;

/**
 * interceptor like.
 */
export type InterceptorLike<TRequest = any, TResponse = any> = Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>;

/**
 * interceptor function.
 */
export type InterceptorType<TRequest = any, TResponse = any> = Type<Interceptor<TRequest, TResponse>> | InterceptorLike<TRequest, TResponse>;


/**
 * Middleware is a chainable behavior modifier for context.
 */
export interface Middleware<T extends ConnectionContext = ConnectionContext> {
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
export type MiddlewareFn<T extends ConnectionContext = ConnectionContext> = Handler<T, Promise<void>>;
/**
 * middleware like.
 */
export type MiddlewareLike<T extends ConnectionContext = ConnectionContext> = Middleware<T> | MiddlewareFn<T>;
/**
 * middleware type.
 */
export type MiddlewareType<T extends ConnectionContext = ConnectionContext> = Type<Middleware<T>> | MiddlewareLike<T>;


/**
 * Interceptor Endpoint.
 */
export class InterceptorEndpoint<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {
    constructor(private next: Endpoint<TRequest, TResponse>, private interceptor: Interceptor<TRequest, TResponse>) { }

    handle(req: TRequest, context: EndpointContext): Observable<TResponse> {
        return this.interceptor.intercept(req, this.next, context)
    }
}

/**
 * Interceptor chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class InterceptorChain<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {

    private chain!: Endpoint<TRequest, TResponse>;
    private backend: EndpointBackend<TRequest, TResponse>;
    private interceptors: Interceptor<TRequest, TResponse>[];
    constructor(backend: EndpointLike<TRequest, TResponse>, interceptors: InterceptorLike<TRequest, TResponse>[]) {
        this.backend = endpointify(backend);
        this.interceptors = interceptors.map(i => interceptorify(i))
    }

    handle(req: TRequest, context: EndpointContext): Observable<TResponse> {
        if (!this.chain) {
            this.chain = this.interceptors.reduceRight(
                (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.backend)
        }
        return this.chain.handle(req, context)
    }
}

/**
 * create endpoint by EndpointFn
 * @param handle 
 * @returns 
 */
export function createEndpoint<TRequest, TResponse>(handle: EndpointFn<TRequest, TResponse>): Endpoint<TRequest, TResponse> {
    return { handle };
}

/**
 * parse to Endpoint if not. 
 * @param e type of {@link EndpointLike}
 * @returns 
 */
export function endpointify<TRequest, TResponse>(e: EndpointLike<TRequest, TResponse>): Endpoint<TRequest, TResponse> {
    return isFunction(e) ? createEndpoint(e) : e;
}

/**
 * create interceptor
 * @param intercept 
 * @returns 
 */
export function createInterceptor<TRequest, TResponse>(intercept: InterceptorFn<TRequest, TResponse>): Interceptor<TRequest, TResponse> {
    return { intercept };
}

/**
 * parse to Interceptor if not. 
 * @param i type of {@link InterceptorLike}
 * @returns 
 */
export function interceptorify<TRequest, TResponse>(i: InterceptorLike<TRequest, TResponse>): Interceptor<TRequest, TResponse> {
    return isFunction(i) ? createInterceptor(i) : i;
}

/**
 * create middleware
 * @param invoke 
 * @returns 
 */
export function createMiddleware<T extends ConnectionContext>(invoke: MiddlewareFn<T>): Middleware<T> {
    return { invoke };
}

/**
 * parse to Middeware if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareify<T extends ConnectionContext>(m: MiddlewareLike<T>): Middleware<T> {
    return isFunction(m) ? createMiddleware(m) : m;
}

/**
 * parse to MiddewareFn if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareFnify<T extends ConnectionContext>(m: MiddlewareLike<T>): MiddlewareFn<T> {
    return isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next));
}

/**
 * middleware backend.
 */
export class MiddlewareBackend<TRequest, TResponse, Tx extends ConnectionContext> implements EndpointBackend<TRequest, TResponse> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private middlewares: MiddlewareLike<Tx>[]) {

    }

    handle(req: TRequest, context: Tx): Observable<TResponse> {
        return defer(async () => {
            if (context.request != req) {
                context.request = req;
            }
            if (!this._middleware) {
                this._middleware = compose(this.middlewares)
            }
            await this._middleware(context, NEXT);
            return context.response
        })
    }

}

/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends ConnectionContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
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
    constructor(private middlewares: (Middleware | MiddlewareFn)[]) {

    }

    invoke<T extends ConnectionContext>(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            this._chainFn = compose(this.middlewares)
        }
        return this._chainFn(ctx, next ?? NEXT)
    }

}

/**
 * interceptor middleware.
 */
export class InterceptorMiddleware<TRequest, TResponse> implements Middleware {

    private _chainFn?: MiddlewareFn;
    private interceptors: Interceptor<TRequest, TResponse>[];
    private middleware: Middleware;
    constructor(middleware: MiddlewareLike, interceptors: InterceptorLike<TRequest, TResponse>[]) {
        this.middleware = middlewareify(middleware);
        this.interceptors = interceptors.map(i => interceptorify(i));
    }

    invoke<T extends ConnectionContext>(ctx: T, next: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            const chain = new InterceptorChain<TRequest, TResponse>((req, ctx) => defer(async () => {
                await this.middleware.invoke(ctx as T, next);
                return (ctx as T).response;
            }), this.interceptors);
            this._chainFn = (ctx: ConnectionContext) => {
                const defer = lang.defer<void>();
                const cancel = chain.handle(ctx.request, ctx)
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
