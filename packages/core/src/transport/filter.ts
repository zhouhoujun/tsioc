import { Abstract, Injectable, OperationInvoker, Type } from '@tsdi/ioc';
import { mergeMap, Observable, of } from 'rxjs';
import { EndpointContext, ServerEndpointContext } from './context';
import { Endpoint, EndpointBackend, endpointify, EndpointLike, Interceptor, InterceptorEndpoint, interceptorify } from './endpoint';
import { Status } from './status';


/**
 * Interceptor is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class InterceptorFilter<TInput = any, TOutput = any> implements Interceptor<TInput, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: EndpointContext): Observable<TOutput>;
}


/**
 * Respond chain.
 */
export class FilterChain<TInput = any, TOutput = any> implements EndpointBackend<TInput, TOutput> {

    private chain!: Endpoint<TInput, TOutput>;
    private backend: EndpointBackend<TInput, TOutput>;
    private filters: InterceptorFilter[];
    constructor(backend: EndpointLike<TInput, TOutput>, filters: InterceptorFilter[]) {
        this.backend = endpointify(backend);
        this.filters = filters.map(i => interceptorify(i))
    }

    handle(input: TInput, ctx: EndpointContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.filters.reduceRight(
                (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.backend)
        }
        return this.chain.handle(input, ctx)
    }
}



/**
 * respond handler method resolver.
 */
@Abstract()
export abstract class EndpointHandlerMethodResolver {
    /**
     * resolve execption hanlde.
     * @param status 
     */
    abstract resolve(status: Type<Status> | Status): OperationInvoker[];
    /**
     * add execption handle.
     * @param status execption type
     * @param methodInvoker execption handle invoker.
     * @param order order.
     */
    abstract addHandle(status: Type<Status>, methodInvoker: OperationInvoker, order?: number): this;
    /**
     * remove execption handle.
     * @param status execption type.
     * @param methodInvoker execption handle.
     */
    abstract removeHandle(status: Type<Status>, methodInvoker: OperationInvoker): this;
}

@Injectable({ static: true })
export class HanlderFilter implements InterceptorFilter {

    intercept(input: any, next: Endpoint<any, any>, ctx: EndpointContext): Observable<any> {

        return this.runHandlers(ctx, input)
            .pipe(
                mergeMap(r => {
                    if (ctx.done) return of(r);
                    return next.handle(input, ctx);
                }),
                mergeMap(res => {
                    return this.runHandlers(ctx, res);
                })
            )
    }

    runHandlers(ctx: EndpointContext, input: any) {
        const handles = ctx.injector.get(EndpointHandlerMethodResolver).resolve(input);

        let obs = of(input);
        handles.forEach(i => {
            obs = obs.pipe(
                mergeMap(r => {
                    if (ctx.done) return of(r);
                    return r.invoke(ctx);
                }));
        })

        return obs;
    }

}


@Abstract()
export abstract class Respond {

    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: ServerEndpointContext, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: ServerEndpointContext, responseType: 'body' | 'header' | 'response', value: T): void;
}
