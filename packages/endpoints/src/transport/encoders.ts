import { Injectable, isNumber, isPlainObject, isString } from '@tsdi/ioc';
import { HEAD, InternalServerExecption, OutgoingType, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, defer, map, mergeMap, of, range, throwError } from 'rxjs';
import { OutgoingEncodeInterceptor, OutgoingEncoder, OutgoingBackend } from './codings';
import { TransportContext } from '../TransportContext';


export const emptyBody = Buffer.alloc(0);


@Injectable()
export class OutgoingBufferFinalizeEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType> {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext, OutgoingType>): Observable<OutgoingType> {
        return next.handle(ctx)
            .pipe(
                map(data => {
                    if (!data || ctx.streamAdapter.isReadable(data)) {
                        return data;
                    }
                    if (!ctx.session.delimiter) return data;
                    if (ctx.session.existHeader || !isNumber(ctx.response.id)) {
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            ctx.session.delimiter,
                            data
                        ])
                    }

                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(ctx.response.id);
                    return Buffer.concat([
                        Buffer.from(String(data.length + bufId.length)),
                        ctx.session.delimiter,
                        bufId,
                        data
                    ])
                })
            )
    }

}

@Injectable()
export class OutgoingSubpacketBufferEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType>  {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext, Buffer>): Observable<OutgoingType> {

        return next.handle(ctx)
            .pipe(
                mergeMap(buf => {
                    if (!buf || ctx.streamAdapter.isReadable(buf)) {
                        return of(buf);
                    }

                    if (ctx.session.options.maxSize) {
                        let maxSize = ctx.session.options.maxSize;
                        if (!ctx.session.existHeader) {
                            maxSize = maxSize - Buffer.byteLength(maxSize.toString()) - (ctx.session.delimiter ? Buffer.byteLength(ctx.session.delimiter) : 0) - ((ctx.session.existHeader) ? 0 : 2) // 2 packet id;
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
export class EmptyOutgoingEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType>  {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {
        if (ctx.statusAdapter?.isEmpty(ctx.status)) {
            //ignore body
            ctx.body = null;
            return of(null);
        }
        return next.handle(ctx);
    }

}

@Injectable()
export class HeadOutgoingEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType>  {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {
        if (ctx.method === HEAD) {
            if (!ctx.sent && !ctx.outgoingAdapter?.getContentLength(ctx.response)) {
                const length = ctx.length;
                if (Number.isInteger(length)) ctx.length = length;
            }
            if (ctx.session.existHeader) return of(null);
            return of(ctx.session.serialize(ctx.session.generatePacket(ctx, true)))
        }
        return next.handle(ctx);
    }

}


@Injectable()
export class NoBodyOutgoingEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType>  {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {
        if (ctx.body === null) {
            if (ctx.explicitNullBody && ctx.outgoingAdapter) {
                ctx.outgoingAdapter.removeContentType(ctx.response);
                ctx.outgoingAdapter.removeContentLength(ctx.response);
                ctx.outgoingAdapter.removeContentEncoding(ctx.response);
            }

            const body = Buffer.from(ctx.statusMessage ?? String(ctx.status));
            if (!ctx.sent) {
                ctx.type = 'text';
                ctx.length = Buffer.byteLength(body)
            }
            if (ctx.session.existHeader) return of(null);
            return of(ctx.session.serialize(ctx.session.generatePacket(ctx, true)))
        }
        return next.handle(ctx);
    }

}

@Injectable()
export class JsonOutgoingEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType>  {
    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {
        if (!ctx.session.headDelimiter && isPlainObject(ctx.response)) {
            return of(ctx.session.serialize(ctx.session.generatePacket(ctx)));
        }
        return next.handle(ctx);
    }
}

@Injectable()
export class PayloadOutgoingEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType>  {
    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {
        if (ctx.session.headDelimiter || ctx.session.existHeader) {
            let body = ctx.body;
            if (isBuffer(body)) {
                ctx.rawBody = body;
            } else if (isString(body)) {
                ctx.rawBody = Buffer.from(body);
            } else if (body && !ctx.streamAdapter.isReadable(ctx.body)) {
                body = Buffer.from(JSON.stringify(body));
                if (!ctx.sent) {
                    ctx.length = Buffer.byteLength(body)
                }
                ctx.rawBody = body;
            }
        }
        return next.handle(ctx);
    }
}

@Injectable()
export class OutgoingPipeEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType> {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {
        if (ctx.rawBody) return next.handle(ctx);

        if (ctx.streamAdapter.isReadable(ctx.body)) {
            if (!ctx.streamAdapter.isWritable(ctx.response)) {
                return defer(async () => {
                    ctx.body = new TextDecoder().decode(await toBuffer(ctx.body));
                    return ctx;
                }).pipe(
                    mergeMap(ctx => next.handle(ctx))
                )
            }
            if (ctx.session.options.maxSize) {
                return new Observable(subsr => {
                    ctx.streamAdapter.pipeTo(ctx.body, ctx.streamAdapter.createWritable({
                        write(chunk, encoding, callback) {
                            ctx.rawBody = chunk;
                            subsr.next(ctx);
                            callback();
                        }
                    })).then(() => {
                        ctx.rawBody = null;
                        subsr.complete();
                    }).catch(err => {
                        subsr.error(err);
                    })
                    return () => subsr.unsubscribe()
                }).pipe(
                    mergeMap(chunk => next.handle(ctx))
                )
            } else {
                return of(ctx.body)
            }
        }

        return next.handle(ctx);
    }
}





@Injectable()
export class TransportOutgoingEncodeBackend implements OutgoingBackend<TransportContext, Buffer> {

    handle(ctx: TransportContext): Observable<Buffer> {
        if (!ctx.rawBody) return throwError(() => new InternalServerExecption())
        let rawBody = ctx.rawBody;
        if (!ctx.session.existHeader && ctx.session.headDelimiter && !ctx.sent) {
            rawBody = Buffer.concat([ctx.session.serialize(ctx.session.generatePacket(ctx, true)), ctx.session.headDelimiter, rawBody]);
        }
        return of(rawBody)

    }
}
