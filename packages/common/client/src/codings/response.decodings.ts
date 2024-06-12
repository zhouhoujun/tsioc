import { EMPTY_OBJ, Injectable, isNil, isString, lang } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { HEAD, ResponseEvent, ResponseJsonParseError, AbstractRequest } from '@tsdi/common';
import { TransportContext, MimeAdapter, XSSI_PREFIX, ev, isBuffer, toBuffer, ClientIncomingPacket } from '@tsdi/common/transport';
import { Observable, defer, mergeMap, of } from 'rxjs';
import { ClientTransportSession } from '../session';




@Injectable()
export class EmptyResponseDecordeInterceptor implements Interceptor<ClientIncomingPacket, ResponseEvent, TransportContext> {

    intercept(input: ClientIncomingPacket, next: Handler<ClientIncomingPacket, ResponseEvent, TransportContext>, context: TransportContext): Observable<ResponseEvent> {
        const len = input.headers.getContentLength();
        const session = context.session as ClientTransportSession;
        if (!len && session.statusAdapter?.isEmpty(input.status)) {
            return of(session.responseFactory.create({ ...input.toJson(), payload: null }));
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class RedirectDecodeInterceptor implements Interceptor<ClientIncomingPacket, ResponseEvent, TransportContext> {

    intercept(input: ClientIncomingPacket, next: Handler<ClientIncomingPacket, ResponseEvent, TransportContext>, context: TransportContext): Observable<ResponseEvent> {
        const session = context.session as ClientTransportSession;
        // HTTP fetch step 5
        if (session.redirector) {
            if (session.statusAdapter?.isRedirect(input.status)) {
                // HTTP fetch step 5.2
                return session.redirector.redirect<ResponseEvent>(context.first(), input.status, input.headers.getHeaders());
            }
        }
        return next.handle(input, context);

    }
}


@Injectable()
export class CompressResponseDecordeInterceptor implements Interceptor<ClientIncomingPacket, ResponseEvent, TransportContext> {


    intercept(input: ClientIncomingPacket, next: Handler<ClientIncomingPacket, ResponseEvent, TransportContext>, context: TransportContext): Observable<ResponseEvent> {
        return defer(async () => {
            const response = input;
            const session = context.session as ClientTransportSession;
            const codings = response.headers.getContentEncoding();
            const req = context.first() as AbstractRequest;
            const streamAdapter = session.streamAdapter;
            const rqstatus = req.context.getValueify(RequestStauts, () => new RequestStauts());
            // HTTP-network fetch step 12.1.1.4: handle content codings
            // in following scenarios we ignore compression support
            // 1. compression support is disabled
            // 2. HEAD request
            // 3. no Content-Encoding header
            // 4. no content response (204)
            // 5. content not modified response (304)
            if (rqstatus.compress && req.method !== HEAD && codings) {

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
                    // response.body = body;
                    return response.clone({ body });

                } catch (err) {
                    throw session.responseFactory.create(response.clone({ error: err }).toJson())
                }
            }
            return response;
        }).pipe(
            mergeMap(event => next.handle(event, context))
        )

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
export class ResponseTypeDecodeInterceptor implements Interceptor<ClientIncomingPacket, ResponseEvent, TransportContext> {

    intercept(input: ClientIncomingPacket, next: Handler<ClientIncomingPacket, ResponseEvent, TransportContext>, context: TransportContext): Observable<ResponseEvent> {
        return defer(async () => {
            const session = context.session as ClientTransportSession;

            const req = context.first() as AbstractRequest;
            const eventFactory = session.responseFactory;
            const streamAdapter = session.streamAdapter;
            let responseType = req.responseType;

            const contentType = input.headers.getContentType();
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

            let body, originalBody;
            body = originalBody = input.body;

            if (responseType !== 'stream' && streamAdapter.isReadable(body)) {
                body = await toBuffer(body);
            }

            let error = input.error;
            let ok = input.ok ?? !error;
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
                                    error = { error: err, text: body } as ResponseJsonParseError
                                }
                            }
                        }
                        break;

                    case 'arraybuffer':
                        body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                        break;

                    case 'blob':
                        body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                            type: input.headers.getContentType()
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
            }

            if (ok) {
                return input.clone({ ok, body });
            } else {
                throw eventFactory.create(input.clone({ ok, body, error }).toJson());
            }

        }).pipe(
            mergeMap(res => next.handle(res, context))
        )


    }
}

const jsonType = /json/i;
const textType = /^text/i;
const xmlType = /xml$/i;