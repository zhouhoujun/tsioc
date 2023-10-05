import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend } from '@tsdi/common';
import { Observable, of } from 'rxjs';
import { Buffer } from 'buffer';

@Abstract()
export abstract class JsonEncoder implements Encoder {
    abstract handle(ctx: Context): Observable<Buffer>;
}

@Abstract()
export abstract class JsonEncoderBackend implements EncoderBackend {
    abstract handle(ctx: Context): Observable<Buffer>;
}

/**
 * json encoder interceptors token
 */
export const JSON_ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('JSON_ENCODER_INTERCEPTORS')


@Injectable()
export class JsonInterceptingEncoder implements Encoder {
    private chain!: Encoder;

    constructor(private backend: JsonEncoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Buffer> {
        if (!this.chain) {
            const interceptors = this.injector.get(JSON_ENCODER_INTERCEPTORS, []);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend)
        }
        return this.chain.handle(ctx)
    }
}



@Injectable()
export class SimpleJsonEncoderBackend implements JsonEncoderBackend {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.raw) return of(ctx.raw);
        if (!ctx || !ctx.packet) throw new ArgumentExecption('json decoding input empty');
        ctx.raw = Buffer.from(JSON.stringify(ctx.packet));
        return of(ctx.raw);

    }

}
