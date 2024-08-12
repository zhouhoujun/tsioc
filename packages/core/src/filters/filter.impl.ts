import { EMPTY, getClass, isFunction, isString, Type, ArgumentExecption, Injector, InjectFlags } from '@tsdi/ioc';
import { Handler } from '../Handler';
import { Filter, FilterHandlerResolver, FilterLike, FilterResolver } from './filter';
import { Interceptor, InterceptorLike, InterceptorResolver } from '../Interceptor';


export class DefaultInterceptorResolver implements InterceptorResolver {
    private maps = new Map<Type | string, InterceptorLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: Type<T> | T | string): InterceptorLike[] {
        const interceptors = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getClass(target))) ?? EMPTY;
        const resolver = this.injector.get(InterceptorResolver, null, InjectFlags.SkipSelf);

        resolver?.resolve(target)?.forEach(r => {
            if (!(interceptors.indexOf(r) >= 0 || (r as Interceptor).equals ? interceptors.some(i => (r as Interceptor).equals!(i)) : false)) {
                interceptors.push(r);
            }
        });

        return interceptors;
    }
    addInterceptor(target: Type | string, interceptor: InterceptorLike, order?: number): this {
        if (!interceptor) {
            throw new ArgumentExecption('filter missing');
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
    removeInterceptor(target: Type | string, interceptor: InterceptorLike): this {
        const hds = this.maps.get(target);
        if (!hds) return this;
        const idx = hds.findIndex(h => h === interceptor || ((h as Interceptor).equals ? (h as Interceptor).equals!(interceptor) : false));
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}



export class DefaultFilterResolver implements FilterResolver {
    private maps = new Map<Type | string, FilterLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: Type<T> | T | string): FilterLike[] {
        const filters = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getClass(target))) ?? EMPTY;
        const resolver = this.injector.get(FilterResolver, null, InjectFlags.SkipSelf);

        resolver?.resolve(target)?.forEach(r => {
            if (!(filters.indexOf(r) >= 0 || (r as Interceptor).equals ? filters.some(i => (r as Interceptor).equals!(i)) : false)) {
                filters.push(r);
            }
        });

        return filters;
    }
    addFilter(target: Type | string, filter: FilterLike, order?: number): this {
        if (!filter) {
            throw new ArgumentExecption('filter missing');
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
    removeFilter(target: Type | string, filter: FilterLike): this {
        const hds = this.maps.get(target);
        if (!hds) return this;
        const idx = hds.findIndex(h => h === filter || ((h as Filter).equals ? (h as Filter).equals!(filter) : false));
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}

/**
 * filter hanlders resolver.
 */
export class DefaultFiterHandlerMethodResolver implements FilterHandlerResolver {

    private maps = new Map<Type | string, Handler[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: Type<T> | T | string): Handler[] {
        const handlers = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getClass(target))) ?? EMPTY;
        const resolver = this.injector.get(FilterHandlerResolver, null, InjectFlags.SkipSelf);

        resolver?.resolve(target)?.forEach(r => {
            if (!(handlers.indexOf(r) >= 0 || (r as Handler).equals ? handlers.some(i => (r as Handler).equals!(i)) : false)) {
                handlers.push(r);
            }
        });

        return handlers;
    }

    addHandle(filter: Type | string, handler: Handler, order?: number): this {
        if (!handler) {
            throw new ArgumentExecption('handler missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [handler];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => h.equals ? h.equals(handler) : h === handler)) {
            hds.push(handler)
        }
        return this
    }

    removeHandle(filter: Type | string, handler: Handler): this {
        const hds = this.maps.get(filter);
        if (!hds) return this;
        const idx = hds.findIndex(h => h.equals ? h.equals(handler) : h === handler);
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}


