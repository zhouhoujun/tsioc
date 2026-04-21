"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionHandlerFilter = exports.ExceptionFilter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const filter_1 = require("./filter");
/**
 * execption filter
 *
 * 异常处理过滤器
 */
let ExceptionFilter = class ExceptionFilter extends filter_1.Filter {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input, next, context) {
        return (0, ioc_1.invokeTail)(() => next.handle(input, context), {
            error: (err) => {
                return (0, ioc_1.invokeTail)(() => this.catchError(input, err, context), {
                    next: (res) => {
                        if (res instanceof Error || res instanceof ioc_1.Exception) {
                            throw res;
                        }
                        return res;
                    },
                    error: (err) => null
                });
            }
        });
    }
};
exports.ExceptionFilter = ExceptionFilter;
exports.ExceptionFilter = ExceptionFilter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ExceptionFilter);
/**
 * execption handler filter.
 */
let ExceptionHandlerFilter = class ExceptionHandlerFilter extends ExceptionFilter {
    catchError(input, err, context) {
        const injector = context.getInjector();
        const handlers = injector.get(filter_1.FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return err;
        }
        return (0, ioc_1.invokeTail)((0, ioc_1.composeHandlers)(handlers, (res, next, input, context) => {
            if ((0, ioc_1.isUndefined)(res)) {
                return next(err, context);
            }
            return res;
        }), {
            error: (err1) => {
                err1.originException = err;
                err1.message = `${err1.message}\r\n${err.toString()}`;
            }
        }, err, context);
    }
};
exports.ExceptionHandlerFilter = ExceptionHandlerFilter;
exports.ExceptionHandlerFilter = ExceptionHandlerFilter = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: true })
], ExceptionHandlerFilter);
//# sourceMappingURL=execption.filter.js.map