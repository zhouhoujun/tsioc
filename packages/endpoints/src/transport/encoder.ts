import { ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Handler, InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend } from '@tsdi/common';
import { Observable, map, of, throwError } from 'rxjs';
import { Buffer } from 'buffer';


/**
 * global encoder interceptors token
 */
export const ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('ENCODER_INTERCEPTORS');
/**
 * client encode interceptors
 */
export const CLIENT_ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('CLIENT_ENCODER_INTERCEPTORS');
/**
 * server encode interceptors
 */
export const SERVER_ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('SERVER_ENCODER_INTERCEPTORS');


@Injectable()
export class InterceptingEncoder implements Encoder {
    private gloablChain!: Encoder;
    private serverChain!: Encoder;
    private clientChain!: Encoder;

    constructor(private backend: EncoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Buffer> {
        return this.getChain(ctx.serverSide).handle(ctx)
    }

    getChain(server?: boolean) {
        let chain = server ? this.serverChain : this.clientChain;
        if (!chain) {
            if (!this.gloablChain) this.gloablChain = this.injector.get(ENCODER_INTERCEPTORS, []).reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);

            const extendsInters = this.injector.get(server ? SERVER_ENCODER_INTERCEPTORS : CLIENT_ENCODER_INTERCEPTORS, []);
            chain = extendsInters.length ? extendsInters.reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.gloablChain) : this.gloablChain;

            if (server) {
                this.serverChain = chain;
            } else {
                this.clientChain = chain;
            }
        }
        return chain;
    }
}



@Injectable()
export class SimpleEncoderBackend implements EncoderBackend {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.raw) return of(ctx.raw);
        if (!ctx || !ctx.packet) return throwError(() => new ArgumentExecption('encoding input empty'));
        try {
            ctx.raw = ctx.session.serialize(ctx.packet, true);
            return of(ctx.raw);
        } catch (err) {
            return throwError(() => err);
        }

    }

}

@Injectable()
export class FinalizeEncodeInterceptor implements EncodeInterceptor {

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