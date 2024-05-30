import { ArgumentExecption, Injectable, isNumber } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap, of, range, throwError } from 'rxjs';
import { TransportContext } from '../context';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { IDuplexStream, IReadableStream } from '../stream';
import { PacketLengthException } from '../execptions';
import { Packet } from '@tsdi/common';

interface CachePacket {
    // payload: IDuplexStream;
    packet: Packet<IDuplexStream>;
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
            exist && input.headers.setHeader('payload-only', id);
            input.attachId(id);
            // input.headers = exist?.packet.headers;
            if (input.headers.has('stream-length')) {
                input.headers.set('stream-length', input.headers.getHeader<number>('stream-length') - idLen);
            }
        } else if (input.payload) {
            id = idLen > 4 ? input.payload.subarray(0, idLen).toString() : input.payload.readUIntBE(0, idLen);
            input.attachId(id);
            const payload = input.payload.subarray(idLen);
            input = input.clone({ payload })
        }
        return next.handle(input, context)
            .pipe(
                map(packet => this.mergePacket(packet)),
                filter(p => p.completed == true),
                map(p => p.packet)
            )
    }

    mergePacket(packet: Packet): CachePacket {

        if (!packet.id || !(isBuffer(packet.payload) || this.streamAdapter.isReadable(packet.payload)) || packet.headers.getContentLength() <= 0) {
            return { packet, completed: true } as CachePacket;
        }
        const len = isBuffer(packet.payload) ? Buffer.byteLength(packet.payload) : packet.headers.getHeader<number>('stream-length');

        if (packet.headers.getContentLength() <= len) {
            return { packet, completed: true } as CachePacket;
        }

        const cached = this.packs.get(packet.id);

        if (!cached) {
            if (!packet.headers.getContentLength()) {
                throw new PacketLengthException('has not content length!');
            }
            const payload = packet.payload;
            packet = packet.clone({ payload: this.streamAdapter.createPassThrough() });

            const cached = {
                packet,
                cacheSize: len
            } as CachePacket;
            if (this.streamAdapter.isReadable(payload)) {
                cached.streams = [payload];
            } else {
                packet.payload.write(payload);
            }
            this.packs.set(packet.id!, cached);
            return cached;
        } else {
            const cLen = cached.packet.headers.getContentLength(); //cached.payloadLength!;
            cached.cacheSize += len;
            if(packet.headers.size){
                cached.packet.headers.setHeaders(packet.headers.getHeaders())
            }

            if (this.streamAdapter.isReadable(packet.payload)) {
                if (cached.streams) {
                    cached.streams.push(packet.payload);
                } else {
                    cached.streams = [packet.payload];
                }
            } else {
                cached.packet.payload!.write(packet.payload);
            }
            if (cached.cacheSize >= cLen) {
                this.packs.delete(packet.id);
                if (cached.streams) {
                    this.streamAdapter.merge(cached.packet.payload!, cached.streams);
                    cached.streams = null;
                } else {
                    cached.packet.payload!.end();
                }
                cached.completed = true;
            }
            return cached;
        }
    }
}

@Injectable()
export class PackageEncodeInterceptor implements Interceptor<Packet, Packet<Buffer | IReadableStream>, TransportContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: Packet, next: Handler<Packet, Packet<Buffer | IReadableStream>, TransportContext>, context: TransportContext): Observable<Packet<Buffer | IReadableStream>> {
        return next.handle(input, context)
            .pipe(
                mergeMap(pkg => {
                    const options = context.options;
                    const idLen = options.idLen ?? 2;
                    const data = pkg.payload
                    const packetSize = isBuffer(data) ? Buffer.byteLength(data) : (pkg.headers.getHeader<number>('stream-length') ?? ((pkg.headers.getHeader<number>('header-length') ?? 0) + pkg.headers.getContentLength()));
                    const sizeLimit = options.maxSize! - (options.delimiter ? Buffer.byteLength(options.delimiter) : 0)
                        - ((options.headDelimiter) ? Buffer.byteLength(options.headDelimiter) : 0)
                        - idLen
                        - ((options.delimiter) ? Buffer.byteLength(options.delimiter) : 0)
                        - (options.countLen ?? 4)
                    // - (isNil(pkg.type) ? 0 : 1); // message type.


                    if (this.streamAdapter.isReadable(data)) {
                        const delimiter = Buffer.from(options.delimiter!);
                        const countLen = context.options.countLen || 4;
                        if (options.maxSize && packetSize > options.maxSize) {

                            return new Observable((subsr: Subscriber<Packet<Buffer | IReadableStream>>) => {
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
                                        subsr.next(this.streamConnectId(pkg, idLen, delimiter, stream, countLen, size + Buffer.byteLength(end)));
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
                                        subsr.next(this.streamConnectId(pkg, idLen, delimiter, stream, countLen, size));
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
                            return of(this.streamConnectId(pkg, idLen, delimiter, data, countLen, packetSize));
                        }
                    } else {

                        if (!isBuffer(data)) return throwError(() => new ArgumentExecption('payload has not serializized!'))

                        if (options.maxSize && packetSize > options.maxSize) {
                            return this.subcontract(data, packetSize, sizeLimit).pipe(
                                map(data => this.connectId(pkg, idLen, data))
                            )
                        } else {
                            return of(this.connectId(pkg, idLen, data));
                        }
                    }
                })
            );
    }

    streamConnectId(packet: Packet, idLen: number, delimiter: Buffer, stream: IReadableStream, countLen: number, len: number): Packet<IReadableStream> {
        let isFist = true;
        const payload = this.streamAdapter.pipeline(stream, this.streamAdapter.createPassThrough({
            transform: (chunk, encoding, callback) => {
                if (isFist) {
                    isFist = false;
                    const buffLen = Buffer.alloc(countLen);
                    const idBuff = this.getIdBuffer(packet.id, idLen)!;
                    buffLen.writeUIntBE(len + idLen, 0, countLen);
                    callback(null, Buffer.concat([buffLen, delimiter, idBuff, chunk], countLen + Buffer.byteLength(delimiter) + idLen + Buffer.byteLength(chunk)));
                } else {
                    callback(null, chunk);
                }
            }
        }))
        return packet.clone({ payload })
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

    connectId(input: Packet, idLen: number, payload: Buffer): Packet<Buffer> {
        if (input.id) {
            const idBuff = this.getIdBuffer(input.id, idLen)!;
            payload = Buffer.concat([idBuff, payload], idLen + Buffer.byteLength(payload))
        }
        return input.clone({ payload });
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