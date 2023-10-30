import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Interceptor, InterceptorHandler } from '@tsdi/core';
import { Packet, Context, Decoder, DecoderBackend, IncomingPacket, StreamAdapter, IDuplexStream, hdr, SendPacket } from '@tsdi/common';
import { Observable, Subscriber } from 'rxjs';


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

            if (!ctx.raw) {
                subscriber.error(new ArgumentExecption('asset decoding input empty'));
                return;
            }
            let raw = ctx.raw;
            let packet: CachePacket | undefined;
            let id: string | number;
            if (!ctx.headers) {
                id = raw.readInt16BE(0);
                raw = raw.subarray(2);
                packet = this.packs.get(id);
            } else {
                if (ctx.headers.id) {
                    id = ctx.headers.id;
                } else {
                    id = raw.readInt16BE(0);
                    raw = raw.subarray(2);
                }
                packet = this.packs.get(id);
            }

            if (!packet) {
                if (ctx.headers) {
                    packet = ctx.headers as CachePacket;
                } else {
                    const hidx = raw.indexOf(ctx.headerDelimiter!);
                    if (hidx >= 0) {
                        try {
                            packet = ctx.session.deserialize(raw.subarray(0, hidx)) as CachePacket;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        raw = raw.subarray(hidx + 1);
                    }
                }
                if (packet) {
                    const len = packet.length ?? (~~(packet.headers?.[hdr.CONTENT_LENGTH] ?? '0'));
                    if (!len) {
                        packet.payload = raw;
                        subscriber.next(packet);
                        subscriber.complete();
                    } else {
                        packet.length = len;
                        packet.cacheSize = raw.length;
                        if (packet.cacheSize >= packet.length) {
                            packet.payload = raw;
                            subscriber.next(packet);
                            subscriber.complete();
                        } else {
                            const stream = packet.payload = ctx.get(StreamAdapter).createPassThrough();
                            stream.write(raw);
                            this.packs.set(id, packet);
                            subscriber.complete();
                        }
                    }
                } else {
                    subscriber.complete();
                }
            } else {
                packet.cacheSize += raw.length;
                (packet.payload as IDuplexStream).write(raw);
                if (packet.cacheSize >= (packet.length || 0)) {
                    (packet.payload as IDuplexStream).end();
                    this.packs.delete(packet.id);
                    subscriber.next(packet);
                    subscriber.complete();
                } else {
                    subscriber.complete();
                }
            }

            return subscriber;
        });
    }

}
