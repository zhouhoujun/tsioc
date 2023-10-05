import { Abstract, ArgumentExecption, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { InterceptorHandler } from '@tsdi/core';
import { InvalidJsonException, Packet, Context, Decoder, DecoderBackend, DecodeInterceptor } from '@tsdi/common';
import { Observable, of } from 'rxjs';


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
        if (ctx.packet) return of(ctx.packet);
        if (!ctx.raw) throw new ArgumentExecption('json decoding input empty');
        const jsonStr = isString(ctx.raw) ? ctx.raw : new TextDecoder().decode(ctx.raw);
        try {
            ctx.packet = JSON.parse(jsonStr);
            return of(ctx.packet ?? {});
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

}
