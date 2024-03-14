import { HttpStatusCode, statusMessage, PUT, GET, HEAD, DELETE, OPTIONS, TRACE, MessageExecption, InternalServerExecption, hdr, IncomingPacket, TransportSession, normalize, Outgoing, ResponsePacket } from '@tsdi/common';
import { Injectable, Injector, isArray, isNumber, isString, lang, tokenId } from '@tsdi/ioc';
import { append, parseTokenList, AbstractAssetContext } from '@tsdi/endpoints/assets';
import * as assert from 'assert';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { HttpServerOpts } from './options';
import { RequestStatusContextFactory, ServerOpts, Throwable } from '@tsdi/endpoints';


export type HttpServRequest = http.IncomingMessage | http2.Http2ServerRequest;

export type HttpServResponse = http.ServerResponse | http2.Http2ServerResponse;

/**
 * http context for `HttpServer`.
 */
export class HttpContext extends AbstractAssetContext<HttpServRequest, HttpServResponse, HttpServerOpts> implements Throwable {

    get protocol(): string {
        if ((this.socket as TLSSocket).encrypted) return httpsPtl;
        if (!this.serverOptions.proxy) return httpPtl;
        const proto = this.getHeader(hdr.X_FORWARDED_PROTO);
        return proto ? proto.split(/\s*,\s*/, 1)[0] : httpPtl;
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

    protected getOriginalUrl(request: HttpServRequest) {
        return normalize(request.url || '');
    }


    get secure(): boolean {
        return this.protocol === httpsPtl;
    }

    get update(): boolean {
        return this.method === PUT;
    }

    isAbsoluteUrl(url: string): boolean {
        return httptl.test(url.trim())
    }

    parseURL(req: http.IncomingMessage | http2.Http2ServerRequest, proxy?: boolean): URL {
        const url = req.url?.trim() ?? '';
        if (httptl.test(url)) {
            return new URL(url);
        } else {
            let host = proxy && req.headers[hdr.X_FORWARDED_HOST];
            if (!host) {
                if (req.httpVersionMajor >= 2) host = req.headers[AUTHORITY];
                if (!host) host = req.headers[hdr.HOST];
            }
            if (!host || isNumber(host)) {
                host = '';
            } else {
                host = isString(host) ? host.split(urlsplit, 1)[0] : host[0]
            }
            return new URL(`${this.protocol}://${host}${url}`);
        }
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
        if (this.body && this.vaildator.isEmpty(code)) this.body = null;
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
        const method = this.methodName;
        const s = this.status;

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

    protected override onBodyChanged(newVal: any, oldVal: any): void {
        (this.response as Outgoing).body = newVal;
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

    setResponse(packet: ResponsePacket): void {
        const { headers, payload, status, statusText } = packet;
        if (status) this.status = status as number;
        if (statusText) this.statusMessage = statusText;
        if (headers) this.setHeader(headers);
        this.body = payload;
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
            return new InternalServerExecption(status, HttpStatusCode.InternalServerError)
        } else if (isNumber(status)) {
            if (!statusMessage[status as HttpStatusCode]) {
                status = HttpStatusCode.InternalServerError
            }
            return new MessageExecption(message ?? statusMessage[status as HttpStatusCode], status)
        }
        return new MessageExecption(status.message ?? statusMessage[(status as MessageExecption).statusCode as HttpStatusCode ?? 500], (status as MessageExecption).statusCode ?? HttpStatusCode.InternalServerError);
    }


}

@Injectable()
export class HttpAssetContextFactory implements RequestStatusContextFactory {

    create(injector: Injector, session: TransportSession, incoming: IncomingPacket<any>, options: HttpServerOpts): HttpContext {
        return new HttpContext(injector, session, incoming.req as HttpServRequest, incoming.res as HttpServResponse, options);
    }

}

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


