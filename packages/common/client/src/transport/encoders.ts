import { Execption, Injectable, isDefined, isNil, isNumber, isString } from '@tsdi/ioc';
import { BadRequestExecption, HEAD, Packet, RequestPacket, TransportRequest, ctype, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, Subscriber, defer, map, mergeMap, of, range, throwError } from 'rxjs';
import { RequestBackend, RequestContext, RequestEncodeInterceptor, RequestEncoder } from './codings';
import { NumberAllocator } from 'number-allocator';


@Injectable()
export class RequestBufferFinalizeEncodeInterceptor implements RequestEncodeInterceptor<Buffer> {

    intercept(ctx: RequestContext<Buffer>, next: RequestEncoder<Buffer>): Observable<Buffer> {
        return next.handle(ctx)
            .pipe(
                map(data => {
                    const session = ctx.session;
                    if (!session.delimiter) return data;
                    if (!isNumber(ctx.id)) {
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            session.delimiter,
                            data
                        ])
                    }

                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(ctx.id);
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
export class SubpacketRequestEncodeInterceptor implements RequestEncodeInterceptor<Buffer>  {

    intercept(ctx: RequestContext<Buffer>, next: RequestEncoder<Buffer>): Observable<Buffer> {

        return next.handle(ctx)
            .pipe(
                mergeMap(buf => {
                    const session = ctx.session;
                    if (!buf) {
                        buf = Buffer.alloc(0);
                    }
                    if (session.options.maxSize) {
                        let maxSize = session.options.maxSize;
                     
                        maxSize = maxSize - Buffer.byteLength(maxSize.toString()) - (session.delimiter ? Buffer.byteLength(session.delimiter) : 0) - ((session.headDelimiter) ? 2 : 0) // 2 packet id;
                        
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
export class PayloadRequestEncodeInterceptor implements RequestEncodeInterceptor<Buffer> {

    intercept(ctx: RequestContext<Buffer>, next: RequestEncoder<Buffer>): Observable<Buffer> {
        if (ctx.session.headDelimiter) {

            let payload = ctx.msg;
            if (isString(payload)) {
                ctx.msg = Buffer.from(payload);
            } else if (payload && !ctx.session.streamAdapter.isReadable(payload)) {
                payload = Buffer.from(JSON.stringify(payload));
                ctx.session.outgoingAdapter?.setContentType(ctx.req, ctype.APPL_JSON);
                ctx.session.outgoingAdapter?.setContentLength(ctx.req, Buffer.byteLength(payload));

                ctx.msg = payload;
            }
        }
        return next.handle(ctx);
    }
}


@Injectable()
export class OutgoingPipeEncodeInterceptor implements RequestEncodeInterceptor<Buffer> {

    intercept(ctx: RequestContext<Buffer>, next: RequestEncoder<Buffer>): Observable<Buffer> {
        if (ctx.msg) return next.handle(ctx);

        const { session, req } = ctx;
        if (session.streamAdapter.isReadable(req.body)) {
            if (!session.headDelimiter) {
                return defer(async () => {
                    req.body = new TextDecoder().decode(await toBuffer(req.body));
                    return ctx;
                }).pipe(
                    mergeMap(ctx => next.handle(ctx))
                )
            }
            if (session.options.maxSize) {
                return new Observable((subsr: Subscriber<RequestContext<Buffer>>) => {
                    session.streamAdapter.pipeTo(req.body, session.streamAdapter.createWritable({
                        write(chunk, encoding, callback) {
                            // ctx.payload = chunk;
                            subsr.next({
                                ...ctx,
                                msg: chunk
                            });
                            callback();
                        }
                    })).then(() => {
                        // ctx.payload = null;
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
export class RequestBufferPacketEncodeBackend implements RequestBackend<Buffer> {
    handle(ctx: RequestContext): Observable<Buffer> {
        const session = ctx.session;
        if(!ctx.msg) {
            return throwError(()=> new Execption('no message'))
        }

        if (!isBuffer(ctx.msg)) {
            const pkg = session.serialize(ctx.msg);
            return of(pkg);
        } else {
            let rawBody = ctx.msg;

            if (session.headDelimiter) {
                rawBody = Buffer.concat([session.serialize(session.generatePacket(ctx.req, true)), session.headDelimiter, rawBody]);
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
        if (ctx.id) {
            ctx.id = this.getPacketId();
        }
        return next.handle(ctx)
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

// function generatePacket(req: TransportRequest, noPayload?: boolean, topic?: boolean): Packet<any> {
//     const pkg = {
//     } as RequestPacket;
//     if (req.method) {
//         pkg.method = req.method;
//     }
//     if (req.headers.size) {
//         pkg.headers = req.headers.getHeaders()
//     }
//     if (!noPayload && isDefined(req.body)) {
//         pkg.payload = req.body;
//     }
//     if (topic) {
//         pkg.topic = req.url;
//         pkg.originalUrl = req.urlWithParams;
//     } else {
//         pkg.url = req.urlWithParams;
//     }


//     return pkg;
// }

@Injectable()
export class HeadRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestPacket>{
    intercept(ctx: RequestContext, next: RequestEncoder<RequestPacket>): Observable<RequestPacket> {
        if (ctx.req.method === HEAD) {
            // if (!ctx.session.outgoingAdapter?.getContentLength(ctx.req)) {
            //     const length = ctx.length;
            //     if (Number.isInteger(length)) ctx.length = length;
            // }
            ctx.msg = ctx.session.generatePacket(ctx.req, true);
            return of(ctx.msg)
        }
        return next.handle(ctx);
    }
}


@Injectable()
export class NoBodyRequestEncodeInterceptor<TMsg = any> implements RequestEncodeInterceptor<TMsg>{
    intercept(ctx: RequestContext, next: RequestEncoder<TMsg>): Observable<TMsg> {
        if (isNil(ctx.req.body)) {
            ctx.msg = ctx.session.generatePacket(ctx.req, true)
            return of(ctx.msg);
        }
        return next.handle(ctx);
    }
}

@Injectable()
export class TransportRequestEncodeBackend implements RequestBackend<RequestPacket> {
    handle(ctx: RequestContext): Observable<RequestPacket> {
        if (!ctx.msg) {
            ctx.msg = ctx.session.generatePacket(ctx.req, false);
        }
        return of(ctx.msg);
    }

}
