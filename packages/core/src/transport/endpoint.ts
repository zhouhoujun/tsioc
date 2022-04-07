import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportContext } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TRequest extends TransportContext = TransportContext, TResponse = any> {
    /**
     * transport endpoint handle.
     * @param ctx request input with context.
     */
    handle(ctx: TRequest): Observable<TResponse>;
}

/**
 * A final {@link Endpoint} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Middleware sit between the `Client|Server` interface and the `EndpointBackend`.
 *
 * When injected, `EndpointBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
@Abstract()
export abstract class EndpointBackend<TRequest extends TransportContext, TResponse> implements Endpoint<TRequest, TResponse> {
    /**
     * transport endpoint handle.
     * @param ctx request input with context.
     */
    abstract handle(ctx: TRequest): Observable<TResponse>;
}

/**
 * Middleware is a chainable behavior modifier for endpoints.
 */
export interface Middleware<TRequest extends TransportContext = TransportContext, TResponse = any> {
    /**
     * the method to implemet middleware.
     * @param ctx  request with context.
     * @param next The next middleware in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(ctx: TRequest, next: Endpoint<TRequest, TResponse>): Observable<TResponse>;
}


/**
 * Middleware Endpoint.
 */
export class MiddlewareEndpoint<TRequest extends TransportContext = TransportContext, TResponse = any> implements Endpoint<TRequest, TResponse> {
    constructor(private next: Endpoint<TRequest, TResponse>, private middleware: Middleware<TRequest, TResponse>) { }

    handle(ctx: TRequest): Observable<TResponse> {
        return this.middleware.intercept(ctx, this.next);
    }
}

/**
 * middleware chain. for composing middlewares. Requests will
 * traverse them in the order they're declared. That is, the first middleware
 * is treated as the outermost middleware.
 */
export class Chain<TRequest extends TransportContext, TResponse> implements Endpoint<TRequest, TResponse> {

    private chain!: Endpoint<TRequest, TResponse>;
    constructor(private backend: EndpointBackend<TRequest, TResponse>, private middlewares: Middleware<TRequest, TResponse>[]) {

    }

    handle(ctx: TRequest): Observable<TResponse> {
        if (!this.chain) {
            this.chain = this.middlewares.reduceRight(
                (next, middleware) => new MiddlewareEndpoint(next, middleware), this.backend);
        }
        return this.chain.handle(ctx);
    }
}
