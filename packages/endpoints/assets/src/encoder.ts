import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend, Packet } from '@tsdi/common';
import { Observable, of } from 'rxjs';


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
export class HeaderEncodeInterceptor implements EncodeInterceptor {

    intercept(input: Context, next: Handler<Context, Buffer>): Observable<Buffer> {

        if (input.packet && !(input.packet as SendPacket).__sent) {
            const headBuf = Buffer.from(JSON.stringify(input.packet));
            if (input.raw) {
                input.raw = Buffer.concat([headBuf, input.headerDelimiter!, input.raw]);
            }
            (input.packet as SendPacket).__sent = true;
        }

        return next.handle(input);
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
