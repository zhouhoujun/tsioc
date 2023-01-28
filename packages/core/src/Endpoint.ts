import { Abstract, InvocationContext, isFunction } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * Endpoint is the fundamental building block of servers and clients.
 */
export interface Endpoint<TInput = any, TOutput = any> {
    /**
     * transport endpoint handle.
     * @param input request input.
     * @param context request context.
     */
    handle(input: TInput, context: InvocationContext): Observable<TOutput>;
}

/**
 * Endpoint funcation.
 */
export type EndpointFn<TInput, TOutput> = (input: TInput, context: InvocationContext) => Observable<TOutput>;

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
    abstract handle(input: TInput, context: InvocationContext): Observable<TOutput>;
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
