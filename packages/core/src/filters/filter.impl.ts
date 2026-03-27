import { getType, isFunction, isString, AbstractType, ArgumentException, Injector, InjectFlags, HandlerLike } from '@tsdi/ioc';
import { Handler } from '../handler';
import { Filter, FilterHandlerResolver, FilterLike, FilterResolver } from './filter';
import { Interceptor, InterceptorLike, InterceptorResolver } from '../interceptor';


export class DefaultInterceptorResolver implements InterceptorResolver {
    private maps = new Map<AbstractType | string, InterceptorLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: AbstractType<T> | T | string): InterceptorLike[] {
        const interceptors = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getType(target))) ?? [];
        const resolver = this.injector.get(InterceptorResolver, null, InjectFlags.SkipSelf);
        if(resolver === this) return interceptors;
        resolver?.resolve(target)?.forEach(r => {
            if (!(interceptors.indexOf(r) >= 0 || (r as Interceptor).equals ? interceptors.some(i => (r as Interceptor).equals!(i)) : false)) {
                interceptors.push(r);
            }
        });

        return interceptors;
    }
    addInterceptor(target: AbstractType | string, interceptor: InterceptorLike, order?: number): this {
        if (!interceptor) {
            throw new ArgumentException('filter missing');
        }
        let hds = this.maps.get(target);
        if (!hds) {
            hds = [interceptor];
            this.maps.set(target, hds)
        } else if (!hds.some(h => h === interceptor || ((h as Interceptor).equals ? (h as Interceptor).equals!(interceptor) : false))) {
            hds.push(interceptor)
        }
        return this
    }
    removeInterceptor(target: AbstractType | string, interceptor: InterceptorLike): this {
        const hds = this.maps.get(target);
        if (!hds) return this;
        const idx = hds.findIndex(h => h === interceptor || ((h as Interceptor).equals ? (h as Interceptor).equals!(interceptor) : false));
        if (idx >= 0) hds.splice(idx, 1);
        return this
    }
}



export class DefaultFilterResolver implements FilterResolver {
    private maps = new Map<AbstractType | string, FilterLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: AbstractType<T> | T | string): FilterLike[] {
        const filters = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getType(target))) ?? [];
        const resolver = this.injector.get(FilterResolver, null, InjectFlags.SkipSelf);
        if(resolver == this) return filters;
        resolver?.resolve(target)?.forEach(r => {
            if (!(filters.indexOf(r) >= 0 || (r as Filter).equals ? filters.some(i => (r as Filter).equals!(i)) : false)) {
                filters.push(r);
            }
        });

        return filters;
    }
    addFilter(target: AbstractType | string, filter: FilterLike, order?: number): this {
        if (!filter) {
            throw new ArgumentException('filter missing');
        }
        let hds = this.maps.get(target);
        if (!hds) {
            hds = [filter];
            this.maps.set(target, hds)
        } else if (!hds.some(h => h === filter || ((h as Filter).equals ? (h as Filter).equals!(filter) : false))) {
            hds.push(filter)
        }
        return this
    }
    removeFilter(target: AbstractType | string, filter: FilterLike): this {
        const hds = this.maps.get(target);
        if (!hds) return this;
        const idx = hds.findIndex(h => h === filter || ((h as Filter).equals ? (h as Filter).equals!(filter) : false));
        if (idx >= 0) hds.splice(idx, 1);
        return this
    }
}

/**
 * filter hanlders resolver.
 */
export class DefaultFiterHandlerMethodResolver implements FilterHandlerResolver {

    private maps = new Map<AbstractType | string, HandlerLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: AbstractType<T> | T | string): HandlerLike[] {
        const handlers = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getType(target))) ?? [];
        const resolver = this.injector.get(FilterHandlerResolver, null, InjectFlags.SkipSelf);
        if(resolver === this) return handlers;
        resolver?.resolve(target)?.forEach(r => {
            if (!(handlers.indexOf(r) >= 0 || (r as Handler).equals ? handlers.some(i => (r as Handler).equals!(i)) : false)) {
                handlers.push(r);
            }
        });

        return handlers;
    }

    addHandle(filter: AbstractType | string, handler: HandlerLike, order?: number): this {
        if (!handler) {
            throw new ArgumentException('handler missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [handler];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => (h as Handler).equals ? (h as Handler).equals?.(handler) : h === handler)) {
            hds.push(handler)
        }
        return this
    }

    removeHandle(filter: AbstractType | string, handler: Handler): this {
        const hds = this.maps.get(filter);
        if (!hds) return this;
        const idx = hds.findIndex(h => (h as Handler).equals ? (h as Handler).equals?.(handler) : h === handler);
        if (idx >= 0) hds.splice(idx, 1);
        return this
    }
}


