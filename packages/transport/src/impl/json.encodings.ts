import { Packet, PacketLengthException } from '@tsdi/common';
import { isString } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, map, of, throwError } from 'rxjs';
import { Encoder, EncodingContext, HeaderEncoder } from '../Encoder';
import { isBuffer } from '../utils';
import { hdr } from '../consts';


export class JsonEncoder extends Encoder {

    handle(input: EncodingContext): Observable<Buffer> {
        const data = Buffer.from(JSON.stringify(input.packet));
        if (input.options.maxSize && Buffer.byteLength(data) > input.options.maxSize) {
            return throwError(()=> new PacketLengthException('packet size large than max size ' + input.options.maxSize));
        }
        return of(data);
    }

}

export interface SubCache {
    headerSent?: boolean;
    headCached?: boolean;
    header: Buffer;
    headerSize: number;
    caches: Buffer[];
    payloadSize: number;
    cacheSize: number;
    residueSize: number;
}

export class SubPacket implements Interceptor<EncodingContext, Buffer> {
    private caches: Map<string | number, SubCache>

    constructor(private headerEncoder: HeaderEncoder) {
        this.caches = new Map();
    }

    intercept(input: EncodingContext, next: Handler<EncodingContext, Buffer>): Observable<Buffer> {
        if (!input.chunk) return next.handle(input);

        return this.getCache(input)
            .pipe(
                map(
                    cache => {
                        const chunk = input.chunk!;
                        const bufSize = Buffer.byteLength(chunk);
                        const total = (cache.headerSent ? 0 : cache.headerSize) + cache.cacheSize + bufSize;
                        const limit = input.options.limit!;

                        if (total == limit) {
                            cache.caches.push(chunk);
                            const data = this.concatSub(cache, limit);
                            return data;
                        } else if (total > limit) {
                            const idx = bufSize - (total - limit);
                            const message = chunk.subarray(0, idx);
                            const rest = chunk.subarray(idx);
                            cache.caches.push(message);
                            const data = this.concatSub(cache, limit);
                            cache.residueSize -= (bufSize - Buffer.byteLength(rest));
                            // return [data, rest];
                            return data;
                        } else {
                            cache.caches.push(chunk);
                            cache.cacheSize += bufSize;
                            cache.residueSize -= bufSize;
                            if (cache.residueSize <= 0) {
                                const data = this.concatSub(cache, cache.cacheSize);
                                return data;
                            }
                            return null!;
                        }
                    })
            )
    }

    protected getCache(input: EncodingContext) {
        let cache = this.caches.get(input.packet.id);
        const len = input.packet.headers?.[hdr.CONTENT_LENGTH];
        const payloadSize = isString(len) ? ~~len : len ?? 0;
        if (!cache) {
            return this.headerEncoder.encode(input)
                .pipe(
                    map(buf => {
                        cache = {
                            caches: [],
                            cacheSize: 0,
                            header: buf,
                            headerSize: Buffer.byteLength(buf),
                            payloadSize,
                            residueSize: payloadSize
                        }
                        this.caches.set(input.packet.id, cache);
                        return cache
                    })
                );

        }
        return of(cache);
    }

    protected concatSub(subpkg: SubCache, size: number): Buffer {
        const data = subpkg.caches;
        subpkg.caches = [];
        subpkg.cacheSize = 0;
        return Buffer.concat(data);
    }
}

