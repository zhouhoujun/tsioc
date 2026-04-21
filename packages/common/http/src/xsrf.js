"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpXsrfInterceptor = exports.HttpXsrfCookieExtractor = exports.HttpXsrfTokenExtractor = exports.XSRF_HEADER_NAME = exports.XSRF_COOKIE_NAME = void 0;
exports.parseCookieValue = parseCookieValue;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
exports.XSRF_COOKIE_NAME = (0, ioc_1.token)('XSRF_COOKIE_NAME');
exports.XSRF_HEADER_NAME = (0, ioc_1.token)('XSRF_HEADER_NAME');
/**
 * Retrieves the current XSRF token to use with the next outgoing request.
 *
 * @publicApi
 */
class HttpXsrfTokenExtractor {
}
exports.HttpXsrfTokenExtractor = HttpXsrfTokenExtractor;
/**
 * `HttpXsrfTokenExtractor` which retrieves the token from a cookie.
 */
let HttpXsrfCookieExtractor = class HttpXsrfCookieExtractor {
    constructor(doc, platform, cookieName) {
        this.doc = doc;
        this.platform = platform;
        this.cookieName = cookieName;
        this.lastCookieString = '';
        this.lastToken = null;
        /**
         * @internal for testing
         */
        this.parseCount = 0;
    }
    getToken() {
        if (this.platform === 'server') {
            return null;
        }
        const cookieString = this.doc.cookie || '';
        if (cookieString !== this.lastCookieString) {
            this.parseCount++;
            this.lastToken = parseCookieValue(cookieString, this.cookieName);
            this.lastCookieString = cookieString;
        }
        return this.lastToken;
    }
};
exports.HttpXsrfCookieExtractor = HttpXsrfCookieExtractor;
exports.HttpXsrfCookieExtractor = HttpXsrfCookieExtractor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Inject)(common_1.DOCUMENT)),
    tslib_1.__param(1, (0, ioc_1.Inject)(common_1.PLATFORM_ID)),
    tslib_1.__param(2, (0, ioc_1.Inject)(exports.XSRF_COOKIE_NAME)),
    tslib_1.__metadata("design:paramtypes", [Object, String, String])
], HttpXsrfCookieExtractor);
/**
 * `HttpInterceptor` which adds an XSRF token to eligible outgoing requests.
 */
let HttpXsrfInterceptor = class HttpXsrfInterceptor {
    constructor(tokenService, headerName) {
        this.tokenService = tokenService;
        this.headerName = headerName;
    }
    intercept(req, next, context) {
        const lcUrl = req.url.toLowerCase();
        // Skip both non-mutating requests and absolute URLs.
        // Non-mutating requests don't require a token, and absolute URLs require special handling
        // anyway as the cookie set
        // on our origin is not the same as the token expected by another origin.
        if (req.method === common_1.GET || req.method === common_1.HEAD || lcUrl.startsWith('http://') ||
            lcUrl.startsWith('https://')) {
            return next.handle(req, context);
        }
        const token = this.tokenService.getToken();
        // Be careful not to overwrite an existing header of the same name.
        if (token !== null && !req.headers.has(this.headerName)) {
            req = req.clone({ headers: req.headers.set(this.headerName, token) });
        }
        return next.handle(req, context);
    }
};
exports.HttpXsrfInterceptor = HttpXsrfInterceptor;
exports.HttpXsrfInterceptor = HttpXsrfInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(1, (0, ioc_1.Inject)(exports.XSRF_HEADER_NAME)),
    tslib_1.__metadata("design:paramtypes", [HttpXsrfTokenExtractor, String])
], HttpXsrfInterceptor);
function parseCookieValue(cookieStr, name) {
    name = encodeURIComponent(name);
    for (const cookie of cookieStr.split(';')) {
        const eqIndex = cookie.indexOf('=');
        const [cookieName, cookieValue] = eqIndex == -1 ? [cookie, ''] : [cookie.slice(0, eqIndex), cookie.slice(eqIndex + 1)];
        if (cookieName.trim() === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}
//# sourceMappingURL=xsrf.js.map