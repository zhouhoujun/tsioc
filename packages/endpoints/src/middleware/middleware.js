"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToInterceptor = convertToInterceptor;
exports.composeMiddleware = composeMiddleware;
const ioc_1 = require("@tsdi/ioc");
const rxjs_1 = require("rxjs");
/**
 * convert middleware to interceptor.
 * @param middleware
 * @returns
 */
function convertToInterceptor(middleware) {
    return (input, next, context) => {
        const nextFn = async () => {
            await (0, rxjs_1.lastValueFrom)(next(input, context));
        };
        return (0, rxjs_1.from)((0, ioc_1.isFunction)(middleware) ? middleware(context, nextFn) : middleware.invoke(context, nextFn)).pipe((0, rxjs_1.map)(r => context.response));
    };
}
/**
 * compose middleware in chain.
 * @param middlewares
 */
function composeMiddleware(middlewares) {
    return (ctx, next) => {
        return dispatchChain(middlewares, ctx, next);
    };
}
/**
 * dispatch middleware in chain.
 *
 * @export
 * @template T input context type.
 * @template TR returnning type.
 * @param {Handler<T>[]} middlewares to run handlers in chain. array of {@link Handler}.
 * @param {T} ctx input context.
 * @param {() => Promise<void> [next] the next step.
 */
function dispatchChain(middlewares, ctx, next) {
    if (!middlewares.length)
        return null;
    let index = -1;
    function dispatch(i) {
        if (i <= index) {
            throw new ioc_1.Exception('next called mutiple times.');
        }
        index = i;
        let handle = middlewares[i];
        if (i === middlewares.length) {
            handle = next;
        }
        if (!handle) {
            return Promise.resolve(next?.());
        }
        const gnext = dispatch.bind(null, i + 1);
        return (0, ioc_1.isFunction)(handle) ? handle(ctx, gnext) : handle.invoke(ctx, gnext);
    }
    return dispatch(0);
}
//# sourceMappingURL=middleware.js.map