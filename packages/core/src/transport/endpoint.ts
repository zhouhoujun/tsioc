import { isFunction } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportContext } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export type EndpointFn<T extends TransportContext = TransportContext> = (context: T) => Observable<T>;

/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<T extends TransportContext = TransportContext> {
    /**
     * update endpoint.
     * @param ctx 
     */
    endpoint(ctx: T): Observable<T>;
}


/**
 * Middleware is a chainable behavior modifier for endpoints.
 */
export type MiddlewareFn<T extends TransportContext = TransportContext> = (context: T, next: Endpoint<T>) => Observable<T>;

/**
 * Middlewarable
 */
export interface Middleware<T extends TransportContext = TransportContext> {
    /**
     * middleware handle.
     *
     * @abstract
     * @param {T} ctx
     * @param {Endpoint<T>} next
     * @returns {Observable<T>}
     */
    middleware(ctx: T, next: Endpoint<T>): Observable<T>;
}

export type TransportMiddleware<T extends TransportContext = TransportContext> = Middleware<T> | MiddlewareFn<T>;

/**
 * middleware chain. for composing middlewares. Requests will
 * traverse them in the order they're declared. That is, the first middleware
 * is treated as the outermost middleware.
 */
export class Chain<T extends TransportContext = TransportContext> implements Endpoint<T> {

    private chain!: Endpoint<T>;
    constructor(private backend: EndpointFn<T> | Endpoint<T>, private middlewares: TransportMiddleware<T>[]) {

    }

    endpoint(ctx: T): Observable<T> {
        if (!this.chain) {
            const endpoint = this.middlewares.reduceRight(
                (next, middleware) => new InterceptorEndpoint(next, middleware), this.backend);
            this.chain = isFunction(endpoint) ? { endpoint } : endpoint;
        }
        return this.chain.endpoint(ctx);
    }
}


/**
 * Interceptor endpoint.
 */
export class InterceptorEndpoint<T extends TransportContext = TransportContext> implements Endpoint<T> {
    private middle: Middleware<T>;
    private next: Endpoint<T>;
    constructor(endpoint: Endpoint<T> | EndpointFn<T>, middleware: TransportMiddleware<T>) {
        this.next = isFunction(endpoint) ? { endpoint } : endpoint;
        this.middle = isFunction(middleware) ? { middleware } : middleware;
    }

    endpoint(ctx: T): Observable<T> {
        return this.middle.middleware(ctx, this.next);
    }
}

