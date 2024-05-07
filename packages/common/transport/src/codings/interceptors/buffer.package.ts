import { Handler, Interceptor } from '@tsdi/core';
import { ArgumentExecption, Injectable, isNumber } from '@tsdi/ioc';
import { Observable, Subscriber, filter, map, mergeMap, of, range, throwError } from 'rxjs';
import { PacketData } from '../../packet';
import { CodingsContext } from '../context';
import { StreamAdapter, isBuffer } from '../../StreamAdapter';
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
    intercept(input: Buffer | IReadableStream, next: Handler<Buffer | IReadableStream, CachePacket, CodingsContext>, context: CodingsContext): Observable<CachePacket> {
        const options = context.options;
        const idLen = options.idLen ?? 2;
        let id: string | number;
        if (this.streamAdapter.isReadable(input)) {
            let isFist = true;
            return next.handle(this.streamAdapter.pipeline(input, this.streamAdapter.createPassThrough({
                transform: (chunk: Buffer, encoding, callback) => {
                    if (isFist) {
                        isFist = false;
                        id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
                        chunk = chunk.subarray(idLen);
                        callback(null, chunk)
                    } else {
                        callback(null, chunk);
                    }
                }
            })), context)
                .pipe(
                    map(packet => this.mergePacket(packet, id)),
                    filter(p => p.completed == true)
                )
        } else {
            id = idLen > 4 ? input.subarray(0, idLen).toString() : input.readUIntBE(0, idLen);
            input = input.subarray(idLen);
            return next.handle(input, context)
                .pipe(
                    map(packet => this.mergePacket(packet, id)),
                    filter(p => p.completed == true)
                )
        }
    }

    mergePacket(packet: CachePacket, id: string | number) {
        if (!packet.id) {
            packet.id = id;
        }

        if (!packet.id) {
            packet.completed = true;
            return packet;
        }
        const len = packet.streamLength ??  (isBuffer(packet.payload)? Buffer.byteLength(packet.payload) : 0);

        const cached = this.packs.get(packet.id);

        if ((cached?.payloadLength ?? packet.payloadLength ?? 0) <= len) {
            packet.completed = true;
            return packet
        }

        if (!cached) {
            if (!packet.payloadLength) {
                throw new PacketLengthException('has not content length!');
            }
            const payload = this.streamAdapter.createPassThrough();
            if (this.streamAdapter.isReadable(packet.payload)) {
                this.streamAdapter.write(packet.payload, payload);
            } else {
                payload.write(packet.payload);
            }
            this.packs.set(packet.id, {
                ...packet,
                payload,
                cacheSize: len
            } as CachePacket);
            return packet;
        } else {
            const cLen = cached.payloadLength!;
            cached.cacheSize += len;
            if (this.streamAdapter.isReadable(packet.payload)) {
                this.streamAdapter.write(packet.payload, cached.payload);
            } else {
                cached.payload.write(packet.payload);
            }
            if (cached.cacheSize >= cLen) {
                this.packs.delete(cached.id);
                cached.payload.end();
                cached.completed = true;
            }
            return cached;
        }
    }
}

@Injectable()
export class PackageEncodeInterceptor implements Interceptor<PacketData, Buffer | IReadableStream, CodingsContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer | IReadableStream, CodingsContext>, context: CodingsContext): Observable<Buffer | IReadableStream> {
        return next.handle(input, context)
            .pipe(
                mergeMap(data => {
                    const options = context.options;
                    const idLen = options.idLen ?? 2;
                    const packetSize = isBuffer(data) ? Buffer.byteLength(data) : (input.streamLength ?? ((input.headerLength ?? 0) + (input.payloadLength ?? 0)));
                    const sizeLimit = options.maxSize! - (options.delimiter ? Buffer.byteLength(options.delimiter) : 0)
                        - ((options.headDelimiter) ? Buffer.byteLength(options.headDelimiter) : 0)
                        - idLen
                        - ((options.delimiter) ? Buffer.byteLength(options.delimiter) : 0)
                        - (options.countLen ?? 4)
                    // - (isNil(input.type) ? 0 : 1); // message type.


                    if (this.streamAdapter.isReadable(data)) {
                        const delimiter = Buffer.from(options.delimiter!);
                        const countLen = context.options.countLen || 4;
                        if (options.maxSize && packetSize > options.maxSize) {
                            
                            return new Observable((subsr: Subscriber<IReadableStream | Buffer>) => {
                                let size = 0;
                                let stream: IDuplexStream | null;
                                let total = 0;
                                const maxSize = sizeLimit;

                                this.streamAdapter.pipeTo(data, this.streamAdapter.createWritable({
                                    write: (chunk: Buffer, encoding, callback) => {
                                        const chLen = Buffer.byteLength(chunk);
                                        total +=  chLen;
                                        const len = size + chLen;
                                        if (!stream) {
                                            stream = this.streamAdapter.createPassThrough();
                                        }
                                        if (chLen <= maxSize) {
                                            if (len >= maxSize) {
                                                const idx = chLen - (len - maxSize);
                                                const end = chunk.subarray(0, idx);
                                                const sub = chunk.subarray(idx + 1);
                                                stream.end(end);
                                                subsr.next(this.streamConnectId(input, idLen, delimiter, stream, countLen, size + Buffer.byteLength(end)));
                                                if (sub.length) {
                                                    stream = this.streamAdapter.createPassThrough();
                                                    stream.write(sub);
                                                    size = Buffer.byteLength(sub);
                                                } else {
                                                    stream = null;
                                                    size = 0;
                                                }
                                            } else {
                                                size += chLen;
                                                stream.write(chunk);
                                                if (total >= packetSize) {
                                                    stream.end();
                                                    subsr.next(this.streamConnectId(input, idLen, delimiter, stream, countLen, size));
                                                    stream = null;
                                                    size = 0;
                                                }
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
                                });

                                return subsr
                            })

                        } else {
                            return of(this.streamConnectId(input, idLen, delimiter, data, countLen, packetSize));
                        }
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

    streamConnectId(input: PacketData, idLen: number, delimiter: Buffer, stream: IReadableStream, countLen: number, len: number) {
        let isFist = true;
        return this.streamAdapter.pipeline(stream, this.streamAdapter.createPassThrough({
            transform: (chunk, encoding, callback) => {
                if (isFist) {
                    isFist = false;
                    const buffLen = Buffer.alloc(countLen);
                    const idBuff = this.getIdBuffer(input.id, idLen)!;
                    buffLen.writeUIntBE(len + idLen, 0, countLen);
                    callback(null, Buffer.concat([buffLen, delimiter, idBuff, chunk], countLen + Buffer.byteLength(delimiter) + idLen + Buffer.byteLength(chunk)));
                } else {
                    callback(null, chunk);
                }
            }
        }))
    }

    getIdBuffer(id: string | number | undefined, idLen: number) {
        if (idLen > 4) {
            return Buffer.from(id as string);
        } else if (isNumber(id)) {
            const idBuff = Buffer.alloc(idLen);
            idBuff.writeUIntBE(id, 0, idLen);
            return idBuff;
        }
        return null;
    }

    connectId(id: string | number | undefined, idLen: number, payload: Buffer) {
        if (id) {
            const idBuff = this.getIdBuffer(id, idLen)!;
            return Buffer.concat([idBuff, payload], idLen + Buffer.byteLength(payload))
        }
        return payload;
    }


    subcontract(chunk: Buffer, maxSize: number): Observable<Buffer> {
        const len = Buffer.byteLength(chunk);
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