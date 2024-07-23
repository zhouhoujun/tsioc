import { Abstract, getTokenOf, ProvdierOf, Token, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Handler } from '../Handler';
import { Interceptor, InterceptorFn } from '../Interceptor';


/**
 * filter is a chainable behavior modifier for `handlers`.
 * 
 * 处理器过滤器。
 */
@Abstract()
export abstract class Filter<TInput = any, TOutput = any, TContext = any> implements Interceptor<TInput, TOutput, TContext> {
    /**
     * the method to implement interceptor filter.
     * @param input request input data.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: TInput, next: Handler, context?: TContext): Observable<TOutput>;
}

/**
 * FilterFn is a chainable behavior modifier for `handlers`.
 * 
 * 处理器过滤方法。
 */
export type FilterFn<TInput = any, TOutput = any, TContext = any> = InterceptorFn<TInput, TOutput, TContext>;

/**
 * filter like
 */
export type FilterLike<TInput = any, TOutput = any, TContext = any> = FilterFn<TInput, TOutput, TContext> | Filter<TInput, TOutput, TContext>;

/**
 * filter service.
 * 
 * 过滤器服务。
 */
export interface FilterService {
    /**
     * use filters
     * @param filters 
     * @param order 
     */
    useFilters(filters: ProvdierOf<FilterLike> | ProvdierOf<FilterLike>[], order?: number): this;
}

/**
 * multi filters token
 */
export const FILTERS_TOKEN = tokenId<FilterLike[]>('FILTERS_TOKEN');

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
