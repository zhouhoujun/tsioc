"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopInterceptor = exports.HttpInterceptingHandler = exports.HTTP_COMMON_INTERCEPTORS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const handler_1 = require("./handler");
/**
 * common http client interceptors for `HttpClient`.
 */
exports.HTTP_COMMON_INTERCEPTORS = (0, ioc_1.token)('HTTP_COMMON_INTERCEPTORS');
/**
 * An injectable {@link HttpHandler} that applies multiple interceptors
 * to a request before passing it to the given {@link HttpBackend}.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `InterceptingHandler` itself.
 * @see `TransportInterceptor`
 */
let HttpInterceptingHandler = class HttpInterceptingHandler extends common_1.RequestInterceptingHandler {
    constructor(backend, injector) {
        super(backend, () => injector.get(exports.HTTP_COMMON_INTERCEPTORS));
    }
};
exports.HttpInterceptingHandler = HttpInterceptingHandler;
exports.HttpInterceptingHandler = HttpInterceptingHandler = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [handler_1.HttpBackend, ioc_1.Injector])
], HttpInterceptingHandler);
let NoopInterceptor = class NoopInterceptor {
    intercept(req, next, context) {
        return next.handle(req, context);
    }
};
exports.NoopInterceptor = NoopInterceptor;
exports.NoopInterceptor = NoopInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], NoopInterceptor);
//# sourceMappingURL=interceptor.js.map