"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestExceptionHandlerFilter = exports.RequestExceptionFilter = exports.RequestFilter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const rxjs_1 = require("rxjs");
/**
 * filter is a chainable behavior modifier for `request handlers`.
 *
 * 处理器过滤器。
 */
let RequestFilter = class RequestFilter extends core_1.Filter {
};
exports.RequestFilter = RequestFilter;
exports.RequestFilter = RequestFilter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], RequestFilter);
let RequestExceptionFilter = class RequestExceptionFilter extends RequestFilter {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input, next, context) {
        return next.handle(input, context)
            .pipe((0, rxjs_1.catchError)(err => {
            return (0, ioc_1.invokeTail)(() => this.catchError(input, err, context), {
                next: (res) => {
                    if (res instanceof Error || res instanceof ioc_1.Exception) {
                        throw res;
                    }
                    return res;
                },
                error: (err) => null
            });
        }));
    }
};
exports.RequestExceptionFilter = RequestExceptionFilter;
exports.RequestExceptionFilter = RequestExceptionFilter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], RequestExceptionFilter);
/**
 * execption handler filter.
 */
let RequestExceptionHandlerFilter = class RequestExceptionHandlerFilter extends RequestExceptionFilter {
    catchError(input, err, context) {
        const injector = context.getInjector();
        const handlers = injector.get(core_1.FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return (0, rxjs_1.throwError)(() => err);
        }
        return (0, ioc_1.toObservable)((0, ioc_1.invokeTail)((0, ioc_1.composeHandlers)(handlers, (res, next, input, context) => {
            if ((0, ioc_1.isUndefined)(res)) {
                return next(err, context);
            }
            return res;
        }), {
            error: (err1) => {
                err1.originException = err;
                err1.message = `${err1.message}\r\n${err.toString()}`;
            }
        }, err, context));
    }
};
exports.RequestExceptionHandlerFilter = RequestExceptionHandlerFilter;
exports.RequestExceptionHandlerFilter = RequestExceptionHandlerFilter = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: true })
], RequestExceptionHandlerFilter);
//# sourceMappingURL=filter.js.map