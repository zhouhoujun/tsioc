import { EMPTY, getClass, Injectable, isFunction, isString, Type, ArgumentExecption } from '@tsdi/ioc';
import { Handler } from '../Handler';
import { Filter, FilterHandlerResolver, FilterLike, FilterResolver } from './filter';
import { Interceptor, InterceptorLike, InterceptorResolver } from '../Interceptor';

@Injectable()
export class DefaultInterceptorResolver extends InterceptorResolver {
    private maps = new Map<Type | string, InterceptorLike[]>();

    resolve<T>(target: Type<T> | T | string): InterceptorLike[] {
        return this.maps.get(isString(target) ? target : (isFunction(target) ? target : getClass(target))) ?? EMPTY
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


@Injectable()
export class DefaultFilterResolver extends FilterResolver {
    private maps = new Map<Type | string, FilterLike[]>();

    resolve<T>(target: Type<T> | T | string): FilterLike[] {
        return this.maps.get(isString(target) ? target : (isFunction(target) ? target : getClass(target))) ?? EMPTY
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
@Injectable()
export class DefaultFiterHandlerMethodResolver extends FilterHandlerResolver {

    private maps = new Map<Type | string, Handler[]>();

    resolve<T>(filter: Type<T> | T | string): Handler[] {
        return this.maps.get(isString(filter) ? filter : (isFunction(filter) ? filter : getClass(filter))) ?? EMPTY
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


