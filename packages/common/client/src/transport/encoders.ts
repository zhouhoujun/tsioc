import { Execption, Injectable, isDefined, isNil, isNumber, isString } from '@tsdi/ioc';
import { BadRequestExecption, HEAD, Packet, RequestPacket, TransportRequest, ctype, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, Subscriber, defer, map, mergeMap, of, range, throwError } from 'rxjs';
import { RequestPacketEncodeBackend, RequestPacketEncodeInterceptor, RequestPacketEncoder, RequestBackend, RequestContext, RequestEncodeInterceptor, RequestEncoder, RequestPacketContext } from './codings';
import { NumberAllocator } from 'number-allocator';


@Injectable()
export class RequestBufferFinalizeEncodeInterceptor implements RequestPacketEncodeInterceptor<Buffer> {

    intercept(ctx: RequestPacketContext<Buffer>, next: RequestPacketEncoder<Buffer>): Observable<Buffer> {
        return next.handle(ctx)
            .pipe(
                map(data => {
                    const session = ctx.session;
                    if (!session.delimiter) return data;
                    if (session.existHeader || !isNumber(ctx.request.id)) {
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            session.delimiter,
                            data
                        ])
                    }

                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(ctx.request.id);
                    return Buffer.concat([
                        Buffer.from(String(data.length + bufId.length)),
                        session.delimiter,
                        bufId,
                        data
                    ])
                })
            )
    }

}


@Injectable()
export class SubpacketRequestEncodeInterceptor implements RequestPacketEncodeInterceptor<Buffer>  {

    intercept(ctx: RequestPacketContext<Buffer>, next: RequestPacketEncoder<Buffer>): Observable<Buffer> {

        return next.handle(ctx)
            .pipe(
                mergeMap(buf => {
                    const session = ctx.session;
                    if (!buf) {
                        buf = Buffer.alloc(0);
                    }
                    if (session.options.maxSize) {
                        let maxSize = session.options.maxSize;
                        if (!session.existHeader) {
                            maxSize = maxSize - Buffer.byteLength(maxSize.toString()) - (session.delimiter ? Buffer.byteLength(session.delimiter) : 0) - ((session.existHeader) ? 0 : 2) // 2 packet id;
                        }
                        if (buf.length <= maxSize) {
                            return of(buf);
                        } else {

                            const len = buf.length;
                            const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

                            return range(1, count)
                                .pipe(
                                    map(i => {
                                        const end = i * maxSize;
                                        return buf.subarray(end - maxSize, end > len ? len : end)
                                    })
                                )
                        }

                    } else {
                        return of(buf);
                    }
                })
            )

    }

}


@Injectable()
export class PayloadRequestEncodeInterceptor implements RequestPacketEncodeInterceptor<Buffer> {

    intercept(ctx: RequestPacketContext<Buffer>, next: RequestPacketEncoder<Buffer>): Observable<Buffer> {
        if (ctx.session.headDelimiter || ctx.session.existHeader) {

            let payload = ctx.request.payload;
            if (isBuffer(payload)) {
                ctx.raw = payload;
            } else if (isString(payload)) {
                ctx.raw = Buffer.from(payload);
            } else if (payload && !ctx.session.streamAdapter.isReadable(payload)) {
                payload = Buffer.from(JSON.stringify(payload));
                ctx.session.outgoingAdapter?.setContentType(ctx.req, ctype.APPL_JSON);
                ctx.session.outgoingAdapter?.setContentLength(ctx.req, Buffer.byteLength(payload));

                ctx.raw = payload;
            }
        }
        return next.handle(ctx);
    }
}


@Injectable()
export class OutgoingPipeEncodeInterceptor implements RequestPacketEncodeInterceptor<Buffer> {

    intercept(ctx: RequestPacketContext<Buffer>, next: RequestPacketEncoder<Buffer>): Observable<Buffer> {
        if (ctx.raw) return next.handle(ctx);

        const { session, req } = ctx;
        if (session.streamAdapter.isReadable(req.body)) {
            if (!session.existHeader) {
                return defer(async () => {
                    req.body = new TextDecoder().decode(await toBuffer(req.body));
                    return ctx;
                }).pipe(
                    mergeMap(ctx => next.handle(ctx))
                )
            }
            if (session.options.maxSize) {
                return new Observable((subsr: Subscriber<RequestPacketContext<Buffer>>) => {
                    session.streamAdapter.pipeTo(req.body, session.streamAdapter.createWritable({
                        write(chunk, encoding, callback) {
                            ctx.raw = chunk;
                            subsr.next(ctx);
                            callback();
                        }
                    })).then(() => {
                        ctx.raw = null;
                        subsr.complete();
                    }).catch(err => {
                        subsr.error(err);
                    })
                    return () => subsr.unsubscribe()
                }).pipe(
                    mergeMap(ctx => next.handle(ctx))
                )
            }
        }

        return next.handle(ctx);
    }
}



@Injectable()
export class RequestBufferPacketEncodeBackend implements RequestPacketEncodeBackend<Buffer> {
    handle(ctx: RequestPacketContext<Buffer>): Observable<Buffer> {
        const session = ctx.session;
        if (!session.existHeader) {
            const pkg = Buffer.from(session.serialize(ctx.request));
            return of(pkg);
        } else {
            let rawBody = ctx.raw;

            if (!rawBody) return throwError(() => new BadRequestExecption())

            if (!session.existHeader && session.headDelimiter) {
                rawBody = Buffer.concat([session.serialize(generatePacket(ctx.req, true, session.topic)), session.headDelimiter, rawBody]);
            }

            return of(rawBody)
        }
    }

}






@Injectable()
export class BindPacketIdEncodeInterceptor implements RequestEncodeInterceptor<RequestPacket> {

    private allocator?: NumberAllocator;
    private last?: number;

    intercept(ctx: RequestContext, next: RequestEncoder<RequestPacket<any>>): Observable<RequestPacket<any>> {
        return next.handle(ctx)
            .pipe(
                map(pkg => {
                    if (pkg.id) {
                        pkg.id = this.getPacketId();
                    }
                    return pkg;
                })
            )
    }

    protected getPacketId(): string | number {
        if (!this.allocator) {
            this.allocator = new NumberAllocator(1, 65536)
        }
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

}

function generatePacket(req: TransportRequest, noPayload?: boolean, topic?: boolean): Packet<any> {
    const pkg = {
    } as RequestPacket;
    if (req.method) {
        pkg.method = req.method;
    }
    if (req.headers.size) {
        pkg.headers = req.headers.getHeaders()
    }
    if (!noPayload && isDefined(req.body)) {
        pkg.payload = req.body;
    }
    if (topic) {
        pkg.topic = req.url;
        pkg.originalUrl = req.urlWithParams;
    } else {
        pkg.url = req.urlWithParams;
    }


    return pkg;
}

@Injectable()
export class HeadRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestPacket>{
    intercept(ctx: RequestContext, next: RequestEncoder<RequestPacket>): Observable<RequestPacket> {
        if (ctx.req.method === HEAD) {
            // if (!ctx.session.outgoingAdapter?.getContentLength(ctx.req)) {
            //     const length = ctx.length;
            //     if (Number.isInteger(length)) ctx.length = length;
            // }
            ctx.request = generatePacket(ctx.req, true, ctx.session.topic);
            return of(ctx.request)
        }
        return next.handle(ctx);
    }
}


@Injectable()
export class NoBodyRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestPacket>{
    intercept(ctx: RequestContext, next: RequestEncoder<RequestPacket>): Observable<RequestPacket> {
        if (isNil(ctx.req.body)) {
            ctx.request = generatePacket(ctx.req, true, ctx.session.topic)
            return of(ctx.request);
        }
        return next.handle(ctx);
    }
}

@Injectable()
export class TransportRequestEncodeBackend implements RequestBackend<RequestPacket> {
    handle(ctx: RequestContext): Observable<RequestPacket> {
        if (!ctx.request) {
            ctx.request = generatePacket(ctx.req, false, ctx.session.topic);
        }
        return of(ctx.request);
    }

}
