"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptorResolver = exports.INTERCEPTORS_TOKEN = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Interceptors multi token
 *
 * 拦截器组的标识令牌
 */
exports.INTERCEPTORS_TOKEN = (0, ioc_1.token)('INTERCEPTORS_TOKEN');
/**
 * Interceptor resolver.
 */
let InterceptorResolver = class InterceptorResolver {
};
exports.InterceptorResolver = InterceptorResolver;
exports.InterceptorResolver = InterceptorResolver = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], InterceptorResolver);
//# sourceMappingURL=interceptor.js.map