import { InjectFlags, Injectable, InvocationContext, Nullable } from '@tsdi/ioc';
import { Decoder, Encoder, IWritableStream, Redirector, ResHeaders, ResponsePacket } from '@tsdi/core';
import { MimeAdapter, MimeTypes, StatusVaildator, StreamAdapter, StreamRequestAdapter, ctype, ev, hdr } from '@tsdi/transport';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpRequest, HttpResponse, HttpStatusCode } from '@tsdi/common';

import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { CLIENT_HTTP2SESSION, HTTP_CLIENT_OPTS, HttpClientOpts } from './option';


@Injectable()
export class HttpRequestAdapter extends StreamRequestAdapter<HttpRequest, HttpEvent, number> {

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Nullable() readonly redirector: Redirector<number>,
        @Nullable() readonly encoder: Encoder,
        @Nullable() readonly decoder: Decoder) {
        super()
    }

    protected write(request: IWritableStream<any>, req: HttpRequest<any>, callback: (error?: Error | null | undefined) => void): void {
        const data = req.serializeBody();
        if (data === null) {
            request.end();
        } else {
            this.streamAdapter.sendbody(
                this.encoder ? this.encoder.encode(data) : data,
                request,
                err => callback(err),
                req.headers.get(hdr.CONTENT_ENCODING) as string);
        }
    }

    createRequest(req: HttpRequest<any>): IWritableStream {
        const url = req.urlWithParams.trim();
        const ac = this.getAbortSignal(req.context);
        const option = req.context.get(HTTP_CLIENT_OPTS, InjectFlags.Self);
        if (option.authority) {
            return this.request2(url, req, req.context.get(CLIENT_HTTP2SESSION, InjectFlags.Self), option, ac);
        } else {
            return this.request1(url, req, ac);
        }
    }

    createErrorResponse(options: {
        url?: string,
        headers?: ResHeaders;
        status: number;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }): HttpEvent {
        return new HttpErrorResponse(options) as any;
    }

    createHeadResponse(options: {
        url?: string;
        ok?: boolean;
        headers?: ResHeaders;
        status: number;
        statusText?: string;
        statusMessage?: string;
    }): HttpHeaderResponse {
        return new HttpHeaderResponse(options)
    }

    createResponse(options: {
        url?: string;
        ok?: boolean;
        headers?: ResHeaders;
        status: number;
        statusText?: string;
        statusMessage?: string;
        body?: any;
    }): HttpResponse {
        return new HttpResponse(options)
    }

    getResponseEvenName(): string {
        return ev.RESPONSE;
    }

    parseHeaders(incoming: any): ResHeaders {
        if (incoming instanceof http.IncomingMessage) {
            return new ResHeaders(incoming.headers);
        } else {
            return new ResHeaders(incoming);
        }
    }

    parsePacket(incoming: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader & http.IncomingMessage, headers: ResHeaders): ResponsePacket<number> {
        let body: any, status: number, statusText: string;
        if (incoming instanceof http.IncomingMessage) {
            status = incoming.statusCode ?? 0;
            statusText = incoming.statusMessage ?? 'OK';
            if (status !== HttpStatusCode.NoContent) {
                body = statusText;
            }
            if (status === 0 && body) {
                status = 200;
            }
        } else {
            status = incoming[hdr.STATUS2];
            statusText = incoming[hdr.STATUS_MESSAGE];
        }
        return {
            body,
            status,
            statusText
        }
    }

    protected request1(url: string, req: HttpRequest, ac: AbortController) {
        const headers: Record<string, any> = {};
        req.headers.forEach((name, values) => {
            headers[name] = values
        });

        if (!headers[hdr.CONTENT_TYPE]) {
            headers[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
        }

        const option = {
            method: req.method,
            headers: {
                'accept': ctype.REQUEST_ACCEPT,
                ...headers,
            },
            abort: ac?.signal
        };

        return secureExp.test(url) ? https.request(url, option) : http.request(url, option);
    }

    protected request2(path: string, req: HttpRequest, session: http2.ClientHttp2Session, option: HttpClientOpts, ac: AbortController) {
        path = path.replace(option.authority!, '');

        const reqHeaders: Record<string, any> = {};
        req.headers.forEach((name, values) => {
            reqHeaders[name] = values
        });

        if (!reqHeaders[hdr.CONTENT_TYPE]) reqHeaders[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
        if (!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
        reqHeaders[HTTP2_HEADER_METHOD] = req.method;
        reqHeaders[HTTP2_HEADER_PATH] = path;

        const stream = session.request(reqHeaders, { ...option.requestOptions, signal: ac?.signal } as http2.ClientSessionRequestOptions);
        return stream;
    }

    protected getAbortSignal(ctx: InvocationContext): AbortController {
        return typeof AbortController === 'undefined' ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

}

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = http2.constants;

const secureExp = /^https:/;

