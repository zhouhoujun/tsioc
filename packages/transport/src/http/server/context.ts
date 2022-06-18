import { HeaderContext, MiddlewareInst, Protocol, ServerContext, TransportContext, TransportServer } from '@tsdi/core';
import { Injector, InvokeArguments, isArray, isNumber, isString, lang, Token, tokenId } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import * as assert from 'assert';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { extname } from 'path';
import { append, encodeUrl, escapeHtml, isBuffer, isStream, parseTokenList } from '../../utils';
import { emptyStatus, redirectStatus } from '../status';
import { CONTENT_DISPOSITION } from './content';
import { ctype, hdr } from '../../consts';
import { MimeAdapter } from '../../mime';
import { Negotiator } from '../../negotiator';
import { HttpError, HttpInternalServerError } from './../errors';
import { HttpServer } from './server';


const AUTHORITY = http2.constants?.HTTP2_HEADER_AUTHORITY ?? ':authority';

export type HttpServRequest = http.IncomingMessage | http2.Http2ServerRequest;

export type HttpServResponse = http.ServerResponse | http2.Http2ServerResponse;

/**
 * http context for `HttpServer`.
 */
export class HttpContext extends ServerContext<HttpServRequest, HttpServResponse> implements HeaderContext {

    protected _body: any;
    private _explicitStatus?: boolean;
    public _explicitNullBody?: boolean;
    private _URL?: URL;
    private _ip?: string;
    readonly originalUrl: string;
    private _url: string;

    constructor(injector: Injector, request: HttpServRequest, response: HttpServResponse, target: TransportServer, options?: InvokeArguments) {
        super(injector, request, response, target, options);
        this.response.statusCode = 404;
        this.originalUrl = request.url?.toString() ?? '';
        this._url = request.url ?? '';
        const sidx = this._url.indexOf('?');
        if (sidx > 0) {
            this._url = this._url.slice(0, sidx);
        }
    }

    protected isSelf(token: Token) {
        return token === HttpContext || token === TransportContext
    }

    /**
     * Return the request socket.
     *
     * @return {Connection}
     * @api public
     */

    get socket() {
        return this.request.socket
    }

    /**
     * Return request header, alias as request.header
     *
     * @return {Object}
     * @api public
     */

    get headers() {
        return this.request.headers
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
                return req.headers.referrer || req.headers.referer
            default:
                return req.headers[field]
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
        if (!(this.target as any)?.proxy) return 'http';
        const proto = this.getHeader(hdr.X_FORWARDED_PROTO) as string;
        return (proto ? proto.split(urlsplit, 1)[0] : 'http') as Protocol
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
        return this.protocol === 'https'
    }

    /**
     * Get url path.
     *
     * @return {String}
     * @api public
     */
    get url(): string {
        return this._url
    }

    /**
     * Set url path
     */
    set url(value: string) {
        this._url = value
    }

    /**
     * When `httpServer.proxy` is `true`, parse
     * the "X-Forwarded-For" ip address list.
     *
     * For example if the value was "client, proxy1, proxy2"
     * you would receive the array `["client", "proxy1", "proxy2"]`
     * where "proxy2" is the furthest down-stream.
     *
     * @return {Array}
     * @api public
     */

    get ips() {
        const proxy = (this.target as HttpServer)?.proxy;
        const val = this.getHeader((this.target as any)?.proxyIpHeader) as string;
        let ips = proxy && val
            ? val.split(/\s*,\s*/)
            : [];
        if ((this.target as HttpServer)?.maxIpsCount > 0) {
            ips = ips.slice(-(this.target as any)?.maxIpsCount)
        }
        return ips
    }

    /**
     * Return request's remote address
     * When `app.proxy` is `true`, parse
     * the "X-Forwarded-For" ip address list and return the first one
     *
     * @return {String}
     * @api public
     */

    get ip() {
        if (!this._ip) {
            this._ip = this.ips[0] || this.socket.remoteAddress || ''
        }
        return this._ip
    }

    set ip(ip: string) {
        this._ip = ip
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
        const proxy = (this.target as HttpServer)?.proxy;
        let host = proxy && this.getHeader(hdr.X_FORWARDED_HOST);
        if (!host) {
            if (this.request.httpVersionMajor >= 2) host = this.getHeader(AUTHORITY);
            if (!host) host = this.getHeader(hdr.HOST);
        }
        if (!host || isNumber(host)) return '';
        return isString(host) ? host.split(urlsplit, 1)[0] : host[0]
    }

    /**
     * Parse the "Host" header field hostname
     * and support X-Forwarded-Host when a
     * proxy is enabled.
     *
     * @return {String} hostname
     * @api public
     */
    get hostname(): string {
        const host = this.host;
        if (!host) return '';
        if ('[' === host[0]) return this.URL.hostname || ''; // IPv6
        return host.split(':', 1)[0]
    }

    get pathname(): string {
        return this.URL.pathname
    }

    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    get URL(): URL {
        /* istanbul ignore else */
        if (!this._URL) {
            const originalUrl = this.originalUrl || ''; // avoid undefined in template string
            try {
                this._URL = new URL(`${this.origin}${originalUrl}`);
            } catch (err) {
                this._URL = Object.create(null);
            }
        }
        return this._URL!;
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
        if (httptl.test(this.originalUrl)) return this.originalUrl;
        return this.origin + this.originalUrl
    }

    /**
     * Get request method.
     *
     * @return {String}
     * @api public
     */

    get method(): string {
        return this.request.method ?? ''
    }


    is(type: string | string[]): string | null | false {
        //no body
        if (this.getHeader(hdr.TRANSFER_ENCODING) && !this.getHeader(hdr.CONTENT_LENGTH)) {
            return null
        }
        const ctype = this.getHeader(hdr.CONTENT_TYPE) as string;
        if (!ctype) return false;
        const adapter = this.injector.get(MimeAdapter)
        const normaled = adapter.normalize(ctype);
        if (!normaled) return false;

        const types = isArray(type) ? type : [type];
        return adapter.match(types, normaled)
    }

    isUpdate(): boolean {
        return this.method === 'PUT'
    }

    get params(): URLSearchParams {
        return this.URL.searchParams
    }

    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const q: Record<string, any> = {};
            this.URL.searchParams.forEach((v, k) => {
                q[k] = v
            });
            this._query = q
        }
        return this._query
    }

    /**
     * Get the search string. Same as the query string
     * except it includes the leading ?.
     *
     * @return {String}
     * @api public
     */

    get search() {
        return this.URL.search
    }

    /**
     * Set the search string. Same as
     * request.querystring= but included for ubiquity.
     *
     * @param {String} str
     * @api public
     */

    set search(str: string) {
        this.URL.search = str;
        this._query = null!
    }

    /**
     * Get query string.
     *
     * @return {String}
     * @api public
     */

    get querystring() {
        return this.URL.search?.slice(1)
    }

    /**
     * Set query string.
     *
     * @param {String} str
     * @api public
     */

    set querystring(str) {
        this.search = `?${str}`
    }

    get playload(): any {
        return (this.request as any).body
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

    accepts(...args: string[]): string | string[] | false {
        const negotiator = this.resolve(Negotiator);
        if (!args.length) {
            return negotiator.mediaTypes()
        }
        const mimeAdapter = this.resolve(MimeAdapter);
        const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter.lookup(a) : a).filter(a => isString(a)) as string[];
        return lang.first(negotiator.mediaTypes(...medias)) ?? false
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
    acceptsEncodings(...encodings: string[]): string | string[] | false {
        const negotiator = this.resolve(Negotiator);
        if (!encodings.length) {
            return negotiator.encodings()
        }
        return lang.first(negotiator.encodings(...encodings)) ?? false
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
    acceptsCharsets(...charsets: string[]): string | string[] | false {
        const negotiator = this.resolve(Negotiator);
        if (!charsets.length) {
            return negotiator.charsets()
        }
        return lang.first(negotiator.charsets(...charsets)) ?? false
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

    acceptsLanguages(...langs: string[]): string | string[] {
        const negotiator = this.resolve(Negotiator);
        if (!langs.length) {
            return negotiator.languages()
        }
        return lang.first(negotiator.languages(...langs)) ?? false
    }

    /**
     * Check if the request is idempotent.
     *
     * @return {Boolean}
     * @api public
     */

    get idempotent() {
        return !!~methods.indexOf(this.method)
    }

    /**
     * Check if the request is fresh, aka
     * Last-Modified and/or the ETag
     * still match.
     *
     * @return {Boolean}
     * @api public
     */
    get fresh(): boolean {
        const method = this.methodName;
        const s = this.status;

        // GET or HEAD for weak freshness validation only
        if ('GET' !== method && 'HEAD' !== method) return false;

        // 2xx or 304 as per rfc2616 14.26
        if ((s >= 200 && s < 300) || 304 === s) {
            return this.freshHeader()
        }

        return false
    }

    get stale(): boolean {
        return !this.fresh;
    }

    protected freshHeader(): boolean {
        const reqHeaders = this.request.headers;
        const modifSince = reqHeaders[hdr.IF_MODIFIED_SINCE];
        const nonMatch = reqHeaders[hdr.IF_NONE_MATCH];
        if (!modifSince && !nonMatch) {
            return false
        }

        const cacheControl = reqHeaders[hdr.CACHE_CONTROL];
        if (cacheControl && no_cache.test(cacheControl)) {
            return false
        }

        // if-none-match
        if (nonMatch && nonMatch !== '*') {
            const etag = this.response.getHeader(hdr.ETAG)

            if (!etag) {
                return false
            }

            let etagStale = true
            const matches = parseTokenList(nonMatch)
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i]
                if (match === etag || match === 'W/' + etag || 'W/' + match === etag) {
                    etagStale = false
                    break
                }
            }

            if (etagStale) {
                return false
            }
        }

        // if-modified-since
        if (modifSince) {
            let lastModified = this.response.getHeader(hdr.LAST_MODIFIED);
            if (isArray(lastModified)) {
                lastModified = lang.first(lastModified)
            }
            const modifiedStale = !lastModified || !(parseStamp(lastModified) <= parseStamp(modifSince))

            if (modifiedStale) {
                return false
            }
        }
        return true
    }



    /**
     * content type.
     */
    get contentType(): string {
        const ctype = this.response.getHeader(hdr.CONTENT_TYPE);
        return (isArray(ctype) ? lang.first(ctype) : ctype) as string ?? ''
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
            this.response.setHeader(hdr.CONTENT_TYPE, type)
        } else {
            this.response.removeHeader(hdr.CONTENT_TYPE)
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
        const contentType = this.injector.get(MimeAdapter).contentType(type);
        if (contentType) {
            this.contentType = contentType
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
        if (!type) return '';
        return type.split(';', 1)[0]
    }

    /**
     * Whether the status code is ok
     */
    get ok(): boolean {
        return this.status >= 200 && this.status < 300
    }
    /**
     * Whether the status code is ok
     */
    set ok(ok: boolean) {
        this.status = ok ? 200 : 404
    }

    get status(): HttpStatusCode {
        return this.response.statusCode
    }

    set status(code: HttpStatusCode) {
        if (this.sent) return;

        assert(Number.isInteger(code), 'status code must be a number');
        assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
        this._explicitStatus = true;
        this.response.statusCode = code;
        if (this.request.httpVersionMajor < 2) this.response.statusMessage = statusMessage[code];
        if (this.body && emptyStatus[code]) this.body = null;
    }

    get statusMessage() {
        return this.response.statusMessage || statusMessage[this.status]
    }

    set statusMessage(msg: string) {
        if (this.request.httpVersionMajor < 2) {
            this.response.statusMessage = msg
        }
    }

    /**
     * Get response body.
     *
     * @return {Mixed}
     * @api public
     */
    get body() {
        return this._body
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
            this.removeHeader(hdr.CONTENT_TYPE);
            this.removeHeader(hdr.CONTENT_LENGTH);
            this.removeHeader(hdr.TRANSFER_ENCODING);
            return
        }

        // set the status
        if (!this._explicitStatus) this.status = 200;

        // set the content-type only if not yet set
        const setType = !this.hasHeader(hdr.CONTENT_TYPE);

        // string
        if (isString(val)) {
            if (setType) this.contentType = xmlpat.test(val) ? ctype.TEXT_HTML : ctype.TEXT_PLAIN;
            this.length = Buffer.byteLength(val);
            return
        }

        // buffer
        if (isBuffer(val)) {
            if (setType) this.contentType = ctype.OCTET_STREAM;
            this.length = val.length;
            return
        }

        // stream
        if (isStream(val)) {
            if (original != val) {
                // overwriting
                if (null != original) this.removeHeader(hdr.CONTENT_LENGTH)
            }

            if (setType) this.contentType = ctype.OCTET_STREAM;
            return
        }

        // json
        this.removeHeader(hdr.CONTENT_LENGTH);
        this.contentType = ctype.APPL_JSON;
    }

    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        if (isNumber(n) && !this.hasHeader(hdr.TRANSFER_ENCODING)) {
            this.setHeader(hdr.CONTENT_LENGTH, n)
        } else {
            this.removeHeader(hdr.CONTENT_LENGTH)
        }
    }

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */

    get length(): number | undefined {
        if (this.hasHeader(hdr.CONTENT_LENGTH)) {
            return this.response.getHeader(hdr.CONTENT_LENGTH) as number || 0
        }

        const { body } = this;
        if (!body || isStream(body)) return undefined;
        if (isString(body)) return Buffer.byteLength(body);
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body))
    }

    /**
     * Set the Last-Modified date using a string or a Date.
     *
     *     this.response.lastModified = new Date();
     *
     * @param {String|Date} type
     * @api public
     */

    set lastModified(val: Date | null) {
        if (!val) {
            this.removeHeader(hdr.LAST_MODIFIED);
            return
        }
        this.setHeader(hdr.LAST_MODIFIED, val.toUTCString())
    }

    /**
     * Get the Last-Modified date in Date form, if it exists.
     *
     * @return {Date}
     * @api public
     */

    get lastModified(): Date | null {
        const date = this.response.getHeader(hdr.LAST_MODIFIED) as string;
        return date ? new Date(date) : null
    }

    /**
     * Set the etag of a response.
     * This will normalize the quotes if necessary.
     *
     *     this.response.etag = 'md5hashsum';
     *     this.response.etag = '"md5hashsum"';
     *     this.response.etag = 'W/"123456789"';
     *
     * @param {String} etag
     * @api public
     */

    set etag(val: string) {
        if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
        this.setHeader(hdr.ETAG, val)
    }

    /**
     * Get the etag of a response.
     *
     * @return {String}
     * @api public
     */
    get etag(): string {
        return this.response.getHeader(hdr.ETAG) as string
    }

    vary(field: string) {
        if (this.sent) return;
        let val = this.response.getHeader(hdr.VARY) ?? '';
        const header = Array.isArray(val)
            ? val.join(', ')
            : String(val)

        // set new header
        if ((val = append(header, field))) {
            this.setHeader(hdr.VARY, val)
        }
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
    get sent() {
        return this.response.headersSent
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
        if (this.sent) return;

        if (val) {
            this.response.setHeader(field as string, val)
        } else {
            const fields = field as Record<string, string | number | string[]>;
            for (const key in fields) {
                this.response.setHeader(key, fields[key])
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
                : [String(prev)].concat(Array.isArray(val) ? val : String(val))
        }

        return this.setHeader(field, val)
    }
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string) {
        if (this.sent) return;
        this.response.removeHeader(field)
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
        if ('back' === url) url = this.getHeader(hdr.REFERRER) as string || alt || '/';
        this.setHeader(hdr.LOCATION, encodeUrl(url));
        // status
        if (!redirectStatus[this.status]) this.status = 302;

        // html
        if (this.accepts('html')) {
            url = escapeHtml(url);
            this.type = ctype.TEXT_HTML_UTF8;
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return
        }

        // text
        this.type =  ctype.TEXT_PLAIN_UTF8;
        this.body = `Redirecting to ${url}.`
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
        const func = this.get(CONTENT_DISPOSITION);
        this.response.setHeader(hdr.CONTENT_DISPOSITION, func(filename, options))
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
        if ((this.response as http.ServerResponse).writableEnded || this.response.finished) return false;
        const socket = this.response.socket;
        // There are already pending outgoing res, but still writable
        // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
        if (!socket) return true;
        return socket.writable
    }

    write(chunk: string | Uint8Array, cb?: (err?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error | null) => void), cb?: (err?: Error | null) => void): boolean {
        if (this.sent) return false;
        if (this.response instanceof http.ServerResponse) {
            return isString(encoding) ? this.response.write(chunk, encoding, cb) : this.response.write(chunk, encoding)
        } else {
            return isString(encoding) ? this.response.write(chunk, encoding, cb) : this.response.write(chunk, encoding)
        }
    }

    flushHeaders() {
        if (this.response instanceof http.ServerResponse) {
            this.response.flushHeaders()
        }
    }


    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: string | number | Error, message?: string): Error {
        if (isString(status)) {
            return new HttpInternalServerError(status)
        } else if (isNumber(status)) {
            if (!statusMessage[status as HttpStatusCode]) {
                status = 500
            }
            return new HttpError(status, message ?? statusMessage[status as HttpStatusCode])
        }
        return new HttpError((status as HttpError).statusCode ?? 500, status.message ?? statusMessage[(status as HttpError).statusCode ?? 500]);
    }

}


const httptl = /^https?:\/\//i;
const urlsplit = /\s*,\s*/;
const xmlpat = /^\s*</;
const no_cache = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;
const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];


function parseStamp(date?: string | number): number {
    if (date) {
        return isString(date) ? Date.parse(date) : date
    }
    return NaN
}


/**
 * http middleware.
 */
export type HttpMiddleware = MiddlewareInst<HttpContext>;

/**
 * http middlewares token.
 */
export const HTTP_MIDDLEWARES = tokenId<HttpMiddleware[]>('HTTP_MIDDLEWARES');
