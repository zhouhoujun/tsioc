"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultResponseFactory = exports.ResponseFactory = exports.ErrorResponse = exports.Response = exports.HeaderResponse = exports.ResponseBase = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const headers_1 = require("./headers");
class ResponseBase {
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText() {
        return this._message;
    }
    get statusMessage() {
        return this._message;
    }
    constructor(init, defaultStatus = null, defaultStatusText = 'OK') {
        this.headers = init.headers instanceof headers_1.HeaderMappings ? init.headers : new headers_1.HeaderMappings(init.headers);
        this.status = init.status !== undefined ? init.status : defaultStatus;
        this.ok = init.error ? false : ((0, ioc_1.isBoolean)(init.ok) ? init.ok : this.isOk(this.status));
        this._message = init.statusText || init.statusMessage || defaultStatusText;
        this.pattern = init.pattern;
    }
    isOk(status) {
        return true;
    }
}
exports.ResponseBase = ResponseBase;
/**
 * header response.
 */
class HeaderResponse extends ResponseBase {
    constructor(init) {
        super(init);
    }
}
exports.HeaderResponse = HeaderResponse;
/**
 * response packet.
 */
class Response extends ResponseBase {
    get payload() {
        return this.body;
    }
    constructor(init) {
        super(init);
        this.body = init.body !== undefined ? init.body : (init.payload ?? null);
    }
}
exports.Response = Response;
/**
 * Error packet.
 */
class ErrorResponse extends ResponseBase {
    constructor(init) {
        super(init, null, init.error?.message ?? ((0, ioc_1.isString)(init.error) ? init.error : 'Unknown Error'));
        this.error = init.error || null;
    }
    isOk(status) {
        return false;
    }
}
exports.ErrorResponse = ErrorResponse;
let ResponseFactory = class ResponseFactory {
};
exports.ResponseFactory = ResponseFactory;
exports.ResponseFactory = ResponseFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ResponseFactory);
let DefaultResponseFactory = class DefaultResponseFactory {
    create(options) {
        if (!options.ok || options.error) {
            if (!options.error) {
                options.error = options?.body ?? options.payload;
            }
            options.ok = false;
            throw new ErrorResponse(options);
        }
        return new Response(options);
    }
};
exports.DefaultResponseFactory = DefaultResponseFactory;
exports.DefaultResponseFactory = DefaultResponseFactory = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], DefaultResponseFactory);
//# sourceMappingURL=response.js.map