import { Injector, isArray, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage, PUT, GET, HEAD, DELETE, OPTIONS, TRACE, Response, normalize } from '@tsdi/common';
import { MessageException, InternalServerException, Outgoing, append, parseTokenList, Incoming, ENOENT } from '@tsdi/common/transport';
import { HttpServConfig, RestfulRequestContext, ServerTransport, Throwable } from '@tsdi/endpoints';
import * as http from 'http';
import * as http2 from 'http2';
import * as assert from 'assert';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { lastValueFrom } from 'rxjs';


export type HttpServRequest = (http.IncomingMessage | http2.Http2ServerRequest) & Incoming<any>;

export type HttpServResponse = (http.ServerResponse | http2.Http2ServerResponse) & Outgoing<any>;

/**
 * http context for `HttpServer`.
 */
export class HttpContext extends RestfulRequestContext<HttpServRequest, HttpServResponse, TLSSocket | Socket, HttpServConfig, number> implements Throwable {


    private _URL?: URL;
    readonly originalUrl: string;
    private _url: string;

    constructor(
        injector: Injector,
        readonly transport: ServerTransport,
        readonly request: HttpServRequest,
        readonly response: HttpServResponse,
        readonly serverOptions: HttpServConfig
    ) {
        super(injector, { ...serverOptions, payload: request });

        this.setValue(ServerTransport, transport);
        const url = this._url = this.originalUrl = normalize(request.url!);
        this.status = HttpStatusCode.NotFound

        const searhIdx = url.indexOf('?');
        if (searhIdx >= 0) {
            (this.request as any).query = this.query;
        }
    }

    /**
     * Get request rul
     */
    get url(): string {
        return this._url;
    }

    /**
     * Set request url
     */
    set url(value: string) {
        this._url = value;
    }


    get protocol(): string {
        if ((this.socket as TLSSocket).encrypted) return httpsPtl;
        if (!this.serverOptions.proxy) return httpPtl;
        const proto = this.getHeader(X_FORWARDED_PROTO);
        return proto ? proto.split(/\s*,\s*/, 1)[0] : httpPtl;
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
            this._URL = this.createURL();
        }
        return this._URL!;
    }

    protected createURL() {
        try {
            return this.parseURL(this.request);
        } catch (err) {
            return Object.create(null);
        }
    }

    protected override canSettatusMessage(): boolean {
        return this.request.httpVersionMajor < 2
    }

    parseURL(incoming: HttpServRequest, proxy?: boolean): URL {
        const req = incoming;
        const url = req.url?.trim() ?? '';
        if (httptl.test(url)) {
            return new URL(url);
        } else {
            let host = proxy && req.headers[X_FORWARDED_HOST];
            if (!host) {
                if (req.httpVersionMajor >= 2) host = req.headers[AUTHORITY];
                if (!host) host = req.headers[HOST];
            }
            if (!host || isNumber(host)) {
                host = '';
            } else {
                host = isString(host) ? host.split(urlsplit, 1)[0] : host[0]
            }
            return new URL(`${this.protocol}://${host}${url}`);
        }
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

    get secure(): boolean {
        return this.protocol === httpsPtl;
    }

    get update(): boolean {
        return this.method === PUT;
    }

    protected override beforeStatusChanged(code: number): void {
        assert(Number.isInteger(code), 'status code must be a number');
        assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
    }

    protected override afterStatusChanged(code: number): void {
        if (this.request.httpVersionMajor < 2) this.response.statusMessage = statusMessage[code as HttpStatusCode];
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
        const proxy = !!this.serverOptions.proxy;
        const val = this.getHeader(this.serverOptions.proxy?.proxyIpHeader ?? '') as string;
        let ips = (proxy && val)
            ? val.split(/\s*,\s*/)
            : [];
        if ((this.serverOptions.proxy?.maxIpsCount ?? 0) > 0) {
            ips = ips.slice(-(this.serverOptions.proxy?.maxIpsCount ?? 0))
        }
        return ips
    }

    private _ip?: string;

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
        const method = this.propertyKey;
        const s = this.status as number;

        // GET or HEAD for weak freshness validation only
        if (GET !== method && HEAD !== method) return false;

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
        const modifSince = reqHeaders[IF_MODIFIED_SINCE] as string;
        const nonMatch = reqHeaders[IF_NONE_MATCH] as string;
        if (!modifSince && !nonMatch) {
            return false
        }

        const cacheControl = reqHeaders[CACHE_CONTROL] as string;
        if (cacheControl && no_cache.test(cacheControl)) {
            return false
        }

        // if-none-match
        if (nonMatch && nonMatch !== '*') {
            const etag = this.response.getHeader('etag')

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
            let lastModified = this.response.getHeader(LAST_MODIFIED);
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

    protected override onBodyChanged(newVal: any, oldVal: any): void {
        (this.response as any).body = newVal;
    }


    vary(field: string) {
        if (this.headersSent) return;
        let val = this.response.getHeader(VARY) ?? '';
        const header = Array.isArray(val)
            ? val.join(', ')
            : String(val)

        // set new header
        if ((val = append(header, field))) {
            this.setHeader(VARY, val)
        }
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
        return socket.writable
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
            return new InternalServerException(status, HttpStatusCode.InternalServerError)
        } else if (isNumber(status)) {
            if (!statusMessage[status as HttpStatusCode]) {
                status = HttpStatusCode.InternalServerError
            }
            return new MessageException(message ?? statusMessage[status as HttpStatusCode], status)
        }
        return new MessageException(status.message ?? statusMessage[(status as MessageException).statusCode as HttpStatusCode ?? 500], (status as MessageException).statusCode ?? HttpStatusCode.InternalServerError);
    }


    setResponse(packet: Response<any>): void {
        const { headers, payload, status, statusMessage: statusText } = packet;
        if (status) this.status = status as number;
        if (statusText) this.statusMessage = statusText;
        if (headers) this.setHeader(headers);
        this.body = payload;
    }



    async throwException(err: MessageException): Promise<void> {
        let headerSent = false;
        if (this.headersSent || !this.writable) {
            headerSent = err.headerSent = true
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return
        }

        this.execption = err;

        await lastValueFrom(this.transport.send(this));
    }

}


export const CONTENT_TYPE = 'content-type';
export const CONTENT_ENCODING = 'content-encoding';
export const CONTENT_LENGTH = 'content-length';
export const TRANSFER_ENCODING = 'transfer-encoding';

export const X_FORWARDED_PROTO = 'x-forwarded-proto';
export const X_FORWARDED_HOST = 'x-forwarded-host';
export const HOST = 'host';
export const IF_MODIFIED_SINCE = 'if-modified-since';
export const IF_NONE_MATCH = 'if-none-match';
export const LAST_MODIFIED = 'last-modified'
export const CACHE_CONTROL = 'cache-control';
export const VARY = 'vary';

const AUTHORITY = http2.constants?.HTTP2_HEADER_AUTHORITY ?? ':authority';
const httpsPtl = 'https';
const httpPtl = 'http';
const httptl = /^https?:\/\//i;
const urlsplit = /\s*,\s*/;
const no_cache = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;
const methods = [GET, HEAD, PUT, DELETE, OPTIONS, TRACE];


function parseStamp(date?: string | number): number {
    if (date) {
        return isString(date) ? Date.parse(date) : date
    }
    return NaN
}


