import { Abstract, getClass, Injectable, InvokerLike, Type } from '@tsdi/ioc';
import { mergeMap, Observable, of } from 'rxjs';
// import { Incoming, Outgoing } from './packet';
import { EndpointContext } from './context';
import { Interceptor, InterceptorEndpoint, runInvokers } from '../Interceptor';
import { Endpoint, EndpointBackend } from '../Endpoint';



/**
 * endpoint filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class EndpointFilter<TInput = any, TOutput = any> implements Interceptor<TInput, TOutput> {
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
    constructor(protected readonly backend: EndpointBackend<TInput, TOutput>, protected readonly filters: EndpointFilter[]) {

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
 * Endpoint handler method resolver.
 */
@Abstract()
export abstract class EndpointHandlerMethodResolver {
    /**
     * resolve filter hanlde.
     * @param filter 
     */
    abstract resolve<T>(filter: Type<T> | T | string): InvokerLike[];
    /**
     * add filter handle.
     * @param filter filter type
     * @param methodInvoker filter handle invoker.
     * @param order order.
     */
    abstract addHandle(filter: Type | string, methodInvoker: InvokerLike, order?: number): this;
    /**
     * remove filter handle.
     * @param filter filter type.
     * @param methodInvoker filter handle.
     */
    abstract removeHandle(filter: Type | string, methodInvoker: InvokerLike): this;
}

/**
 * run handlers.
 * @param ctx 
 * @param filter 
 * @returns 
 */
export function runHandlers(ctx: EndpointContext, input: any, filter: Type | string): Observable<any> {
    const handles = ctx.injector.get(EndpointHandlerMethodResolver).resolve(filter);
    return runInvokers(handles, ctx, input, c => c.done === true)
}

// @Injectable({ static: true })
// export class PathHanlderFilter implements EndpointFilter<Incoming, Outgoing> {

//     intercept(input: Incoming, next: Endpoint<Incoming, Outgoing>, ctx: EndpointContext): Observable<Outgoing> {
//         if (!input.url) return next.handle(input, ctx);

//         return runHandlers(ctx, input, input.url)
//             .pipe(
//                 mergeMap(r => {
//                     if (ctx.done) return of(r);
//                     return next.handle(input, ctx);
//                 }))
//     }

// }

// @Injectable({ static: true })
// export class StatusInterceptorFilter implements EndpointFilter<Incoming, Outgoing> {

//     intercept(input: Incoming, next: Endpoint<Incoming, Outgoing>, ctx: EndpointContext): Observable<Outgoing> {
//         return next.handle(input, ctx)
//             .pipe(
//                 mergeMap(res => {
//                     return runHandlers(ctx, res, getClass(ctx.status))
//                 })
//             )
//     }

// }



@Injectable({ static: true })
export class InOutInterceptorFilter implements EndpointFilter {

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
    abstract respond<T>(ctx: EndpointContext, value: T): void;
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
    abstract respond<T>(ctx: EndpointContext, responseType: 'body' | 'header' | 'response', value: T): void;
}

