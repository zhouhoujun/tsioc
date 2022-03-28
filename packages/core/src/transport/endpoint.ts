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


/**
 * middleware chain. for composing middlewares. Requests will
 * traverse them in the order they're declared. That is, the first middleware
 * is treated as the outermost middleware.
 */
export class Chain<T extends TransportContext = TransportContext> implements Endpoint<T> {

    private chain!: Endpoint<T>;
    constructor(private backend: EndpointFn<T> | Endpoint<T>, private middlewares: Middleware<T>[]) {

    }

    endpoint(ctx: T): Observable<T> {
        if (!this.chain) {
            const endpoint = this.middlewares.reduceRight(
                (next, middleware) => new InterceptorEndpint(next, middleware), this.backend);
            this.chain = isFunction(endpoint) ? { endpoint } : endpoint;
        }
        return this.chain.endpoint(ctx);
    }
}


/**
 * Interceptor Handler.
 */
export class InterceptorEndpint<T extends TransportContext = TransportContext> implements Endpoint<T> {
    private middle: Middleware<T>;
    private next: Endpoint<T>;
    constructor(endpoint: Endpoint<T> | EndpointFn<T>, middleware: MiddlewareFn<T> | Middleware<T>) {
        this.next = isFunction(endpoint) ? { endpoint } : endpoint;
        this.middle = isFunction(middleware) ? { middleware } : middleware;
    }

    endpoint(ctx: T): Observable<T> {
        return this.middle.middleware(ctx, this.next);
    }
}


// /**
//  * Endpoint is the fundamental building block of servers and clients.
//  */
// export interface TransportEndpoint<TRequest, TResponse> {
//     /**
//      * transport server endpoint.
//      * @param req request input.
//      */
//     handle(req: TRequest): Observable<TResponse>;
// }

// /**
//  * Middlewarable implements {@link DispatchHandler}.
//  *
//  * @export
//  */
// export interface Middlewarable<T extends TransportContext = TransportContext> {
//     /**
//      * middleware handle.
//      *
//      * @abstract
//      * @param {T} ctx
//      * @param {() => Promise<void>} next
//      * @returns {Promise<void>}
//      */
//     middleware(ctx: T, next?: () => Promise<void>): Promise<void>;
// }

// /**
//  * Middleware is a chainable behavior modifier for endpoints.
//  */
// export type MiddlewareFn<T extends TransportContext = TransportContext> = Handler<T, Promise<void>>
// /**
//  * middleware for server endpoint {@link TransportEndpoint}.
//  */
// export type Middleware<T extends TransportContext = TransportContext> = MiddlewareFn<T> | Middlewarable<T>;

// /**
//  * middleware chain. for composing middlewares. Requests will
//  * traverse them in the order they're declared. That is, the first middleware
//  * is treated as the outermost middleware.
//  */
// export class Chain<T extends TransportContext = TransportContext> implements Middlewarable<T> {
//     private middlewares: MiddlewareFn[];
//     constructor(middlewares: Middleware[]) {
//         this.middlewares = middlewares.map(m => isFunction(m) ? m : (ctx, next) => m.middleware(ctx, next));
//     }

//     middleware(ctx: T, next?: () => Promise<void>): Promise<void> {
//         return chain(this.middlewares, ctx, next);
//     }
// }
