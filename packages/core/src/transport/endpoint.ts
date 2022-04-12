import { Abstract, isFunction } from '@tsdi/ioc';
import { Observable } from 'rxjs';


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
 * Middleware is a chainable behavior modifier for endpoints.
 */
export interface Middleware<TRequest, TResponse> {
    /**
     * the method to implemet middleware.
     * @param req  request with context.
     * @param next The next middleware in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>): Observable<TResponse>;
}


/**
 * Middleware Endpoint.
 */
export class MiddlewareEndpoint<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {
    constructor(private next: Endpoint<TRequest, TResponse>, private middleware: Middleware<TRequest, TResponse>) { }

    handle(req: TRequest): Observable<TResponse> {
        return this.middleware.intercept(req, this.next);
    }
}

/**
 * middleware chain. for composing middlewares. Requests will
 * traverse them in the order they're declared. That is, the first middleware
 * is treated as the outermost middleware.
 */
export class Chain<TRequest, TResponse> implements Endpoint<TRequest, TResponse> {

    private chain!: Endpoint<TRequest, TResponse>;
    private backend: EndpointBackend<TRequest, TResponse>;
    constructor(backend: EndpointBackend<TRequest, TResponse> | ((req: TRequest) => Observable<TResponse>), private middlewares: Middleware<TRequest, TResponse>[]) {
        this.backend = isFunction(backend) ? { handle: backend } : backend;
    }

    handle(req: TRequest): Observable<TResponse> {
        if (!this.chain) {
            this.chain = this.middlewares.reduceRight(
                (next, middleware) => new MiddlewareEndpoint(next, middleware), this.backend);
        }
        return this.chain.handle(req);
    }
}
