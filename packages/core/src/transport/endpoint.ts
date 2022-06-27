import { Abstract, Handler, isFunction, Type, chain, lang } from '@tsdi/ioc';
import { from, Observable, mergeMap, defer } from 'rxjs';
import { EndpointContext, TransportContext } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TRequest, TResponse> {
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
 * A final {@link Endpoint} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Middleware sit between the `Client|Server` interface and the `EndpointBackend`.
 *
 * When injected, `EndpointBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
@Abstract()
export abstract class EndpointBackend<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {
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
 * interceptor instance.
 */
export type InterceptorInst<TRequest = any, TResponse = any> = Interceptor<TRequest, TResponse> | InterceptorFn<TRequest, TResponse>;

/**
 * interceptor function.
 */
export type InterceptorType<TRequest = any, TResponse = any> = Type<Interceptor<TRequest, TResponse>> | Interceptor<TRequest, TResponse>;


/**
 * Middleware is a chainable behavior modifier for context.
 */
export interface Middleware<T extends TransportContext = TransportContext> {
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
export type MiddlewareFn<T extends TransportContext = TransportContext> = Handler<T, Promise<void>>;
/**
 * middleware instance.
 */
export type MiddlewareInst<T extends TransportContext = TransportContext> = Middleware<T> | MiddlewareFn<T>;
/**
 * middleware type.
 */
export type MiddlewareType<T extends TransportContext = TransportContext> = Type<Middleware<T>> | Middleware<T>;


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
    constructor(backend: EndpointBackend<TRequest, TResponse> | EndpointFn<TRequest, TResponse>, interceptors: InterceptorInst<TRequest, TResponse>[]) {
        this.backend = isFunction(backend) ? { handle: backend } : backend;
        this.interceptors = interceptors.map(intercept => isFunction(intercept) ? ({ intercept }) : intercept)
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
 * custom endpoint.
 */
export class CustomEndpoint<TRequest, TResponse> implements Endpoint<TRequest, TResponse>  {

    constructor(private fn: EndpointFn<TRequest, TResponse>) { }

    handle(req: TRequest, context: EndpointContext): Observable<TResponse> {
        return this.fn(req, context)
    }
}

/**
 * middleware backend.
 */
export class MiddlewareBackend<TRequest, TResponse, Tx extends TransportContext> implements EndpointBackend<TRequest, TResponse> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private backend: EndpointBackend<TRequest, TResponse>, private middlewares: MiddlewareInst<Tx>[]) {

    }

    handle(req: TRequest, context: Tx): Observable<TResponse> {
        return this.backend.handle(req, context)
            .pipe(
                mergeMap(resp => {
                    if (!this._middleware) {
                        this._middleware = compose(this.middlewares)
                    }
                    return from(this._middleware(context, NEXT).then(c => resp))
                })
            )
    }

}

/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends TransportContext>(middlewares: MiddlewareInst<T>[]): MiddlewareFn<T> {
    const middleFns = middlewares.filter(m => m).map(m => isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next)) as MiddlewareFn<T>);
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

    invoke<T extends TransportContext>(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            this._chainFn = compose(this.middlewares)
        }
        return this._chainFn(ctx, next ?? NEXT)
    }

}


export class InterceptorMiddleware<TRequest, TResponse> implements Middleware {

    private _chainFn?: MiddlewareFn;
    private interceptors: Interceptor<TRequest, TResponse>[];
    private middleware: Middleware;
    constructor(middleware: MiddlewareInst, interceptors: InterceptorInst<TRequest, TResponse>[]) {
        this.middleware = isFunction(middleware) ? { invoke: middleware } : middleware;
        this.interceptors = interceptors.map(intercept => isFunction(intercept) ? ({ intercept }) : intercept);
    }

    invoke<T extends TransportContext>(ctx: T, next: () => Promise<void>): Promise<void> {
        if (!this._chainFn) {
            const chain = new InterceptorChain<TRequest, TResponse>((req, ctx) => defer(async () => {
                await this.middleware.invoke(ctx as T, next);
                return (ctx as T).response;
            }), this.interceptors);
            this._chainFn = (ctx: TransportContext) => {
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
                ctx.onDestroy(()=> cancel?.unsubscribe());
                
                return defer.promise;
            }
        }
        return this._chainFn(ctx, next ?? NEXT)
    }
}