"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRequest = void 0;
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const params_1 = require("./params");
/**
 * Determine whether the given HTTP method may include a body.
 */
function mightHaveBody(method) {
    switch (method) {
        case common_1.DELETE:
        case common_1.GET:
        case common_1.HEAD:
        case common_1.OPTIONS:
        case common_1.JSONP:
            return false;
        default:
            return true;
    }
}
/**
 * An outgoing HTTP request with an optional typed body.
 *
 * `HttpRequest` represents an outgoing request, including URL, method,
 * headers, body, and other request configuration options. Instances should be
 * assumed to be immutable. To modify a `HttpRequest`, the `clone`
 * method should be used.
 *
 * @publicApi
 */
class HttpRequest {
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, interceptors should take care to preserve
     * idempotence by treating them as such.
     */
    get body() {
        return this.payload;
    }
    constructor(method, url, third, fourth) {
        this.url = url;
        /**
         * Whether this request should be made in a way that exposes progress events.
         *
         * Progress events are expensive (change detection runs on each event) and so
         * they should only be requested if the consumer intends to monitor them.
         */
        this.reportProgress = false;
        /**
         * Whether this request should be sent with outgoing credentials (cookies).
         */
        this.withCredentials = false;
        /**
         * The expected response type of the server.
         *
         * This is used to parse the response appropriately before returning it to
         * the requestee.
         */
        this.responseType = 'json';
        this.method = method.toUpperCase();
        // Next, need to figure out which argument holds the HttpRequestInit
        // options, if any.
        let options;
        // Check whether a body argument is expected. The only valid way to omit
        // the body argument is to use a known no-body method like GET.
        if (mightHaveBody(this.method) || !!fourth) {
            // Body is the third argument, options are the fourth.
            this.payload = (third !== undefined) ? third : null;
            options = fourth;
        }
        else {
            // No body required, options are the third argument. The body stays null.
            options = third;
            this.payload = null;
        }
        this.observe = options.observe || 'body';
        this.forceJson = options.responseType === 'json';
        // If options have been passed, interpret them.
        // if (options) {
        // Normalize reportProgress and withCredentials.
        this.reportProgress = !!options.reportProgress;
        this.withCredentials = !!options.withCredentials;
        // Override default response type of 'json' if one is provided.
        if (options.responseType) {
            this.responseType = options.responseType;
        }
        // Override headers if they're provided.
        if (options.headers) {
            this.headers = new common_1.HeaderMappings(options.headers);
        }
        if (options.params) {
            this.params = options.params;
        }
        this.timeout = options.timeout;
        // }
        // If no headers have been passed in, construct a new HeadersLike instance.
        if (!this.headers) {
            this.headers = new common_1.HeaderMappings();
        }
        // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
        if (!this.params) {
            this.params = new params_1.HttpParams();
        }
        this.urlWithParams = this.getUrlWithParams();
    }
    getUrlWithParams() {
        return (0, common_1.appendUrlParams)(this.url, this.params);
    }
    attachId(id) {
        this.id = id;
    }
    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     */
    serializeBody() {
        // If no body is present, no need to serialize it.
        if ((0, ioc_1.isNil)(this.body)) {
            return null;
        }
        // Check whether the body is already in a serialized form. If so,
        // it can just be returned directly.
        if ((0, common_1.isArrayBuffer)(this.body) || (0, common_1.isBlob)(this.body) || (0, common_1.isFormData)(this.body) ||
            (0, common_1.isUrlSearchParams)(this.body) || (0, ioc_1.isString)(this.body)) {
            return this.body;
        }
        // Check whether the body is an instance of HttpUrlEncodedParams.
        if (this.body instanceof params_1.HttpParams) {
            return this.body.toString();
        }
        // Check whether the body is an object or array, and serialize with JSON if so.
        if (typeof this.body === 'object' || typeof this.body === 'boolean' ||
            Array.isArray(this.body)) {
            return JSON.stringify(this.body);
        }
        // Fall back on toString() for everything else.
        return this.body.toString();
    }
    /**
     * Examine the body and attempt to infer an appropriate MIME type
     * for it.
     *
     * If no such type can be inferred, this method will return `null`.
     */
    detectContentTypeHeader() {
        // An empty body has no content type.
        if (this.body === null) {
            return null;
        }
        // FormData bodies rely on the browser's content type assignment.
        if ((0, common_1.isFormData)(this.body)) {
            return null;
        }
        // Blobs usually have their own content type. If it doesn't, then
        // no type can be inferred.
        if ((0, common_1.isBlob)(this.body)) {
            return this.body.type || null;
        }
        // Array buffers have unknown contents and thus no type can be inferred.
        if ((0, common_1.isArrayBuffer)(this.body)) {
            return null;
        }
        // Technically, strings could be a form of JSON data, but it's safe enough
        // to assume they're plain strings.
        if ((0, ioc_1.isString)(this.body)) {
            return 'text/plain';
        }
        // `HttpUrlEncodedParams` has its own content-type.
        if (this.body instanceof params_1.HttpParams) {
            return 'application/x-www-form-urlencoded;charset=UTF-8';
        }
        // Arrays, objects, boolean and numbers will be encoded as JSON.
        const type = typeof this.body;
        if (type === 'object' || type === 'number' || type === 'boolean') {
            return 'application/json';
        }
        // No type could be inferred.
        return null;
    }
    clone(update = {}) {
        // For method, url, and responseType, take the current value unless
        // it is overridden in the update hash.
        const method = update.method || this.method;
        const url = update.url || this.url;
        // The body is somewhat special - a `null` value in update.body means
        // whatever current body is present is being overridden with an empty
        // body, whereas an `undefined` value in update.body implies no
        // override.
        let body = (0, ioc_1.isUndefined)(update.body) ? update.payload : update.body;
        if ((0, ioc_1.isUndefined)(body)) {
            body = this.body;
        }
        const options = this.cloneOpts(update);
        // Finally, construct the new HttpRequest using the pieces from above.
        return new HttpRequest(method, url, body, options);
    }
    cloneOpts(update) {
        const responseType = update.responseType ?? ((!this.forceJson && this.responseType == 'json') ? undefined : this.responseType);
        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        const withCredentials = (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        const reportProgress = (update.reportProgress !== undefined) ? update.reportProgress : this.reportProgress;
        // Headers and params may be appended to if `setHeaders` or
        // `setParams` are used.
        let headers;
        if (update.headers instanceof common_1.HeaderMappings) {
            headers = update.headers;
        }
        else {
            headers = this.headers;
            update.headers && headers.setHeaders(update.headers);
        }
        // `setParams` are used.
        let params = update.params || this.params;
        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams[param]), params);
        }
        return {
            params,
            headers,
            reportProgress,
            responseType,
            withCredentials
        };
    }
    toJson(options) {
        const rcd = {};
        if (this.id) {
            rcd.id = this.id;
        }
        if (this.headers.size) {
            rcd.headers = this.headers.getHeaders();
        }
        if (!(0, ioc_1.isNil)(this.payload)) {
            rcd[options?.payloadKey ?? 'body'] = this.payload;
        }
        if (this.method)
            rcd.method = this.method;
        // rcd.withCredentials = this.withCredentials;
        // rcd.reportProgress = this.reportProgress;
        rcd.url = this.urlWithParams;
        return rcd;
    }
}
exports.HttpRequest = HttpRequest;
//# sourceMappingURL=request.js.map