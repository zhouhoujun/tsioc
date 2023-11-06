import { ArgumentExecption, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { InterceptorHandler } from '@tsdi/core';
import { Packet, Context, Decoder, DecoderBackend, DecodeInterceptor, IncomingPacket, IDuplexStream, hdr } from '@tsdi/common';
import { Observable, Subscriber, of, throwError } from 'rxjs';



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

interface CachePacket extends IncomingPacket {
    cacheSize: number;
}


@Injectable()
export class TransportDecoderBackend implements DecoderBackend {

    packs: Map<string | number, CachePacket>;
    constructor() {
        this.packs = new Map();
    }

    handle(ctx: Context): Observable<IncomingPacket> {
        if (ctx.headers && ctx.session.streamAdapter.isReadable(ctx.readable)) {
            ctx.packet = {
                ...ctx.headers,
                payload: ctx.readable
            } as IncomingPacket;
            return of(ctx.packet);
        }

        return new Observable((subscriber: Subscriber<IncomingPacket>) => {

            if (!ctx.raw) {
                subscriber.error(new ArgumentExecption('asset decoding input empty'));
                return;
            }

            let raw = ctx.raw;
            let packet: CachePacket | undefined;
            let id: string | number;
            if (!ctx.headers) {
                id = raw.readInt16BE(0);
                raw = raw.subarray(2);
                packet = this.packs.get(id);
            } else {

                if (ctx.headers.id) {
                    id = ctx.headers.id;
                } else {
                    id = raw.readInt16BE(0);
                    raw = raw.subarray(2);
                }
                packet = this.packs.get(id);

            }

            if (!packet) {
                if (ctx.headers) {
                    packet = ctx.headers as CachePacket;
                } else {
                    const hidx = raw.indexOf(ctx.headerDelimiter!);
                    if (hidx >= 0) {
                        try {
                            packet = ctx.session.deserialize(raw.subarray(0, hidx)) as CachePacket;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        raw = raw.subarray(hidx + 1);
                    }
                }
                if (packet) {
                    const len = packet.length ?? (~~(packet.headers?.[hdr.CONTENT_LENGTH] ?? '0'));
                    if (!len) {
                        packet.payload = raw;
                        subscriber.next(packet);
                        subscriber.complete();
                    } else {
                        packet.length = len;
                        packet.cacheSize = raw.length;
                        if (packet.cacheSize >= packet.length) {
                            packet.payload = raw;
                            subscriber.next(packet);
                            subscriber.complete();
                        } else {
                            const stream = packet.payload = ctx.session.streamAdapter.createPassThrough();
                            stream.write(raw);
                            this.packs.set(id, packet);
                            subscriber.complete();
                        }
                    }
                } else {
                    subscriber.complete();
                }
            } else {
                packet.cacheSize += raw.length;
                (packet.payload as IDuplexStream).write(raw);
                if (packet.cacheSize >= (packet.length || 0)) {
                    (packet.payload as IDuplexStream).end();
                    this.packs.delete(packet.id);
                    subscriber.next(packet);
                    subscriber.complete();
                } else {
                    subscriber.complete();
                }
            }

            return subscriber;
        });
    }

}