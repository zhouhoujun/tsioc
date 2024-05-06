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

        if (!packet.id || !isBuffer(packet.payload)) {
            packet.completed = true;
            return packet;
        }
        const len = packet.streamLength ?? packet.payload?.length ?? 0;

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
                    const packetSize = isBuffer(data) ? data.length : (input.streamLength ?? ((input.headerLength ?? 0) + (input.payloadLength ?? 0)));
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
                            // const delimiter = Buffer.from(options.delimiter!);
                            // const countLen = context.options.countLen || 4;
                            // let size = 0;
                            // let total = 0;
                            // let buffers: Buffer[] = [];
                            // let first = true;
                            // const stream = this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
                            //     transform: (chunk, encoding, callback) => {

                            //         total += chunk.length;
                            //         if (chunk.length <= sizeLimit) {
                            //             if ((size + chunk.length) >= sizeLimit) {
                            //                 first = false;
                            //                 const idx = chunk.length - (size + chunk.length - sizeLimit);
                            //                 const end = chunk.subarray(0, idx);
                            //                 const sub = chunk.subarray(idx + 1);
                            //                 const idBuff = this.getIdBuffer(input.id, idLen)!;
                            //                 const buffLen = Buffer.alloc(countLen);
                            //                 const cLen = size + end.length + idBuff.length;
                            //                 buffLen.writeUIntBE(cLen, 0, countLen);
                            //                 const payload = Buffer.concat([buffLen, delimiter, idBuff, ...buffers, end], cLen + buffLen.length + delimiter.length);
                            //                 if (sub.length) {
                            //                     buffers = [sub];
                            //                     size = sub.length;
                            //                 } else {
                            //                     buffers = [];
                            //                     size = 0;
                            //                 }
                            //                 // setTimeout(() => {
                            //                 callback(null, payload);
                            //                 // }, 1)
                            //             } else {
                            //                 size += chunk.length;
                            //                 buffers.push(chunk);
                            //                 if (total >= packetSize) {
                            //                     const idBuff = this.getIdBuffer(input.id, idLen)!;
                            //                     const buffLen = Buffer.alloc(countLen);
                            //                     const cLen = size + idBuff.length;
                            //                     buffLen.writeUIntBE(cLen, 0, countLen);
                            //                     const payload = Buffer.concat([buffLen, delimiter, idBuff, ...buffers, chunk], cLen + buffLen.length + delimiter.length);
                            //                     buffers = [];
                            //                     size = 0;
                            //                     // setTimeout(() => {
                            //                     callback(null, payload);
                            //                     // }, 1)
                            //                 } else {
                            //                     callback();
                            //                 }
                            //             }
                            //         } else {
                            //             this.subcontract(chunk, sizeLimit)
                            //                 .pipe(
                            //                     map(buf => {
                            //                         const idBuff = this.getIdBuffer(input.id, idLen)!;
                            //                         const buffLen = Buffer.alloc(countLen);
                            //                         const cLen = buf.length + idBuff.length;
                            //                         buffLen.writeUIntBE(cLen, 0, countLen);
                            //                         return Buffer.concat([buffLen, delimiter, idBuff, buf], buffLen.length + delimiter.length + cLen);
                            //                     })
                            //                 ).subscribe({
                            //                     next: (buff) => {
                            //                         callback(null, buff);
                            //                     },
                            //                     error: (err) => callback(err)
                            //                 })

                            //         }
                            //     }
                            // }));

                            // return of(stream);


                            // return new Observable((subsr: Subscriber<Buffer>) => {
                            //     let size = 0;
                            //     let buffers: Buffer[] = [];
                            //     let first = true;
                            //     let total = 0;
                            //     this.streamAdapter.pipeTo(data, this.streamAdapter.createWritable({
                            //         write: (chunk: Buffer, encoding, callback) => {
                            //             const maxSize = sizeLimit;
                            //             total += chunk.length;
                            //             if (chunk.length <= maxSize) {
                            //                 if (size + chunk.length >= maxSize) {
                            //                     first = false;
                            //                     const idx = chunk.length - (size + chunk.length - maxSize);
                            //                     const end = chunk.subarray(0, idx);
                            //                     const sub = chunk.subarray(idx + 1);
                            //                     buffers.push(end);
                            //                     const idBuff = this.getIdBuffer(input.id, idLen)!;
                            //                     buffers.unshift(idBuff);
                            //                     const payload = Buffer.concat(buffers,  idBuff.length + size + end.length);
                            //                     if (sub.length) {
                            //                         buffers = [sub];
                            //                         size = sub.length;
                            //                     } else {
                            //                         buffers = [];
                            //                         size = 0;
                            //                     }
                            //                     subsr.next(payload)
                            //                 } else {
                            //                     size += chunk.length;
                            //                     buffers.push(chunk);
                            //                     if (total >= packetSize) {
                            //                         const idBuff = this.getIdBuffer(input.id, idLen)!;
                            //                         buffers.unshift(idBuff);
                            //                         const payload = Buffer.concat(buffers, size);
                            //                         buffers = [];
                            //                         size = 0;
                            //                         total = 0;
                            //                         subsr.next(payload);
                            //                     }
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
                            //     });

                            //     return subsr
                            // })
                            return new Observable((subsr: Subscriber<IReadableStream | Buffer>) => {
                                let size = 0;
                                let stream: IDuplexStream | null;
                                let total = 0;

                                this.streamAdapter.pipeTo(data, this.streamAdapter.createWritable({
                                    write: (chunk: Buffer, encoding, callback) => {
                                        const maxSize = sizeLimit;
                                        total += chunk.length;
                                        if (!stream) {
                                            stream = this.streamAdapter.createPassThrough();
                                        }
                                        if (chunk.length <= maxSize) {
                                            if (size + chunk.length >= maxSize) {
                                                const idx = chunk.length - (size + chunk.length - maxSize);
                                                const end = chunk.subarray(0, idx);
                                                const sub = chunk.subarray(idx + 1);
                                                stream.end(end);
                                                subsr.next(this.streamConnectId(input, idLen, delimiter, stream, countLen, size + end.length));
                                                if (sub.length) {
                                                    stream = this.streamAdapter.createPassThrough();
                                                    stream.write(sub);
                                                    size = sub.length;
                                                } else {
                                                    stream = null;
                                                    size = 0;
                                                }
                                            } else {
                                                size += chunk.length;
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
                    buffLen.writeUIntBE(len + idBuff.length, 0, countLen);
                    callback(null, Buffer.concat([buffLen, delimiter, idBuff, chunk], buffLen.length + delimiter.length + idBuff.length + chunk.length));
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
            return Buffer.concat([idBuff, payload], idBuff.length + payload.length)
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