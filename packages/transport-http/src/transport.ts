import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { ListenOpts, mths, RestfulTransportStrategy } from '@tsdi/core';
import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { hdr } from '@tsdi/transport';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';

@Injectable({ static: true })
export class HttpTransportStrategy extends RestfulTransportStrategy {

    private _protocol = 'http';
    parseStatus(status?: string | number | undefined): number {
        return isString(status) ? (status ? parseInt(status) : 0) : status ?? 0;
    }

    get ok(): number {
        return HttpStatusCode.Ok;
    }
    get badRequest(): number {
        return HttpStatusCode.BadRequest;
    }
    get notFound(): number {
        return HttpStatusCode.NotFound;
    }
    get found(): number {
        return HttpStatusCode.Found
    }
    get unauthorized(): number {
        return HttpStatusCode.Unauthorized;
    }
    get forbidden(): number {
        return HttpStatusCode.Forbidden;
    }
    get noContent(): number {
        return HttpStatusCode.NoContent;
    }
    get serverError(): number {
        return HttpStatusCode.InternalServerError;
    }

    get unsupportedMediaType(): number {
        return HttpStatusCode.UnsupportedMediaType;
    }

    redirectDefaultMethod(): string {
        return mths.GET;
    }

    redirectBodify(status: number, method?: string | undefined): boolean {
        if (status === 303) return false;
        return method ? (status === 301 || status === 302) && method !== mths.POST : true;
    }

    isVaild(statusCode: number): boolean {
        return !!statusMessage[statusCode as HttpStatusCode];
    }

    isNotFound(status: number): boolean {
        return status === HttpStatusCode.NotFound;
    }

    isEmpty(status: number): boolean {
        return emptyStatus[status];
    }

    isOk(status: number): boolean {
        return status >= 200 && status < 300;
    }

    isRetry(status: number): boolean {
        return retryStatus[status];
    }

    isContinue(status: number): boolean {
        return status === HttpStatusCode.Continue;
    }

    isRedirect(status: number): boolean {
        return redirectStatus[status]
    }

    isRequestFailed(status: number): boolean {
        return status >= 400 && status < 500
    }
    isServerError(status: number): boolean {
        return status >= 500
    }

    message(status: number): string {
        return statusMessage[status as HttpStatusCode];
    }

    isUpdate(req: http.IncomingMessage | http2.Http2ServerRequest): boolean {
        return req.method === mths.PUT
    }

    isSecure(req: http.IncomingMessage | http2.Http2ServerRequest): boolean {
        return this.protocol === 'https' || (req?.socket as TLSSocket)?.encrypted === true
    }

    get protocol(): string {
        return this._protocol;
    }

    parseURL(req: http.IncomingMessage | http2.Http2ServerRequest, opts: ListenOpts, proxy?: boolean): URL {
        const url = req.url?.trim() ?? '';
        if (httptl.test(url)) {
            return new URL(url);
        } else {
            if ((req.socket as TLSSocket).encrypted) {
                this._protocol = 'https';
            } else if (!proxy) {
                this._protocol = 'http';
            } else {
                const proto = req.headers[hdr.X_FORWARDED_PROTO] as string;
                this._protocol = (proto ? proto.split(urlsplit, 1)[0] : 'http');
            }

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

    isAbsoluteUrl(url: string): boolean {
        return httptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }

}

const AUTHORITY = http2.constants?.HTTP2_HEADER_AUTHORITY ?? ':authority';

const httptl = /^https?:\/\//i;
const urlsplit = /\s*,\s*/;

/**
 * status codes for redirects
 */
const redirectStatus: Record<number, boolean> = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
}

/**
 * status codes for empty bodies
 */
const emptyStatus: Record<number, boolean> = {
    204: true,
    205: true,
    304: true
}

/**
 * status codes for when you should retry the request
 */
const retryStatus: Record<number, boolean> = {
    502: true,
    503: true,
    504: true
}
