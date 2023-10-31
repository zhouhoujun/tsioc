import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Handler, InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend, SendPacket } from '@tsdi/common';
import { Observable, map, of, throwError } from 'rxjs';
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

    strategy = 'json';

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
        if (!ctx || !ctx.packet) return throwError(() => new ArgumentExecption('json decoding input empty'));
        try {
            ctx.raw = ctx.session.serialize(ctx.packet, true);
            return of(ctx.raw);
        } catch (err) {
            return throwError(() => err);
        }

    }

}

@Injectable()
export class FinalizeJsonEncodeInterceptor implements EncodeInterceptor {

    intercept(input: Context, next: Handler<Context, Buffer>): Observable<Buffer> {
        return next.handle(input)
            .pipe(
                map(data => {
                    if(!input.delimiter) return data;
                    
                    return Buffer.concat([
                        Buffer.from(String(data.length)),
                        input.delimiter,
                        data
                    ])
                })
            )
    }

}