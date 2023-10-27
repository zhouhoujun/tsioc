import { Abstract, ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { InterceptorHandler } from '@tsdi/core';
import { Packet, Context, Decoder, DecoderBackend, DecodeInterceptor } from '@tsdi/common';
import { Observable, of, throwError } from 'rxjs';


@Abstract()
export abstract class JsonDecoder implements Decoder {
    abstract handle(ctx: Context): Observable<Packet>;
}



@Abstract()
export abstract class JsonDecoderBackend implements DecoderBackend {
    abstract handle(ctx: Context): Observable<Packet>;
}

/**
 * json decoder interceptors token
 */
export const JSON_DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('JSON_DECODER_INTERCEPTORS');

@Injectable()
export class JsonInterceptingDecoder implements Decoder {
    private chain!: Decoder;

    constructor(private backend: JsonDecoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Packet> {
        if (!this.chain) {
            const interceptors = this.injector.get(JSON_DECODER_INTERCEPTORS, []);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend)
        }
        return this.chain.handle(ctx)
    }
}


@Injectable()
export class SimpleJsonDecoderBackend implements JsonDecoderBackend {

    handle(ctx: Context): Observable<Packet> {
        if (!ctx.raw || !ctx.raw.length) return of({});
        try {
            ctx.packet = ctx.session.deserialize(ctx.raw);
            return of(ctx.packet ?? {});
        } catch (err) {
            return throwError(() => err);
        }
    }

}
