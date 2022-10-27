/* eslint-disable no-case-declarations */
import {
    EndpointBackend, TransportEvent, ClientContext, TransportErrorResponse,
    TransportRequest, ResHeaders, OutgoingHeader, Status, StatusFactory,
    EmptyStatus, RedirectStatus, TransportHeaderResponse, Redirector, OkStatus, mths,
    ResponseJsonParseError, TransportResponse, ResHeadersLike
} from '@tsdi/core';
import { Abstract, lang, _tyundef } from '@tsdi/ioc';
import { PassThrough, pipeline, Readable } from 'stream';
import { Observable, Observer } from 'rxjs';
import * as zlib from 'zlib';
import { isBuffer, pmPipeline, toBuffer, XSSI_PREFIX } from '../utils';
import { Connection } from '../connection';
import { IncomingMessage } from '../server/req';
import { ev, hdr } from '../consts';
import { RequestStauts } from './options';
import { MimeAdapter, MimeTypes } from '../mime';


/**
 * transport endpoint backend.
 */
@Abstract()
export abstract class TransportBackend implements EndpointBackend<TransportRequest, TransportEvent> {

    handle(req: TransportRequest, ctx: ClientContext): Observable<TransportEvent> {
        return new Observable((observer: Observer<TransportEvent<any>>) => {
            const conn = ctx.get(Connection);
            const url = req.url.trim();
            let status: Status<number>;
            let headers: ResHeaders;

            let error: any;
            let ok = false;
            const factory = ctx.statusFactory as StatusFactory<number>;
            const onError = (error: Error) => {
                const res = this.createError({
                    url,
                    error,
                    statusText: 'Unknown Error',
                    ...status

                });
                observer.error(res)
            };
            const onResponse = async (incoming: IncomingMessage) => {
                let body: any;
                headers = new ResHeaders(incoming.headers);
                status = factory.createByCode(headers.get(hdr.STATUS2) ?? headers.get(hdr.STATUS) ?? 0);
                ctx.status = status;

                if (status instanceof EmptyStatus) {
                    observer.next(this.createHeadResponse({
                        url,
                        headers,
                        ...status
                    }));
                    observer.complete();
                    return;
                }

                // HTTP fetch step 5
                body = pipeline(incoming, new PassThrough(), (err) => {
                    error = err;
                    ok = !err;
                });

                if (status instanceof RedirectStatus) {
                    // HTTP fetch step 5.2
                    ctx.get(Redirector).redirect<TransportEvent<any>>(ctx, req, status, headers).subscribe(observer);
                    return;
                }
                ok = status instanceof OkStatus;

                if (!ok) {
                    if (!error) {
                        body = await toBuffer(body);
                        body = new TextDecoder().decode(body);
                    }
                    return observer.error(this.createError({
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
                        ...status
                    }));
                    observer.complete();
                } else {
                    observer.error(this.createError({
                        url,
                        error: error ?? body,
                        ...status
                    }));
                }

            };

            const resName = this.getResponseEvenName();

            conn.on(resName, onResponse);
            conn.on(ev.ERROR, onError);
            conn.on(ev.ABOUT, onError);
            conn.on(ev.ABORTED, onError);
            conn.on(ev.TIMEOUT, onError);

            this.send(conn, req, ctx, onError);

            return () => {
                conn.off(resName, onResponse);
                conn.off(ev.ERROR, onError);
                conn.off(ev.ABOUT, onError);
                conn.off(ev.ABORTED, onError);
                conn.off(ev.TIMEOUT, onError);
                if (!ctx.destroyed) {
                    observer.error(this.createError({
                        status: 0,
                        statusText: 'The operation was aborted.'
                    }));

                }

            }
        });
    }

    protected getResponseEvenName() {
        return ev.RESPONSE
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

    protected abstract send(conn: Connection, req: TransportRequest, ctx: ClientContext, onError: (err: any)=> void): Promise<void>;

}


