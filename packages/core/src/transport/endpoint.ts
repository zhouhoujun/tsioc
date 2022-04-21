import { Abstract, chain, Handler, isFunction } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { TransportContext, TransportContextFactory } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TRequest, TResponse> {
    /**
     * transport endpoint handle.
     * @param req request input with context.
     */
    handle(req: TRequest): Observable<TResponse>;
}

export type EndpointFn<TRequest, TResponse> = (req: TRequest) => Observable<TResponse>;


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
     * @param req request input with context.
     */
    abstract handle(req: TRequest): Observable<TResponse>;
}

/**
 * Interceptor is a chainable behavior modifier for endpoints.
 */
export interface Interceptor<TRequest, TResponse> {
    /**
     * the method to implemet interceptor.
     * @param req  request with context.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>): Observable<TResponse>;
}

/**
 * interceptor function.
 */
export type InterceptorFn<TRequest, TResponse> = (req: TRequest, next: Endpoint<TRequest, TResponse>) => Observable<TResponse>;


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
 * Interceptor Endpoint.
 */
export class InterceptorEndpoint<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {
    constructor(private next: Endpoint<TRequest, TResponse>, private middleware: Interceptor<TRequest, TResponse>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.middleware.intercept(req, this.next);
    }
}

/**
 * Interceptor chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class Chain<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {

    private chain!: Endpoint<TRequest, TResponse>;
    private backend: EndpointBackend<TRequest, TResponse>;
    constructor(backend: EndpointBackend<TRequest, TResponse> | EndpointFn<TRequest, TResponse>, private interceptors: Interceptor<TRequest, TResponse>[]) {
        this.backend = isFunction(backend) ? { handle: backend } : backend;
    }

    handle(req: TRequest): Observable<TResponse> {
        if (!this.chain) {
            this.chain = this.interceptors.reduceRight(
                (next, middleware) => new InterceptorEndpoint(next, middleware), this.backend);
        }
        return this.chain.handle(req);
    }
}

/**
 * middleware backend.
 */
export class MiddlewareBackend<TRequest, TResponse> implements EndpointBackend<TRequest, TResponse> {

    private _middles?: MiddlewareFn[];
    constructor(private factory: TransportContextFactory<TRequest, TResponse>, private backend: EndpointBackend<TRequest, TResponse>, private middlewares: (Middleware | MiddlewareFn)[]) {

    }

    handle(req: TRequest): Observable<TResponse> {
        return this.backend.handle(req)
            .pipe(
                mergeMap(async resp => {
                    if (!this._middles) {
                        this._middles = this.middlewares.map(m => isFunction(m) ? m : (ctx, nt) => m.invoke(ctx, nt));
                    }
                    try {
                        const ctx = this.factory.create({ request: req, response: resp });
                        await chain(this._middles, ctx);
                    } catch (err) {
                        throw err;
                    }
                    return resp;
                })
            );
    }

}
