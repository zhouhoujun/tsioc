import { ArgumentExecption, Injectable } from '@tsdi/ioc';
import { GET, IDuplexStream, IncomingPacket, InternalServerExecption, MESSAGE, hdr } from '@tsdi/common';
import { Observable, Subscriber, mergeMap, of, throwError } from 'rxjs';
import { IncomingBackend, IncomingDecodeInterceptor, IncomingDecoder } from './codings';
import { IncomingContext } from './session';
import { TransportContext, TransportContextFactory } from '../TransportContext';



interface CachePacket extends IncomingPacket {
    cacheSize: number;
    length: number;
}


@Injectable()
export class StreamIncomingDecordeInterceptor<T extends IncomingContext = IncomingContext> implements IncomingDecodeInterceptor<T> {

    intercept(ctx: T, next: IncomingDecoder<T>): Observable<TransportContext> {
        if (!ctx.ready && ctx.packet && ctx.packet.req && ctx.packet.res) {
            ctx.ready = true;
        }
        return next.handle(ctx)
    }

}

@Injectable()
export class PayloadStreamIncomingDecordeInterceptor<T extends IncomingContext = IncomingContext> implements IncomingDecodeInterceptor<T> {

    intercept(ctx: T, next: IncomingDecoder<T>): Observable<TransportContext> {
        if (!ctx.ready && ctx.packet && !ctx.packet.payload && ctx.session.existHeader && ctx.session.streamAdapter.isReadable(ctx.raw)) {
            ctx.packet.payload = ctx.raw;
            if (!ctx.packet.method) {
                ctx.packet.method = ctx.options.transportOpts?.microservice ? MESSAGE : GET;
            }
            ctx.ready = true;
        }
        return next.handle(ctx)
    }

}

@Injectable()
export class BufferIncomingDecordeInterceptor<T extends IncomingContext = IncomingContext> implements IncomingDecodeInterceptor<T> {

    packs: Map<string | number, CachePacket>;
    constructor() {
        this.packs = new Map();
    }

    intercept(ctx: T, next: IncomingDecoder<T>): Observable<TransportContext> {
        if (ctx.ready) return next.handle(ctx);
        return new Observable((subscriber: Subscriber<IncomingPacket>) => {

            if (!ctx.raw) {
                subscriber.error(new ArgumentExecption('asset decoding input empty'));
                return;
            }

            let raw = ctx.raw;
            let packet: CachePacket | undefined;
            let id: string | number;
            if (!ctx.packet) {
                id = raw.readInt16BE(0);
                raw = raw.subarray(2);
                packet = this.packs.get(id);
            } else {
                if (ctx.packet.id) {
                    id = ctx.packet.id;
                } else {
                    id = raw.readInt16BE(0);
                    raw = raw.subarray(2);
                }
                packet = this.packs.get(id);

            }

            if (!packet) {
                if (ctx.packet) {
                    packet = ctx.packet as CachePacket;
                } else {
                    const hidx = raw.indexOf(ctx.session.headerDelimiter!);
                    if (hidx >= 0) {
                        try {
                            packet = ctx.session.parseHeader(raw.subarray(0, hidx)) as CachePacket;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        raw = raw.subarray(hidx + 1);
                    }
                }
                if (packet) {
                    const len = ~~(packet.headers?.[hdr.CONTENT_LENGTH] ?? '0');
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
        }).pipe(
            mergeMap(pkg => {
                if (!pkg.method) {
                    pkg.method = ctx.options.transportOpts?.microservice ? MESSAGE : GET;
                }
                ctx.packet = pkg;
                ctx.ready = true;
                return next.handle(ctx);
            })
        )
    }
}

@Injectable()
export class TransportIncomingBackend<T extends IncomingContext = IncomingContext> implements IncomingBackend<T> {


    handle(ctx: T): Observable<TransportContext> {
        const injector = ctx.session.injector;
        if (!ctx.packet || !ctx.ready) return throwError(() => new InternalServerExecption('incoming packet no ready.'));

        const context = injector.get(TransportContextFactory).create(injector, ctx.session, ctx.packet, ctx.options);
        return of(context);

    }

}

