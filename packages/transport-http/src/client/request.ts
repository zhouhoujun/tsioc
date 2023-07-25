import { InjectFlags, Injectable, InvocationContext, Optional } from '@tsdi/ioc';
import { Decoder, Encoder, IWritableStream, Redirector, StatusVaildator, StreamAdapter, ResHeaders, IncomingHeaders } from '@tsdi/core';
import { MimeAdapter, MimeTypes, StatusPacket, StreamRequestAdapter, ctype, ev, hdr } from '@tsdi/transport';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpRequest, HttpResponse } from '@tsdi/common/http';

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
        @Optional() readonly redirector: Redirector<number>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder) {
        super()
    }

    protected override getPayload(req: HttpRequest<any>) {
        return req.serializeBody()
    }

    createRequest(url: string, req: HttpRequest<any>): IWritableStream {
        const ac = this.getAbortSignal(req.context);
        const option = req.context.get(HTTP_CLIENT_OPTS);
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

    protected override getResponseEvenName(): string {
        return ev.RESPONSE;
    }

    protected override parseStatusPacket(incoming: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader & http.IncomingMessage): StatusPacket<number> {
        let body: any, status: number, statusText: string;
        let headers: IncomingHeaders;
        if (incoming instanceof http.IncomingMessage) {
            status = incoming.statusCode ?? 0;
            statusText = incoming.statusMessage ?? '';
            if (status === 0 && body) {
                status = 200;
            }
            headers = incoming.headers;
        } else {
            headers = incoming;
            status = incoming[hdr.STATUS2];
            statusText = incoming[hdr.STATUS_MESSAGE];
        }
        return {
            headers,
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

