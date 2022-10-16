import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { ListenOpts, mths, RedirectTransportStatus, States, TransportStrategy } from '@tsdi/core';
import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { hdr } from '@tsdi/transport';
import * as http from 'http';
import * as http2 from 'http2';
import { Observable } from 'rxjs';
import { TLSSocket } from 'tls';


@Injectable()
export class HttpTransportStatus extends RedirectTransportStatus {

    parse(status?: string | number | undefined): number {
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

    redirectDefaultMethod(): string {
        return mths.GET;
    }

    redirectBodify(status: number, method?: string | undefined): boolean {
        if (status === 303) return false;
        return method ? (status === 301 || status === 302) && method !== mths.POST : true;
    }

    isServerError(status: number): boolean {
        return status >= 500
    }

    message(status: number): string {
        return statusMessage[status as HttpStatusCode];
    }

}


@Injectable({ static: true })
export class HttpTransportStrategy extends TransportStrategy<number> implements RedirectTransportStatus {
    private _protocol = 'http';
    private _empty = false;
    private _state: States = States.NotFound;
    private _code = HttpStatusCode.NotFound;

    constructor() {
        super();
    }

    get statusChanged(): Observable<number> {
        throw new Error('Method not implemented.');
    }
    get isEmpty(): boolean {
        return this._empty;
    }


    get code(): number {
        return this._code;
    }
    set code(code: number) {
        this._code = code;
    }

    parseCode(code?: string | number | null | undefined): number {
        return isString(code) ? (code ? parseInt(code) : 0) : code ?? 0;
    }

    get state(): States {
        return this._state;
    }

    set state(state: States) {
        if (this._state === state) return;
        this._state = state;
        this._code

    }

    toState(status: string | number): States {
        throw new Error('Method not implemented.');
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

    get message(): string {
        throw new Error('Method not implemented.');
    }
    set message(msg: string) {
        throw new Error('Method not implemented.');
    }

    redirectBodify(status: string | number, method?: string | undefined): boolean {
        throw new Error('Method not implemented.');
    }
    redirectDefaultMethod(): string {
        throw new Error('Method not implemented.');
    }

    get protocol(): string {
        return this._protocol;
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
