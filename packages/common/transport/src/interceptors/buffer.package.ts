import { ArgumentExecption, Injectable, isNumber } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import { Observable, Subscriber, filter, map, mergeMap, of, range, throwError } from 'rxjs';
import { TransportContext } from '../context';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { IDuplexStream, IReadableStream } from '../stream';
import { PacketLengthException } from '../execptions';

interface CachePacket {
    packet: Packet<IDuplexStream>;
    streams?: IReadableStream[] | null;
    cacheSize: number;
    completed?: boolean;
}

@Injectable()
export class PackageDecodeInterceptor implements Interceptor<Message, Packet, TransportContext> {

    packs: Map<string | number, CachePacket> = new Map();
    intercept(input: Message, next: Handler<Message, Packet, TransportContext>, context: TransportContext): Observable<Packet> {
        const options = context.options;
        const idLen = options.idLen ?? 2;
        let id: string | number;
        const session = context.session;
        if (session.streamAdapter.isReadable(input.data)) {
            const chunk = input.data.read(idLen);
            id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
            const exist = this.packs.get(id);
            if (exist) input.headers['payload-only'] = id;
            input.attachId(id);
            if (input.headers['stream-length']) {
                input.headers['stream-length'] = input.headers['stream-length'] as number - idLen;
            }
        } else if (input.data) {
            id = idLen > 4 ? input.data.subarray(0, idLen).toString() : input.data.readUIntBE(0, idLen);
            input.attachId(id);
            const data = input.data.subarray(idLen);
            input = input.clone({ data })
        }
        return next.handle(input, context)
            .pipe(
                map(packet => this.mergePacket(packet, session.streamAdapter)),
                filter(p => p.completed == true),
                map(p => p.packet)
            )
    }

    mergePacket(packet: Packet, streamAdapter: StreamAdapter): CachePacket {

        if (!packet.id || !(isBuffer(packet.payload) || streamAdapter.isReadable(packet.payload)) || packet.headers.getContentLength() <= 0) {
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
            packet = packet.clone({ payload: streamAdapter.createPassThrough() });

            const cached = {
                packet,
                cacheSize: len
            } as CachePacket;
            if (streamAdapter.isReadable(payload)) {
                cached.streams = [payload];
            } else {
                packet.payload.write(payload);
            }
            this.packs.set(packet.id!, cached);
            return cached;
        } else {
            const cLen = cached.packet.headers.getContentLength();
            cached.cacheSize += len;
            if (packet.headers.size) {
                cached.packet.headers.setHeaders(packet.headers.getHeaders())
            }

            if (streamAdapter.isReadable(packet.payload)) {
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
                    streamAdapter.merge(cached.packet.payload!, cached.streams);
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
export class PackageEncodeInterceptor implements Interceptor<Packet, Message, TransportContext> {

    intercept(input: Packet, next: Handler<Packet, Message, TransportContext>, context: TransportContext): Observable<Message> {
        return next.handle(input, context)
            .pipe(
                mergeMap(msg => {
                    const session = context.session;
                    const options = context.options;
                    const idLen = options.idLen ?? 2;
                    const data = msg.data;
                    const packetSize = isBuffer(data) ? Buffer.byteLength(data) : (msg.headers['stream-length'] as number ?? ((msg.headers['header-length'] as number ?? 0) + input.headers.getContentLength())) //pkg.headers['content-length']));
                    const sizeLimit = options.maxSize! - (options.delimiter ? Buffer.byteLength(options.delimiter) : 0)
                        - ((options.headDelimiter) ? Buffer.byteLength(options.headDelimiter) : 0)
                        - idLen
                        - ((options.delimiter) ? Buffer.byteLength(options.delimiter) : 0)
                        - (options.countLen ?? 4)
                    // - (isNil(pkg.type) ? 0 : 1); // message type.


                    if (session.streamAdapter.isReadable(data)) {
                        const delimiter = Buffer.from(options.delimiter!);
                        const countLen = context.options.countLen || 4;
                        if (options.maxSize && packetSize > options.maxSize) {

                            return new Observable((subsr: Subscriber<Message>) => {
                                let size = 0;
                                let stream: IDuplexStream | null;
                                let total = 0;
                                const maxSize = sizeLimit;

                                const writeBuffer = (chunk: Buffer, chLen: number) => {
                                    if (!stream) {
                                        stream = session.streamAdapter.createPassThrough();
                                    }
                                    total += chLen;
                                    const len = size + chLen;
                                    if (len >= maxSize) {
                                        const idx = chLen - (len - maxSize);
                                        const end = chunk.subarray(0, idx);
                                        const sub = chunk.subarray(idx);
                                        stream.end(end);
                                        subsr.next(this.streamConnectId(session.streamAdapter, msg, idLen, delimiter, stream, countLen, size + Buffer.byteLength(end)));
                                        if (sub.length) {
                                            stream = session.streamAdapter.createPassThrough();
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
                                        subsr.next(this.streamConnectId(session.streamAdapter, msg, idLen, delimiter, stream, countLen, size));
                                        stream = null;
                                        size = 0;
                                    }
                                };

                                session.streamAdapter.pipeTo(data, session.streamAdapter.createWritable({
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
                            return of(this.streamConnectId(session.streamAdapter, msg, idLen, delimiter, data, countLen, packetSize));
                        }
                    } else {

                        if (!isBuffer(data)) return throwError(() => new ArgumentExecption('payload has not serializized!'))

                        if (options.maxSize && packetSize > options.maxSize) {
                            return this.subcontract(data, packetSize, sizeLimit).pipe(
                                map(data => this.connectId(msg, idLen, data))
                            )
                        } else {
                            return of(this.connectId(msg, idLen, data));
                        }
                    }
                })
            );
    }

    streamConnectId(streamAdapter: StreamAdapter, msg: Message, idLen: number, delimiter: Buffer, stream: IReadableStream, countLen: number, len: number): Message {
        let isFist = true;
        const data = streamAdapter.pipeline(stream, streamAdapter.createPassThrough({
            transform: (chunk, encoding, callback) => {
                if (isFist) {
                    isFist = false;
                    const buffLen = Buffer.alloc(countLen);
                    const idBuff = this.getIdBuffer(msg.id!, idLen)!;
                    buffLen.writeUIntBE(len + idLen, 0, countLen);
                    callback(null, Buffer.concat([buffLen, delimiter, idBuff, chunk], countLen + Buffer.byteLength(delimiter) + idLen + Buffer.byteLength(chunk)));
                } else {
                    callback(null, chunk);
                }
            }
        }))
        return msg.clone({ data })
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

    connectId(msg: Message, idLen: number, data: Buffer): Message {
        if (msg.id) {
            const idBuff = this.getIdBuffer(msg.id, idLen)!;
            data = Buffer.concat([idBuff, data], idLen + Buffer.byteLength(data))
        }
        return msg.clone({ data });
    }


    subcontract(chunk: Buffer, len: number, maxSize: number): Observable<Buffer> {
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