import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Interceptor, InterceptorHandler } from '@tsdi/core';
import { Context, Encoder, EncoderBackend, RequestPacket } from '@tsdi/common';
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


export const JSON_ENCODER_INTERCEPTORS = tokenId<Interceptor<Context, Buffer>[]>('JSON_ENCODER_INTERCEPTORS')


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
        const { context, ...pkg } = ctx.packet as RequestPacket;
        ctx.raw = Buffer.from(JSON.stringify(pkg));
        return of(ctx.raw);

    }

}
