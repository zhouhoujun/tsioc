"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContext = exports.RESPONSE = exports.REQUEST = void 0;
exports.createRequestContext = createRequestContext;
const ioc_1 = require("@tsdi/ioc");
const headers_1 = require("./headers");
const outgoing_impl_1 = require("./outgoing.impl");
const MimeAdapter_1 = require("./MimeAdapter");
const CONTENT_LENGTH = new ioc_1.ContextToken(() => null);
const CONTENT_TYPE = new ioc_1.ContextToken(() => headers_1.ContentType.APPL_JSON);
const CONTENT_ENCODING = new ioc_1.ContextToken(() => null);
exports.REQUEST = new ioc_1.ContextToken(() => null);
exports.RESPONSE = new ioc_1.ContextToken(() => null);
class RequestContext extends ioc_1.RunContext {
    getRequest() {
        const req = this.get(exports.REQUEST);
        if (!req) {
            throw new ioc_1.Exception('Request not init in context');
        }
        return req;
    }
    createResponse(response) {
        return this.get(outgoing_impl_1.OutgoingFactory).create(response);
    }
    getResponse() {
        let resp = this.get(exports.RESPONSE);
        if (!resp) {
            resp = this.createResponse({ incoming: this.getRequest() });
            this.set(exports.RESPONSE, resp);
        }
        return resp;
    }
    /**
     * get response content encoding.
     * @returns
     */
    getContentEncoding() {
        return this.get(CONTENT_ENCODING);
    }
    /**
     * set response content encoding.
     * @param encoding
     */
    setContentEncoding(encoding) {
        this.set(CONTENT_ENCODING, encoding);
    }
    /**
     * get response content type
     * @param type
     */
    getContentType() {
        return this.get(CONTENT_TYPE);
    }
    /**
     * set response content type
     * @param type
     */
    setContentType(type) {
        this.set(CONTENT_TYPE, type);
    }
    /**
     * get response content length
     * @returns
     */
    getContentLength() {
        return this.get(CONTENT_LENGTH);
    }
    /**
     * set response content length
     * @param len
     */
    setContentLength(len) {
        this.set(CONTENT_LENGTH, len);
    }
    /**
     * Check if the given `type(s)` is acceptable, returning
     * the best match when true, otherwise `false`, in which
     * case you should respond with 406 "Not Acceptable".
     *
     * The `type` value may be a single mime type string
     * such as "application/json", the extension name
     * such as "json" or an array `["json", "html", "text/plain"]`. When a list
     * or array is given the _best_ match, if any is returned.
     *
     * Examples:
     *
     *     // Accept: text/html
     *     this.accepts('html');
     *     // => "html"
     *
     *     // Accept: text/*, application/json
     *     this.accepts('html');
     *     // => "html"
     *     this.accepts('text/html');
     *     // => "text/html"
     *     this.accepts('json', 'text');
     *     // => "json"
     *     this.accepts('application/json');
     *     // => "application/json"
     *
     *     // Accept: text/*, application/json
     *     this.accepts('image/png');
     *     this.accepts('png');
     *     // => false
     *
     *     // Accept: text/*;q=.5, application/json
     *     this.accepts('html', 'json');
     *     // => "json"
     *
     * @param {String|Array} type(s)...
     * @return {String|Array|false}
     * @api public
     */
    accepts(...args) {
        const acceptsPriority = this.get(MimeAdapter_1.AcceptsPriority);
        const headerAdapter = this.get(headers_1.HeaderAdapter);
        if (!acceptsPriority || !headerAdapter)
            return '*';
        const accepts = headerAdapter.getAccept(this.getRequest()) ?? '*';
        if (!args.length) {
            return accepts ?? false;
        }
        const mimeAdapter = this.get(MimeAdapter_1.MimeAdapter);
        const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter?.lookup(a) ?? a : a).filter(a => (0, ioc_1.isString)(a));
        return ioc_1.lang.first(acceptsPriority.priority(accepts, medias, 'media')) ?? false;
    }
    /**
    * Return accepted encodings or best fit based on `encodings`.
    *
    * Given `Accept-Encoding: gzip, deflate`
    * an array sorted by quality is returned:
    *
    *     ['gzip', 'deflate']
    *
    * @param {String|Array} encoding(s)...
    * @return {String|Array}
    * @api public
    */
    acceptsEncodings(...encodings) {
        const acceptsPriority = this.get(MimeAdapter_1.AcceptsPriority);
        const headerAdapter = this.get(headers_1.HeaderAdapter);
        if (!acceptsPriority || !headerAdapter)
            return '*';
        const accepts = headerAdapter.getAcceptEncoding(this.getRequest()) ?? '*';
        if (!encodings.length) {
            return accepts;
        }
        return ioc_1.lang.first(acceptsPriority.priority(accepts, encodings, 'encodings')) ?? false;
    }
    /**
     * Return accepted charsets or best fit based on `charsets`.
     *
     * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
     * an array sorted by quality is returned:
     *
     *     ['utf-8', 'utf-7', 'iso-8859-1']
     *
     * @param {String|Array} charset(s)...
     * @return {String|Array}
     * @api public
     */
    acceptsCharsets(...charsets) {
        const acceptsPriority = this.get(MimeAdapter_1.AcceptsPriority);
        const headerAdapter = this.get(headers_1.HeaderAdapter);
        if (!acceptsPriority || !headerAdapter)
            return '*';
        const accepts = headerAdapter.getAcceptCharset(this.getRequest()) ?? '*';
        if (!charsets.length) {
            return accepts;
        }
        return ioc_1.lang.first(acceptsPriority.priority(accepts, charsets, 'charsets')) ?? false;
    }
    /**
     * Return accepted languages or best fit based on `langs`.
     *
     * Given `Accept-Language: en;q=0.8, es, pt`
     * an array sorted by quality is returned:
     *
     *     ['es', 'pt', 'en']
     *
     * @param {String|Array} lang(s)...
     * @return {Array|String}
     * @api public
     */
    acceptsLanguages(...langs) {
        const acceptsPriority = this.get(MimeAdapter_1.AcceptsPriority);
        const headerAdapter = this.get(headers_1.HeaderAdapter);
        if (!acceptsPriority || !headerAdapter)
            return '*';
        const accepts = headerAdapter.getAcceptLanguage(this.getRequest()) ?? '*';
        if (!langs.length) {
            return accepts;
        }
        return ioc_1.lang.first(acceptsPriority.priority(accepts, langs, 'lang')) ?? false;
    }
}
exports.RequestContext = RequestContext;
function createRequestContext(injector, previous, entries) {
    const context = new RequestContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}
//# sourceMappingURL=context.js.map