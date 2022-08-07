import { Injectable, isUndefined, lang, type_undef } from '@tsdi/ioc';
import { EndpointBackend, EndpointContext, mths, ResHeaders, Redirector, ReqHeaders } from '@tsdi/core';
import {
    HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse,
    HttpHeaderResponse, HttpStatusCode, HttpJsonParseError, HttpBackend
} from '@tsdi/common';
import { finalize, Observable, Observer } from 'rxjs';
import * as zlib from 'zlib';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { PassThrough, pipeline } from 'stream';
import { promisify } from 'util';
import { ev, hdr, toBuffer, isBuffer, MimeAdapter, ctype, RequestStauts, sendbody, XSSI_PREFIX, MimeTypes } from '@tsdi/transport';
import { HttpError } from '../errors';
import { CLIENT_HTTP2SESSION, HttpClientOpts } from './option';

const pmPipeline = promisify(pipeline);


/**
 * http client backend.
 */
@Injectable()
export class HttpBackend2 extends HttpBackend {

    private _http1?: Http1Backend;
    get http1() {
        if (!this._http1) {
            this._http1 = new Http1Backend();
        }
        return this._http1;
    }

    private _http2?: Http1Backend;
    get http2() {
        if (!this._http2) {
            this._http2 = new Http2Backend();
        }
        return this._http2;
    }

    handle(req: HttpRequest<any>, context: EndpointContext): Observable<HttpEvent<any>> {
        const option = context.target.getOptions() as HttpClientOpts;
        if (option.authority && req.url.startsWith(option.authority)) {
            return this.http2.handle(req, context);
        }
        return this.http1.handle(req, context);
    }

}

/**
 * http1 client backend.
 */
export class Http1Backend extends EndpointBackend<HttpRequest, HttpEvent> {

    handle(req: HttpRequest<any>, ctx: EndpointContext): Observable<HttpEvent<any>> {
        return new Observable((observer: Observer<HttpEvent<any>>) => {
            const headers: Record<string, any> = {};
            req.headers.forEach((name, values) => {
                headers[name] = values
            });

            if (!headers[hdr.CONTENT_TYPE]) {
                headers[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
            }

            const url = req.urlWithParams.trim();
            const ac = this.getAbortSignal(ctx);
            const option = {
                method: req.method,
                headers: {
                    'accept': ctype.REQUEST_ACCEPT,
                    ...headers,
                },
                abort: ac?.signal
            };

            const request = secureExp.test(url) ? https.request(url, option) : http.request(url, option);
            
            const statAdpr = ctx.protocol.status;
            let status: number, statusText: string | undefined;
            let error: any;
            let ok = false;

            const onResponse = async (res: http.IncomingMessage) => {
                status = statAdpr.parse(res.statusCode ?? 0);
                statusText = res.statusMessage;
                const headers = new ResHeaders(res.headers as Record<string, any>);

                let body: any;

                if (status !== HttpStatusCode.NoContent) {
                    body = res.statusMessage;
                }
                if (status === 0) {
                    status = body ? statAdpr.ok : 0
                }

                ok = statAdpr.isOk(status);

                if (statAdpr.isEmpty(status)) {
                    observer.next(new HttpHeaderResponse({
                        url,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                    return;
                }

                const rqstatus = ctx.getValueify(RequestStauts, () => new RequestStauts());

                // HTTP fetch step 5
                if (status && statAdpr.isRedirect(status)) {
                    ctx.get(Redirector).redirect<HttpEvent<any>>(ctx, req, status, headers)
                        .subscribe(observer)
                    return;
                }

                body = pipeline(res, new PassThrough(), (err) => {
                    if (err) {
                        error = err;
                        ok = false;
                    }
                });

                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);

                // HTTP-network fetch step 12.1.1.4: handle content codings
                // in following scenarios we ignore compression support
                // 1. compression support is disabled
                // 2. HEAD request
                // 3. no Content-Encoding header
                // 4. no content response (204)
                // 5. content not modified response (304)

                if (rqstatus.compress && request.method !== mths.HEAD && codings) {
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
                            await pmPipeline(res, raw);
                            const defer = lang.defer();
                            raw.once(ev.DATA, chunk => {
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

                            raw.once('end', defer.resolve);

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


                let buffer: Buffer | undefined
                try {
                    buffer = await toBuffer(body);
                } catch (err) {
                    ok = false;
                    error = err;
                }
                let originalBody: any;

                if (buffer) {
                    const contentType = res.headers[hdr.CONTENT_TYPE] as string;
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
                            body = new TextDecoder().decode(buffer);
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
                            body = buffer.subarray(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                            break;
                        case 'blob':
                            body = new Blob([buffer.subarray(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], {
                                type: res.headers[hdr.CONTENT_TYPE] as string
                            });
                            break;
                        case 'text':
                        default:
                            body = new TextDecoder().decode(buffer);
                    }
                }
                if (ok) {
                    observer.next(new HttpResponse({
                        url,
                        body,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                } else {
                    observer.error(new HttpErrorResponse({
                        url,
                        error,
                        headers,
                        status,
                        statusText
                    }));
                }
            };

            const onError = (error: Error) => {
                const res = new HttpErrorResponse({
                    error,
                    status: status || 0,
                    statusText: statusText || 'Unknown Error',
                    url
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
                    err => onError(err));
            }


            return () => {
                if (isUndefined(status)) {
                    ac?.abort();
                }
                request.off(ev.RESPONSE, onResponse);
                // request.off(ev.DATA, onData);
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

    getAbortSignal(ctx: EndpointContext): IAbortController {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }
}

interface IAbortController {
    /** Returns the AbortSignal object associated with this object. */
    readonly signal: AbortSignal;
    /** Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted. */
    abort(reason?: any): void;
}

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = http2.constants;

const HTTP2_HEADER_STATUS = ':status';


/**
 * http2 client backend.
 */
export class Http2Backend implements EndpointBackend<HttpRequest, HttpEvent> {

    handle(req: HttpRequest<any>, ctx: EndpointContext): Observable<HttpEvent<any>> {
        return new Observable((observer: Observer<HttpEvent<any>>) => {
            const url = req.urlWithParams.trim();
            let path = url;
            const option = ctx.target.getOptions() as HttpClientOpts;
            if (option.authority) {
                path = path.replace(option.authority, '');
            }
            const reqHeaders: Record<string, any> = {};
            req.headers.forEach((name, values) => {
                reqHeaders[name] = values
            });

            if (!reqHeaders[hdr.CONTENT_TYPE]) reqHeaders[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
            if(!reqHeaders[HTTP2_HEADER_ACCEPT]) reqHeaders[HTTP2_HEADER_ACCEPT] = ctype.REQUEST_ACCEPT;
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = path;

            const ac = this.getAbortSignal(ctx);
            const request = ctx.get(CLIENT_HTTP2SESSION).request(reqHeaders, { ...option.requestOptions, signal: ac?.signal } as http2.ClientSessionRequestOptions);

            const statAdpr = ctx.protocol.status;
            let onData: (chunk: Buffer) => void;
            let onEnd: () => void;
            let status: number, statusText: string;
            let completed = false;

            let error: any;
            let ok = false;

            const onResponse = (hdrs: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader, flags: number) => {
                let body: any;
                const headers = new ReqHeaders(hdrs as Record<string, any>);
                status = statAdpr.parse(hdrs[HTTP2_HEADER_STATUS]);

                ok = statAdpr.isOk(status);
                statusText = statAdpr.message(status) ?? 'OK';

                if (statAdpr.isEmpty(status)) {
                    completed = true;
                    observer.next(new HttpHeaderResponse({
                        url,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                    return;
                }

                const rqstatus = ctx.getValueify(RequestStauts, () => new RequestStauts());
                // HTTP fetch step 5

                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);
                const data: any[] = [];
                let bytes = 0;
                // let strdata = '';
                onData = (chunk: Buffer) => {
                    // strdata += chunk;
                    bytes += chunk.length;
                    data.push(chunk);
                };
                onEnd = async () => {
                    completed = true;
                    // body = strdata;
                    body = Buffer.concat(data, bytes);
                    if (status === 0) {
                        status = bytes ? statAdpr.ok : 0
                    }

                    if (status && statAdpr.isRedirect(status)) {
                        completed = true;
                        // HTTP fetch step 5.2
                        ctx.get(Redirector).redirect<HttpEvent<any>>(ctx, req, status, headers)
                            .pipe(
                                finalize(() => completed = true)
                            ).subscribe(observer);
                        return;
                    }

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
                                raw.once(ev.DATA, chunk => {
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

                                raw.once('end', defer.resolve);

                                await defer.promise;

                            } else if (codings === 'br') { // For br
                                const unBr = zlib.createBrotliDecompress();
                                await pmPipeline(body, unBr);
                                body = unBr;
                            }
                            if (body instanceof PassThrough) {
                                body = await toBuffer(body);
                            }
                        } catch (err) {
                            ok = false;
                            error = err;
                        }
                    }

                    let originalBody: any;
                    let buffer: Buffer;
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
                            buffer = body;
                            body = buffer.subarray(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                            break;
                        case 'blob':
                            buffer = body;
                            body = new Blob([buffer.subarray(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], {
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
                            status,
                            statusText
                        }));
                        observer.complete();
                    } else {
                        observer.error(new HttpErrorResponse({
                            url,
                            error: error ?? body,
                            status,
                            statusText
                        }));
                    }
                };
                request.on(ev.DATA, onData);
                request.on(ev.END, onEnd);

            }

            const onError = (error: Error) => {
                const res = new HttpErrorResponse({
                    url,
                    error,
                    status: status || 0,
                    statusText: statusText || 'Unknown Error',
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
                    err => onError(err));
            }

            return () => {
                if (isUndefined(status) || !completed) {
                    ac?.abort();
                }
                request.off(ev.RESPONSE, onResponse);
                request.off(ev.DATA, onData);
                request.off(ev.END, onEnd);
                request.off(ev.ERROR, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.ABORTED, onError);
                request.off(ev.TIMEOUT, onError);
                if (!ctx.destroyed) {
                    observer.error(new HttpError(0, 'The operation was aborted.'));
                    request.emit(ev.CLOSE);
                }
            }
        })
    }

    getAbortSignal(ctx: EndpointContext): IAbortController {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }
}

const secureExp = /^https:/;
