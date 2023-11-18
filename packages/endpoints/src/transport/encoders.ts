import { Injectable, isNumber, isPlainObject, isString } from '@tsdi/ioc';
import { OutgoingType, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, defer, map, mergeMap, of, range } from 'rxjs';
import { EmptyOutgoingEncoder, OutgoingEncodeInterceptor, OutgoingEncoder, OutgoingBackend, StreamOutgoingEncoder } from './codings';
import { TransportContext } from '../TransportContext';
import { AssetContext } from '../AssetContext';


@Injectable()
export class OutgoingPipeEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType> {

    constructor(
        private empty: EmptyOutgoingEncoder,
        private stream: StreamOutgoingEncoder
    ) { }

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {

        if (null == ctx.body || (ctx instanceof AssetContext && ctx.isEmpty())) {
            return this.empty.handle(ctx);
        } else if (ctx.streamAdapter.isReadable(ctx.body)) {
            if (isPlainObject(ctx.response)) {
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
            }
            return this.stream.handle(ctx);
        }

        return next.handle(ctx);
    }
}



@Injectable()
export class BufferifyOutgoingEncodeBackend implements OutgoingBackend<TransportContext, Buffer> {

    handle(ctx: TransportContext): Observable<Buffer> {
        if (isPlainObject(ctx.response)) {
            const res = Buffer.from(JSON.stringify(ctx.response));
            return of(res);
        } else {
            let rawBody = ctx.rawBody;
            if (!rawBody) {
                const body = ctx.body;
                if (isBuffer(body)) {
                    rawBody = body;
                } else if (isString(body)) {
                    rawBody = Buffer.from(body);
                } else {
                    rawBody = Buffer.from(JSON.stringify(body));
                    if (!ctx.sent) {
                        ctx.length = Buffer.byteLength(body)
                    }
                }
            }

            if (!ctx.session.existHeader && ctx.session.headerDelimiter && !ctx.sent) {
                rawBody = Buffer.concat([ctx.session.generateHeader(ctx), ctx.session.headerDelimiter, rawBody]);
            }

            return of(rawBody)
        }
    }
}


@Injectable()
export class OutgoingSubpacketBufferEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, Buffer>  {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext, Buffer>): Observable<Buffer> {

        return next.handle(ctx)
            .pipe(
                mergeMap(buf => {
                    if (!buf) {
                        buf = Buffer.alloc(0);
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
export class OutgoingBufferFinalizeEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, Buffer> {

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext, Buffer>): Observable<Buffer> {
        return next.handle(ctx)
            .pipe(
                map(data => {
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
