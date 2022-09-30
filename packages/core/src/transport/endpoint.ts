import { Abstract, Handler, isFunction, Type, chain, lang } from '@tsdi/ioc';
import { Observable, defer } from 'rxjs';
import { EndpointContext, ServerEndpointContext } from './context';


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

