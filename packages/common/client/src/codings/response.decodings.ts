
import { Decoder, HEAD, InputContext, ResponseJsonParseError, TransportEvent, TransportRequest } from '@tsdi/common';
import { Incoming, Mappings, MimeAdapter, NotSupportedExecption, ResponseEventFactory, StreamAdapter, XSSI_PREFIX, ev, isBuffer, toBuffer } from '@tsdi/common/transport';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Abstract, EMPTY_OBJ, Injectable, Injector, Module, getClass, getClassName, lang, tokenId } from '@tsdi/ioc';
import { Observable, catchError, defer, mergeMap, of, throwError } from 'rxjs';



@Abstract()
export abstract class ResponseDecodeHandler implements Handler<any, TransportEvent, InputContext> {
    abstract handle(input: any, context: InputContext): Observable<TransportEvent>
}


@Injectable({
    static: true,
    providedIn: 'root'
})
export class ResponseMappings extends Mappings {

}


@Injectable()
export class ResponseDecodeBackend implements Backend<any, TransportEvent, InputContext>  {

    constructor(private mappings: ResponseMappings) { }

    handle(input: any, context: InputContext): Observable<TransportEvent> {
        const type = getClass(input);
        const handlers = this.mappings.getHanlder(type);
        
        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            return throwError(() => new NotSupportedExecption('No encodings handler for response type:' + getClassName(type)));
        }
    }

}


export const RESPONSE_DECODE_INTERCEPTORS = tokenId<Interceptor<any, TransportEvent, InputContext>[]>('RESPONSE_DECODE_INTERCEPTORS');

@Injectable()
export class ResponseDecodeInterceptingHandler extends InterceptingHandler<any, TransportEvent, InputContext>  {
    constructor(backend: ResponseDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(RESPONSE_DECODE_INTERCEPTORS, []))
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
export class ResponseDecoder extends Decoder<any, TransportEvent> implements Interceptor<any, TransportEvent, InputContext> {

    constructor(readonly handler: ResponseDecodeHandler) {
        super()
    }

    intercept(input: any, next: Handler<any, any, InputContext>, context: InputContext): Observable<TransportEvent> {
        return next.handle(input, context)
            .pipe(
                mergeMap(res=> this.handler.handle(res, context.next(res)))
            );
    }
}


@Module({
    providers: [
        ResponseMappings,
        ResponseDecodeBackend,
        { provide: ResponseDecodeHandler, useClass: ResponseDecodeInterceptingHandler },
        ResponseDecoder
    ]
})
export class ResponseDecodingsModule {

}


@Injectable()
export class IncomingResponseHanlder implements Handler<Incoming, TransportEvent, InputContext> {

    constructor(
        private streamAdapter: StreamAdapter,
        private mimeAdapter: MimeAdapter
    ) { }

    handle(input: Incoming, context: InputContext): Observable<TransportEvent> {
        const streamAdapter = this.streamAdapter;
        const res = input;
        return defer(async () => {
            const req = context.first() as TransportRequest;
            const eventFactory = req.context.get(ResponseEventFactory);

            let responseType = req.responseType;
            if (this.mimeAdapter) {
                const contentType = res.getContentType();
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
            if (responseType !== 'stream' && streamAdapter.isReadable(res.payload)) {
                res.payload = await toBuffer(res.payload);
            }
            let body, originalBody;
            body = originalBody = res.payload;
            let ok = res.ok ?? !!res.error;
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
                            res.error = { error: err, text: body } as ResponseJsonParseError
                        }
                    }
                    break;

                case 'arraybuffer':
                    body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                    break;

                case 'blob':
                    body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                        type: res.getContentType()
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
            res.payload = body;

            if (ok) {
                return eventFactory.createResponse(res);
            } else {
                throw eventFactory.createErrorResponse(res);
            }

        })
    }

}

@Injectable()
export class CompressResponseDecordeInterceptor implements Interceptor<Incoming, TransportEvent, InputContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: Incoming, next: Handler<Incoming, TransportEvent, InputContext>, context: InputContext): Observable<TransportEvent> {
        const response = input;
        if (response instanceof Incoming) {
            const codings = response.getContentEncoding();
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