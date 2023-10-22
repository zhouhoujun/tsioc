import { Abstract, ArgumentExecption, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InterceptorHandler } from '@tsdi/core';
import { InvalidJsonException, Packet, Context, Decoder, DecoderBackend, DecodeInterceptor, IncomingPacket } from '@tsdi/common';
import { Observable, map, of } from 'rxjs';


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


@Injectable()
export class SimpleAssetDecoderBackend implements AssetDecoderBackend {

    handle(ctx: Context): Observable<IncomingPacket> {
        if (ctx.packet) return of(ctx.packet);
        const jsonStr = isString(ctx.raw) ? ctx.raw : new TextDecoder().decode(ctx.raw);
        try {
            ctx.packet = JSON.parse(jsonStr);
            return of(ctx.packet ?? {});
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

}
