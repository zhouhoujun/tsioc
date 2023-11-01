import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
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
 * global json decoder interceptors token
 */
export const JSON_DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('JSON_DECODER_INTERCEPTORS');
/**
 * client json decoder interceptors token
 */
export const CLIENT_JSON_DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('CLIENT_JSON_DECODER_INTERCEPTORS');
/**
 * server json decoder interceptors token
 */
export const SERVER_JSON_DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('SERVER_JSON_DECODER_INTERCEPTORS');


@Injectable()
export class JsonInterceptingDecoder implements Decoder {
    private gloablChain!: Decoder;
    private clientChain!: Decoder;
    private serverChain!: Decoder;
    strategy = 'json';

    constructor(private backend: JsonDecoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Packet> {
        return this.getChain(ctx.serverSide).handle(ctx)
    }

    getChain(server?: boolean) {
        let chain = server ? this.serverChain : this.clientChain;
        if (!chain) {
            if (!this.gloablChain) this.gloablChain = this.injector.get(JSON_DECODER_INTERCEPTORS, []).reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);

            const extendsInters = this.injector.get(server ? SERVER_JSON_DECODER_INTERCEPTORS : CLIENT_JSON_DECODER_INTERCEPTORS, []);
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
