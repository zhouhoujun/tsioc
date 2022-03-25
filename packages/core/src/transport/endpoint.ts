import { Handler, isFunction } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportContext } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TRequest = any, TResponse = any> {
    /**
     * Endpoint is the fundamental building block of servers and clients.
     * @param ctx 
     * @param request 
     */
    handle(ctx: TransportContext, request: TRequest): Observable<TResponse>
}


/**
 * Middleware is a chainable behavior modifier for endpoints.
 */
export type MiddlewareFn<TRequest, TResponse> = (endpoint: Endpoint<TRequest, TResponse>) => Endpoint<TRequest, TResponse>

/**
 * Middleware is a chainable behavior modifier for endpoints.
 */
export interface TransportMiddleware<TRequest, TResponse> {
    /**
    * the method to modifier endpoint.
    * @param endpoint.
    */
    handle(endpoint: Endpoint<TRequest, TResponse>): Endpoint<TRequest, TResponse>;
}

export type MiddlewareType<TRequest = any, TResponse = any> = MiddlewareFn<TRequest, TResponse> | TransportMiddleware<TRequest, TResponse>

/**
 * toChain is a helper function for composing middlewares. Requests will
 * traverse them in the order they're declared. That is, the first middleware
 * is treated as the outermost middleware.
 */
export function toChain(outer: MiddlewareType, ...others: MiddlewareType[]): MiddlewareType {
    return (next: Endpoint) => {
        for (let i = others.length - 1; i >= 0; i--) { // reverse
            next = modifier(others[i], next)
        }
        return modifier(outer, next);
    }
}

function modifier(outer: MiddlewareType, next: Endpoint) {
    return isFunction(outer) ? outer(next) : outer.handle(next);
}





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
    handle(ctx: T, next?: () => Promise<void>): Promise<void>;
}


/**
 * middleware for server endpoint {@link TransportEndpoint}.
 */
export type Middleware<T extends TransportContext = TransportContext> = Handler<TransportContext, Promise<void>> | Middlewarable<T>;

/**
 * middleware chain.
 */
export class Chain<T extends TransportContext = TransportContext> implements Middlewarable<T> {
    constructor(private middlewares: Middleware[]) { }
    async handle(ctx: T, next?: () => Promise<void>): Promise<void> {
        // return chain(this.middlewares, ctx, next);
    }
}
