import { AbstractType, Injector, HandlerLike } from '@tsdi/ioc';
import { Handler } from '../handler';
import { FilterHandlerResolver, FilterLike, FilterResolver } from './filter';
import { InterceptorLike, InterceptorResolver } from '../interceptor';
export declare class DefaultInterceptorResolver implements InterceptorResolver {
    private injector;
    private maps;
    constructor(injector: Injector);
    resolve<T>(target: AbstractType<T> | T | string): InterceptorLike[];
    addInterceptor(target: AbstractType | string, interceptor: InterceptorLike, order?: number): this;
    removeInterceptor(target: AbstractType | string, interceptor: InterceptorLike): this;
}
export declare class DefaultFilterResolver implements FilterResolver {
    private injector;
    private maps;
    constructor(injector: Injector);
    resolve<T>(target: AbstractType<T> | T | string): FilterLike[];
    addFilter(target: AbstractType | string, filter: FilterLike, order?: number): this;
    removeFilter(target: AbstractType | string, filter: FilterLike): this;
}
/**
 * filter hanlders resolver.
 */
export declare class DefaultFiterHandlerMethodResolver implements FilterHandlerResolver {
    private injector;
    private maps;
    constructor(injector: Injector);
    resolve<T>(target: AbstractType<T> | T | string): HandlerLike[];
    addHandle(filter: AbstractType | string, handler: HandlerLike, order?: number): this;
    removeHandle(filter: AbstractType | string, handler: Handler): this;
}
