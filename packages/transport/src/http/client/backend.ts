import { EMPTY_OBJ, Injectable, isUndefined, lang, type_undef } from '@tsdi/ioc';
import { EndpointBackend, EndpointContext, HttpRequestMethod, mths, TransportClient, global, isArrayBuffer, isBlob, isFormData } from '@tsdi/core';
import {
    HttpRequest, HttpEvent, HttpHeaders, HttpResponse, HttpErrorResponse,
    HttpHeaderResponse, HttpStatusCode, statusMessage, HttpJsonParseError
} from '@tsdi/common';
import { finalize, Observable, Observer } from 'rxjs';
import * as zlib from 'zlib';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { PassThrough, pipeline, Readable, Writable, PipelineSource } from 'stream';
import { promisify } from 'util';
import * as NodeFormData from 'form-data';
import { ev, hdr } from '../../consts';
import { HttpError } from '../errors';
import { toBuffer, isBuffer, jsonTypes, textTypes, xmlTypes } from '../../utils';
import { CLIENT_HTTP2SESSION, HttpClientOptions } from './option';
import { MimeAdapter } from '../../mime';

const pmPipeline = promisify(pipeline);

if (typeof global.FormData === type_undef) {
    global.FormData = NodeFormData;
}

/**
 * http client backend.
 */
@Injectable()
export class HttpBackend extends EndpointBackend<HttpRequest, HttpEvent> {
    constructor(private option: HttpClientOptions) {
        super();
    }

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
            this._http2 = new Http2Backend(this.option);
        }
        return this._http2;
    }

    handle(req: HttpRequest<any>, context: EndpointContext): Observable<HttpEvent<any>> {
        if (this.option.authority && req.url.startsWith(this.option.authority)) {
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
                    'accept': 'application/json, text/plain, */*',
                    ...headers,
                },
                abort: ac?.signal
            };

            const request = secureExp.test(url) ? https.request(url, option) : http.request(url, option);

            let status: number, statusText: string | undefined;
            let error: any;
            let ok = false;

            const onResponse = async (res: http.IncomingMessage) => {
                status = res.statusCode ?? 0;
                statusText = res.statusMessage;
                const headers = new HttpHeaders(res.headers as Record<string, any>);

                let body: any;

                if (status !== HttpStatusCode.NoContent) {
                    body = res.statusMessage;
                }
                if (status === 0) {
                    status = body ? HttpStatusCode.Ok : 0
                }

                ok = ctx.adapter.isOk(status);

                if (ctx.adapter.isEmpty(status)) {
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
                if (status && ctx.adapter.isRedirect(status)) {
                    // HTTP fetch step 5.2
                    const location = headers.get(hdr.LOCATION);

                    // HTTP fetch step 5.3
                    let locationURL = null;
                    try {
                        locationURL = location === null ? null : new URL(location, req.url).toString();
                    } catch {
                        // error here can only be invalid URL in Location: header
                        // do not throw when options.redirect == manual
                        // let the user extract the errorneous redirect URL
                        if (rqstatus.redirect !== 'manual') {
                            error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with an invalid redirect URL: ${location}`);
                            ok = false;
                        }
                    }

                    // HTTP fetch step 5.5
                    switch (rqstatus.redirect) {
                        case 'error':
                            error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with a redirect, redirect mode is set to error: ${req.url}`);
                            ok = false;
                            break;
                        case 'manual':
                            // Nothing to do
                            break;
                        case 'follow': {
                            // HTTP-redirect fetch step 2
                            if (locationURL === null) {
                                break;
                            }

                            // HTTP-redirect fetch step 5
                            if (rqstatus.counter >= rqstatus.follow) {
                                error = new HttpError(HttpStatusCode.BadRequest, `maximum redirect reached at: ${req.url}`);
                                ok = false;
                                break;
                            }

                            rqstatus.counter += 1;

                            // HTTP-redirect fetch step 6 (counter increment)
                            // Create a new Request object.

                            let reqheaders = req.headers;
                            let method = req.method as HttpRequestMethod;
                            let body = req.body;

                            // when forwarding sensitive headers like "Authorization",
                            // "WWW-Authenticate", and "Cookie" to untrusted targets,
                            // headers will be ignored when following a redirect to a domain
                            // that is not a subdomain match or exact match of the initial domain.
                            // For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
                            // will forward the sensitive headers, but a redirect to "bar.com" will not.
                            if (!isDomainOrSubdomain(req.url, locationURL)) {
                                for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
                                    reqheaders = reqheaders.delete(name);
                                }
                            }

                            // HTTP-redirect fetch step 9
                            if (status !== 303 && req.body && req.body instanceof Readable) {
                                error = new HttpError(HttpStatusCode.BadRequest, 'Cannot follow redirect with body being a readable stream');
                                ok = false;
                            }

                            // HTTP-redirect fetch step 11
                            if (status === 303 || ((status === 301 || status === 302) && request.method === mths.POST)) {
                                method = mths.GET;
                                body = undefined;
                                reqheaders = reqheaders.delete('content-length');
                            }

                            // HTTP-redirect fetch step 14
                            const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
                            if (responseReferrerPolicy) {
                                reqheaders = reqheaders.set(hdr.REFERRER_POLICY, responseReferrerPolicy);
                            }
                            // HTTP-redirect fetch step 15
                            (ctx.target as TransportClient).send(locationURL, {
                                method,
                                headers: reqheaders,
                                body,
                                context: ctx,
                                observe: 'response'
                            }).subscribe(observer as any);


                            return;
                        }

                        default:
                            error = new TypeError(`Redirect option '${rqstatus.redirect}' is not a valid value of RequestRedirect`);
                            ok = false;
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
                            error,
                            headers,
                            status,
                            statusText
                        }));
                    }
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
                    const contentType = res.headers[hdr.CONTENT_TYPE];
                    let type = req.responseType;
                    if (contentType) {
                        const adapter = ctx.get(MimeAdapter);
                        if (type === 'json' && !adapter.match(jsonTypes, contentType)) {
                            if (adapter.match(xmlTypes, contentType) || adapter.match(textTypes, contentType)) {
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
                            body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                            break;
                        case 'blob':
                            body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], {
                                type: res.headers[hdr.CONTENT_TYPE]
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
export class Http2Backend extends EndpointBackend<HttpRequest, HttpEvent> {
    constructor(private option: HttpClientOptions) {
        super();
    }
    handle(req: HttpRequest<any>, ctx: EndpointContext): Observable<HttpEvent<any>> {
        return new Observable((observer: Observer<HttpEvent<any>>) => {
            const url = req.urlWithParams.trim();
            let path = url;
            if (this.option.authority) {
                path = path.slice(this.option.authority.length);
            }
            const reqHeaders: Record<string, any> = {};
            req.headers.forEach((name, values) => {
                reqHeaders[name] = values
            });

            if (!reqHeaders[hdr.CONTENT_TYPE]) {
                reqHeaders[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
            }
            reqHeaders[HTTP2_HEADER_ACCEPT] = 'application/json, text/plain, */*';
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = path;

            const ac = this.getAbortSignal(ctx);
            const request = ctx.get(CLIENT_HTTP2SESSION).request(reqHeaders, { ...this.option.requestOptions, signal: ac?.signal } as http2.ClientSessionRequestOptions);
            // request.setEncoding('utf8');


            let onData: (chunk: Buffer) => void;
            let onEnd: () => void;
            let status: number, statusText: string;
            let completed = false;

            let error: any;
            let ok = false;

            const onResponse = (hdrs: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader, flags: number) => {
                let body: any;
                const headers = new HttpHeaders(hdrs as Record<string, any>);
                status = hdrs[HTTP2_HEADER_STATUS] ?? 0;

                ok = ctx.adapter.isOk(status);
                statusText = statusMessage[status as HttpStatusCode] ?? 'OK';

                if (ctx.adapter.isEmpty(status)) {
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
                        status = bytes ? HttpStatusCode.Ok : 0
                    }

                    if (status && ctx.adapter.isRedirect(status)) {
                        completed = true;
                        // HTTP fetch step 5.2
                        const location = headers.get(hdr.LOCATION);

                        // HTTP fetch step 5.3
                        let locationURL = null;
                        try {
                            locationURL = location === null ? null : new URL(location, req.url).toString();
                        } catch {
                            // error here can only be invalid URL in Location: header
                            // do not throw when options.redirect == manual
                            // let the user extract the errorneous redirect URL
                            if (rqstatus.redirect !== 'manual') {
                                error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with an invalid redirect URL: ${location}`);
                                ok = false;
                            }
                        }

                        // HTTP fetch step 5.5
                        switch (rqstatus.redirect) {
                            case 'error':
                                error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with a redirect, redirect mode is set to error: ${req.url}`);
                                ok = false;
                                break;
                            case 'manual':
                                // Nothing to do
                                break;
                            case 'follow': {
                                // HTTP-redirect fetch step 2
                                if (locationURL === null) {
                                    break;
                                }

                                // HTTP-redirect fetch step 5
                                if (rqstatus.counter >= rqstatus.follow) {
                                    error = new HttpError(HttpStatusCode.BadRequest, `maximum redirect reached at: ${req.url}`);
                                    ok = false;
                                    break;
                                }

                                rqstatus.counter += 1;

                                // HTTP-redirect fetch step 6 (counter increment)
                                // Create a new Request object.

                                let reqheaders = req.headers;
                                let method = req.method as HttpRequestMethod;
                                let body = req.body;

                                // when forwarding sensitive headers like "Authorization",
                                // "WWW-Authenticate", and "Cookie" to untrusted targets,
                                // headers will be ignored when following a redirect to a domain
                                // that is not a subdomain match or exact match of the initial domain.
                                // For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
                                // will forward the sensitive headers, but a redirect to "bar.com" will not.
                                if (!isDomainOrSubdomain(req.url, locationURL)) {
                                    for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
                                        reqheaders = reqheaders.delete(name);
                                    }
                                }

                                // HTTP-redirect fetch step 9
                                if (status !== 303 && req.body && req.body instanceof Readable) {
                                    error = new HttpError(HttpStatusCode.BadRequest, 'Cannot follow redirect with body being a readable stream');
                                    ok = false;
                                }

                                // HTTP-redirect fetch step 11
                                if (status === 303 || ((status === 301 || status === 302) && req.method === mths.POST)) {
                                    method = mths.GET;
                                    body = undefined;
                                    reqheaders = reqheaders.delete('content-length');
                                }

                                // HTTP-redirect fetch step 14
                                const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
                                if (responseReferrerPolicy) {
                                    reqheaders = reqheaders.set(hdr.REFERRER_POLICY, responseReferrerPolicy);
                                }
                                // HTTP-redirect fetch step 15
                                (ctx.target as TransportClient).send(locationURL, {
                                    method,
                                    headers: reqheaders,
                                    body,
                                    context: ctx,
                                    observe: 'response'
                                }).pipe(
                                    finalize(() => completed = true)
                                ).subscribe(observer as any);

                                return;
                            }

                            default:
                                error = new TypeError(`Redirect option '${rqstatus.redirect}' is not a valid value of RequestRedirect`);
                                ok = false;
                                break;
                        }
                    } else {
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
                        const contentType = headers.get(hdr.CONTENT_TYPE);
                        let type = req.responseType;
                        if (contentType) {
                            const adapter = ctx.get(MimeAdapter);
                            if (type === 'json' && !adapter.match(jsonTypes, contentType)) {
                                if (adapter.match(xmlTypes, contentType) || adapter.match(textTypes, contentType)) {
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
                                body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                                break;
                            case 'blob':
                                buffer = body;
                                body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], {
                                    type: headers.get(hdr.CONTENT_TYPE) as string
                                });
                                break;
                            case 'text':
                                body = new TextDecoder().decode(body);
                                break;
                            default:
                                break;
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


export async function sendbody(data: any, request: Writable, error: (err: any) => void): Promise<void> {
    let source: PipelineSource<any>;
    try {
        if (isArrayBuffer(data)) {
            source = Buffer.from(data);
        } else if (isBuffer(data)) {
            source = data;
        } else if (isBlob(data)) {
            const arrbuff = await data.arrayBuffer();
            source = Buffer.from(arrbuff);
        } else if (isFormData(data)) {
            let form: NodeFormData;
            if (data instanceof NodeFormData) {
                form = data;
            } else {
                form = new NodeFormData();
                data.forEach((v, k, parent) => {
                    form.append(k, v);
                });
            }
            source = form.getBuffer();
        } else {
            source = String(data);
        }
        await pmPipeline(source, request)
    } catch (err) {
        error(err);
    }
}



const secureExp = /^https:/;
const XSSI_PREFIX = /^\)\]\}',?\n/;


export class RequestStauts {
    public follow: number;
    public counter: number;
    public highWaterMark: number;
    public insecureHTTPParser: boolean;
    public referrerPolicy: ReferrerPolicy;
    public redirect: 'manual' | 'error' | 'follow' | '';
    // readonly agent: http.Agent | boolean;
    readonly compress: boolean;
    constructor(init: {
        compress?: boolean;
        follow?: number;
        counter?: number;
        highWaterMark?: number;
        insecureHTTPParser?: boolean;
        referrerPolicy?: ReferrerPolicy;
        redirect?: 'manual' | 'error' | 'follow' | '';
        agent?: http.Agent | boolean;
    } = EMPTY_OBJ) {
        this.compress = init.compress ?? false;
        this.follow = init.follow ?? 20;
        this.counter = init.counter ?? 0;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureHTTPParser = init.insecureHTTPParser ?? false;
        this.redirect = init.redirect ?? 'follow';
        this.referrerPolicy = init.referrerPolicy ?? '';
        // this.agent = init.agent ?? false;

    }
}


const isDomainOrSubdomain = (destination: string | URL, original: string | URL) => {
    const orig = new URL(original).hostname;
    const dest = new URL(destination).hostname;

    return orig === dest || orig.endsWith(`.${dest}`);
}

export const referPolicys = new Set([
    '',
    'no-referrer',
    'no-referrer-when-downgrade',
    'same-origin',
    'origin',
    'strict-origin',
    'origin-when-cross-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
]);

const splitReg = /[,\s]+/;

export function parseReferrerPolicyFromHeader(headers: HttpHeaders) {
    const policyTokens = (headers.get('referrer-policy') || '').split(splitReg);
    let policy = '';
    for (const token of policyTokens) {
        if (token && referPolicys.has(token)) {
            policy = token;
        }
    }
    return policy;
}

