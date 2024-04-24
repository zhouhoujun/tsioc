import { Handler, Interceptor } from '@tsdi/core';
import { ArgumentExecption, Injectable, isNil, isNumber } from '@tsdi/ioc';
import { PacketData } from '../../packet';
import { CodingsContext } from '../context';
import { Observable, Subscriber, map, mergeMap, of, range, throwError } from 'rxjs';
import { TransportOpts } from '../../TransportSession';
import { StreamAdapter, isBuffer } from '../../StreamAdapter';
import { IDuplexStream, IReadableStream } from '../../stream';
import { PacketLengthException } from '../../execptions';

interface CachePacket extends PacketData {
    payload: IDuplexStream;
    cacheSize: number;
}

@Injectable()
export class PackageDecodeInterceptor implements Interceptor<Buffer | IReadableStream, PacketData, CodingsContext> {

    packs: Map<string | number, CachePacket> = new Map();
    intercept(input: Buffer, next: Handler<Buffer, PacketData, CodingsContext>, context: CodingsContext): Observable<PacketData> {
        const options = context.options as TransportOpts;
        const idLen = options.idLen ?? 2;
        const id = idLen > 4 ? input.subarray(0, idLen).toString() : input.readIntBE(0, idLen);
        input = input.subarray(idLen);
        context.package = true;
        return next.handle(input, context)
            .pipe(
                mergeMap(packet => {
                    if (!packet.id) {
                        packet.id = id;
                    }
                    return new Observable((subscriber: Subscriber<PacketData>) => {
                        if (!packet.id || !isBuffer(packet.payload)) {
                            subscriber.next(packet);
                            subscriber.complete();
                            return subscriber;
                        }
                        const len = packet.payload.length ?? 0;
                        if ((packet.payloadLength ?? 0) <= len) {
                            subscriber.next(packet);
                            subscriber.complete();
                            return subscriber;
                        }

                        const cached = this.packs.get(packet.id);
                        if (!cached) {
                            if (!packet.payloadLength) {
                                subscriber.error(new PacketLengthException('has not content length!'));
                                return subscriber;
                            }
                            const streamAdapter = context.session!.injector.get(StreamAdapter);
                            const payload = streamAdapter.createPassThrough();
                            payload.write(packet.payload);
                            this.packs.set(packet.id, {
                                ...packet,
                                payload,
                                cacheSize: len
                            } as CachePacket);
                            subscriber.complete();
                        } else {
                            const cLen = cached.payloadLength!;
                            cached.cacheSize += len;
                            cached.payload.write(packet.payload);
                            if (cached.cacheSize >= cLen) {
                                this.packs.delete(cached.id);
                                cached.payload.end();
                                subscriber.next(cached);
                                subscriber.complete();
                            } else {
                                subscriber.complete();
                            }
                        }

                        return subscriber;
                    });

                })
            )
    }
}

@Injectable()
export class PackageEncodeInterceptor implements Interceptor<PacketData, Buffer | IReadableStream, CodingsContext> {

    constructor() { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer, CodingsContext>, context: CodingsContext): Observable<Buffer | IReadableStream> {
        context.package = true;
        return next.handle(input, context)
            .pipe(
                mergeMap(data => {
                    const options = context.options as TransportOpts;
                    const idLen = options.idLen ?? 2;
                    const packetSize = isBuffer(data) ? data.length : ((input.headerLength ?? 0) + (input.payloadLength ?? 0));
                    const sizeLimit = options.maxSize! - (options.delimiter ? Buffer.byteLength(options.delimiter) : 0)
                        - ((options.headDelimiter) ? Buffer.byteLength(options.headDelimiter) : 0)
                        - (input.id ? idLen : 0)
                        - (isNil(input.type) ? 0 : 1); // message type.

                    if (options.maxSize && packetSize > options.maxSize) {
                        const streamAdapter = context.session!.injector.get(StreamAdapter);
                        if (streamAdapter.isReadable(data)) {
                            return new Observable((subsr: Subscriber<Buffer>) => {
                                let size = 0;
                                let buffers: Buffer[] = [];
                                let first = true;

                                streamAdapter.pipeTo(data, streamAdapter.createWritable({
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
                                                subsr.next(this.connectId(input.id, idLen, payload))
                                                size = 0;
                                            } else {
                                                buffers.push(chunk);
                                            }
                                            callback();
                                        } else {
                                            this.subcontract(chunk, maxSize).subscribe({
                                                next: (payload) => {
                                                    subsr.next(this.connectId(input.id, idLen, payload));
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
                            })
                        } else {

                            if (!isBuffer(data)) return throwError(() => new ArgumentExecption('payload has not serializized!'))

                            return this.subcontract(data, sizeLimit).pipe(
                                map(data => this.connectId(input.id, idLen, data))
                            )
                        }
                    }
                    return of(this.connectId(input.id, idLen, data));

                })
            );
    }

    connectId(id: string | number | undefined, idLen: number, payload: Buffer) {
        if (id) {
            if (idLen > 4) {
                payload = Buffer.concat([Buffer.from(id as string), payload]);
            } else if (isNumber(id)) {
                const idBuff = Buffer.alloc(idLen);
                idBuff.writeIntBE(id, 0, idLen);
                payload = Buffer.concat([idBuff, payload]);
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