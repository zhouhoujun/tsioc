
import { Decoder, HEAD, ResponseJsonParseError, TransportEvent, TransportRequest } from '@tsdi/common';
import { MimeAdapter, Packet, ResponsePacket, StreamAdapter, XSSI_PREFIX, ev, isBuffer, toBuffer } from '@tsdi/common/transport';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Abstract, EMPTY_OBJ, Injectable, Injector, Module, lang, tokenId } from '@tsdi/ioc';
import { Observable, defer, mergeMap } from 'rxjs';


export interface ResponseContext {
    response: ResponsePacket;
    req: TransportRequest;
}


@Injectable()
export class ResponseBackend implements Backend<ResponseContext, TransportEvent> {

    constructor(
        private streamAdapter: StreamAdapter,
        private mimeAdapter: MimeAdapter
    ) { }

    handle(input: ResponseContext): Observable<TransportEvent> {
        const streamAdapter = this.streamAdapter;
        return defer(async () => {
            const { req, response } = input;
            let responseType = req.responseType;
            if (this.mimeAdapter) {
                const contentType = response.getContentType();
                if (contentType) {
                    if (responseType === 'json' && !this.mimeAdapter.isJson(contentType)) {
                        if (this.mimeAdapter.isXml(contentType) || this.mimeAdapter.isText(contentType)) {
                            responseType = 'text';
                        } else {
                            responseType = 'blob';
                        }
                    }
                }
            }
            if (responseType !== 'stream' && streamAdapter.isReadable(response.payload)) {
                response.payload = await toBuffer(response.payload);
            }
            let body, originalBody;
            body = originalBody = response.payload;
            let ok = response.ok ?? !!response.error;
            switch (responseType) {
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
                            response.error = { error: err, text: body } as ResponseJsonParseError
                        }
                    }
                    break;

                case 'arraybuffer':
                    body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                    break;

                case 'blob':
                    body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                        type: response.getContentType()
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
            response.payload = body;

            if (ok) {
                return session.eventFactory.createResponse(response);
            } else {
                throw session.eventFactory.createErrorResponse(response);
            }

        })
    }

}

@Abstract()
export abstract class ResponseDecodeHandler implements Handler<ResponseContext, TransportEvent> {
    abstract handle(input: ResponseContext): Observable<TransportEvent>
}

export const RESPONSE_DECODE_INTERCEPTORS = tokenId<Interceptor<ResponseContext, TransportEvent>[]>('RESPONSE_DECODE_INTERCEPTORS');

@Injectable()
export class ResponseDecodeInterceptingHandler extends InterceptingHandler<ResponseContext, TransportEvent>  {
    constructor(backend: ResponseBackend, injector: Injector) {
        super(backend, () => injector.get(RESPONSE_DECODE_INTERCEPTORS))
    }
}


@Injectable()
export class CompressResponseDecordeInterceptor implements Interceptor<ResponseContext, TransportEvent> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(ctx: ResponseContext, next: Handler<ResponseContext, TransportEvent>): Observable<TransportEvent> {
        const response = ctx.response;
        if (response instanceof Outgoing) {
            const codings = response.getContentEncoding();
            const req = ctx.req;
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
                    let body = response.payload;
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
                        response.payload = body;

                    } catch (err) {
                        throw ctx.session.eventFactory.createErrorResponse({ url: req.urlWithParams, error: err })
                    }
                }).pipe(
                    mergeMap(() => {
                        return next.handle(ctx);
                    })
                )
            }
        }
        return next.handle(ctx)
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
export class ResponseDecoder extends Decoder<ResponseContext, TransportEvent> {

    constructor(readonly handler: ResponseDecodeHandler) {
        super()
    }
}


@Module({
    providers: [
        { provide: RESPONSE_DECODE_INTERCEPTORS, useClass: CompressResponseDecordeInterceptor, multi: true },
        { provide: ResponseDecodeHandler, useClass: ResponseDecodeInterceptingHandler },
        ResponseDecoder
    ]
})
export class ResponseDecodingsModule {

}