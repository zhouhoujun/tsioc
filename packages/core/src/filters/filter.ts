import { Abstract, getTokenOf, Token, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from '../endpoints/context';
import { Endpoint } from '../Endpoint';
import { runEndpoints } from '../endpoints/runs';
import { Interceptor } from '../Interceptor';


/**
 * endpoint filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class Filter<TCtx extends EndpointContext = EndpointContext, TOutput = any> implements Interceptor<TCtx, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param context request context.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    abstract intercept(context: TCtx, next: Endpoint<TCtx, TOutput>): Observable<TOutput>;
}

const FILTERS = 'FILTERS';
/**
 * get target filters token.
 * @param request 
 * @returns 
 */
export function getFiltersToken(type: TypeOf<any>, propertyKey?: string): Token<Filter[]> {
    return getTokenOf(type, FILTERS, propertyKey)
}


/**
 * Endpoint handler method resolver.
 */
@Abstract()
export abstract class FilterHandlerResolver {
    /**
     * resolve filter hanlde.
     * @param filter 
     */
    abstract resolve<T>(filter: Type<T> | T | string): Endpoint[];
    /**
     * add filter handle.
     * @param filter filter type
     * @param endpoint filter endpoint.
     * @param order order.
     */
    abstract addHandle(filter: Type | string, endpoint: Endpoint, order?: number): this;
    /**
     * remove filter handle.
     * @param filter filter type.
     * @param endpoint filter endpoint.
     */
    abstract removeHandle(filter: Type | string, endpoint: Endpoint): this;
}


/**
 * run handlers.
 * @param ctx 
 * @param filter 
 * @returns 
 */
export function runHandlers(ctx: EndpointContext, filter: Type | string): Observable<any> {
    const handles = ctx.injector.get(FilterHandlerResolver).resolve(filter);
    return runEndpoints(handles, ctx, c => c.done === true)
}

