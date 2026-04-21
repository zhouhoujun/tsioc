"use strict";
var HttpClientXsrfModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClientJsonpModule = exports.HttpClientModule = exports.HttpClientXsrfModule = void 0;
exports.jsonpCallbackContext = jsonpCallbackContext;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const handler_1 = require("./handler");
const client_1 = require("./client");
const xhr_1 = require("./xhr");
const interceptor_1 = require("./interceptor");
const jsonp_1 = require("./jsonp");
const xsrf_1 = require("./xsrf");
/**
 * Configures XSRF protection support for outgoing requests.
 *
 * For a server that supports a cookie-based XSRF protection system,
 * use directly to configure XSRF protection with the correct
 * cookie and header names.
 *
 * If no names are supplied, the default cookie name is `XSRF-TOKEN`
 * and the default header name is `X-XSRF-TOKEN`.
 *
 * @publicApi
 */
let HttpClientXsrfModule = HttpClientXsrfModule_1 = class HttpClientXsrfModule {
    /**
     * Disable the default XSRF protection.
     */
    static disable() {
        return {
            module: HttpClientXsrfModule_1,
            providers: [
                { provide: xsrf_1.HttpXsrfInterceptor, useClass: interceptor_1.NoopInterceptor },
            ]
        };
    }
    /**
     * Configure XSRF protection.
     * @param options An object that can specify either or both
     * cookie name or header name.
     * - Cookie name default is `XSRF-TOKEN`.
     * - Header name default is `X-XSRF-TOKEN`.
     *
     */
    static withOptions(options = {}) {
        const providers = [];
        if (options.cookieName) {
            providers.push({ provide: xsrf_1.XSRF_COOKIE_NAME, useValue: options.cookieName });
        }
        if (options.headerName) {
            providers.push({ provide: xsrf_1.XSRF_HEADER_NAME, useValue: options.headerName });
        }
        return {
            module: HttpClientXsrfModule_1,
            providers
        };
    }
};
exports.HttpClientXsrfModule = HttpClientXsrfModule;
exports.HttpClientXsrfModule = HttpClientXsrfModule = HttpClientXsrfModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            xsrf_1.HttpXsrfInterceptor,
            { provide: interceptor_1.HTTP_COMMON_INTERCEPTORS, useExisting: xsrf_1.HttpXsrfInterceptor, multi: true },
            { provide: xsrf_1.HttpXsrfTokenExtractor, useClass: xsrf_1.HttpXsrfCookieExtractor },
            { provide: xsrf_1.XSRF_COOKIE_NAME, useValue: 'XSRF-TOKEN' },
            { provide: xsrf_1.XSRF_HEADER_NAME, useValue: 'X-XSRF-TOKEN' },
        ],
    })
], HttpClientXsrfModule);
/**
 * http client module, Configures the module injector for {@link HttpClient}.
 *
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in {@link HTTP_COMMON_INTERCEPTORS}.
 */
let HttpClientModule = class HttpClientModule {
};
exports.HttpClientModule = HttpClientModule;
exports.HttpClientModule = HttpClientModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        /**
        * Optional configuration for XSRF protection.
        */
        imports: [
            HttpClientXsrfModule.withOptions({
                cookieName: 'XSRF-TOKEN',
                headerName: 'X-XSRF-TOKEN',
            }),
        ],
        providers: [
            client_1.HttpClient,
            { provide: handler_1.HttpHandler, useClass: interceptor_1.HttpInterceptingHandler },
            xhr_1.HttpXhrBackend,
            { provide: handler_1.HttpBackend, useExisting: xhr_1.HttpXhrBackend }
        ]
    })
], HttpClientModule);
/**
 * Configures the module injector for {@link HttpClient}
 * with supporting services for JSONP.
 * Without this module, Jsonp requests reach the backend
 * with method JSONP, where they are rejected.
 *
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in {@link HTTP_COMMON_INTERCEPTORS}.
 *
 * @publicApi
 */
let HttpClientJsonpModule = class HttpClientJsonpModule {
};
exports.HttpClientJsonpModule = HttpClientJsonpModule;
exports.HttpClientJsonpModule = HttpClientJsonpModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            jsonp_1.JsonpClientBackend,
            { provide: jsonp_1.JsonpCallbackContext, useFactory: jsonpCallbackContext },
            { provide: interceptor_1.HTTP_COMMON_INTERCEPTORS, useClass: jsonp_1.JsonpInterceptor, multi: true },
        ],
    })
], HttpClientJsonpModule);
function jsonpCallbackContext() {
    if (typeof window === 'object') {
        return window;
    }
    return {};
}
//# sourceMappingURL=module.js.map