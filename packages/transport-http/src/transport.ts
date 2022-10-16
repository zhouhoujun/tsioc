import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { ListenOpts, mths, RedirectTransportStatus, States, TransportStrategy } from '@tsdi/core';
import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { hdr } from '@tsdi/transport';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';

@Injectable({ static: true })
export class HttpTransportStrategy extends TransportStrategy<number> implements RedirectTransportStatus {
    private _protocol = 'http';

    get protocol(): string {
        return this._protocol;
    }

    isEmpty(status: number): boolean {
        return emptyStatus[status];
    }


    isValidCode(code: number): boolean {
        return !!statusMessage[code as HttpStatusCode];
    }

    parseCode(code?: string | number | null | undefined): number {
        return isString(code) ? (code ? parseInt(code) : 0) : code ?? 0;
    }

    toState(status: string | number): States {
        switch (status) {
            case HttpStatusCode.Ok:
                return States.Ok;
            case HttpStatusCode.BadRequest:
                return States.BadRequest;
            case HttpStatusCode.NotFound:
                return States.NotFound;
            // case HttpStatusCode.Found:
            //     return States.Found;
            case HttpStatusCode.Unauthorized:
                return States.Unauthorized;
            case HttpStatusCode.Forbidden:
                return States.Forbidden;
            case HttpStatusCode.NoContent:
                return States.NoContent;
            case HttpStatusCode.UnsupportedMediaType:
                return States.UnsupportedMediaType;
            case HttpStatusCode.InternalServerError:
                return States.InternalServerError;
            default:
                if (redirectStatus[status as HttpStatusCode]) {
                    return States.Redirect;
                }
                if (retryStatus[status as HttpStatusCode]) {
                    return States.Retry;
                }
                return States.InternalServerError;
        }
    }

    toCode(state: States): number {
        switch (state) {
            case States.Ok:
                return HttpStatusCode.Ok;
            case States.BadRequest:
                return HttpStatusCode.BadRequest;
            case States.NotFound:
                return HttpStatusCode.NotFound;
            case States.Found:
                return HttpStatusCode.Found;
            case States.Unauthorized:
                return HttpStatusCode.Unauthorized;
            case States.Forbidden:
                return HttpStatusCode.Forbidden;
            case States.NoContent:
                return HttpStatusCode.NoContent;
            case States.UnsupportedMediaType:
                return HttpStatusCode.UnsupportedMediaType;

            case States.InternalServerError:
            default:
                return HttpStatusCode.InternalServerError;

        }
    }

    message(status: number): string {
        return statusMessage[status as HttpStatusCode];
    }

    redirectBodify(status: string | number, method?: string | undefined): boolean {
        if (status === HttpStatusCode.SeeOther) return false;
        return method ? (status === HttpStatusCode.MovedPermanently || status === HttpStatusCode.Found) && method !== mths.POST : true;
    }

    redirectDefaultMethod(): string {
        return mths.GET;
    }

    isUpdate(req: http.IncomingMessage | http2.Http2ServerRequest): boolean {
        return req.method === mths.PUT
    }

    isSecure(req: http.IncomingMessage | http2.Http2ServerRequest): boolean {
        return this.protocol === 'https' || (req?.socket as TLSSocket)?.encrypted === true
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
