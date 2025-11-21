import {
    Abstract, chainEndFn, chainFactory, getTokenOf, HandlerFn, isFunction, ProvdierOf,
    Token, tokenId, AbstractType, TypeOf, HandlerLike, HandleResult
} from '@tsdi/ioc';
import { Handler, RunableContext } from '../handler';
import { InterceptorFn } from '../interceptor';


/**
 * filter is a chainable behavior modifier for `handlers`.
 * 
 * 处理器过滤器。
 */
@Abstract()
export abstract class Filter<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> {
    /**
     * the method to implement interceptor filter.
     * @param input request input data.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    abstract doFilter(input: TInput, next: Handler<TInput, TOutput>, context: TContext): HandleResult<TOutput>;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}

/**
 * FilterFn is a chainable behavior modifier for `handlers`.
 * 
 * 处理器过滤方法。
 */
export type FilterFn<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = InterceptorFn<TInput, TOutput, TContext>;

/**
 * filter like
 */
export type FilterLike<TInput = any, TOutput = any, TContext extends RunableContext = RunableContext> = FilterFn<TInput, TOutput, TContext> | Filter<TInput, TOutput, TContext>;


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
 * Filter resolver.
 */
@Abstract()
export abstract class FilterResolver {
    /**
     * resolve hanlde filter.
     * @param target 
     */
    abstract resolve<T>(target: AbstractType<T> | T | string): FilterLike[];
    /**
     * add handle filter.
     * @param target filter for the target type
     * @param filter handler filter.
     * @param order order.
     */
    abstract addFilter(target: AbstractType | string, filter: FilterLike, order?: number): this;
    /**
     * remove handle filter.
     * @param target filter for the target type
     * @param filter handler filter.
     */
    abstract removeFilter(target: AbstractType | string, filter: FilterLike): this;
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
    abstract resolve<T>(filter: AbstractType<T> | T | string): HandlerLike[];
    /**
     * add filter handle.
     * @param filter filter type
     * @param handler filter handler.
     * @param order order.
     */
    abstract addHandle(filter: AbstractType | string, handler: HandlerLike, order?: number): this;
    /**
     * remove filter handle.
     * @param filter filter type.
     * @param handler filter handler.
     */
    abstract removeHandle(filter: AbstractType | string, handler: HandlerLike): this;
}


/**
 * compose chain filters.
 * @param filters 
 * @returns 
 */
export function composeFilters(filters: FilterLike[]): FilterFn {
    return filters.reduceRight((next, filterFn) => chainedFilterFn(next as FilterFn, filterFn), chainEndFn as FilterFn) as FilterFn;
}

/**
 * Constructs a `ChainedFilterFn` which wraps and invokes a functional interceptor.
 */
function chainedFilterFn(
    chainTailLike: FilterLike, filterLike: FilterLike,
): FilterFn {

    const chainTailFn = isFunction(chainTailLike) ? chainTailLike : (req: any, handle: HandlerFn, context: any) => chainTailLike.doFilter(req, {
        handle,
    }, context);
    const filterFn = isFunction(filterLike) ? filterLike : (req: any, handle: HandlerFn, context: any) => filterLike.doFilter(req, {
        handle,
    }, context);

    return chainFactory(chainTailFn, filterFn)
}