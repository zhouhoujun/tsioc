import { EMPTY_OBJ, Injectable, getClass, isNil, isString, lang } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { HEAD, ResponseJsonParseError, TransportEvent, TransportHeaders, TransportRequest } from '@tsdi/common';
import { Codings, DecodeHandler } from '@tsdi/common/codings';
import {
    TransportContext, MimeAdapter, NotSupportedExecption, ResponseEventFactory, StreamAdapter,
    XSSI_PREFIX, ev, isBuffer, toBuffer, Packet, ResponsePacketIncoming, ResponseIncoming
} from '@tsdi/common/transport';
import { Observable, defer, mergeMap, throwError } from 'rxjs';




const jsonType = /json/i;
const textType = /^text/i;
const xmlType = /xml$/i;

@Injectable()
export class ResponseIncomingResolver {

    resolve(res: ResponseIncoming, context: TransportContext) {
        return defer(async () => {
            const req = context.first() as TransportRequest;
            const eventFactory = req.context.get(ResponseEventFactory);
            const streamAdapter = req.context.get(StreamAdapter);
            let responseType = req.responseType;

            const contentType = res.tHeaders.getContentType();
            if (contentType && responseType === 'json') {
                const mimeAdapter = req.context.get(MimeAdapter);
                if (mimeAdapter && !mimeAdapter.isJson(contentType)) {
                    if (mimeAdapter.isXml(contentType) || mimeAdapter.isText(contentType)) {
                        responseType = 'text';
                    } else {
                        responseType = 'blob';
                    }
                } else if (!mimeAdapter && !jsonType.test(contentType)) {
                    if (xmlType.test(contentType) || textType.test(contentType)) {
                        responseType = 'text';
                    } else {
                        responseType = 'blob';
                    }
                }
            }

            if (responseType !== 'stream' && streamAdapter.isReadable(res.body)) {
                res.body = await toBuffer(res.body);
            }
            let body, originalBody;
            body = originalBody = res.body;
            let ok = res.ok ?? !res.error;
            if (!isNil(body)) {
                switch (responseType) {
                    case 'json':
                        // Save the original body, before attempting XSSI prefix stripping.
                        if (isBuffer(body)) {
                            body = new TextDecoder().decode(body);
                        }
                        if (isString(body)) {
                            originalBody = body;
                            try {
                                body = body.replace(XSSI_PREFIX, '');
                                // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                body = (body !== '') ? JSON.parse(body) : null;
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
                                    res.error = { error: err, text: body } as ResponseJsonParseError
                                }
                            }
                        }
                        break;

                    case 'arraybuffer':
                        body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                        break;

                    case 'blob':
                        body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                            type: res.tHeaders.getContentType()
                        });
                        break;

                    case 'stream':
                        body = streamAdapter.isStream(body) ? body : streamAdapter.jsonSreamify(body);
                        break;

                    case 'text':
                    default:
                        if (isBuffer(body)) {
                            body = new TextDecoder().decode(body);
                        }
                        break;

                }
                res.body = body;
            }

            if (ok) {
                return eventFactory.createResponse(res);
            } else {
                throw eventFactory.createErrorResponse(res);
            }

        })
    }
}


@Injectable({ static: true })
export class ResponseDecodingsHandlers {

    @DecodeHandler(ResponsePacketIncoming)
    handleResponseIncoming(res: ResponsePacketIncoming, context: TransportContext, resovler: ResponseIncomingResolver) {
        if (!(res.tHeaders instanceof TransportHeaders)) {
            return throwError(() => new NotSupportedExecption(`${context.options.group ?? ''} ${context.options.name ?? ''} response is not ResponseIncoming!`));
        }
        return resovler.resolve(res, context);
    }
}


@Injectable()
export class ResponseDecodeInterceper implements Interceptor<any, any, TransportContext> {

    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap(res => {
                if (getClass(res) === Object) {
                    const packet = res as Packet;
                    if (!(packet.url || packet.topic || packet.headers || packet.payload)) {
                        return throwError(() => new NotSupportedExecption(`${context.options.group ?? ''} ${context.options.name ?? ''} response is not packet data!`));
                    }
                    res = new ResponsePacketIncoming(packet, context.options);
                }

                return this.codings.decode(res, context)
            }));
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



@Injectable()
export class CompressResponseDecordeInterceptor implements Interceptor<ResponseIncoming, TransportEvent, TransportContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: ResponseIncoming, next: Handler<ResponseIncoming, TransportEvent, TransportContext>, context: TransportContext): Observable<TransportEvent> {
        const response = input;
        if (response.tHeaders instanceof TransportHeaders) {
            const codings = response.tHeaders.getContentEncoding();
            const req = context.first() as TransportRequest;
            const eventFactory = req.context.get(ResponseEventFactory);
            const streamAdapter = this.streamAdapter;
            const rqstatus = req.context.getValueify(RequestStauts, () => new RequestStauts());
            // HTTP-network fetch step 12.1.1.4: handle content codings
            // in following scenarios we ignore compression support
            // 1. compression support is disabled
            // 2. HEAD request
            // 3. no Content-Encoding header
            // 4. no content response (204)
            // 5. content not modified response (304)
            if (rqstatus.compress && req.method !== HEAD && codings) {
                return defer(async () => {
                    let body = response.body;
                    // For Node v6+
                    // Be less strict when decoding compressed responses, since sometimes
                    // servers send slightly invalid responses that are still accepted
                    // by common browsers.
                    // Always using Z_SYNC_FLUSH is what cURL does.
                    const constants = streamAdapter.getZipConstants();
                    const zlibOptions = {
                        flush: constants.Z_SYNC_FLUSH,
                        finishFlush: constants.Z_SYNC_FLUSH
                    };

                    try {
                        if (codings === 'gzip' || codings === 'x-gzip') { // For gzip
                            const unzip = streamAdapter.createGunzip(zlibOptions);
                            await streamAdapter.pipeTo(body, unzip);
                            body = unzip;
                        } else if (codings === 'deflate' || codings === 'x-deflate') { // For deflate
                            // Handle the infamous raw deflate response from old servers
                            // a hack for old IIS and Apache servers
                            const raw = streamAdapter.createPassThrough();
                            await streamAdapter.pipeTo(body, raw);
                            const defer = lang.defer();
                            raw.on(ev.DATA, chunk => {
                                if ((chunk[0] & 0x0F) === 0x08) {
                                    body = streamAdapter.pipeline(body, streamAdapter.createInflate(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                } else {
                                    body = streamAdapter.pipeline(body, streamAdapter.createInflateRaw(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                }
                            });

                            raw.once(ev.END, defer.resolve);

                            await defer.promise;

                        } else if (codings === 'br') { // For br
                            const unBr = streamAdapter.createBrotliDecompress();
                            await streamAdapter.pipeTo(body, unBr);
                            body = unBr;
                        }
                        response.body = body;

                    } catch (err) {
                        throw eventFactory.createErrorResponse({ url: req.urlWithParams, error: err })
                    }
                }).pipe(
                    mergeMap(() => {
                        return next.handle(input, context);
                    })
                )
            }
        }
        return next.handle(input, context)
    }
}
