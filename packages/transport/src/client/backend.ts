import { EndpointBackend, IncomingHeaders, IncomingStatusHeaders, isArrayBuffer, isBlob, isFormData, mths, Redirector, ReqHeaders, RequestContext, ResponseJsonParseError, TransportError } from '@tsdi/core';
import { EMPTY_OBJ, Injectable, InvocationContext, isUndefined, lang, type_undef } from '@tsdi/ioc';
import { Observable, Observer, throwError, finalize } from 'rxjs';
import * as zlib from 'zlib';
import { PassThrough, pipeline, Writable, PipelineSource } from 'stream';
import { promisify } from 'util';
import { ctype, ev, hdr } from '../consts';
import { ClientSession } from '../stream';
import { createFormData, isBuffer, isFormDataLike, jsonTypes, textTypes, toBuffer, xmlTypes } from '../utils';
import { ProtocolClientOpts } from './options';
import { TransportRequest } from './request';
import { ErrorResponse, TransportResponse, TransportEvent, TransportHeaderResponse } from './response';
import { MimeAdapter } from '../mime';

const pmPipeline = promisify(pipeline);
/**
 * transport protocol backend.
 */
@Injectable()
export class ProtocolBackend implements EndpointBackend<TransportRequest, TransportEvent> {


    handle(req: TransportRequest, ctx: RequestContext): Observable<TransportEvent> {
        const session = ctx.get(ClientSession);
        const { headers, method, url } = req;
        if (!session || session.destroyed) return throwError(() => new ErrorResponse({
            url,
            status: 0,
            statusMessage: 'has not connected.'
        }));

        return new Observable((observer: Observer<any>) => {
            const statAdpr = ctx.protocol.status;
            const path = url.replace(session.authority, '');

            headers.set(hdr.METHOD, method);
            headers.set(hdr.PATH, path);
            !headers.has(hdr.CONTENT_TYPE) && headers.set(hdr.CONTENT_TYPE, req.detectContentTypeHeader()!)
            !headers.has(hdr.ACCEPT) && headers.set(hdr.ACCEPT, ctype.REQUEST_ACCEPT);

            const opts = ctx.target.getOptions() as ProtocolClientOpts;
            const ac = this.getAbortSignal(ctx);
            const request = session.request(headers.headers, { ...opts.requestOpts, signal: ac.signal });

            let onData: (chunk: Buffer) => void;
            let onEnd: () => void;
            let status: number, statusText: string;
            let completed = false;

            let error: any;
            let ok = false;

            const onResponse = (hdrs: IncomingHeaders & IncomingStatusHeaders, flags: number) => {
                let body: any;
                const headers = new ReqHeaders(hdrs as Record<string, any>);
                status = statAdpr.parse(hdrs[hdr.STATUS2] ?? hdrs[hdr.STATUS]);

                ok = statAdpr.isOk(status);
                statusText = statAdpr.message(status) ?? 'OK';

                if (statAdpr.isEmpty(status)) {
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

                const rqstatus = ctx.getValueify(RequestStauts, () => new RequestStauts());
                // fetch step 5

                // fetch step 12.1.1.3
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
                        ctx.get(Redirector).redirect<TransportEvent<any>>(ctx, req, status, headers)
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
                    let type = ctx.responseType;
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
                                    error = { error: err, text: body } as ResponseJsonParseError
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
                        observer.next(new TransportResponse({
                            url,
                            body,
                            headers,
                            status,
                            statusText
                        }));
                        observer.complete();
                    } else {
                        observer.error(new ErrorResponse({
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
                const res = new ErrorResponse({
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
                    observer.error(new TransportError('The operation was aborted.'));
                    request.emit(ev.CLOSE);
                }
            }
        });
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }
}

/**
 * json xss.
 */
export const XSSI_PREFIX = /^\)\]\}',?\n/;

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
        } else if (isFormDataLike(data)) {
            if (isFormData(data)) {
                const form = createFormData();
                data.forEach((v, k, parent) => {
                    form.append(k, v);
                });
                data = form;
            }
            source = data.getBuffer();
        } else {
            source = String(data);
        }
        await pmPipeline(source, request)
    } catch (err) {
        error(err);
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


