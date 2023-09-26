import { Abstract, ArgumentExecption, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { Interceptor, InterceptorHandler } from '@tsdi/core';
import { InvalidJsonException, Packet, Context, Decoder, DecoderBackend } from '@tsdi/common';
import { Observable, of } from 'rxjs';


@Abstract()
export abstract class AssetDecoder implements Decoder {
    abstract handle(ctx: Context): Observable<Packet>;
}



@Abstract()
export abstract class AssetDecoderBackend implements DecoderBackend {
    abstract handle(ctx: Context): Observable<Packet>;
}


export const ASSET_DECODER_INTERCEPTORS = tokenId<Interceptor<Context, Packet>[]>('ASSET_DECODER_INTERCEPTORS')

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
export class SimpleAssetDecoderBackend implements AssetDecoderBackend {

    handle(ctx: Context): Observable<Packet> {
        if (ctx.packet) return of(ctx.packet);
        if (!ctx.raw) throw new ArgumentExecption('asset decoding input empty');
        const jsonStr = isString(ctx.raw) ? ctx.raw : new TextDecoder().decode(ctx.raw);
        try {
            ctx.packet = JSON.parse(jsonStr);
            return of(ctx.packet ?? {});
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

}
