import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Context, Encoder, EncoderBackend } from '@tsdi/common';
import { Observable, of } from 'rxjs';
import { Interceptor, InterceptorHandler } from '@tsdi/core';


@Abstract()
export abstract class AssetEncoder implements Encoder {
    abstract handle(ctx: Context): Observable<Buffer>;
}

@Abstract()
export abstract class AssetEncoderBackend implements EncoderBackend {
    abstract handle(ctx: Context): Observable<Buffer>;
}



export const ASSET_ENCODER_INTERCEPTORS =  tokenId<Interceptor<Context, Buffer>[]>('ASSET_ENCODER_INTERCEPTORS')


@Injectable()
export class AssetInterceptingEncoder implements Encoder {
    private chain!: Encoder;

    constructor(private backend: AssetEncoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Buffer> {
        if (!this.chain) {
            const interceptors = this.injector.get(ASSET_ENCODER_INTERCEPTORS, []);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend)
        }
        return this.chain.handle(ctx)
    }
}



@Injectable()
export class SimpleAssetEncoderBackend implements AssetEncoderBackend {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.raw) return of(ctx.raw);
        if (!ctx || !ctx.packet) throw new ArgumentExecption('asset decoding input empty');
        const pkg = ctx.packet;
        ctx.raw = Buffer.from(JSON.stringify(pkg));
        return of(ctx.raw);

    }

}
