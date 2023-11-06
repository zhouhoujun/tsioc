import { Injectable, Injector, tokenId } from '@tsdi/ioc';
import { InterceptorHandler } from '@tsdi/core';
import { Packet, Context, Decoder, DecoderBackend, DecodeInterceptor } from '@tsdi/common';
import { Observable, of, throwError } from 'rxjs';



/**
 * global decoder interceptors token
 */
export const DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('DECODER_INTERCEPTORS');
/**
 * client decoder interceptors token
 */
export const CLIENT_DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('CLIENT_DECODER_INTERCEPTORS');
/**
 * server decoder interceptors token
 */
export const SERVER_DECODER_INTERCEPTORS = tokenId<DecodeInterceptor[]>('SERVER_DECODER_INTERCEPTORS');


@Injectable()
export class InterceptingDecoder implements Decoder {
    private gloablChain!: Decoder;
    private clientChain!: Decoder;
    private serverChain!: Decoder;

    constructor(private backend: DecoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Packet> {
        return this.getChain(ctx.serverSide).handle(ctx)
    }

    getChain(server?: boolean) {
        let chain = server ? this.serverChain : this.clientChain;
        if (!chain) {
            if (!this.gloablChain) this.gloablChain = this.injector.get(DECODER_INTERCEPTORS, []).reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);

            const extendsInters = this.injector.get(server ? SERVER_DECODER_INTERCEPTORS : CLIENT_DECODER_INTERCEPTORS, []);
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
export class SimpleDecoderBackend implements DecoderBackend {

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
