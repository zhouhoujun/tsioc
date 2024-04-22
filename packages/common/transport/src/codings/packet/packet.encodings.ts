import { Abstract, ArgumentExecption, Injectable, Optional, isPromise, isString } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, Subscriber, from, isObservable, map, mergeMap, range, throwError } from 'rxjs';
import { PacketData, Packet } from '../../packet';
import { StreamAdapter, isBuffer } from '../../StreamAdapter';
import { CodingsContext } from '../context';
import { PacketIdGenerator } from '../../PacketId';
import { TransportOpts } from '../../TransportSession';




@Abstract()
export abstract class HandlerSerialization {
    abstract serialize(packet: Packet): Buffer;
}


@Abstract()
export abstract class PayloadSerialization {
    abstract serialize(packet: Packet): Buffer;
}



@Injectable()
export class SerializeHeaderEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(@Optional() private serialization: HandlerSerialization) { }

    intercept(input: PacketData, next: Handler<PacketData<any>, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (!input.headerBuffer) {
            if (this.serialization) {
                input.headerBuffer = this.serialization.serialize(input);
                input.headerLength = input.headerBuffer.length;
            } else {
                const { id, type, payload, headerBuffer, headerLength, ...headers } = input;
                input.headerBuffer = Buffer.from(JSON.stringify(headers));
                input.headerLength = input.headerBuffer.length;
            }
        }
        return next.handle(input);
    }

}

@Injectable()
export class SerializePayloadEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private serialization: PayloadSerialization
    ) { }

    intercept(input: PacketData, next: Handler<PacketData<any>, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (this.streamAdapter.isReadable(input.payload)) return next.handle(input, context);
        let payload: Buffer;
        if (this.serialization) {
            payload = this.serialization.serialize(input);
        } else {
            if (isBuffer(input.payload)) {
                payload = input.payload;
            } else if (isString(input.payload)) {
                payload = Buffer.from(input.payload);
            } else {
                payload = Buffer.from(JSON.stringify(input.payload))
            }
        }
        input.payloadLength = payload.length;
        input.payload = payload;
        return next.handle(input, context);
    }

}


@Injectable()
export class AysncPacketEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {
    intercept(input: PacketData, next: Handler<any, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (isPromise(input.payload)) {
            return from(input.payload).pipe(mergeMap(v => {
                input.payload = v;
                return next.handle(input);
            }));
        }
        if (isObservable(input.payload)) {
            return input.payload.pipe(mergeMap(v => {
                input.payload = v;
                return next.handle(input, context);
            }));
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class BindPacketIdEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(private idGenerator: PacketIdGenerator) { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (!input.id) {
            input.id = this.idGenerator.getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class LargePayloadEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor() { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: CodingsContext): Observable<Buffer> {
        const options = context.options as TransportOpts;
        const packetSize = (input.payloadLength ?? 0) + (input.headerLength ?? 0);
        const sizeLimit = options.maxSize! - (options.delimiter ? Buffer.byteLength(options.delimiter) : 0)
            - ((options.headDelimiter) ? Buffer.byteLength(options.headDelimiter) : 0)
            - (isString(input.id) ? Buffer.byteLength(input.id) : 2)
            - 1; // message type.

        if (options.maxSize && packetSize > options.maxSize) {
            const streamAdapter = context.session!.injector.get(StreamAdapter);
            if (streamAdapter.isReadable(input.payload)) {
                return new Observable((subsr: Subscriber<PacketData>) => {
                    let size = 0;
                    let buffers: Buffer[] = [];
                    let first = true;

                    streamAdapter.pipeTo(input.payload, streamAdapter.createWritable({
                        write: (chunk: Buffer, encoding, callback) => {
                            let maxSize = sizeLimit;
                            if (chunk.length <= maxSize) {
                                if (first) {
                                    maxSize = maxSize - (input.headerLength ?? 0); // header length
                                }
                                size += chunk.length;
                                if (size >= maxSize) {
                                    first = false;
                                    const idx = chunk.length - (size - maxSize);
                                    buffers.push(chunk.subarray(0, idx))
                                    const sub = chunk.subarray(idx + 1);

                                    const payload = Buffer.concat(buffers);
                                    if (sub.length) {
                                        buffers = [sub];
                                        size = sub.length;
                                    } else {
                                        buffers = [];
                                        size = 0;
                                    }

                                    subsr.next({
                                        ...input,
                                        payload
                                    });
                                    size = 0;
                                } else {
                                    buffers.push(chunk);
                                }
                                callback();
                            } else {
                                this.subPacket(input, chunk, maxSize).subscribe({
                                    next(payload) {
                                        subsr.next({
                                            ...input,
                                            payload
                                        });
                                    },
                                    complete() {
                                        callback()
                                    },
                                    error(err) {
                                        callback(err)
                                    }
                                })
                            }
                        }
                    })).then(() => {
                        subsr.complete();
                    }).catch(err => {
                        subsr.error(err);
                    })
                    return () => subsr.unsubscribe()
                }).pipe(
                    mergeMap(ctx => next.handle(ctx, context))
                )
            } else {

                if (!isBuffer(input.payload)) return throwError(() => new ArgumentExecption('payload has not serializized!'))

                return this.subPacket(input, input.payload, sizeLimit)
                    .pipe(
                        mergeMap(payload => {
                            input.payload = payload;
                            return next.handle(input, context)
                        })
                    )
            }
        }

        return next.handle(input, context);
    }


    subPacket(input: PacketData, chunk: Buffer, maxSize: number): Observable<Buffer> {
        const len = chunk.length + (input.headerLength ?? 0); // header length
        const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

        let first = true;

        return range(1, count)
            .pipe(
                map(i => {
                    const end = i * (first ? maxSize - (input.headerLength ?? 0) : maxSize);
                    if (first) {
                        first = false;
                    }
                    return chunk.subarray(end - maxSize, end > len ? len : end)
                })
            )
    }

}