"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultFiterHandlerMethodResolver = exports.DefaultFilterResolver = exports.DefaultInterceptorResolver = void 0;
const ioc_1 = require("@tsdi/ioc");
const filter_1 = require("./filter");
const interceptor_1 = require("../interceptor");
class DefaultInterceptorResolver {
    constructor(injector) {
        this.injector = injector;
        this.maps = new Map();
    }
    resolve(target) {
        const interceptors = this.maps.get((0, ioc_1.isString)(target) ? target : ((0, ioc_1.isFunction)(target) ? target : (0, ioc_1.getType)(target))) ?? [];
        const resolver = this.injector.get(interceptor_1.InterceptorResolver, null, ioc_1.InjectFlags.SkipSelf);
        if (resolver === this)
            return interceptors;
        resolver?.resolve(target)?.forEach(r => {
            if (!(interceptors.indexOf(r) >= 0 || r.equals ? interceptors.some(i => r.equals(i)) : false)) {
                interceptors.push(r);
            }
        });
        return interceptors;
    }
    addInterceptor(target, interceptor, order) {
        if (!interceptor) {
            throw new ioc_1.ArgumentException('filter missing');
        }
        let hds = this.maps.get(target);
        if (!hds) {
            hds = [interceptor];
            this.maps.set(target, hds);
        }
        else if (!hds.some(h => h === interceptor || (h.equals ? h.equals(interceptor) : false))) {
            hds.push(interceptor);
        }
        return this;
    }
    removeInterceptor(target, interceptor) {
        const hds = this.maps.get(target);
        if (!hds)
            return this;
        const idx = hds.findIndex(h => h === interceptor || (h.equals ? h.equals(interceptor) : false));
        if (idx >= 0)
            hds.splice(idx, 1);
        return this;
    }
}
exports.DefaultInterceptorResolver = DefaultInterceptorResolver;
class DefaultFilterResolver {
    constructor(injector) {
        this.injector = injector;
        this.maps = new Map();
    }
    resolve(target) {
        const filters = this.maps.get((0, ioc_1.isString)(target) ? target : ((0, ioc_1.isFunction)(target) ? target : (0, ioc_1.getType)(target))) ?? [];
        const resolver = this.injector.get(filter_1.FilterResolver, null, ioc_1.InjectFlags.SkipSelf);
        if (resolver == this)
            return filters;
        resolver?.resolve(target)?.forEach(r => {
            if (!(filters.indexOf(r) >= 0 || r.equals ? filters.some(i => r.equals(i)) : false)) {
                filters.push(r);
            }
        });
        return filters;
    }
    addFilter(target, filter, order) {
        if (!filter) {
            throw new ioc_1.ArgumentException('filter missing');
        }
        let hds = this.maps.get(target);
        if (!hds) {
            hds = [filter];
            this.maps.set(target, hds);
        }
        else if (!hds.some(h => h === filter || (h.equals ? h.equals(filter) : false))) {
            hds.push(filter);
        }
        return this;
    }
    removeFilter(target, filter) {
        const hds = this.maps.get(target);
        if (!hds)
            return this;
        const idx = hds.findIndex(h => h === filter || (h.equals ? h.equals(filter) : false));
        if (idx >= 0)
            hds.splice(idx, 1);
        return this;
    }
}
exports.DefaultFilterResolver = DefaultFilterResolver;
/**
 * filter hanlders resolver.
 */
class DefaultFiterHandlerMethodResolver {
    constructor(injector) {
        this.injector = injector;
        this.maps = new Map();
    }
    resolve(target) {
        const handlers = this.maps.get((0, ioc_1.isString)(target) ? target : ((0, ioc_1.isFunction)(target) ? target : (0, ioc_1.getType)(target))) ?? [];
        const resolver = this.injector.get(filter_1.FilterHandlerResolver, null, ioc_1.InjectFlags.SkipSelf);
        if (resolver === this)
            return handlers;
        resolver?.resolve(target)?.forEach(r => {
            if (!(handlers.indexOf(r) >= 0 || r.equals ? handlers.some(i => r.equals(i)) : false)) {
                handlers.push(r);
            }
        });
        return handlers;
    }
    addHandle(filter, handler, order) {
        if (!handler) {
            throw new ioc_1.ArgumentException('handler missing');
        }
        let hds = this.maps.get(filter);
        if (!hds) {
            hds = [handler];
            this.maps.set(filter, hds);
        }
        else if (!hds.some(h => h.equals ? h.equals?.(handler) : h === handler)) {
            hds.push(handler);
        }
        return this;
    }
    removeHandle(filter, handler) {
        const hds = this.maps.get(filter);
        if (!hds)
            return this;
        const idx = hds.findIndex(h => h.equals ? h.equals?.(handler) : h === handler);
        if (idx >= 0)
            hds.splice(idx, 1);
        return this;
    }
}
exports.DefaultFiterHandlerMethodResolver = DefaultFiterHandlerMethodResolver;
//# sourceMappingURL=filter.impl.js.map