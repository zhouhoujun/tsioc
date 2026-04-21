"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterHandlerResolver = exports.FilterResolver = exports.FILTERS_TOKEN = exports.Filter = void 0;
exports.composeFilters = composeFilters;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * filter is a chainable behavior modifier for `handlers`.
 *
 * 处理器过滤器。
 */
let Filter = class Filter {
};
exports.Filter = Filter;
exports.Filter = Filter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], Filter);
/**
 * multi filters token
 */
exports.FILTERS_TOKEN = (0, ioc_1.token)('FILTERS_TOKEN');
/**
 * Filter resolver.
 */
let FilterResolver = class FilterResolver {
};
exports.FilterResolver = FilterResolver;
exports.FilterResolver = FilterResolver = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], FilterResolver);
/**
 * Endpoint handler method resolver.
 */
let FilterHandlerResolver = class FilterHandlerResolver {
};
exports.FilterHandlerResolver = FilterHandlerResolver;
exports.FilterHandlerResolver = FilterHandlerResolver = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], FilterHandlerResolver);
/**
 * compose chain filters.
 * @param filters
 * @returns
 */
function composeFilters(filters) {
    return filters.reduceRight((next, filterFn) => chainedFilterFn(next, filterFn), ioc_1.chainEndFn);
}
/**
 * Constructs a `ChainedFilterFn` which wraps and invokes a functional interceptor.
 */
function chainedFilterFn(chainTailLike, filterLike) {
    const chainTailFn = (0, ioc_1.isFunction)(chainTailLike) ? chainTailLike : (req, handle, context) => chainTailLike.doFilter(req, {
        handle,
    }, context);
    const filterFn = (0, ioc_1.isFunction)(filterLike) ? filterLike : (req, handle, context) => filterLike.doFilter(req, {
        handle,
    }, context);
    return (0, ioc_1.chainFactory)(chainTailFn, filterFn);
}
//# sourceMappingURL=filter.js.map