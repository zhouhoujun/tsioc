import { chain, Handler, InvocationContext, isFunction } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportContext } from './context';



export type Endpoint2<TRequest = any, TResponse = any> = (ctx: InvocationContext, request: TRequest) => Observable<TResponse>;

export type Middleware2<TRequest = any, TResponse = any> = (next: Endpoint2<TRequest, TResponse>) => Endpoint2<TRequest, TResponse>;


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface TransportEndpoint<TRequest, TResponse> {
    /**
     * transport server endpoint.
     * @param req request input.
     */
    handle(req: TRequest): Observable<TResponse>;
}

/**
 * Middlewarable implements {@link DispatchHandler}.
 *
 * @export
 */
export interface Middlewarable<T extends TransportContext = TransportContext> {
    /**
     * middleware handle.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    middleware(ctx: T, next?: () => Promise<void>): Promise<void>;
}

/**
 * Middleware is a chainable behavior modifier for endpoints.
 */
export type MiddlewareFn<T extends TransportContext = TransportContext> = Handler<T, Promise<void>>
/**
 * middleware for server endpoint {@link TransportEndpoint}.
 */
export type Middleware<T extends TransportContext = TransportContext> = MiddlewareFn<T> | Middlewarable<T>;

/**
 * middleware chain. for composing middlewares. Requests will
 * traverse them in the order they're declared. That is, the first middleware
 * is treated as the outermost middleware.
 */
export class Chain<T extends TransportContext = TransportContext> implements Middlewarable<T> {
    private middlewares: MiddlewareFn[];
    constructor(middlewares: Middleware[]) {
        this.middlewares = middlewares.map(m => isFunction(m) ? m : (ctx, next) => m.middleware(ctx, next));
    }

    middleware(ctx: T, next?: () => Promise<void>): Promise<void> {
        return chain(this.middlewares, ctx, next);
    }
}
