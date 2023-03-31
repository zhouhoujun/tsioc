import { Abstract, getTokenOf, InvocationContext, Token, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { runHandlers } from '../endpoints/runs';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';


/**
 * endpoint filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class Filter<TCtx extends InvocationContext = InvocationContext, TOutput = any> implements Interceptor<TCtx, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param context request context.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    abstract intercept(context: TCtx, next: Handler<TCtx, TOutput>): Observable<TOutput>;
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
    abstract resolve<T>(filter: Type<T> | T | string): Handler[];
    /**
     * add filter handle.
     * @param filter filter type
     * @param handler filter handler.
     * @param order order.
     */
    abstract addHandle(filter: Type | string, handler: Handler, order?: number): this;
    /**
     * remove filter handle.
     * @param filter filter type.
     * @param handler filter handler.
     */
    abstract removeHandle(filter: Type | string, handler: Handler): this;
}


/**
 * run handlers.
 * @param ctx 
 * @param filter 
 * @returns 
 */
export function runFilters(ctx: InvocationContext, filter: Type | string): Observable<any> {
    const handles = ctx.injector.get(FilterHandlerResolver).resolve(filter);
    return runHandlers(handles, ctx, c => c.done === true)
}

