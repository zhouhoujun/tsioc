import { HttpStatusCode, statusMessage } from '@tsdi/common';
import {
    BadGatewayStatus, BadRequestStatus, ForbiddenStatus, FoundStatus,
    GatewayTimeoutStatus, Incoming, InternalServerErrorStatus, ListenOpts,
    MethodNotAllowedStatus, MovedPermanentlyStatus, mths, NoContentStatus, NotFoundStatus,
    NotImplementedStatus, NotModifiedStatus, OkStatus, PermanentRedirectStatus, RequestTimeoutStatus,
    ResetContentStatus, ServiceUnavailableStatus, Status, StatusFactory, StatusTypes, TemporaryRedirectStatus,
    TransportStrategy, UnauthorizedStatus, UnsupportedMediaTypeStatus, UseProxyStatus
} from '@tsdi/core';
import { ArgumentExecption, Injectable, isNumber, isString } from '@tsdi/ioc';
import { hdr } from '@tsdi/transport';
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';

@Injectable({ static: true })
export class HttpTransportStrategy extends TransportStrategy<number> {
    private _protocol = 'http';

    get protocol(): string {
        return this._protocol;
    }

    isValidCode(code: number): boolean {
        return !!statusMessage[code as HttpStatusCode];
    }

    parseCode(code?: string | number | null | undefined): number {
        return isString(code) ? (code ? parseInt(code) : 0) : code ?? 0;
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


@Injectable({ static: true })
export class HttpStatusFactory extends StatusFactory<number> {

    create(type: StatusTypes, statusText?: string | undefined): Status<number> {
        const code = this.getStatusCode(type);
        return this.createByCode(code, statusText)
    }
    createByCode(status: number | string | null, statusText?: string | undefined): Status<number> {
        status = isString(status) ? (status ? parseInt(status) : 0) : status ?? 0;
        switch (status) {
            case HttpStatusCode.Ok:
                return new OkStatus(HttpStatusCode.Ok, statusMessage[HttpStatusCode.Ok]);

            case HttpStatusCode.NoContent:
                return new NoContentStatus(HttpStatusCode.NoContent, statusMessage[HttpStatusCode.NoContent]);
            case HttpStatusCode.ResetContent:
                return new ResetContentStatus(HttpStatusCode.ResetContent, statusMessage[HttpStatusCode.ResetContent]);
            case HttpStatusCode.NotModified:
                return new NotModifiedStatus(HttpStatusCode.NotModified, statusMessage[HttpStatusCode.NotModified]);

            case HttpStatusCode.Found:
                return new FoundStatus(HttpStatusCode.Found, statusMessage[HttpStatusCode.Found]);
            case HttpStatusCode.MovedPermanently:
                return new MovedPermanentlyStatus(HttpStatusCode.MovedPermanently, statusMessage[HttpStatusCode.MovedPermanently]);
            case HttpStatusCode.SeeOther:
                return new MovedPermanentlyStatus(HttpStatusCode.SeeOther, statusMessage[HttpStatusCode.SeeOther]);
            case HttpStatusCode.UseProxy:
                return new UseProxyStatus(HttpStatusCode.UseProxy, statusMessage[HttpStatusCode.UseProxy]);
            case HttpStatusCode.TemporaryRedirect:
                return new TemporaryRedirectStatus(HttpStatusCode.TemporaryRedirect, statusMessage[HttpStatusCode.TemporaryRedirect]);
            case HttpStatusCode.PermanentRedirect:
                return new PermanentRedirectStatus(HttpStatusCode.PermanentRedirect, statusMessage[HttpStatusCode.PermanentRedirect]);

            case HttpStatusCode.BadRequest:
                return new BadRequestStatus(HttpStatusCode.BadRequest, statusMessage[HttpStatusCode.BadRequest]);
            case HttpStatusCode.Unauthorized:
                return new UnauthorizedStatus(HttpStatusCode.Unauthorized, statusMessage[HttpStatusCode.Unauthorized]);
            case HttpStatusCode.Forbidden:
                return new ForbiddenStatus(HttpStatusCode.Forbidden, statusMessage[HttpStatusCode.Forbidden]);
            case HttpStatusCode.NotFound:
                return new NotFoundStatus(HttpStatusCode.NotFound, statusMessage[HttpStatusCode.NotFound]);
            case HttpStatusCode.MethodNotAllowed:
                return new MethodNotAllowedStatus(HttpStatusCode.MethodNotAllowed, statusMessage[HttpStatusCode.MethodNotAllowed]);
            case HttpStatusCode.RequestTimeout:
                return new RequestTimeoutStatus(HttpStatusCode.RequestTimeout, statusMessage[HttpStatusCode.RequestTimeout]);
            case HttpStatusCode.UnsupportedMediaType:
                return new UnsupportedMediaTypeStatus(HttpStatusCode.UnsupportedMediaType, statusMessage[HttpStatusCode.UnsupportedMediaType]);

            case HttpStatusCode.InternalServerError:
                return new InternalServerErrorStatus(HttpStatusCode.InternalServerError, statusMessage[HttpStatusCode.InternalServerError]);
            case HttpStatusCode.NotImplemented:
                return new NotImplementedStatus(HttpStatusCode.NotImplemented, statusMessage[HttpStatusCode.NotImplemented]);
            case HttpStatusCode.BadGateway:
                return new BadGatewayStatus(HttpStatusCode.BadGateway, statusMessage[HttpStatusCode.BadGateway]);
            case HttpStatusCode.ServiceUnavailable:
                return new ServiceUnavailableStatus(HttpStatusCode.ServiceUnavailable, statusMessage[HttpStatusCode.ServiceUnavailable]);
            case HttpStatusCode.GatewayTimeout:
                return new GatewayTimeoutStatus(HttpStatusCode.GatewayTimeout, statusMessage[HttpStatusCode.GatewayTimeout]);
            default:
                return new Status(status);

        }
    }

    createByIncoming(incoming: Incoming): Status<number> {
        throw new Error('Method not implemented.');
    }


    getStatusCode(type: StatusTypes): number {
        switch (type) {
            case 'Accepted':
                return HttpStatusCode.Accepted;
            case 'BadGateway':
                return HttpStatusCode.BadGateway;
            case 'BadRequest':
                return HttpStatusCode.BadRequest;
            case 'Forbidden':
                return HttpStatusCode.Forbidden;
            case 'Found':
                return HttpStatusCode.Found;
            case 'GatewayTimeout':
                return HttpStatusCode.GatewayTimeout;
            case 'InternalServerError':
                return HttpStatusCode.InternalServerError;
            case 'MethodNotAllowed':
                return HttpStatusCode.MethodNotAllowed;
            case 'MovedPermanently':
                return HttpStatusCode.MovedPermanently;
            case 'NoContent':
                return HttpStatusCode.NoContent;
            case 'NotFound':
                return HttpStatusCode.NotFound;
            case 'NotModified':
                return HttpStatusCode.NotModified;
            case 'Ok':
                return HttpStatusCode.Ok;
            case 'SeeOther':
                return HttpStatusCode.SeeOther;
            case 'ServiceUnavailable':
                return HttpStatusCode.ServiceUnavailable;
            case 'Unauthorized':
                return HttpStatusCode.Unauthorized;
            case 'UnsupportedMediaType':
                return HttpStatusCode.UnsupportedMediaType;
            case 'Unused':
                return HttpStatusCode.Unused;
            case 'UseProxy':
                return HttpStatusCode.UseProxy;
            default:
                throw new ArgumentExecption(`${type} is unkonw`)
        }
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
