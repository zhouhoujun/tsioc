import { ApplicationContext, HttpStatusCode, Middleware, Protocol, RequestMethod, TransportContext, TransportError, TransportOption } from '@tsdi/core';
import { Injector, isNumber, isString, tokenId } from '@tsdi/ioc';
import * as assert from 'assert';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { Readable } from 'stream';
import { extname } from 'path';
import { encodeUrl, escapeHtml, isBuffer, isStream } from '../utils';
import { emptyStatus, redirectStatus, statusMessage } from './status';
import { CONTENT_DISPOSITION } from './content';

export interface HttpContextOption extends TransportOption {
    request: http.IncomingMessage | http2.Http2ServerRequest;
    response: http.ServerResponse | http2.Http2ServerResponse;
}


export class HttpContext extends TransportContext {

    protected _body: any;
    private _explicitStatus?: boolean;
    private _explicitNullBody?: boolean;

    /**
     * target client or server.
     */
    readonly target: any;
    /**
     * transport request.
     */
    readonly request: http.IncomingMessage | http2.Http2ServerRequest;

    /**
     * transport response.
     */
    readonly response: http.ServerResponse | http2.Http2ServerResponse;

    constructor(injector: Injector, options: HttpContextOption) {
        super(injector, options);
        this.target = options.target;
        this.request = options.request;
        this.response = options.response;
    }

    // /**
    //  * transport request.
    //  */
    // abstract get request(): http.IncomingMessage | http2.Http2ServerRequest;

    /**
     * Return the request socket.
     *
     * @return {Connection}
     * @api public
     */

    get socket() {
        return this.request.socket;
    }

    /**
     * Return request header, alias as request.header
     *
     * @return {Object}
     * @api public
     */

    get headers() {
        return this.request.headers;
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
    getHeader(field: string) {
        const req = this.request;
        switch (field = field.toLowerCase()) {
            case 'referer':
            case 'referrer':
                return req.headers.referrer || req.headers.referer || '';
            default:
                return req.headers[field] || '';
        }
    }

    /**
     * Return the protocol string "http" or "https"
     * when requested with TLS. When the proxy setting
     * is enabled the "X-Forwarded-Proto" header
     * field will be trusted. If you're running behind
     * a reverse proxy that supplies https for you this
     * may be enabled.
     *
     * @return {String}
     * @api public
     */
    get protocol(): Protocol {
        if ((this.socket as TLSSocket).encrypted) return 'https';
        // if (!this.get(TransportServer).proxy) return 'http';
        const proto = this.getHeader('X-Forwarded-Proto') as string;
        return (proto ? proto.split(/\s*,\s*/, 1)[0] : 'http') as Protocol;
    }

    /**
     * Short-hand for:
     *
     *    this.protocol == 'https'
     *
     * @return {Boolean}
     * @api public
     */
    get secure(): boolean {
        return this.protocol === 'https';
    }

    /**
     * Get request URL.
     *
     * @return {String}
     * @api public
     */
    get url(): string {
        return this.request.url ?? '';
    }

    /**
     * Parse the "Host" header field host
     * and support X-Forwarded-Host when a
     * proxy is enabled.
     *
     * @return {String} hostname:port
     * @api public
     */
    get host() {
        const proxy = this.get(ApplicationContext).arguments.env.proxy;
        let host = proxy && this.getHeader('X-Forwarded-Host');
        if (!host) {
            if (this.request.httpVersionMajor >= 2) host = this.getHeader(':authority');
            if (!host) host = this.getHeader('Host');
        }
        if (!host || isNumber(host)) return '';
        return isString(host) ? host.split(/\s*,\s*/, 1)[0] : host[0];
    }

    /**
     * Get origin of URL.
     *
     * @return {String}
     * @api public
     */

    get origin() {
        return `${this.protocol}://${this.host}`;
    }

    /**
     * Get full request URL.
     *
     * @return {String}
     * @api public
     */

    get href() {
        // support: `GET http://example.com/foo`
        if (/^https?:\/\//i.test(this.url)) return this.url;
        return this.origin + this.url;
    }

    /**
     * Get request method.
     *
     * @return {String}
     * @api public
     */

    get method(): RequestMethod | undefined {
        return this.request.method as RequestMethod;
    }

    isUpdate(): boolean {
        return this.method === 'PUT';
    }

    get query(): any {
        throw new Error('Method not implemented.');
    }

    get restful(): Record<string, string | number> {
        throw new Error('Method not implemented.');
    }
    set restful(value: Record<string, string | number>) {
        throw new Error('Method not implemented.');
    }

    // /**
    //  * Get accept object.
    //  * Lazily memoized.
    //  *
    //  * @return {Object}
    //  * @api private
    //  */

    // get accept() {
    //     return this._accept || (this._accept = accepts(this.request));
    // }

    // /**
    //  * Set accept object.
    //  *
    //  * @param {Object}
    //  * @api private
    //  */

    // set accept(obj) {
    //     this.request.
    //         this._accept = obj;
    // }

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

    accepts(...args: string[]): string | number | string[] {
        return '';
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
    acceptsEncodings(...encodings: string[]): void {

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
    acceptsCharsets(...charsets: string[]): void {

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

    acceptsLanguages(...langs: string[]): void {
        return this.accept.languages(...langs);
    }

    /**
       * Check if the request is fresh, aka
       * Last-Modified and/or the ETag
       * still match.
       *
       * @return {Boolean}
       * @api public
       */

    get fresh() {
        const method = this.methodName;
        const s = this.status;

        // GET or HEAD for weak freshness validation only
        if ('GET' !== method && 'HEAD' !== method) return false;

        // 2xx or 304 as per rfc2616 14.26
        if ((s >= 200 && s < 300) || 304 === s) {
            return fresh(this.request.headers, this.response.getHeaders());
        }

        return false;
    }



    // /**
    //  * transport response.
    //  */
    // abstract get response(): http.ServerResponse | http2.Http2ServerResponse;


    get contentType(): string {
        return this.response.getHeader('Content-Type')?.toString() ?? '';
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
    set contentType(type: string) {
        if (type) {
            this.response.setHeader('Content-Type', type);
        } else {
            this.response.removeHeader('Content-Type');
        }
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
    set type(type: string) {
        this.contentType = type;
    }

    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(value: boolean) {
        throw new Error('Method not implemented.');
    }

    get status(): HttpStatusCode {
        return this.response.statusCode;
    }

    set status(code: HttpStatusCode) {
        if (this.headerSent) return;

        assert(Number.isInteger(code), 'status code must be a number');
        assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
        this._explicitStatus = true;
        this.response.statusCode = code;
        if (this.request.httpVersionMajor < 2) this.response.statusMessage = statusMessage[code];
        if (this.body && emptyStatus[code]) this.body = null;
        this.response.statusCode = code;
    }

    get message() {
        return this.response.statusMessage ?? statusMessage[this.status];
    }

    set message(msg: string) {
        this.response.statusMessage = msg;
    }

    private _err!: Error;
    set error(err: Error) {
        this._err = err;
        if (err) {
            this.message = err.stack ?? err.message;
            this.status = HttpStatusCode.InternalServerError;
        }
    }

    get error() {
        return this._err;
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

        // no content
        if (null == val) {
            if (!emptyStatus[this.status]) this.status = 204;
            if (val === null) this._explicitNullBody = true;
            this.removeHeader('Content-Type');
            this.removeHeader('Content-Length');
            this.removeHeader('Transfer-Encoding');
            return;
        }

        // set the status
        if (!this._explicitStatus) this.status = 200;

        // set the content-type only if not yet set
        const setType = !this.hasHeader('Content-Type');

        // string
        if (isString(val)) {
            if (setType) this.contentType = /^\s*</.test(val) ? 'text/html' : 'text/plain';
            this.length = Buffer.byteLength(val);
            return;
        }

        // buffer
        if (isBuffer(val)) {
            if (setType) this.contentType = 'application/octet-stream';
            this.length = val.length;
            return;
        }

        // stream
        if (isStream(val)) {
            this.onDestroy(() => {
                if (val instanceof Readable) val.destroy();
            });
            // onFinish(this.response, destroy.bind(null, val));
            if (original != val) {
                val.once('error', err => this.onerror(err));
                // overwriting
                if (null != original) this.removeHeader('Content-Length');
            }

            if (setType) this.contentType = 'application/octet-stream';
            return;
        }

        // json
        this.removeHeader('Content-Length');
        this.contentType = 'application/json';
    }

    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        if (isNumber(n) && !this.hasHeader('Transfer-Encoding')) {
            this.setHeader('Content-Length', n);
        } else {
            this.removeHeader('Content-Length');
        }
    }

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */

    get length(): number | undefined {
        if (this.hasHeader('Content-Length')) {
            return this.response.getHeader('Content-Length') as number || 0;
        }

        const { body } = this;
        if (!body || isStream(body)) return undefined;
        if ('string' === typeof body) return Buffer.byteLength(body);
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body));
    }

    /**
     * Returns true if the header identified by name is currently set in the outgoing headers.
     * The header name matching is case-insensitive.
     *
     * Examples:
     *
     *     this.hasHeader('Content-Type');
     *     // => true
     *
     * @param {String} field
     * @return {boolean}
     * @api public
     */
    hasHeader(field: string) {
        return this.response.hasHeader(field)
    }

    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get headerSent() {
        return this.response.headersSent;
    }

    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: string | Record<string, string | number | string[]>, val?: string | number | string[]) {
        if (this.headerSent) return;

        if (val) {
            this.response.setHeader(field as string, val);
        } else {
            const fields = field as Record<string, string | number | string[]>;
            for (const key in fields) {
                this.response.setHeader(key, fields[key]);
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

    appendHeader(field: string, val: string | number | string[]) {
        const prev = this.response.getHeader(field);
        if (prev) {
            val = Array.isArray(prev)
                ? prev.concat(Array.isArray(val) ? val : String(val))
                : [String(prev)].concat(Array.isArray(val) ? val : String(val));
        }

        return this.setHeader(field, val);
    }
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string) {
        if (this.headerSent) return;
        this.response.removeHeader(field);
    }

    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    redirect(url: string, alt?: string): void {
        if ('back' === url) url = this.getHeader('Referrer') as string || alt || '/';
        this.setHeader('Location', encodeUrl(url));

        // status
        if (!redirectStatus[this.status]) this.status = 302;

        // html
        if (this.accepts('html')) {
            url = escapeHtml(url);
            this.contentType = 'text/html; charset=utf-8';
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return;
        }

        // text
        this.contentType = 'text/plain; charset=utf-8';
        this.body = `Redirecting to ${url}.`;
    }


    /**
     * Set Content-Disposition header to "attachment" with optional `filename`.
     *
     * @param filname file name for download.
     * @param options content disposition.
     * @api public
     */
    attachment(filename: string, options?: {
        contentType?: string;
        /**
        * Specifies the disposition type.
        * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
        * but can convey additional information if both parties agree to it).
        * The `type` is normalized to lower-case.
        * @default 'attachment'
        */
        type?: 'attachment' | 'inline' | string | undefined;
        /**
         * If the filename option is outside ISO-8859-1,
         * then the file name is actually stored in a supplemental field for clients
         * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
         * @default true
         */
        fallback?: string | boolean | undefined;
    }): void {
        if (options?.contentType) {
            this.contentType = options.contentType;
        } else if (filename) {
            this.type = extname(filename);
        }
        const func = this.getValue(CONTENT_DISPOSITION);
        this.response.setHeader('Content-Disposition', func(filename, options));
    }

    /**
     * Checks if the request is writable.
     * Tests for the existence of the socket
     * as node sometimes does not set it.
     */
    get writable() {
        // can't write any more after response finished
        // response.writableEnded is available since Node > 12.9
        // https://nodejs.org/api/http.html#http_response_writableended
        // response.finished is undocumented feature of previous Node versions
        // https://stackoverflow.com/questions/16254385/undocumented-response-finished-in-node-js
        if (this.response.writableEnded || this.response.finished) return false;

        const socket = this.response.socket;
        // There are already pending outgoing res, but still writable
        // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
        if (!socket) return true;
        return socket.writable;
    }

    write(chunk: string | Uint8Array, cb?: (err?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error | null) => void), cb?: (err?: Error | null) => void): boolean {
        if (this.headerSent) return false;
        if (this.response instanceof http.ServerResponse) {
            return isString(encoding) ? this.response.write(chunk, encoding, cb) : this.response.write(chunk, encoding);
        } else {
            return isString(encoding) ? this.response.write(chunk, encoding, cb) : this.response.write(chunk, encoding);
        }
    }

    flushHeaders() {
        if (this.response instanceof http.ServerResponse) {
            this.response.flushHeaders();
        }
    }


    throwError(status: TransportStatus, ...messages: string[]):  {
        
    }

    static create(injector: Injector, options?: TransportOption): HttpContext {
        throw new Error('Method not implemented.');
    }
}


export type HttpMiddleware = Middleware<HttpContext>;

/**
 * http middlewares token.
 */
export const HTTP_MIDDLEWARES = tokenId<HttpMiddleware[]>('MIDDLEWARES');
