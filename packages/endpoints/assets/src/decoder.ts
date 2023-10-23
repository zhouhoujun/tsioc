import { Abstract, ArgumentExecption, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InterceptorHandler } from '@tsdi/core';
import { InvalidJsonException, Packet, Context, Decoder, DecoderBackend, DecodeInterceptor, IncomingPacket, StreamAdapter, IDuplexStream, hdr } from '@tsdi/common';
import { Observable, Subscriber, map, of } from 'rxjs';


@Abstract()
export abstract class AssetDecoder implements Decoder {
    abstract handle(ctx: Context<IncomingPacket>): Observable<IncomingPacket>;
}



@Abstract()
export abstract class AssetDecoderBackend implements DecoderBackend {
    abstract handle(ctx: Context<IncomingPacket>): Observable<IncomingPacket>;
}


export const ASSET_DECODER_INTERCEPTORS = tokenId<Interceptor<Context, IncomingPacket>[]>('ASSET_DECODER_INTERCEPTORS')

@Injectable()
export class AssetInterceptingDecoder implements Decoder {
    private chain!: Decoder;

    constructor(private backend: AssetDecoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Packet> {
        if (!this.chain) {
            const interceptors = this.injector.get(ASSET_DECODER_INTERCEPTORS, []);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend)
        }
        return this.chain.handle(ctx)
    }
}

@Injectable()
export class HeaderDecodeInterceptor implements DecodeInterceptor<IncomingPacket> {

    packs: Map<string | number, IncomingPacket>;
    constructor() {
        this.packs = new Map();
    }

    intercept(ctx: Context, next: Handler<Context, IncomingPacket>): Observable<IncomingPacket> {
        if (!ctx.raw || !ctx.raw.length) throw new ArgumentExecption('asset decoding input empty');
        const id = ctx.raw!.readInt16BE(1);
        ctx.raw = ctx.raw.subarray(1);
        ctx.packet = this.packs.get(id);
        if (!ctx.packet) {
            const packet = ctx.packet = JSON.parse(new TextDecoder().decode(ctx.raw));
            if (!packet.length) {
                return of(packet);
            } else {
                this.packs.set(id, packet);
                return of(null as any);
            }
        } else {
            return next.handle(ctx)
                .pipe(
                    map(pkg => {
                        if (pkg.length == pkg.payload?.length) {
                            this.packs.delete(pkg.id);
                        }
                        return pkg;
                    })
                );
        }
    }

}


interface CachePacket extends IncomingPacket {
    cacheSize: number;
}

@Injectable()
export class SimpleAssetDecoderBackend implements AssetDecoderBackend {

    packs: Map<string | number, CachePacket>;
    constructor() {
        this.packs = new Map();
    }

    handle(ctx: Context): Observable<IncomingPacket> {
        return new Observable((subscriber: Subscriber<IncomingPacket>) => {

            if (!ctx.raw || !ctx.raw.length) {
                subscriber.error(new ArgumentExecption('asset decoding input empty'));
                return;
            }
            const id = ctx.raw!.readInt16BE(0);
            let raw = ctx.raw.subarray(2);
            let packet = (ctx.packet as CachePacket) ?? this.packs.get(id);
            if (!packet) {
                const hidx = raw.indexOf(ctx.headerDelimiter!);
                if (hidx >= 0) {
                    packet = JSON.parse(new TextDecoder().decode(raw.subarray(0, hidx))) as CachePacket;
                    raw = raw.subarray(hidx);
                    const len = packet?.length ?? (~~(packet?.headers?.[hdr.CONTENT_LENGTH] ?? '0'));
                    if (!len) {
                        packet.payload = Buffer.alloc(0);
                        subscriber.next(packet);
                        subscriber.complete();
                    } else {
                        packet.length = len;
                        packet.cacheSize = raw.length;
                        const stream = packet.payload = ctx.get(StreamAdapter).createPassThrough();
                        stream.write(raw);
                        this.packs.set(id, packet);
                        subscriber.next(packet);
                        subscriber.complete();
                    }
                }
            } else {
                packet.cacheSize += raw.length;
                (packet.payload as IDuplexStream).write(raw);
                if (packet.cacheSize >= (packet.length || 0)) {
                    (packet.payload as IDuplexStream).end();
                    this.packs.delete(packet.id);
                    // subscriber.next(packet);
                    // subscriber.complete();
                }
            }

            return () => {

            }
        });
    }

}
