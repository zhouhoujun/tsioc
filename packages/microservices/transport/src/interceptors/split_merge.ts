// import { ArgumentException, Injectable, isNumber } from '@tsdi/ioc';
// import { Observable, Subscriber, filter, map, mergeMap, of, range, throwError } from 'rxjs';
// import { StreamAdapter, isBuffer } from '../StreamAdapter';
// import { IDuplex, IReadable } from '../stream';
// import { PacketLengthException } from '../exceptions';
// import { IncomingMessage } from '../Incoming';
// import { OutgoingMessage } from '../Outgoing';
// import { Packet } from '../socket';
// // import { AbstractTransport } from '../transports';
// // import { Transport } from '../Transport';

// interface CachePacket {
//     packet: Packet<IDuplex>;
//     cacheSize: number;
//     completed?: boolean;
// }

// @Injectable()
// export class MergePacketInterceptor implements RequestInterceptor<Packet, IncomingMessage<any>> {

//     packs: Map<string | number, CachePacket> = new Map();
//     intercept(input: Packet, next: RequestHandler<Packet, IncomingMessage>, context: RequestContext): Observable<IncomingMessage> {
//         const transport = context.get(Transport) as AbstractTransport;
//         const opts = transport.options;
//         const idLen = opts.idLen ?? 2;
//         let id: string | number;
//         if (transport.streamAdapter.isReadable(input.payload)) {
//             const chunk = input.payload.read(idLen);
//             id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
//             const exist = this.packs.get(id);
//             // if (exist) input.noHead = true;
//             input.id = id;
//             if (input.length) {
//                 input.length = input.length - idLen;
//             }
//         } else if (isBuffer(input.payload)) {
//             id = idLen > 4 ? input.payload.subarray(0, idLen).toString() : input.payload.readUIntBE(0, idLen);
//             input.id = id;
//             input.payload = input.payload.subarray(idLen);
//         } 
//         // else if (isString(input.packet)) {
//         //     id = input.packet.slice(0, idLen);
//         //     input.packet = input.packet.slice(idLen);
//         // }
        
//         return next.handle(input, context)
//             .pipe(
//                 map(packet => this.mergePacket(packet, transport.streamAdapter, transport.headerAdapter!, input.noHead)),
//                 filter(p => p.completed == true),
//                 map(p => p.packet)
//             )
//     }


//         if (!packet.id || !(isBuffer(packet.payload) || streamAdapter.isReadable(packet.payload)) || (!noHead && packet.headers && headerAdapter.getContentLength(packet.headers) <= 0)) {
//             return { packet, completed: true } as CachePacket;
//         }
//         const len = isBuffer(packet.payload) ? Buffer.byteLength(packet.payload) : packet.contentLength!;

//         if (!noHead && packet.headers && headerAdapter.getContentLength(packet.headers) <= len) {
//             return { packet, completed: true } as CachePacket;
//         }

//         const cached = this.packs.get(packet.id);

//         if (!cached) {
//             if (packet.headers && !headerAdapter.getContentLength(packet.headers)) {
//                 throw new PacketLengthException('has not content length!');
//             }
//             const payload = packet.payload;
//             packet.payload = streamAdapter.createPassThrough();

//             const cached = {
//                 packet,
//                 cacheSize: len
//             } as CachePacket;
//             if (streamAdapter.isReadable(payload)) {
//                 cached.streams = [payload];
//             } else {
//                 packet.payload.write(payload);
//             }
//             this.packs.set(packet.id!, cached);
//             return cached;
//         } else {
//             const cLen = headerAdapter.getContentLength(cached.packet.headers);
//             cached.cacheSize += len;
//             if (packet.headers.size) {
//                 cached.packet.headers.setHeaders(packet.headers.getHeaders())
//             }

//             if (streamAdapter.isReadable(packet.payload)) {
//                 if (cached.streams) {
//                     cached.streams.push(packet.payload);
//                 } else {
//                     cached.streams = [packet.payload];
//                 }
//             } else {
//                 cached.packet.payload!.write(packet.payload);
//             }
//             if (cached.cacheSize >= cLen) {
//                 this.packs.delete(packet.id);
//                 if (cached.streams) {
//                     streamAdapter.merge(cached.packet.payload!, cached.streams);
//                     cached.streams = null;
//                 } else {
//                     cached.packet.payload!.end();
//                 }
//                 cached.completed = true;
//             }
//             return cached;
//         }
//     }
// }

// @Injectable()
// export class SplitPacketInterceptor implements RequestInterceptor<OutgoingMessage, Packet> {

//     intercept(input: OutgoingMessage, next: RequestHandler<OutgoingMessage, Packet>, context: RequestContext): Observable<Packet> {
//         return next.handle(input, context)
//             .pipe(
//                 mergeMap(msg => {
//                     const transport = context.get(Transport) as AbstractTransport;
//                     const opts = transport.options;
//                     const idLen = opts.idLen ?? 2;
//                     const data = msg.payload;
//                     const packetSize = isBuffer(data) ? Buffer.byteLength(data) : msg.contentLength!;
//                     const sizeLimit = opts.maxSize! - (opts.delimiter ? Buffer.byteLength(opts.delimiter) : 0)
//                         - ((opts.headDelimiter) ? Buffer.byteLength(opts.headDelimiter) : 0)
//                         - idLen
//                         - ((opts.delimiter) ? Buffer.byteLength(opts.delimiter) : 0)
//                         - (opts.countLen ?? 4)
//                     // - (isNil(pkg.type) ? 0 : 1); // Packet type.


//                     if (transport.streamAdapter.isReadable(data)) {
//                         const delimiter = Buffer.from(opts.delimiter!);
//                         const countLen = opts.countLen || 4;
//                         if (opts.maxSize && packetSize > opts.maxSize) {

//                             return new Observable((subsr: Subscriber<Packet>) => {
//                                 let size = 0;
//                                 let stream: IDuplex | null;
//                                 let total = 0;
//                                 const maxSize = sizeLimit;

//                                 const writeBuffer = (chunk: Buffer, chLen: number) => {
//                                     if (!stream) {
//                                         stream = transport.streamAdapter.createPassThrough();
//                                     }
//                                     total += chLen;
//                                     const len = size + chLen;
//                                     if (len >= maxSize) {
//                                         const idx = chLen - (len - maxSize);
//                                         const end = chunk.subarray(0, idx);
//                                         const sub = chunk.subarray(idx);
//                                         stream.end(end);
//                                         subsr.next(this.streamConnectId(transport.streamAdapter, msg, idLen, delimiter, stream, countLen, size + Buffer.byteLength(end)));
//                                         if (sub.length) {
//                                             stream = transport.streamAdapter.createPassThrough();
//                                             stream.write(sub);
//                                             size = Buffer.byteLength(sub);
//                                         } else {
//                                             stream = null;
//                                             size = 0;
//                                         }
//                                     } else {
//                                         size += chLen;
//                                         stream.write(chunk);
//                                     }

//                                     if (total >= packetSize && stream) {
//                                         stream.end();
//                                         subsr.next(this.streamConnectId(transport.streamAdapter, msg, idLen, delimiter, stream, countLen, size));
//                                         stream = null;
//                                         size = 0;
//                                     }
//                                 };

//                                 transport.streamAdapter.pipeTo(data, transport.streamAdapter.createWritable({
//                                     write: (chunk: Buffer, encoding, callback) => {
//                                         const chLen = Buffer.byteLength(chunk);
//                                         if (chLen <= maxSize) {
//                                             writeBuffer(chunk, chLen);
//                                             callback();
//                                         } else {
//                                             // const count = (chLen % maxSize === 0) ? (chLen / maxSize) : (Math.floor(chLen / maxSize) + 1);
//                                             // for (let i = 1; i <= count; i++) {
//                                             //     const end = i * maxSize;
//                                             //     const sub = chunk.subarray(end - maxSize, end >= chLen ? chLen : end);
//                                             //     writeBuffer(sub, Buffer.byteLength(sub))
//                                             // }
//                                             // callback();

//                                             this.subcontract(chunk, chLen, maxSize).subscribe({
//                                                 next: (payload) => {
//                                                     writeBuffer(payload, Buffer.byteLength(payload))
//                                                 },
//                                                 complete() {
//                                                     callback()
//                                                 },
//                                                 error(err) {
//                                                     callback(err)
//                                                 }
//                                             })
//                                         }
//                                     }
//                                 })).then(() => {
//                                     subsr.complete();
//                                 }).catch(err => {
//                                     subsr.error(err);
//                                 });

//                                 return subsr
//                             })

//                         } else {
//                             return of(this.streamConnectId(transport.streamAdapter, msg, idLen, delimiter, data, countLen, packetSize));
//                         }
//                     } else {

//                         if (!isBuffer(data)) return throwError(() => new ArgumentException('payload has not serializized!'))

//                         if (opts.maxSize && packetSize > opts.maxSize) {
//                             return this.subcontract(data, packetSize, sizeLimit).pipe(
//                                 map(data => this.connectId(msg, idLen, data))
//                             )
//                         } else {
//                             return of(this.connectId(msg, idLen, data));
//                         }
//                     }
//                 })
//             );
//     }

//     streamConnectId(streamAdapter: StreamAdapter, msg: Packet, idLen: number, delimiter: Buffer, stream: IReadable, countLen: number, len: number): Packet {
//         let isFist = true;
//         msg.payload = streamAdapter.pipeline(stream, streamAdapter.createPassThrough({
//             transform: (chunk, encoding, callback) => {
//                 if (isFist) {
//                     isFist = false;
//                     const buffLen = Buffer.alloc(countLen);
//                     const idBuff = this.getIdBuffer(msg.id!, idLen)!;
//                     buffLen.writeUIntBE(len + idLen, 0, countLen);
//                     callback(null, Buffer.concat([buffLen, delimiter, idBuff, chunk], countLen + Buffer.byteLength(delimiter) + idLen + Buffer.byteLength(chunk)));
//                 } else {
//                     callback(null, chunk);
//                 }
//             }
//         }))
//         return msg
//     }

//     getIdBuffer(id: string | number | undefined, idLen: number) {
//         if (idLen > 4) {
//             return Buffer.from(id as string);
//         } else if (isNumber(id)) {
//             const idBuff = Buffer.alloc(idLen);
//             idBuff.writeUIntBE(id, 0, idLen);
//             return idBuff;
//         }
//         return null;
//     }

//     connectId(msg: Packet, idLen: number, data: Buffer): Packet {
//         if (msg.id) {
//             const idBuff = this.getIdBuffer(msg.id, idLen)!;
//             msg.payload = Buffer.concat([idBuff, data], idLen + Buffer.byteLength(data))
//         }
//         return msg;
//     }


//     subcontract(chunk: Buffer, len: number, maxSize: number): Observable<Buffer> {
//         const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

//         return range(1, count)
//             .pipe(
//                 map(i => {
//                     const end = i * maxSize;
//                     return chunk.subarray(end - maxSize, end >= len ? len : end)
//                 })
//             )
//     }

// }