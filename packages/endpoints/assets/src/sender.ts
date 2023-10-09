import { Injectable, Injector } from '@tsdi/ioc';
import { Context, Encoder, Packet, PacketLengthException, Sender, Transport, TransportOpts } from '@tsdi/common';
import { Observable, finalize, map, throwError } from 'rxjs';
import { AssetEncoder } from './encoder';


@Injectable()
export class AssetSender implements Sender {

    private delimiter: Buffer;
    private maxSize?: number;

    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly encoder: AssetEncoder,
        options: TransportOpts
    ) {

        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.maxSize = options.maxSize;
    }

    send(packet: Packet): Observable<any> {
        const ctx = new Context(this.injector, this.transport, packet);
        const len = ~~(packet.headers?.['content-length'] ?? '0');
        if (this.maxSize && len > this.maxSize) return throwError(() => new PacketLengthException(len.toString()))
        return this.encoder.handle(ctx)
            .pipe(
                map(data => {
                    const len = Buffer.byteLength(data);
                    return Buffer.concat([
                        Buffer.from(String(len)),
                        this.delimiter,
                        data
                    ])
                }),
                finalize(()=> ctx.destroy())
            )
    }

}


// export interface SubCache {
//     headerSent?: boolean;
//     headCached?: boolean;
//     header: Buffer;
//     headerSize: number;
//     caches: Buffer[];
//     payloadSize: number;
//     cacheSize: number;
//     residueSize: number;
// }

// export class SubPacket implements Interceptor<Context, Buffer> {
//     private caches: Map<string | number, SubCache>

//     constructor() {
//         this.caches = new Map();
//     }

//     intercept(input: Context, next: Encoder): Observable<Buffer> {
//         if (!input.chunk) return next.handle(input);

//         return this.getCache(input)
//             .pipe(
//                 map(
//                     cache => {
//                         const chunk = input.chunk!;
//                         const bufSize = Buffer.byteLength(chunk);
//                         const total = (cache.headerSent ? 0 : cache.headerSize) + cache.cacheSize + bufSize;
//                         const limit = input.options.limit!;

//                         if (total == limit) {
//                             cache.caches.push(chunk);
//                             const data = this.concatSub(cache, limit);
//                             return data;
//                         } else if (total > limit) {
//                             const idx = bufSize - (total - limit);
//                             const message = chunk.subarray(0, idx);
//                             const rest = chunk.subarray(idx);
//                             cache.caches.push(message);
//                             const data = this.concatSub(cache, limit);
//                             cache.residueSize -= (bufSize - Buffer.byteLength(rest));
//                             // return [data, rest];
//                             return data;
//                         } else {
//                             cache.caches.push(chunk);
//                             cache.cacheSize += bufSize;
//                             cache.residueSize -= bufSize;
//                             if (cache.residueSize <= 0) {
//                                 const data = this.concatSub(cache, cache.cacheSize);
//                                 return data;
//                             }
//                             return null!;
//                         }
//                     })
//             )
//     }

//     protected getCache(input: EncodingContext) {
//         let cache = this.caches.get(input.packet.id);
//         const len = input.packet.headers?.[hdr.CONTENT_LENGTH];
//         const payloadSize = isString(len) ? ~~len : len ?? 0;
//         if (!cache) {
//             return this.headerEncoder.encode(input)
//                 .pipe(
//                     map(buf => {
//                         cache = {
//                             caches: [],
//                             cacheSize: 0,
//                             header: buf,
//                             headerSize: Buffer.byteLength(buf),
//                             payloadSize,
//                             residueSize: payloadSize
//                         }
//                         this.caches.set(input.packet.id, cache);
//                         return cache
//                     })
//                 );

//         }
//         return of(cache);
//     }

//     protected concatSub(subpkg: SubCache, size: number): Buffer {
//         const data = subpkg.caches;
//         subpkg.caches = [];
//         subpkg.cacheSize = 0;
//         return Buffer.concat(data);
//     }
// }