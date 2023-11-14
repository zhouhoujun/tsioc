import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { OutgoingType, TransportRequest, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, defer, map, mergeMap, of, range } from 'rxjs';
import { EmptyRequestEncoder, RequestBackend, RequestEncodeInterceptor, RequestEncoder, StreamRequestEncoder } from './codings';
import { ClientTransportSession } from './session';



@Injectable()
export class OutgoingPipeEncodeInterceptor implements RequestEncodeInterceptor<TransportRequest, OutgoingType> {

    constructor(
        private empty: EmptyRequestEncoder,
        private stream: StreamRequestEncoder
    ) { }

    intercept(req: TransportRequest, next: RequestEncoder<TransportRequest>): Observable<OutgoingType> {
        const session = req.context.get(ClientTransportSession);
        if (null == req.body) {
            return this.empty.handle(req);
        } else if (session.streamAdapter.isReadable(req.body)) {
            if (!session.existHeader) {
                return defer(async () => {
                    req.body = new TextDecoder().decode(await toBuffer(req.body));
                    return req;
                }).pipe(
                    mergeMap(ctx => next.handle(ctx))
                )
            }
            if (session.options.maxSize) {
                return new Observable(subsr => {
                    session.streamAdapter.pipeTo(req.body, session.streamAdapter.createWritable({
                        write(chunk, encoding, callback) {
                            req.rawBody = chunk;
                            subsr.next(req);
                            callback();
                        }
                    })).then(() => {
                        req.rawBody = null;
                        subsr.complete();
                    }).catch(err => {
                        subsr.error(err);
                    })
                    return () => subsr.unsubscribe()
                }).pipe(
                    mergeMap(chunk => next.handle(req))
                )
            }
            return this.stream.handle(req);
        }

        return next.handle(req);
    }
}

@Injectable()
export class BufferifyRequestEncodeBackend implements RequestBackend<TransportRequest, Buffer> {
    handle(req: TransportRequest): Observable<Buffer> {
        const session = req.context.get(ClientTransportSession);
        if (!session.existHeader) {
            const res = Buffer.from(JSON.stringify({
                id: req.id,
                headers: req.headers.getHeaders(),
                url: req.url,
                payload: req.body
            }));
            return of(res);
        } else {
            let rawBody = req.rawBody;
            if (!rawBody) {
                const body = req.body;
                if (isBuffer(body)) {
                    rawBody = body;
                } else if (isString(body)) {
                    rawBody = Buffer.from(body);
                } else {
                    rawBody = Buffer.from(JSON.stringify(body));
                }
            }

            if (!session.existHeader && session.headerDelimiter) {
                rawBody = Buffer.concat([session.generateHeader(req), session.headerDelimiter, rawBody]);
            }

            return of(rawBody)
        }
    }

}

@Injectable()
export class SubpacketRequestEncodeInterceptor implements RequestEncodeInterceptor<TransportRequest, Buffer>  {

    intercept(req: TransportRequest, next: RequestEncoder<TransportRequest, Buffer>): Observable<Buffer> {

        return next.handle(req)
            .pipe(
                mergeMap(buf => {
                    const session = req.context.get(ClientTransportSession);
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
export class RequestBufferFinalizeEncodeInterceptor implements RequestEncodeInterceptor<TransportRequest, Buffer> {

    intercept(req: TransportRequest, next: RequestEncoder<TransportRequest, Buffer>): Observable<Buffer> {
        return next.handle(req)
            .pipe(
                map(data => {
                    const session = req.context.get(ClientTransportSession);
                    if (!session.delimiter) return data;
                    if (!session.existHeader || !isNumber(req.id)) {
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            session.delimiter,
                            data
                        ])
                    }

                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(req.id);
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