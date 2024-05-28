import { ArgumentExecption, Injectable, isNumber } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap, of, range, throwError } from 'rxjs';
import { TransportContext } from '../context';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { IDuplexStream, IReadableStream } from '../stream';
import { PacketLengthException } from '../execptions';
import { Packet } from '@tsdi/common';

interface CachePacket {
    payload: IDuplexStream;
    packet: Packet<any>;
    streams?: IReadableStream[] | null;
    cacheSize: number;
    completed?: boolean;
}

@Injectable()
export class PackageDecodeInterceptor implements Interceptor<Packet<Buffer | IReadableStream>, Packet, TransportContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    packs: Map<string | number, CachePacket> = new Map();
    intercept(input: Packet<Buffer | IReadableStream>, next: Handler<Packet<Buffer | IReadableStream>, Packet, TransportContext>, context: TransportContext): Observable<Packet> {
        const options = context.options;
        const idLen = options.idLen ?? 2;
        let id: string | number;
        if (this.streamAdapter.isReadable(input.payload)) {
            const chunk = input.payload.read(idLen);
            id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
            const exist = this.packs.get(id);
            input.headers = exist?.packet.headers;
            if (input.payload?.length) {
                input.payload.length -= idLen;
            }
        } else if(input.payload) {
            id = idLen > 4 ? input.payload.subarray(0, idLen).toString() : input.payload.readUIntBE(0, idLen);
            input.payload = input.payload.subarray(idLen);
        }
        return next.handle(input, context)
            .pipe(
                map(packet => this.mergePacket(packet, id)),
                filter(p => p.completed == true)
            )
    }

    mergePacket(packet: Packet, id: string | number): Packet {
        if (!packet.id) {
            packet.id = id;
        }

        if (!packet.id || !(isBuffer(packet.payload) || this.streamAdapter.isReadable(packet.payload))) {
            packet.completed = true;
            return packet;
        }
        const len = isBuffer(packet.payload) ? Buffer.byteLength(packet.payload) : packet.payload?.length ?? 0;

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

            const cached = {
                ...packet,
                payload,
                cacheSize: len
            } as CachePacket;
            if (this.streamAdapter.isReadable(packet.payload)) {
                cached.streams = [packet.payload];
            } else {
                payload.write(packet.payload);
            }
            this.packs.set(packet.id, cached);
            return cached;
        } else {
            const cLen = cached.payloadLength!;
            cached.cacheSize += len;
            if (this.streamAdapter.isReadable(packet.payload)) {
                if (cached.streams) {
                    cached.streams.push(packet.payload);
                } else {
                    cached.streams = [packet.payload];
                }
            } else {
                cached.payload.write(packet.payload);
            }
            if (cached.cacheSize >= cLen) {
                this.packs.delete(cached.id);
                if (cached.streams) {
                    this.streamAdapter.merge(cached.payload, cached.streams);
                    cached.streams = null;
                } else {
                    cached.payload.end();
                }
                cached.completed = true;
            }
            return cached;
        }
    }
}

@Injectable()
export class PackageEncodeInterceptor implements Interceptor<Packet, Buffer | IReadableStream, TransportContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: Packet, next: Handler<Packet, Buffer | IReadableStream, TransportContext>, context: TransportContext): Observable<Buffer | IReadableStream> {
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

                                const writeBuffer = (chunk: Buffer, chLen: number) => {
                                    if (!stream) {
                                        stream = this.streamAdapter.createPassThrough();
                                    }
                                    total += chLen;
                                    const len = size + chLen;
                                    if (len >= maxSize) {
                                        const idx = chLen - (len - maxSize);
                                        const end = chunk.subarray(0, idx);
                                        const sub = chunk.subarray(idx);
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
                                    }

                                    if (total >= packetSize && stream) {
                                        stream.end();
                                        subsr.next(this.streamConnectId(input, idLen, delimiter, stream, countLen, size));
                                        stream = null;
                                        size = 0;
                                    }
                                };

                                this.streamAdapter.pipeTo(data, this.streamAdapter.createWritable({
                                    write: (chunk: Buffer, encoding, callback) => {
                                        const chLen = Buffer.byteLength(chunk);
                                        if (chLen <= maxSize) {
                                            writeBuffer(chunk, chLen);
                                            callback();
                                        } else {
                                            // const count = (chLen % maxSize === 0) ? (chLen / maxSize) : (Math.floor(chLen / maxSize) + 1);
                                            // for (let i = 1; i <= count; i++) {
                                            //     const end = i * maxSize;
                                            //     const sub = chunk.subarray(end - maxSize, end >= chLen ? chLen : end);
                                            //     writeBuffer(sub, Buffer.byteLength(sub))
                                            // }
                                            // callback();

                                            this.subcontract(chunk, chLen, maxSize).subscribe({
                                                next: (payload) => {
                                                    writeBuffer(payload, Buffer.byteLength(payload))
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
                            return this.subcontract(data, packetSize, sizeLimit).pipe(
                                map(data => this.connectId(input.id, idLen, data))
                            )
                        } else {
                            return of(this.connectId(input.id, idLen, data));
                        }
                    }
                })
            );
    }

    streamConnectId(input: Packet, idLen: number, delimiter: Buffer, stream: IReadableStream, countLen: number, len: number) {
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


    subcontract(chunk: Buffer, len: number, maxSize: number): Observable<Buffer> {
        // const len = Buffer.byteLength(chunk);
        const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

        return range(1, count)
            .pipe(
                map(i => {
                    const end = i * maxSize;
                    return chunk.subarray(end - maxSize, end >= len ? len : end)
                })
            )
    }

}