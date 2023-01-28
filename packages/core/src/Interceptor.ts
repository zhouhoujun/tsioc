import { ClassType, InvocationContext, InvokerLike, isFunction, isPromise } from '@tsdi/ioc';
import { isObservable, mergeMap, Observable, of } from 'rxjs';
import { Endpoint, EndpointBackend, endpointify, EndpointLike } from './Endpoint';

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
    intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: InvocationContext): Observable<TOutput>;
}

/**
 * interceptor function.
 */
export type InterceptorFn<TInput, TOutput> = (input: TInput, next: Endpoint<TInput, TOutput>, context: InvocationContext) => Observable<TOutput>;

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

    handle(input: TInput, context: InvocationContext): Observable<TOutput> {
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

    handle(input: TInput, context: InvocationContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.interceptors.reduceRight(
                (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.backend)
        }
        return this.chain.handle(input, context)
    }
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

/**
 * run invokers.
 * @param invokders 
 * @param ctx 
 * @param input 
 * @param isDone 
 * @returns 
 */
export function runInvokers(invokders: InvokerLike[] | undefined, ctx: InvocationContext, input: any, isDone: (ctx: InvocationContext) => boolean): Observable<any> {
    let $obs = of(input);
    if (!invokders || !invokders.length) {
        return $obs;
    }

    invokders.forEach(i => {
        $obs = $obs.pipe(
            mergeMap(r => {
                if (isDone(ctx)) return of(r);
                const $res = isFunction(i) ? i(ctx) : i.invoke(ctx);
                if (!isPromise($res) || !isObservable($res)) return of($res);
                return $res;
            }));
    });
    return $obs;
}