import { Handler, Interceptor } from '@tsdi/core';
import { ArgumentExecption, Injectable, isNil, isNumber } from '@tsdi/ioc';
import { Observable, Subscriber, defer, filter, map, mergeMap, of, range, throwError } from 'rxjs';
import { PacketData } from '../../packet';
import { CodingsContext } from '../context';
import { StreamAdapter, isBuffer, toBuffer } from '../../StreamAdapter';
import { IDuplexStream, IReadableStream } from '../../stream';
import { PacketLengthException } from '../../execptions';

interface CachePacket extends PacketData {
    payload: IDuplexStream;
    cacheSize: number;
    completed?: boolean;
}

@Injectable()
export class PackageDecodeInterceptor implements Interceptor<Buffer | IReadableStream, PacketData, CodingsContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    packs: Map<string | number, CachePacket> = new Map();
    intercept(input: Buffer, next: Handler<Buffer, CachePacket, CodingsContext>, context: CodingsContext): Observable<CachePacket> {
        const options = context.options;
        const idLen = options.idLen ?? 2;
        const id = idLen > 4 ? input.subarray(0, idLen).toString() : input.readIntBE(0, idLen);
        input = input.subarray(idLen);
        return next.handle(input, context)
            .pipe(
                map(packet => {
                    if (!packet.id) {
                        packet.id = id;
                    }

                    if (!packet.id || !isBuffer(packet.payload)) {
                        packet.completed = true;
                        return packet;
                    }
                    const len = packet.payload.length ?? 0;
                    if ((packet.payloadLength ?? 0) <= len) {
                        packet.completed = true;
                        return packet
                    }

                    const cached = this.packs.get(packet.id);
                    if (!cached) {
                        if (!packet.payloadLength) {
                            throw new PacketLengthException('has not content length!');
                        }
                        const payload = this.streamAdapter.createPassThrough();
                        payload.write(packet.payload);
                        this.packs.set(packet.id, {
                            ...packet,
                            payload,
                            cacheSize: len
                        } as CachePacket);
                        return packet;
                    } else {
                        const cLen = cached.payloadLength!;
                        cached.cacheSize += len;
                        cached.payload.write(packet.payload);
                        if (cached.cacheSize >= cLen) {
                            this.packs.delete(cached.id);
                            cached.payload.end();
                            cached.completed = true;
                        }
                        return cached;
                    }

                }),
                filter(p => p.completed == true)
            )
    }
}

@Injectable()
export class PackageEncodeInterceptor implements Interceptor<PacketData, Buffer | IReadableStream, CodingsContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer, CodingsContext>, context: CodingsContext): Observable<Buffer | IReadableStream> {
        return next.handle(input, context)
            .pipe(
                mergeMap(data => {
                    const options = context.options;
                    const idLen = options.idLen ?? 2;
                    const packetSize = isBuffer(data) ? data.length : ((input.headerLength ?? 0) + (input.payloadLength ?? 0));
                    const sizeLimit = options.maxSize! - (options.delimiter ? Buffer.byteLength(options.delimiter) : 0)
                        - ((options.headDelimiter) ? Buffer.byteLength(options.headDelimiter) : 0)
                        - (input.id ? idLen : 0)
                    // - (isNil(input.type) ? 0 : 1); // message type.


                    if (this.streamAdapter.isReadable(data)) {
                        let stream: IDuplexStream;
                        if (options.maxSize && packetSize > options.maxSize) {
                            let size = 0;
                            let buffers: Buffer[] = [];
                            let first = true;
                            stream = this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
                                transform: (chunk, encoding, callback) => {
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

                                            const payload = Buffer.concat(buffers, size);
                                            if (sub.length) {
                                                buffers = [sub];
                                                size = sub.length;
                                            } else {
                                                buffers = [];
                                                size = 0;
                                            }
                                            callback(null, this.connectId(input.id, idLen, payload))
                                            size = 0;
                                        } else {
                                            buffers.push(chunk);
                                        }
                                    }
                                }
                            }));

                            // return new Observable((subsr: Subscriber<Buffer>) => {
                            //     let size = 0;
                            //     let buffers: Buffer[] = [];
                            //     let first = true;



                            //     this.streamAdapter.pipeTo(data, this.streamAdapter.createWritable({
                            //         write: (chunk: Buffer, encoding, callback) => {
                            //             let maxSize = sizeLimit;
                            //             if (chunk.length <= maxSize) {
                            //                 if (first) {
                            //                     maxSize = maxSize - (input.headerLength ?? 0); // header length
                            //                 }
                            //                 size += chunk.length;
                            //                 if (size >= maxSize) {
                            //                     first = false;
                            //                     const idx = chunk.length - (size - maxSize);
                            //                     buffers.push(chunk.subarray(0, idx))
                            //                     const sub = chunk.subarray(idx + 1);

                            //                     const payload = Buffer.concat(buffers, size);
                            //                     if (sub.length) {
                            //                         buffers = [sub];
                            //                         size = sub.length;
                            //                     } else {
                            //                         buffers = [];
                            //                         size = 0;
                            //                     }
                            //                     subsr.next(this.connectId(input.id, idLen, payload))
                            //                     size = 0;
                            //                 } else {
                            //                     buffers.push(chunk);
                            //                 }
                            //                 callback();
                            //             } else {
                            //                 this.subcontract(chunk, maxSize).subscribe({
                            //                     next: (payload) => {
                            //                         subsr.next(this.connectId(input.id, idLen, payload));
                            //                     },
                            //                     complete() {
                            //                         callback()
                            //                     },
                            //                     error(err) {
                            //                         callback(err)
                            //                     }
                            //                 })
                            //             }
                            //         }
                            //     })).then(() => {
                            //         subsr.complete();
                            //     }).catch(err => {
                            //         subsr.error(err);
                            //     })
                            //     return () => subsr.unsubscribe()
                            // })
                        } else {
                            // return defer(async () => this.connectId(input.id, idLen, await toBuffer(data)));
                            let isFist = true;
                            input.streamLength = (input.streamLength ?? 0) + idLen;
                            stream = this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
                                transform: (chunk, encoding, callback) => {
                                    if (isFist) {
                                        isFist = false;
                                        callback(null, this.connectId(input.id, idLen, chunk));
                                    } else {
                                        callback(null, chunk);
                                    }
                                }
                            }))
                        }
                        return of(stream);
                    } else {

                        if (!isBuffer(data)) return throwError(() => new ArgumentExecption('payload has not serializized!'))

                        if (options.maxSize && packetSize > options.maxSize) {

                            return this.subcontract(data, sizeLimit).pipe(
                                map(data => this.connectId(input.id, idLen, data))
                            )
                        } else {
                            return of(this.connectId(input.id, idLen, data));
                        }
                    }
                })
            );
    }


    connectId(id: string | number | undefined, idLen: number, payload: Buffer) {
        if (id) {
            if (idLen > 4) {
                const idBuff = Buffer.from(id as string);
                payload = Buffer.concat([Buffer.from(id as string), payload], idBuff.length + payload.length);
            } else if (isNumber(id)) {
                const idBuff = Buffer.alloc(idLen);
                idBuff.writeIntBE(id, 0, idLen);
                payload = Buffer.concat([idBuff, payload], idBuff.length + payload.length);
            }
        }
        return payload;
    }


    subcontract(chunk: Buffer, maxSize: number): Observable<Buffer> {
        const len = chunk.length
        const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

        return range(1, count)
            .pipe(
                map(i => {
                    const end = i * maxSize;
                    return chunk.subarray(end - maxSize, end > len ? len : end)
                })
            )
    }

}