import { ArgumentExecption, EMPTY_OBJ, Injectable, isNil, isPlainObject, lang } from '@tsdi/ioc';
import {
    BufferTransportSession,
    HEAD, IDuplexStream, MessageExecption, PacketBuffer, Redirector, ResponseJsonParseError, ResponsePacket,
    TransportEvent, XSSI_PREFIX, ev, isBuffer, toBuffer
} from '@tsdi/common';
import { Observable, Subscriber, catchError, defer, mergeMap, of, throwError } from 'rxjs';
import {
    PacketDecodeBackend, PacketDecodeInterceptor, PacketDecoder, ResponsePacketContext,
    ResponseBackend, ResponseContext, ResponseDecodeInterceptor, ResponseDecoder
} from './codings';



@Injectable()
export class ObjectPacketDecordeInterceptor<TMsg = any> implements PacketDecodeInterceptor<TMsg> {

    intercept(ctx: ResponsePacketContext<TMsg>, next: PacketDecoder<TMsg>): Observable<ResponsePacket> {
        if (isPlainObject(ctx.msg) && !isNil(ctx.msg.payload)) {
            return of(ctx.msg);
        }
        return next.handle(ctx)
    }
}

@Injectable()
export class StreamPacketDecordeInterceptor<TMsg = any> implements PacketDecodeInterceptor<TMsg> {

    intercept(ctx: ResponsePacketContext<TMsg>, next: PacketDecoder<TMsg>): Observable<ResponsePacket> {
        if (ctx.session.existHeader && ctx.session.streamAdapter.isReadable(ctx.msg)) {
            return of({
                ...ctx.packet,
                payload: ctx.msg
            });
        }
        return next.handle(ctx)
    }

}


@Injectable()
export class BufferPacketDecordeInterceptor<TMsg = any> implements PacketDecodeInterceptor<TMsg> {

    intercept(ctx: ResponsePacketContext<TMsg>, next: PacketDecoder<TMsg>): Observable<ResponsePacket> {
        if (ctx.session.existHeader && isBuffer(ctx.msg)) {
            ctx.raw = ctx.msg;
        }
        return next.handle(ctx)
    }

}


@Injectable({ static: false })
export class UnpackPacketDecordeInterceptor<TMsg = any> implements PacketDecodeInterceptor<TMsg> {

    private packetBuffer?: PacketBuffer;
    intercept(ctx: ResponsePacketContext<TMsg>, next: PacketDecoder<TMsg>): Observable<ResponsePacket> {
        if (!isBuffer(ctx.raw) && !ctx.session.delimiter) return next.handle(ctx)
        if (!this.packetBuffer) {
            this.packetBuffer = new PacketBuffer();
        }
        return this.packetBuffer.concat(ctx.session as BufferTransportSession, ctx.topic ?? '', ctx.raw!)
            .pipe(
                mergeMap(buf => {
                    ctx.raw = buf;
                    return next.handle(ctx);
                })
            );

    }
}



interface ResponseCachePacket extends ResponsePacket {
    length: number;
    cacheSize: number;
}

@Injectable()
export class ConnectPacketDecordeInterceptor<TMsg = any> implements PacketDecodeInterceptor<TMsg> {
    packs: Map<string | number, ResponseCachePacket>;

    constructor() {
        this.packs = new Map();
    }

    intercept(ctx: ResponsePacketContext<TMsg>, next: PacketDecoder<TMsg>): Observable<ResponsePacket> {
        const session = ctx.session;
        if (!ctx.raw || !isBuffer(ctx.raw)) {
            return next.handle(ctx);
        }

        return new Observable((subscriber: Subscriber<ResponsePacket>) => {

            if (!ctx.raw) {
                subscriber.error(new ArgumentExecption('asset decoding input empty'));
                return subscriber;
            }
            if (!isBuffer(ctx.raw)) {
                subscriber.error(new ArgumentExecption('asset decoding input is not buffer'));
                return subscriber;
            }

            let raw = ctx.raw;
            let id: string | number;
            if (ctx.packet?.id) {
                id = ctx.packet.id;
            } else {
                id = raw.readInt16BE(0);
                raw = raw.subarray(2);
            }
            let packet = this.packs.get(id) as ResponseCachePacket;

            if (!packet) {
                if (ctx.packet) {
                    packet = ctx.packet as ResponseCachePacket;
                } else if (session.headDelimiter) {
                    const hidx = raw.indexOf(session.headDelimiter);
                    if (hidx >= 0) {
                        try {
                            packet = session.deserialize(raw.subarray(0, hidx)) as ResponseCachePacket;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        raw = raw.subarray(hidx + 1);
                    }
                } else {
                    packet = session.deserialize(raw) as ResponseCachePacket;
                }

                if (packet) {
                    const len = session.incomingAdapter?.getContentLength(packet) // ~~ (packet.headers?.[hdr.CONTENT_LENGTH] ?? '0');
                    if (!len) {
                        packet.payload = raw;
                        subscriber.next(packet);
                        subscriber.complete();
                    } else {
                        packet.length = len;
                        packet.cacheSize = raw.length;
                        if (packet.cacheSize >= packet.length) {
                            packet.payload = raw;
                            subscriber.next(packet);
                            subscriber.complete();
                        } else {
                            const stream = packet.payload = ctx.session.streamAdapter.createPassThrough();
                            stream.write(raw);
                            this.packs.set(id, packet);
                            subscriber.complete();
                        }
                    }
                } else {
                    subscriber.complete();
                }
            } else {
                packet.cacheSize += raw.length;
                (packet.payload as IDuplexStream).write(raw);
                if (packet.cacheSize >= (packet.length || 0)) {
                    (packet.payload as IDuplexStream).end();
                    this.packs.delete(packet.id);
                    subscriber.next(packet);
                    subscriber.complete();
                } else {
                    subscriber.complete();
                }
            }

            return subscriber;
        })
    }
}


@Injectable()
export class TransportPacketDecordeBackend<TMsg = any> implements PacketDecodeBackend<TMsg> {

    handle(ctx: ResponsePacketContext<TMsg>): Observable<ResponsePacket> {
        if (!ctx.packet) return throwError(() => new MessageExecption('no packet'))

        return of(ctx.packet);
    }

}



@Injectable()
export class CatchErrorResponseDecordeInterceptor<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {

    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {
        return next.handle(ctx)
            .pipe(
                catchError(err => {
                    if (err instanceof Error) {
                        err = ctx.session.eventFactory.createErrorResponse({ url: ctx.req.urlWithParams, error: err })
                    }
                    return throwError(() => err)
                })
            )
    }
}



@Injectable()
export class EmptyResponseDecordeInterceptor<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {
    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {
        if (ctx.packet.status && ctx.session.statusAdapter?.isEmpty(ctx.packet.status)) {
            return of(ctx.session.eventFactory.createResponse({
                ...ctx.packet,
                payload: null
            }) as T);

        }
        return next.handle(ctx);
    }
}

@Injectable()
export class RedirectResponseDecordeInterceptor<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {
    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {
        if (ctx.packet.status && ctx.session.statusAdapter?.isRedirect(ctx.packet.status)) {
            // HTTP fetch step 5.2
            const redirector = ctx.req.context.get(Redirector);
            return redirector.redirect<T>(ctx.req, ctx.packet.status, ctx.packet.headers!);
        }
        return next.handle(ctx);
    }
}

@Injectable()
export class ErrorResponseDecordeInterceptor<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {
    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {
        if (ctx.packet.error) {
            return throwError(() => ctx.session.eventFactory.createErrorResponse(ctx.packet))
        } else if (ctx.packet.status && ctx.session.statusAdapter) {
            ctx.packet.ok = ctx.session.statusAdapter.isOk(ctx.packet.status);
            if (!ctx.packet.ok) {
                return defer(async () => {
                    const packet = ctx.packet;
                    if (!packet.error) {
                        if (ctx.session.streamAdapter.isReadable(packet.payload)) {
                            packet.payload = await toBuffer(packet.payload);
                        }
                        if (isBuffer(packet.payload)) {
                            packet.payload = new TextDecoder().decode(packet.payload);
                        }
                    }
                    throw ctx.session.eventFactory.createErrorResponse({
                        url: packet.url ?? ctx.req.url,
                        error: packet.error ?? packet.payload,
                        status: packet.status,
                        statusText: packet.statusText
                    });
                });
            }
        }
        return next.handle(ctx);
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
export class CompressResponseDecordeInterceptor<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {
    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {

        if (ctx.session.incomingAdapter) {
            const codings = ctx.session.incomingAdapter.getContentEncoding(ctx.packet);
            const req = ctx.req;
            const streamAdapter = ctx.session.streamAdapter;
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
                    let body = ctx.packet.payload;
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
                        ctx.packet.payload = body;

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


@Injectable()
export class TransportResponseDecordeBackend<T extends TransportEvent = TransportEvent> implements ResponseBackend<T> {

    constructor() { }

    handle(ctx: ResponseContext): Observable<T> {
        return defer(async () => {
            const { packet, session } = ctx;
            let responseType = ctx.req.responseType;
            if (session.incomingAdapter && session.mimeAdapter) {
                const contentType = session.incomingAdapter?.getContentType(packet);
                if (contentType) {
                    if (responseType === 'json' && !session.mimeAdapter.isJson(contentType)) {
                        if (session.mimeAdapter.isXml(contentType) || session.mimeAdapter.isText(contentType)) {
                            responseType = 'text';
                        } else {
                            responseType = 'blob';
                        }
                    }
                }
            }
            const streamAdapter = session.streamAdapter;
            if (responseType !== 'stream' && streamAdapter.isReadable(packet.payload)) {
                packet.payload = await toBuffer(packet.payload);
            }
            let body, originalBody;
            body = originalBody = packet.payload;
            let ok = packet.ok ?? !!packet.error;
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
                            packet.error = { error: err, text: body } as ResponseJsonParseError
                        }
                    }
                    break;

                case 'arraybuffer':
                    body = body.subarray(body.byteOffset, body.byteOffset + body.byteLength);
                    break;

                case 'blob':
                    body = new Blob([body.subarray(body.byteOffset, body.byteOffset + body.byteLength)], {
                        type: session.incomingAdapter?.getContentType(packet)
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
            packet.payload = body;

            if (ok) {
                return session.eventFactory.createResponse(packet) as T;
            } else {
                throw session.eventFactory.createErrorResponse(packet);
            }

        })
    }

}
