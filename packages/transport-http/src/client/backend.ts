import { Injectable, isUndefined, lang, _tyundef } from '@tsdi/ioc';
import { EndpointContext, mths, ResHeaders, Redirector, StatusFactory, Status, EmptyStatus, NoContentStatus, RedirectStatus, OkStatus } from '@tsdi/core';
import { HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse, HttpHeaderResponse, HttpJsonParseError, HttpBackend } from '@tsdi/common';
import { ev, hdr, toBuffer, isBuffer, MimeAdapter, ctype, RequestStauts, sendbody, XSSI_PREFIX, MimeTypes } from '@tsdi/transport';
import { finalize, Observable, Observer } from 'rxjs';
import * as zlib from 'zlib';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { PassThrough, Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { CLIENT_HTTP2SESSION, HttpClientOpts } from './option';

const pmPipeline = promisify(pipeline);


/**
 * http client backend.
 */
@Injectable()
export class HttpBackend2 extends HttpBackend {

    handle(req: HttpRequest<any>, ctx: EndpointContext): Observable<HttpEvent<any>> {
        return new Observable((observer: Observer<HttpEvent<any>>) => {
            const url = req.urlWithParams.trim();
            const option = ctx.target.getOptions() as HttpClientOpts;
            let request: http2.ClientHttp2Stream | http.ClientRequest;

            const ac = this.getAbortSignal(ctx);
            if (option.authority) {
                request = this.request2(url, req, ctx.get(CLIENT_HTTP2SESSION), option, ac);
            } else {
                request = this.request1(url, req, ac);
            }

            // const stat = ctx.transport as TransportStrategy<number> & RedirectTransportStatus;
            let status: Status<number>;
            let completed = false;
            let headers: ResHeaders;

            let error: any;
            let ok = false;
            const factory = ctx.get(StatusFactory);

            const onResponse = async (incoming: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader & http.IncomingMessage, flags: number) => {
                let body: any;
                if (incoming instanceof http.IncomingMessage) {
                    headers = new ResHeaders(incoming.headers);
                    status = factory.createByCode(incoming.statusCode ?? 0, incoming.statusMessage ?? 'OK');
                    if (!(status instanceof NoContentStatus)) {
                        body = status.statusText;
                    }
                    if (status.status === 0 && body) {
                        status = factory.create('Ok');
                    }
                } else {
                    headers = new ResHeaders(incoming);
                    status = factory.createByCode(incoming[hdr.STATUS2] ?? 0);
                }
                ctx.status = status;

                if (status instanceof EmptyStatus) {
                    completed = true;
                    observer.next(new HttpHeaderResponse({
                        url,
                        headers,
                        ...status
                    }));
                    observer.complete();
                    return;
                }

                // HTTP fetch step 5
                body = pipeline(incoming instanceof http.IncomingMessage ? incoming : request as http2.ClientHttp2Stream, new PassThrough(), (err) => {
                    error = err;
                    ok = !err;
                });

                if (status instanceof RedirectStatus) {
                    // HTTP fetch step 5.2
                    ctx.get(Redirector).redirect<HttpEvent<any>>(ctx, req, status, headers)
                        .pipe(
                            finalize(() => completed = true)
                        ).subscribe(observer);
                    return;
                }

                completed = true;
                ok = status instanceof OkStatus;

                if (!ok) {
                    if (!error) {
                        body = await toBuffer(body);
                        body = new TextDecoder().decode(body);
                    }
                    completed = true;
                    return observer.error(new HttpErrorResponse({
                        url,
                        error: error ?? body,
                        ...status
                    }));
                }

                const rqstatus = (req.context ?? ctx).getValueify(RequestStauts, () => new RequestStauts());
                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);

                // HTTP-network fetch step 12.1.1.4: handle content codings
                // in following scenarios we ignore compression support
                // 1. compression support is disabled
                // 2. HEAD request
                // 3. no Content-Encoding header
                // 4. no content response (204)
                // 5. content not modified response (304)
                if (rqstatus.compress && req.method !== mths.HEAD && codings) {
                    // For Node v6+
                    // Be less strict when decoding compressed responses, since sometimes
                    // servers send slightly invalid responses that are still accepted
                    // by common browsers.
                    // Always using Z_SYNC_FLUSH is what cURL does.
                    const zlibOptions = {
                        flush: zlib.constants.Z_SYNC_FLUSH,
                        finishFlush: zlib.constants.Z_SYNC_FLUSH
                    };

                    try {
                        if (codings === 'gzip' || codings === 'x-gzip') { // For gzip
                            const unzip = zlib.createGunzip(zlibOptions);
                            await pmPipeline(body, unzip);
                            body = unzip;
                        } else if (codings === 'deflate' || codings === 'x-deflate') { // For deflate
                            // Handle the infamous raw deflate response from old servers
                            // a hack for old IIS and Apache servers
                            const raw = new PassThrough();
                            await pmPipeline(body, raw);
                            const defer = lang.defer();
                            raw.on(ev.DATA, chunk => {
                                if ((chunk[0] & 0x0F) === 0x08) {
                                    body = pipeline(body, zlib.createInflate(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                } else {
                                    body = pipeline(body, zlib.createInflateRaw(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                }
                            });

                            raw.once(ev.END, defer.resolve);

                            await defer.promise;

                        } else if (codings === 'br') { // For br
                            const unBr = zlib.createBrotliDecompress();
                            await pmPipeline(body, unBr);
                            body = unBr;
                        }
                    } catch (err) {
                        ok = false;
                        error = err;
                    }
                }

                let originalBody: any;
                body = body instanceof Readable ? await toBuffer(body) : body;
                const contentType = headers.get(hdr.CONTENT_TYPE) as string;
                let type = req.responseType;
                if (contentType) {
                    const adapter = ctx.get(MimeAdapter);
                    const mity = ctx.get(MimeTypes);
                    if (type === 'json' && !adapter.match(mity.json, contentType)) {
                        if (adapter.match(mity.xml, contentType) || adapter.match(mity.text, contentType)) {
                            type = 'text';
                        } else {
                            type = 'blob';
                        }
                    }
                }
                switch (type) {
                    case 'json':
                        // Save the original body, before attempting XSSI prefix stripping.
                        if (isBuffer(body)) {
                            body = new TextDecoder().decode(body);
                        }
                        originalBody = body;
                        try {
                            body = body.replace(XSSI_PREFIX, '');
                            // Attempt the parse. If it fails, a parse error should be delivered to the user.
                            body = body !== '' ? JSON.parse(body) : null
                        } catch (err) {
                            // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                            // JSON response. Restore the original body (including any XSSI prefix) to deliver
                            // a better error response.
                            body = originalBody;

                            // If this was an error request to begin with, leave it as a string, it probably
                            // just isn't JSON. Otherwise, deliver the parsing error to the user.
                            if (ok) {
                                // Even though the response status was 2xx, this is still an error.
                                ok = false;
                                // The parse error contains the text of the body that failed to parse.
                                error = { error: err, text: body } as HttpJsonParseError
                            }
                        }
                        break;

                    case 'arraybuffer':
                        body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                        break;
                    case 'blob':
                        body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                            type: headers.get(hdr.CONTENT_TYPE) as string
                        });
                        break;
                    case 'text':
                    default:
                        body = new TextDecoder().decode(body);
                        break;
                }


                if (ok) {
                    observer.next(new HttpResponse({
                        url,
                        body,
                        headers,
                        ...status
                    }));
                    observer.complete();
                } else {
                    observer.error(new HttpErrorResponse({
                        url,
                        error: error ?? body,
                        ...status
                    }));
                }
            };



            const onError = (error: Error) => {
                const res = new HttpErrorResponse({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    ...status

                });
                observer.error(res)
            };

            request.on(ev.RESPONSE, onResponse);
            request.on(ev.ERROR, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.ABORTED, onError);
            request.on(ev.TIMEOUT, onError);

            //todo send body.
            const data = req.serializeBody();
            if (data === null) {
                request.end();
            } else {
                sendbody(
                    data,
                    request,
                    err => onError(err),
                    req.headers.get(hdr.CONTENT_ENCODING) as string);
            }

            return () => {
                if (isUndefined(status) || !completed) {
                    ac?.abort();
                }
                request.off(ev.RESPONSE, onResponse);
                request.off(ev.ERROR, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.ABORTED, onError);
                request.off(ev.TIMEOUT, onError);
                if (!ctx.destroyed) {
                    observer.error(new HttpErrorResponse({
                        status: 0,
                        statusText: 'The operation was aborted.'
                    }));
                    request.emit(ev.CLOSE);
                }
            }
        })
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

    protected getAbortSignal(ctx: EndpointContext): AbortController {
        return typeof AbortController === _tyundef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

}

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = http2.constants;

const secureExp = /^https:/;
