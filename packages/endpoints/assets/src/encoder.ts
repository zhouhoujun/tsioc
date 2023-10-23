import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Interceptor, InterceptorHandler } from '@tsdi/core';
import { Context, Encoder, EncoderBackend, Packet } from '@tsdi/common';
import { Observable, of, throwError } from 'rxjs';


@Abstract()
export abstract class AssetEncoder implements Encoder {
    abstract handle(ctx: Context): Observable<Buffer>;
}

@Abstract()
export abstract class AssetEncoderBackend implements EncoderBackend {
    abstract handle(ctx: Context): Observable<Buffer>;
}


/**
 * asset encode interceptors
 */
export const ASSET_ENCODER_INTERCEPTORS = tokenId<Interceptor<Context, Buffer>[]>('ASSET_ENCODER_INTERCEPTORS')


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

interface SendPacket extends Packet {
    __sent?: boolean
}


@Injectable()
export class SimpleAssetEncoderBackend implements AssetEncoderBackend {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.packet && !(ctx.packet as SendPacket).__sent) {
            const { length, payload, ...data } = ctx.packet;
            const headBuf = Buffer.from(JSON.stringify(data));
            ctx.raw = Buffer.concat([headBuf, ctx.headerDelimiter!, payload ?? ctx.raw ?? Buffer.alloc(0)]);
            (ctx.packet as SendPacket).__sent = true;
        } else {
            ctx.raw = ctx.packet?.payload;
        }
        if (!ctx.raw) throwError(() => new ArgumentExecption('asset decoding input empty'));
        return of(ctx.raw!);
    }

}
