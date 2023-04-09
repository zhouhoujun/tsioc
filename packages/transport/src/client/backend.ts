/* eslint-disable no-case-declarations */
import {
    TransportEvent, TransportErrorResponse, TransportRequest,
    ResHeaders, OutgoingHeader, TransportHeaderResponse, Redirector,
    ResponseJsonParseError, TransportResponse, ResHeadersLike, Backend, Incoming, HEAD
} from '@tsdi/core';
import { Abstract, EMPTY_OBJ, lang } from '@tsdi/ioc';
import { PassThrough, pipeline, Readable } from 'stream';
import { Observable, Observer } from 'rxjs';
import * as zlib from 'zlib';
import { isBuffer, pmPipeline, sendbody, toBuffer, XSSI_PREFIX } from '../utils';
import { IncomingMessage } from '../incoming';
import { OutgoingMessage } from '../outgoing';
import { ev, hdr } from '../consts';
import { MimeAdapter, MimeTypes } from '../mime';
import { StatusVaildator } from '../status';


/**
 * transport endpoint backend.
 */
@Abstract()
export abstract class TransportBackend implements Backend<TransportRequest, TransportEvent> {

    constructor(
        private vaildator: StatusVaildator,
        private mimeTypes: MimeTypes,
        private mimeAdapter: MimeAdapter,
        private redirector: Redirector) {
    }

    handle(req: TransportRequest): Observable<TransportEvent> {
        return new Observable((observer: Observer<TransportEvent<any>>) => {
            const url = req.url.trim();
            let status: number | string;
            let statusText: string;

            let error: any;
            let ok = false;

            const request = this.createRequest(req);

            const onError = (error?: Error | null) => {
                const res = this.createError({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    status

                });
                observer.error(res)
            };
            const onResponse = async (incoming: IncomingMessage) => {
                let body: any;
                const headers = new ResHeaders(incoming.headers);
                status = headers.get(hdr.STATUS2) ?? headers.get(hdr.STATUS) ?? 0;

                if (emptyStatus[status]) {
                    observer.next(this.createHeadResponse({
                        url,
                        headers,
                        status
                    }));
                    observer.complete();
                    return;
                }

                // HTTP fetch step 5
                body = pipeline(incoming, new PassThrough(), (err) => {
                    error = err;
                    ok = !err;
                });

                if (this.vaildator.isRedirect(status)) {
                    // HTTP fetch step 5.2
                    this.redirector.redirect<TransportEvent<any>>(req, status, headers).subscribe(observer);
                    return;
                }
                ok = this.vaildator.isOk(status);

                if (!ok) {
                    if (!error) {
                        body = await toBuffer(body);
                        body = new TextDecoder().decode(body);
                    }
                    return observer.error(this.createError({
                        url,
                        error: error ?? body,
                        status,
                        statusText
                    }));
                }

                const rqstatus = req.context.getValueify(RequestStauts, () => new RequestStauts());
                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);

                // HTTP-network fetch step 12.1.1.4: handle content codings
                // in following scenarios we ignore compression support
                // 1. compression support is disabled
                // 2. HEAD request
                // 3. no Content-Encoding header
                // 4. no content response (204)
                // 5. content not modified response (304)
                if (rqstatus.compress && req.method !== HEAD && codings) {
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
                    const adapter = this.mimeAdapter;
                    const mity = this.mimeTypes;
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
                                error = { error: err, text: body } as ResponseJsonParseError
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
                    observer.next(this.createResponse({
                        url,
                        body,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                } else {
                    observer.error(this.createError({
                        url,
                        error: error ?? body,
                        status,
                        statusText
                    }));
                }
            };

            const respName = this.getResponseEvenName();

            request.on(respName, onResponse);
            request.on(ev.ERROR, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.ABORTED, onError);
            request.on(ev.TIMEOUT, onError);

            if (req.body === null) {
                request.end();
            } else {
                this.sendBody(request, req.body, onError);
            }

            return () => {
                request.off(respName, onResponse);
                request.off(ev.ERROR, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.ABORTED, onError);
                request.off(ev.TIMEOUT, onError);
                if (!req.context.destroyed) {
                    observer.error(this.createError({
                        status: 0,
                        statusText: 'The operation was aborted.'
                    }));
                }
            }
        });
    }


    protected createError(options: {
        url?: string,
        headers?: Record<string, OutgoingHeader>;
        status: number | string;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }) {
        return new TransportErrorResponse(options);
    }

    protected createHeadResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: number | string;
        statusText?: string;
        statusMessage?: string;
    }) {
        return new TransportHeaderResponse(options);
    }

    protected createResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: number | string;
        statusText?: string;
        statusMessage?: string;
        body?: any;
    }) {
        return new TransportResponse(options);
    }

    protected getResponseEvenName() {
        return ev.RESPONSE
    }

    protected abstract createRequest(req: TransportRequest): OutgoingMessage;

    protected sendBody(request: OutgoingMessage, body: any, callback: (error?: Error | null) => void) {
        sendbody(body, request, callback);
    }
}


export class RequestStauts {
    public highWaterMark: number;
    public insecureParser: boolean;
    public referrerPolicy: ReferrerPolicy;
    readonly compress: boolean;
    constructor(init: {
        compress?: boolean;
        follow?: number;
        counter?: number;
        highWaterMark?: number;
        insecureParser?: boolean;
        referrerPolicy?: ReferrerPolicy;
        redirect?: 'manual' | 'error' | 'follow' | '';
    } = EMPTY_OBJ) {
        this.compress = init.compress ?? false;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureParser = init.insecureParser ?? false;
        this.referrerPolicy = init.referrerPolicy ?? '';
    }
}

