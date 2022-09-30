import { AssetContext, HeadersContext, MiddlewareLike, mths, Throwable, ServerEndpointContext, Incoming } from '@tsdi/core';
import { isArray, isNumber, isString, lang, Token, tokenId } from '@tsdi/ioc';
import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { hdr, append, parseTokenList, AssetServerContext } from '@tsdi/transport';
import * as assert from 'assert';
import * as http from 'http';
import * as http2 from 'http2';
import { HttpError, HttpInternalServerError } from './../errors';
import { HttpServer } from './server';


export type HttpServRequest = http.IncomingMessage | http2.Http2ServerRequest;

export type HttpServResponse = http.ServerResponse | http2.Http2ServerResponse;

/**
 * http context for `HttpServer`.
 */
export class HttpContext extends AssetServerContext<HttpServRequest, HttpServResponse> implements HeadersContext, AssetContext, Throwable {

    protected isSelf(token: Token) {
        return token === HttpContext || token === AssetServerContext || token === ServerEndpointContext;
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
        let ips = (proxy && val)
            ? val.split(/\s*,\s*/)
            : [];
        if ((this.target as HttpServer)?.maxIpsCount > 0) {
            ips = ips.slice(-(this.target as any)?.maxIpsCount)
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
        const modifSince = reqHeaders[hdr.IF_MODIFIED_SINCE] as string;
        const nonMatch = reqHeaders[hdr.IF_NONE_MATCH] as string;
        if (!modifSince && !nonMatch) {
            return false
        }

        const cacheControl = reqHeaders[hdr.CACHE_CONTROL] as string;
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
        if (this.request.httpVersionMajor < 2) this.response.statusMessage = this.transport.status.message(code);
        if (this.body && this.transport.status.isEmpty(code)) this.body = null;
    }

    get statusMessage() {
        return this.response.statusMessage || this.transport.status.message(this.status)
    }

    set statusMessage(msg: string) {
        if (this.request.httpVersionMajor < 2) {
            this.response.statusMessage = msg
        }
    }

    protected override onNullBody(): void {
        this._explicitNullBody = true;
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

