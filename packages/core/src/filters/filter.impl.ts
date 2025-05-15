import { getType, isFunction, isString, Type, ArgumentException, Injector, InjectFlags, HandlerLike } from '@tsdi/ioc';
import { ApplicationHandler } from '../ApplicationHandler';
import { Filter, FilterHandlerResolver, FilterLike, FilterResolver } from './filter';
import { ApplicationInterceptor, ApplicationInterceptorLike, InterceptorResolver } from '../ApplicationInterceptor';


export class DefaultInterceptorResolver implements InterceptorResolver {
    private maps = new Map<Type | string, ApplicationInterceptorLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: Type<T> | T | string): ApplicationInterceptorLike[] {
        const interceptors = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getType(target))) ?? [];
        const resolver = this.injector.get(InterceptorResolver, null, InjectFlags.SkipSelf);

        resolver?.resolve(target)?.forEach(r => {
            if (!(interceptors.indexOf(r) >= 0 || (r as ApplicationInterceptor).equals ? interceptors.some(i => (r as ApplicationInterceptor).equals!(i)) : false)) {
                interceptors.push(r);
            }
        });

        return interceptors;
    }
    addInterceptor(target: Type | string, interceptor: ApplicationInterceptorLike, order?: number): this {
        if (!interceptor) {
            throw new ArgumentException('filter missing');
        }
        let hds = this.maps.get(target);
        if (!hds) {
            hds = [interceptor];
            this.maps.set(target, hds)
        } else if (!hds.some(h => h === interceptor || ((h as ApplicationInterceptor).equals ? (h as ApplicationInterceptor).equals!(interceptor) : false))) {
            hds.push(interceptor)
        }
        return this
    }
    removeInterceptor(target: Type | string, interceptor: ApplicationInterceptorLike): this {
        const hds = this.maps.get(target);
        if (!hds) return this;
        const idx = hds.findIndex(h => h === interceptor || ((h as ApplicationInterceptor).equals ? (h as ApplicationInterceptor).equals!(interceptor) : false));
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}



export class DefaultFilterResolver implements FilterResolver {
    private maps = new Map<Type | string, FilterLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: Type<T> | T | string): FilterLike[] {
        const filters = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getType(target))) ?? [];
        const resolver = this.injector.get(FilterResolver, null, InjectFlags.SkipSelf);

        resolver?.resolve(target)?.forEach(r => {
            if (!(filters.indexOf(r) >= 0 || (r as Filter).equals ? filters.some(i => (r as Filter).equals!(i)) : false)) {
                filters.push(r);
            }
        });

        return filters;
    }
    addFilter(target: Type | string, filter: FilterLike, order?: number): this {
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

    private maps = new Map<Type | string, HandlerLike[]>();

    constructor(private injector: Injector) { }

    resolve<T>(target: Type<T> | T | string): HandlerLike[] {
        const handlers = this.maps.get(isString(target) ? target : (isFunction(target) ? target : getType(target))) ?? [];
        const resolver = this.injector.get(FilterHandlerResolver, null, InjectFlags.SkipSelf);

        resolver?.resolve(target)?.forEach(r => {
            if (!(handlers.indexOf(r) >= 0 || (r as ApplicationHandler).equals ? handlers.some(i => (r as ApplicationHandler).equals!(i)) : false)) {
                handlers.push(r);
            }
        });

        return handlers;
    }

    addHandle(filter: Type | string, handler: HandlerLike, order?: number): this {
        if (!handler) {
            throw new ArgumentException('handler missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [handler];
            this.maps.set(filter, hds)
        } else if (!hds.some(h => (h as ApplicationHandler).equals ? (h as ApplicationHandler).equals?.(handler) : h === handler)) {
            hds.push(handler)
        }
        return this
    }

    removeHandle(filter: Type | string, handler: ApplicationHandler): this {
        const hds = this.maps.get(filter);
        if (!hds) return this;
        const idx = hds.findIndex(h => (h as ApplicationHandler).equals ? (h as ApplicationHandler).equals?.(handler) : h === handler);
        if (idx > 0) hds.splice(idx, 1);
        return this
    }
}


