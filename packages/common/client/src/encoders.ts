import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { OutgoingType, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, Subscriber, defer, map, mergeMap, of, range } from 'rxjs';
import { EmptyRequestEncoder, RequestBackend, RequestContext, RequestEncodeInterceptor, RequestEncoder, StreamRequestEncoder } from './codings';
import { ClientTransportSession } from './session';



@Injectable()
export class OutgoingPipeEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, OutgoingType> {

    constructor(
        private empty: EmptyRequestEncoder,
        private stream: StreamRequestEncoder
    ) { }

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext>): Observable<OutgoingType> {

        if (null == ctx.req.body) {
            return this.empty.handle(ctx);
        } else if (ctx.session.streamAdapter.isReadable(ctx.req.body)) {
            if (!ctx.session.existHeader) {
                return defer(async () => {
                    ctx.req.body = new TextDecoder().decode(await toBuffer(ctx.req.body));
                    return ctx;
                }).pipe(
                    mergeMap(ctx => next.handle(ctx))
                )
            }
            if (ctx.session.options.maxSize) {
                return new Observable((subsr: Subscriber<RequestContext>) => {
                    ctx.session.streamAdapter.pipeTo(ctx.req.body, ctx.session.streamAdapter.createWritable({
                        write(chunk, encoding, callback) {
                            ctx.raw = chunk;
                            subsr.next(ctx);
                            // subsr.next({
                            //     ...ctx,
                            //     raw: chunk
                            // });
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
            return this.stream.handle(ctx);
        }

        return next.handle(ctx);
    }
}

@Injectable()
export class BufferifyRequestEncodeBackend implements RequestBackend<RequestContext, Buffer> {
    handle(ctx: RequestContext): Observable<Buffer> {
        const session = ctx.req.context.get(ClientTransportSession);
        if (!session.existHeader) {
            const pkg = Buffer.from(JSON.stringify(session.generatePacket(ctx.req)));
            return of(pkg);
        } else {
            let rawBody = ctx.raw;
            if (!rawBody) {
                const body = ctx.req.body;
                if (isBuffer(body)) {
                    rawBody = body;
                } else if (isString(body)) {
                    rawBody = Buffer.from(body);
                } else {
                    rawBody = Buffer.from(JSON.stringify(body));
                }
            }

            if (!session.existHeader && session.headerDelimiter) {
                rawBody = Buffer.concat([session.serialize(session.generatePacket(ctx.req, true)), session.headerDelimiter, rawBody]);
            }

            return of(rawBody)
        }
    }

}

@Injectable()
export class SubpacketRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, Buffer>  {

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext, Buffer>): Observable<Buffer> {

        return next.handle(ctx)
            .pipe(
                mergeMap(buf => {
                    const session = ctx.req.context.get(ClientTransportSession);
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
export class RequestBufferFinalizeEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, Buffer> {

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext, Buffer>): Observable<Buffer> {
        return next.handle(ctx)
            .pipe(
                map(data => {
                    const session = ctx.session;
                    if (!session.delimiter) return data;
                    if (session.existHeader || !isNumber(ctx.req.id)) {
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            session.delimiter,
                            data
                        ])
                    }

                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(ctx.req.id);
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