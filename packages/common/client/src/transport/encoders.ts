import { Injectable, isNil, isNumber, isString } from '@tsdi/ioc';
import { BadRequestExecption, HEAD, OutgoingType, ctype, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, Subscriber, defer, map, mergeMap, of, range, throwError } from 'rxjs';
import { RequestBackend, RequestContext, RequestEncodeInterceptor, RequestEncoder } from './codings';



@Injectable()
export class RequestBufferFinalizeEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, OutgoingType> {

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext, OutgoingType>): Observable<OutgoingType> {
        return next.handle(ctx)
            .pipe(
                map(data => {
                    const session = ctx.session;
                    if (!data || session.streamAdapter.isReadable(data)) {
                        return data;
                    }
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


@Injectable()
export class SubpacketRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, Buffer>  {

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext, Buffer>): Observable<Buffer> {

        return next.handle(ctx)
            .pipe(
                mergeMap(buf => {
                    if (!buf || ctx.session.streamAdapter.isReadable(buf)) {
                        return of(buf);
                    }
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
export class HeadRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, OutgoingType>{
    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext>): Observable<OutgoingType> {
        if (ctx.req.method === HEAD) {
            // if (!ctx.session.outgoingAdapter?.getContentLength(ctx.req)) {
            //     const length = ctx.length;
            //     if (Number.isInteger(length)) ctx.length = length;
            // }
            if (ctx.session.existHeader) return of(null);
            return of(ctx.session.serialize(ctx.session.generatePacket(ctx.req, true)))
        }
        return next.handle(ctx);
    }

}

@Injectable()
export class NoBodyRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, OutgoingType>{
    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext>): Observable<OutgoingType> {
        if (isNil(ctx.req.body)) {
            if (ctx.session.existHeader) return of(null);
            const buff = ctx.session.serialize(ctx.session.generatePacket(ctx.req, true));
            return of(buff);
        }
        return next.handle(ctx);
    }
}

@Injectable()
export class PayloadRequestEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, OutgoingType> {

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext>): Observable<OutgoingType> {
        if (ctx.session.headDelimiter || ctx.session.existHeader) {
            let body = ctx.req.body;
            if (isBuffer(body)) {
                ctx.raw = body;
            } else if (isString(body)) {
                ctx.raw = Buffer.from(body);
            } else if (body && !ctx.session.streamAdapter.isReadable(body)) {
                body = Buffer.from(JSON.stringify(body));
                ctx.session.outgoingAdapter?.setContentType(ctx.req, ctype.APPL_JSON);
                ctx.session.outgoingAdapter?.setContentLength(ctx.req, Buffer.byteLength(body));

                ctx.raw = body;
            }
        }
        return next.handle(ctx);
    }
}


@Injectable()
export class OutgoingPipeEncodeInterceptor implements RequestEncodeInterceptor<RequestContext, OutgoingType> {

    intercept(ctx: RequestContext, next: RequestEncoder<RequestContext>): Observable<OutgoingType> {
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
                return new Observable((subsr: Subscriber<RequestContext>) => {
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
export class TransportRequestEncodeBackend implements RequestBackend<RequestContext, Buffer> {
    handle(ctx: RequestContext): Observable<Buffer> {
        const session = ctx.session;
        if (!session.existHeader) {
            const pkg = Buffer.from(JSON.stringify(session.generatePacket(ctx.req)));
            return of(pkg);
        } else {
            let rawBody = ctx.raw;

            if (!rawBody) return throwError(() => new BadRequestExecption())
            // if (!rawBody) {
            //     const body = ctx.req.body;
            //     if (isBuffer(body)) {
            //         rawBody = body;
            //     } else if (isString(body)) {
            //         rawBody = Buffer.from(body);
            //     } else {
            //         rawBody = Buffer.from(JSON.stringify(body));
            //     }
            // }

            if (!session.existHeader && session.headDelimiter) {
                rawBody = Buffer.concat([session.serialize(session.generatePacket(ctx.req, true)), session.headDelimiter, rawBody]);
            }

            return of(rawBody)
        }
    }

}
