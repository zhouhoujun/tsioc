"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContextFactory = exports.AbstractRequestContext = void 0;
exports.getScopeValue = getScopeValue;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const transport_1 = require("@tsdi/common/transport");
const content_1 = require("./content");
const Session_1 = require("./sessions/Session");
/**
 * abstract request context for sevice side.
 *
 * 请求上下文
 */
let AbstractRequestContext = class AbstractRequestContext extends common_1.RequestContext {
    constructor() {
        super(...arguments);
        this._ok = true;
    }
    /**
     * mime adapter.
     */
    get mimeAdapter() {
        return this.get(common_1.MimeAdapter);
    }
    /**
     * mime accepts priority
     */
    get acceptsPriority() {
        return this.get(common_1.AcceptsPriority);
    }
    /**
     * status adapter.
     */
    get statusAdapter() {
        return this.get(common_1.StatusAdapter);
    }
    /**
     * stream adapter
     */
    get headerAdapter() {
        return this.get(common_1.HeaderAdapter);
    }
    /**
     * stream adapter
     */
    get streamAdapter() {
        return this.get(common_1.StreamAdapter);
    }
    /**
     * file adapter
     */
    get fileAdapter() {
        return this.get(common_1.FileAdapter);
    }
    get session() {
        if (this._session === undefined) {
            this._session = this.get(Session_1.Session) ?? null;
        }
        return this._session;
    }
    /**
     * Set response content length.
     *
     * @param {Number} n
     * @api public
     */
    set length(n) {
        if (!this.headerAdapter.hasContentEncoding(this.response)) {
            this.headerAdapter.setContentLength(this.response, n);
        }
        else {
            this.headerAdapter.setContentLength(this.response, null);
        }
    }
    /**
     * Get response content length
     *
     * @return {Number}
     * @api public
     */
    get length() {
        if (this.headerAdapter.hasContentLength(this.response)) {
            return this.headerAdapter.getContentLength(this.response);
        }
        if ((0, ioc_1.isNil)(this.body) || this.streamAdapter.isStream(this.body))
            return null;
        if ((0, ioc_1.isString)(this.body))
            return Buffer.byteLength(this.body);
        if (Buffer.isBuffer(this.body))
            return this.body.length;
        return Buffer.byteLength(JSON.stringify(this.body));
    }
    /**
     * Get response status.
     */
    get status() {
        return this.response.statusCode;
    }
    /**
     * Set response status, defaults to OK.
     */
    set status(code) {
        if (this.headersSent)
            return;
        this.beforeStatusChanged(code);
        if (this.statusAdapter && !this.statusAdapter.isStatus(code))
            throw new common_1.InternalServerException(`invalid status code: ${code}`);
        this._explicitStatus = true;
        this.response.statusCode = code;
        if (!(0, ioc_1.isNil)(this.body) && this.statusAdapter?.isEmpty(code))
            this.body = null;
        this.afterStatusChanged(code);
    }
    beforeStatusChanged(code) { }
    afterStatusChanged(code) { }
    get statusMessage() {
        return this.response.statusMessage;
    }
    set statusMessage(msg) {
        if (this.canSettatusMessage())
            this.response.statusMessage = msg;
    }
    canSettatusMessage() {
        return true;
    }
    /**
     * Whether the status code is ok
     */
    get ok() {
        return this.statusAdapter?.isOk(this.status) ?? this._ok;
    }
    /**
     * Whether the status code is ok
     */
    set ok(ok) {
        this._ok = ok;
        if (!this.statusAdapter) {
            if (!ok) {
                this.body = null;
            }
            return;
        }
        this.status = ok ? this.statusAdapter.ok : this.statusAdapter.notFound;
    }
    get explicitNullBody() {
        return this._explicitNullBody;
    }
    /**
     * Get response body.
     *
     * @return {Mixed}
     * @api public
     */
    get body() {
        return this._body;
    }
    /**
     * Set response body.
     *
     * @param {String|Buffer|Object|Stream} val
     * @api public
     */
    set body(val) {
        const original = this._body;
        this._body = val;
        if (original !== val) {
            this.onBodyChanged(val, original);
        }
        // no content
        if (null == val) {
            if (this.statusAdapter && !this.statusAdapter.isEmpty(this.status)) {
                this.status = this.statusAdapter.noContent;
            }
            if (val === null)
                this.onNullBody();
            this.setContentEncoding(null);
            this.setContentLength(null);
            this.setContentType(null);
            return;
        }
        // set the status
        if (!this._explicitStatus || this.statusAdapter?.isNotFound(this.status))
            this.ok = true;
        // set the content-type only if not yet set
        const setType = !this.headerAdapter.hasContentType(this.response);
        // string
        if ((0, ioc_1.isString)(val)) {
            if (setType)
                this.contentType = common_1.xmlRegExp.test(val) ? common_1.ContentType.TEXT_HTML : common_1.ContentType.TEXT_PLAIN;
            this.length = Buffer.byteLength(val);
            return;
        }
        // buffer
        if ((0, transport_1.isBuffer)(val)) {
            if (setType)
                this.contentType = common_1.ContentType.OCTET_STREAM;
            this.length = val.length;
            return;
        }
        // stream
        if (this.streamAdapter.isStream(val)) {
            if (original != val) {
                // overwriting
                if (null != original)
                    this.headerAdapter.setContentLength(this.response, null);
            }
            if (setType)
                this.contentType = common_1.ContentType.OCTET_STREAM;
            return;
        }
        // json
        this.headerAdapter.setContentLength(this.response, null);
        this.contentType = common_1.ContentType.APPL_JSON;
    }
    /**
     * on body changed. default do nothing.
     * @param newVal
     * @param oldVal
     */
    onBodyChanged(newVal, oldVal) { }
    /**
     * on body set null.
     */
    onNullBody() {
        this._explicitNullBody = true;
    }
    /**
     * The request method.
     */
    get method() {
        return this.request.method;
    }
    // /**
    //  * get request encoding.
    //  * @returns 
    //  */
    // getContentEncoding() {
    //     return this.headerAdapter.getContentEncoding(this.request);
    // }
    // /**
    //  * get request content type
    //  * @param type 
    //  */
    // getContentType(type: string | null | undefined): string {
    //     return this.headerAdapter.getContentType(this.request);
    // }
    // /**
    //  * set request content length
    //  * @param len 
    //  */
    // getContentLength(): number {
    //     return this.headerAdapter.getContentLength(this.request);
    // }
    /**
     * set response content length
     * @param len
     */
    setContentLength(len) {
        super.setContentLength(len);
        this.headerAdapter.setContentLength(this.response, len);
    }
    /**
     * set response content encoding.
     * @param encoding
     */
    setContentEncoding(encoding) {
        super.setContentEncoding(encoding);
        this.headerAdapter.setContentEncoding(this.response, encoding);
    }
    /**
     * set response content type
     * @param type
     */
    setContentType(type) {
        super.setContentType(type);
        this.headerAdapter.setContentType(this.response, type);
    }
    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    getHeader(field) {
        return this.headerAdapter.getHeader(this.request, field);
    }
    /**
     * has response header field or not.
     * @param field
     */
    hasHeader(field) {
        return this.headerAdapter.hasHeader(this.response, field);
    }
    setHeader(field, val) {
        if (this.headersSent)
            return;
        if (val) {
            this.headerAdapter.setHeader(this.response, field, val);
        }
        else if (field instanceof common_1.HeaderMappings) {
            field.forEach((name, values) => {
                this.headerAdapter.setHeader(this.response, name, values);
            });
        }
        else if (field.getHeaders) {
            const headers = field.getHeaders?.();
            if (headers) {
                for (const key in headers) {
                    this.headerAdapter.setHeader(this.response, key, headers[key]);
                }
            }
        }
        else if (field.getHeaderNames) {
            field.getHeaderNames?.().forEach(name => {
                this.headerAdapter.setHeader(this.response, name, field.getHeader?.(name));
            });
        }
        else {
            const fields = field;
            for (const key in fields) {
                this.headerAdapter.setHeader(this.response, key, fields[key]);
            }
        }
    }
    /**
     * Append additional header `field` with value `val`.
     *
     * Examples:
     *
     * ```
     * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
     * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
     * this.append('Warning', '199 Miscellaneous warning');
     * ```
     *
     * @param {String} field
     * @param {String|Array} val
     * @api public
     */
    appendHeader(field, val) {
        if (this.headersSent)
            return;
        const prev = this.headerAdapter.getHeader(this.response, field);
        if (prev) {
            val = Array.isArray(prev)
                ? prev.concat(Array.isArray(val) ? val : String(val))
                : [String(prev)].concat(Array.isArray(val) ? val : String(val));
        }
        return this.setHeader(field, val);
    }
    /**
    * Remove response header `field`.
    *
    * @param {String} name
    * @api public
    */
    removeHeader(field) {
        if (this.headersSent)
            return;
        this.headerAdapter.removeHeader(this.response, field);
    }
    /**
     * Remove all response headers
     *
     * @api public
     */
    removeHeaders() {
        if (this.headersSent)
            return;
        this.headerAdapter.removeHeaders(this.response);
    }
    /**
     * Check if the incoming request contains the "Content-Type"
     * header field and if it contains any of the given mime `type`s.
     * If there is no request body, `null` is returned.
     * If there is no content type, `false` is returned.
     * Otherwise, it returns the first `type` that matches.
     *
     * Examples:
     *
     *     // With Content-Type: text/html; charset=utf-8
     *     this.is('html'); // => 'html'
     *     this.is('text/html'); // => 'text/html'
     *     this.is('text/*', 'application/json'); // => 'text/html'
     *
     *     // When Content-Type is application/json
     *     this.is('json', 'urlencoded'); // => 'json'
     *     this.is('application/json'); // => 'application/json'
     *     this.is('html', 'application/*'); // => 'application/json'
     *
     *     this.is('html'); // => false
     */
    is(type) {
        const encoding = this.headerAdapter.getContentEncoding(this.request);
        const len = this.headerAdapter.getContentLength(this.request);
        //no body
        if (encoding && !len) {
            return null;
        }
        const ctype = this.headerAdapter.getContentType(this.request);
        if (!ctype)
            return false;
        if (!this.mimeAdapter) {
            const itype = (0, ioc_1.isArray)(type) ? type[0] : type;
            if (ctype.indexOf(itype) >= 0 || itype.indexOf(ctype) >= 0) {
                return itype;
            }
            return false;
        }
        const normaled = this.mimeAdapter.normalize(ctype);
        if (!normaled)
            return false;
        const types = (0, ioc_1.isArray)(type) ? type : [type];
        return this.mimeAdapter.match(types, normaled);
    }
    /**
     * content type.
     */
    get contentType() {
        const ctype = this.headerAdapter.getContentType(this.response);
        return ((0, ioc_1.isArray)(ctype) ? ioc_1.lang.first(ctype) : ctype) ?? '';
    }
    /**
     * Set Content-Type response header with `type` through `mime.lookup()`
     * when it does not contain a charset.
     *
     * Examples:
     *
     *     this.contentType = 'application/json';
     *     this.contentType = 'application/octet-stream';  // buffer stream
     *     this.contentType = 'image/png';      // png
     *     this.contentType = 'image/pjpeg';   //jpeg
     *     this.contentType = 'text/plain';    // text, txt
     *     this.contentType = 'text/html';    // html, htm, shtml
     *     this.contextType = 'text/javascript'; // javascript text
     *     this.contentType = 'application/javascript'; //javascript file .js, .mjs
     *
     * @param {String} type
     * @api public
     */
    set contentType(type) {
        this.headerAdapter.setContentType(this.response, type);
    }
    /**
     * Set Content-Type response header with `type` through `mime.lookup()`
     * when it does not contain a charset.
     *
     * Examples:
     *
     *     this.type = '.html';
     *     this.type = 'html';
     *     this.type = 'json';
     *     this.type = 'application/json';
     *     this.type = 'png';
     *
     * @param {String} type
     * @api public
     */
    set type(type) {
        const contentType = this.mimeAdapter?.contentType(type) ?? type;
        if (contentType) {
            this.contentType = contentType;
        }
    }
    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    get type() {
        const type = this.contentType;
        if (!type)
            return '';
        return type.split(';', 1)[0];
    }
    /**
     * Get Content-Encoding or not.
     * @param packet
     */
    get contentEncoding() {
        return this.headerAdapter.getContentEncoding(this.response);
    }
    /**
     * Set Content-Encoding.
     */
    set contentEncoding(encoding) {
        if (this.headersSent)
            return;
        this.headerAdapter.setContentEncoding(this.response, encoding);
        // if (isNil(encoding)) {
        //     this.resHeaders.setContentEncoding(encoding)
        // } else {
        //     const old = this.resHeaders.getContentEncoding();
        //     this.resHeaders.setContentEncoding(encoding);
        //     if (old != encoding) {
        //         this.resHeaders.setContentLength(null);
        //     }
        // }
    }
    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get headersSent() {
        return this.response.headersSent == true;
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
        if (!this.acceptsPriority)
            return '*';
        const accepts = this.headerAdapter.getAccept(this.request) ?? '*';
        if (!args.length) {
            return accepts ?? false;
        }
        const medias = args.map(a => a.indexOf('/') === -1 ? this.mimeAdapter?.lookup(a) ?? a : a).filter(a => (0, ioc_1.isString)(a));
        return ioc_1.lang.first(this.acceptsPriority.priority(accepts, medias, 'media')) ?? false;
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
        if (!this.acceptsPriority)
            return '*';
        const accepts = this.headerAdapter.getAcceptEncoding(this.request) ?? '*';
        if (!encodings.length) {
            return accepts;
        }
        return ioc_1.lang.first(this.acceptsPriority.priority(accepts, encodings, 'encodings')) ?? false;
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
        if (!this.acceptsPriority)
            return '*';
        const accepts = this.headerAdapter.getAcceptCharset(this.request) ?? '*';
        if (!charsets.length) {
            return accepts;
        }
        return ioc_1.lang.first(this.acceptsPriority.priority(accepts, charsets, 'charsets')) ?? false;
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
        if (!this.acceptsPriority)
            return '*';
        const accepts = this.headerAdapter.getAcceptLanguage(this.request) ?? '*';
        if (!langs.length) {
            return accepts;
        }
        return ioc_1.lang.first(this.acceptsPriority.priority(accepts, langs, 'lang')) ?? false;
    }
    /**
    * Set Content-Disposition header to "attachment" with optional `filename`.
    *
    * @param filname file name for download.
    * @param options content disposition.
    * @api public
    */
    attachment(filename, options) {
        if (options?.contentType) {
            this.contentType = options.contentType;
        }
        else if (filename) {
            this.type = this.fileAdapter.extname(filename);
        }
        const func = this.get(content_1.CONTENT_DISPOSITION_TOKEN);
        this.headerAdapter.setContentDisposition(this.response, func(filename, options));
    }
};
exports.AbstractRequestContext = AbstractRequestContext;
exports.AbstractRequestContext = AbstractRequestContext = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractRequestContext);
function getScopeValue(req, scope) {
    if (!req) {
        return null;
    }
    switch (scope) {
        case 'body':
            return req['body'] ?? req['payload'];
        case 'payload':
            return req['payload'] ?? req['body'];
        default:
            return req[scope];
    }
}
let RequestContextFactory = class RequestContextFactory {
};
exports.RequestContextFactory = RequestContextFactory;
exports.RequestContextFactory = RequestContextFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], RequestContextFactory);
//# sourceMappingURL=AbstractRequestContext.js.map