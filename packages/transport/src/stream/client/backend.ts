import {
    EndpointBackend, IncomingHeaders, IncomingStatusHeaders, TransportRequest, RedirectTransportStatus,
    mths, Redirector, ClientEndpointContext, ResHeaders, ResponseJsonParseError, TransportExecption,
    TransportErrorResponse, TransportEvent, TransportHeaderResponse, TransportResponse

} from '@tsdi/core';
import { EMPTY_OBJ, Injectable, InvocationContext, isUndefined, lang, _tyundef } from '@tsdi/ioc';
import { PassThrough, pipeline, Writable, Readable } from 'stream';
import { Observable, Observer, throwError, finalize } from 'rxjs';
import * as zlib from 'zlib';
import { ctype, ev, hdr } from '../../consts';
import { MimeAdapter, MimeTypes } from '../../mime';
import { isBuffer, pmPipeline, toBuffer } from '../../utils';
import { RequestStauts, TransportClientOpts } from '../../client/options';
import { Connection } from '../../connection';


/**
 * transport restful endpoint backend.
 */
@Injectable()
export class TransportBackend2 implements EndpointBackend<TransportRequest, TransportEvent> {

    handle(req: TransportRequest, ctx: ClientEndpointContext): Observable<TransportEvent> {
        const session = ctx.get(Connection);
        const { method, url } = req;
        if (!session || session.destroyed) return throwError(() => new TransportErrorResponse({
            url,
            status: 0,
            statusMessage: 'has not connected.'
        }));

        return new Observable((observer: Observer<any>) => {
            const stgy = ctx.transport;
            const path = url.replace(session.authority, '');

            req.headers.set(hdr.METHOD, method);
            req.headers.set(hdr.PATH, path);
            !req.headers.has(hdr.CONTENT_TYPE) && req.headers.set(hdr.CONTENT_TYPE, ctype.APPL_JSON)
            !req.headers.has(hdr.ACCEPT) && req.headers.set(hdr.ACCEPT, ctype.REQUEST_ACCEPT);

            const opts = ctx.target.getOptions() as TransportClientOpts;
            const ac = this.getAbortSignal(ctx);
            const request = session.request(req.headers.headers, { ...opts.requestOpts, signal: ac.signal });

            let status: number, statusText: string;
            let completed = false;

            let error: any;
            let ok = false;

            const onResponse = async (hdrs: IncomingHeaders & IncomingStatusHeaders, flags: number) => {
                let body: any;
                const headers = new ResHeaders(hdrs as Record<string, any>);
                status = stgy.status.parse(hdrs[hdr.STATUS2] ?? hdrs[hdr.STATUS]);

                statusText = stgy.status.message(status) ?? 'OK';

                if (stgy.status.isEmpty(status)) {
                    completed = true;
                    observer.next(new TransportHeaderResponse({
                        url,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                    return;
                }

                // fetch step 5
                body = pipeline(request, new PassThrough({ objectMode: true }), (err) => {
                    error = err;
                    ok = !err;
                });

                if (status && stgy.status instanceof RedirectTransportStatus && stgy.status.isRedirect(status)) {
                    // HTTP fetch step 5.2
                    ctx.get(Redirector).redirect<TransportEvent<any>>(ctx, req, status, headers)
                        .pipe(
                            finalize(() => completed = true)
                        ).subscribe(observer);
                    return;
                }

                completed = true;
                ok = stgy.status.isOk(status);

                if (!ok) {
                    if (!error) {
                        body = await toBuffer(body);
                        body = new TextDecoder().decode(body);
                    }
                    return observer.error(new TransportErrorResponse({
                        url,
                        error: error ?? body,
                        status,
                        statusText
                    }));
                }

                const rqstatus = ctx.getValueify(RequestStauts, () => new RequestStauts());
                // codings.
                const codings = headers.get(hdr.CONTENT_ENCODING);

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
                        if (body instanceof PassThrough) {
                            body = await toBuffer(body);
                        }
                    } catch (err) {
                        ok = false;
                        error = err;
                    }
                }

                let type = ctx.responseType;
                if (type === 'stream' && body instanceof Readable) {
                    ok = true;
                } else {
                    let originalBody: any;
                    const contentType = headers.get(hdr.CONTENT_TYPE) as string;
                    body = body instanceof Readable ? await toBuffer(body) : body;
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

                }

                if (ok) {
                    observer.next(new TransportResponse({
                        url,
                        body,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                } else {
                    observer.error(new TransportErrorResponse({
                        url,
                        error: error ?? body,
                        status,
                        statusText
                    }));
                }
            };

            const onError = (error?: Error) => {
                const res = new TransportErrorResponse({
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
            const data = req.body;
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
                    observer.error(new TransportExecption('The operation was aborted.'));
                    request.emit(ev.CLOSE);
                }
            }
        });
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === _tyundef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }
}
