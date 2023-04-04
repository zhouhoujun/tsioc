import { Abstract, getTokenOf, ProvdierOf, Token, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';


/**
 * endpoint filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class Filter<TInput = any, TOutput = any> implements Interceptor<TInput, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param input request input data.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: TInput, next: Handler<TInput, TOutput>): Observable<TOutput>;
}

/**
 * filter service.
 */
export interface FilterService {
    /**
     * use filters
     * @param filters 
     * @param order 
     */
    useFilters(filters: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;
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


