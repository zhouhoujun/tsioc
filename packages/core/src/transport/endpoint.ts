import { Abstract, ClassType, isFunction, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from './context';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TInput = any, TOutput = any> {
    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    handle(input: TInput, context: EndpointContext): Observable<TOutput>;
}

/**
 * Endpoint funcation.
 */
export type EndpointFn<TInput, TOutput> = (input: TInput, context: EndpointContext) => Observable<TOutput>;

/**
 * endpoint like.
 */
export type EndpointLike<TInput, TOutput> = Endpoint<TInput, TOutput> | EndpointFn<TInput, TOutput>;

/**
 * A final {@link Endpoint} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Middleware sit between the `Client|Server` interface and the `EndpointBackend`.
 *
 * When injected, `EndpointBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
@Abstract()
export abstract class EndpointBackend<TInput = any, TOutput = any> implements Endpoint<TInput, TOutput> {
    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    abstract handle(input: TInput, context: EndpointContext): Observable<TOutput>;
}

/**
 * Interceptor is a chainable behavior modifier for `endpoints`.
 */
export interface Interceptor<TInput = any, TOutput = any> {
    /**
     * the method to implemet interceptor.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: EndpointContext): Observable<TOutput>;
}

/**
 * interceptor function.
 */
export type InterceptorFn<TInput, TOutput> = (input: TInput, next: Endpoint<TInput, TOutput>, context: EndpointContext) => Observable<TOutput>;

/**
 * interceptor like.
 */
export type InterceptorLike<TInput = any, TOutput = any> = Interceptor<TInput, TOutput> | InterceptorFn<TInput, TOutput>;

/**
 * interceptor function.
 */
export type InterceptorType<TInput = any, TOutput = any> = ClassType<Interceptor<TInput, TOutput>> | InterceptorLike<TInput, TOutput>;


/**
 * Interceptor Endpoint.
 */
export class InterceptorEndpoint<TInput, TOutput> implements Endpoint<TInput, TOutput> {
    constructor(private next: Endpoint<TInput, TOutput>, private interceptor: Interceptor<TInput, TOutput>) { }

    handle(input: TInput, context: EndpointContext): Observable<TOutput> {
        return this.interceptor.intercept(input, this.next, context)
    }
}

/**
 * Interceptor chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class InterceptorChain<TInput, TOutput> implements Endpoint<TInput, TOutput> {

    private chain!: Endpoint<TInput, TOutput>;
    private backend: EndpointBackend<TInput, TOutput>;
    private interceptors: Interceptor<TInput, TOutput>[];
    constructor(backend: EndpointLike<TInput, TOutput>, interceptors: InterceptorLike<TInput, TOutput>[]) {
        this.backend = endpointify(backend);
        this.interceptors = interceptors.map(i => interceptorify(i))
    }

    handle(input: TInput, context: EndpointContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.interceptors.reduceRight(
                (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.backend)
        }
        return this.chain.handle(input, context)
    }
}

/**
 * create endpoint by EndpointFn
 * @param handle 
 * @returns 
 */
export function createEndpoint<TInput, TOutput>(handle: EndpointFn<TInput, TOutput>): Endpoint<TInput, TOutput> {
    return { handle };
}

/**
 * parse to Endpoint if not. 
 * @param e type of {@link EndpointLike}
 * @returns 
 */
export function endpointify<TInput, TOutput>(e: EndpointLike<TInput, TOutput>): Endpoint<TInput, TOutput> {
    return isFunction(e) ? createEndpoint(e) : e;
}

/**
 * create interceptor
 * @param intercept 
 * @returns 
 */
export function createInterceptor<TInput, TOutput>(intercept: InterceptorFn<TInput, TOutput>): Interceptor<TInput, TOutput> {
    return { intercept };
}

/**
 * parse to Interceptor if not. 
 * @param i type of {@link InterceptorLike}
 * @returns 
 */
export function interceptorify<TInput, TOutput>(i: InterceptorLike<TInput, TOutput>): Interceptor<TInput, TOutput> {
    return isFunction(i) ? createInterceptor(i) : i;
}

