import { AssetContext, HeaderContext, MiddlewareLike, mths, Protocol, Throwable, TransportContext, TransportServer } from '@tsdi/core';
import { Injector, InvokeArguments, isArray, isNumber, isString, lang, Token, tokenId } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import * as assert from 'assert';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { append, encodeUrl, escapeHtml, parseTokenList } from '../../utils';
import { ctype, hdr } from '../../consts';
import { HttpError, HttpInternalServerError } from './../errors';
import { HttpServer } from './server';
import { AssetServerContext } from '../../asset.ctx';


const AUTHORITY = http2.constants?.HTTP2_HEADER_AUTHORITY ?? ':authority';

export type HttpServRequest = http.IncomingMessage | http2.Http2ServerRequest;

export type HttpServResponse = http.ServerResponse | http2.Http2ServerResponse;

/**
 * http context for `HttpServer`.
 */
export class HttpContext extends AssetServerContext<HttpServRequest, HttpServResponse> implements HeaderContext, AssetContext, Throwable {

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
        return token === HttpContext || token === AssetServerContext || token === TransportContext;
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

    isUpdate(): boolean {
        return this.method === mths.PUT
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
        if (mths.GET !== method && mths.HEAD !== method) return false;

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

    get status(): HttpStatusCode {
        return this.response.statusCode
    }

    set status(code: HttpStatusCode) {
        if (this.sent) return;

        assert(Number.isInteger(code), 'status code must be a number');
        assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
        this._explicitStatus = true;
        this.response.statusCode = code;
        if (this.request.httpVersionMajor < 2) this.response.statusMessage = this.adapter.message(code);
        if (this.body && this.adapter.isEmpty(code)) this.body = null;
    }

    get statusMessage() {
        return this.response.statusMessage || this.adapter.message(this.status)
    }

    set statusMessage(msg: string) {
        if (this.request.httpVersionMajor < 2) {
            this.response.statusMessage = msg
        }
    }

    protected override onNullBody(): void {
        this._explicitNullBody = true;
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
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get sent() {
        return this.response.headersSent
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
const no_cache = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;
const methods = [mths.GET, mths.HEAD, mths.PUT, mths.DELETE, mths.OPTIONS, mths.TRACE];


function parseStamp(date?: string | number): number {
    if (date) {
        return isString(date) ? Date.parse(date) : date
    }
    return NaN
}


/**
 * http middleware.
 */
export type HttpMiddleware = MiddlewareLike<HttpContext>;

/**
 * http middlewares token.
 */
export const HTTP_MIDDLEWARES = tokenId<HttpMiddleware[]>('HTTP_MIDDLEWARES');

