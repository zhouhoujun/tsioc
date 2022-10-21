import { Abstract, Injectable, OperationInvoker, Type } from '@tsdi/ioc';
import { mergeMap, Observable, of } from 'rxjs';
import { EndpointContext, ServerEndpointContext } from './context';
import { Endpoint, EndpointBackend, endpointify, EndpointLike, Interceptor, InterceptorEndpoint, interceptorify } from './endpoint';
import { Incoming, Outgoing } from './packet';


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
 * Filter chain.
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
     * resolve filter hanlde.
     * @param filter 
     */
    abstract resolve<T>(filter: Type<T> | T | string): OperationInvoker[];
    /**
     * add filter handle.
     * @param filter filter type
     * @param methodInvoker filter handle invoker.
     * @param order order.
     */
    abstract addHandle(filter: Type | string, methodInvoker: OperationInvoker, order?: number): this;
    /**
     * remove filter handle.
     * @param filter filter type.
     * @param methodInvoker filter handle.
     */
    abstract removeHandle(filter: Type | string, methodInvoker: OperationInvoker): this;
}

/**
 * run handlers.
 * @param ctx 
 * @param filter 
 * @returns 
 */
export function runHandlers(ctx: EndpointContext, input: any, filter: any): Observable<any> {
    const handles = ctx.injector.get(EndpointHandlerMethodResolver).resolve(filter);
    let obs = of(input);
    handles.forEach(i => {
        obs = obs.pipe(
            mergeMap(r => {
                if (ctx.done) return of(r);
                return i.invoke(ctx);
            }));
    })

    return obs;
}

@Injectable({ static: true })
export class PathHanlderFilter implements InterceptorFilter<Incoming, Outgoing> {

    intercept(input: Incoming, next: Endpoint<Incoming, Outgoing>, ctx: EndpointContext): Observable<Outgoing> {
        return runHandlers(ctx, input, input.url)
            .pipe(
                mergeMap(r => {
                    if (ctx.done) return of(r);
                    return next.handle(input, ctx);
                }))
    }

}

@Injectable({ static: true })
export class StatusHanlderFilter implements InterceptorFilter<Incoming, Outgoing> {

    intercept(input: Incoming, next: Endpoint<Incoming, Outgoing>, ctx: EndpointContext): Observable<Outgoing> {
        return next.handle(input, ctx)
            .pipe(
                mergeMap(res => {
                    return runHandlers(ctx, res, ctx.status)
                })
            )
    }

}


@Injectable({ static: true })
export class InputOutputHanlderFilter implements InterceptorFilter {

    intercept(input: any, next: Endpoint<any, any>, ctx: EndpointContext): Observable<any> {
        return runHandlers(ctx, input, input)
            .pipe(
                mergeMap(r => {
                    if (ctx.done) return of(r);
                    return next.handle(input, ctx);
                }),
                mergeMap(res => {
                    return runHandlers(ctx, res, res);
                })
            )
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
