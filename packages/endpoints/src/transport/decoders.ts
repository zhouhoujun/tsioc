import { ArgumentExecption, Injectable, isString } from '@tsdi/ioc';
import { GET, IDuplexStream, IncomingPacket, InternalServerExecption, MESSAGE, isBuffer } from '@tsdi/common';
import { Observable, Subscriber, map, mergeMap, of, throwError } from 'rxjs';
import { IncomingBackend, IncomingContext, IncomingDecodeInterceptor, IncomingDecoder } from './codings';
import { TransportContext, TransportContextFactory } from '../TransportContext';



interface CachePacket extends IncomingPacket {
    cacheSize: number;
    length: number;
}

@Injectable()
export class StringIncomingDecordeInterceptor<T = any> implements IncomingDecodeInterceptor<T> {

    intercept(ctx: IncomingContext<T>, next: IncomingDecoder<T>): Observable<IncomingPacket> {
        if (isString(ctx.msg)) {
            try {
                ctx.incoming = ctx.session.deserialize(ctx.msg);
                return of(ctx.incoming);
            } catch {
                ctx.raw = Buffer.from(ctx.msg);
            }
        }
        return next.handle(ctx)
    }

}

@Injectable()
export class BufferIncomingDecordeInterceptor<T = any> implements IncomingDecodeInterceptor<T> {

    intercept(ctx: IncomingContext<T>, next: IncomingDecoder<T>): Observable<IncomingPacket> {
        if (isBuffer(ctx.msg)) {
            ctx.raw = ctx.msg;
        }
        return next.handle(ctx)
    }
}

@Injectable()
export class StreamIncomingDecordeInterceptor<T = any> implements IncomingDecodeInterceptor<T> {

    intercept(ctx: IncomingContext<T>, next: IncomingDecoder<T>): Observable<IncomingPacket> {
        if (ctx.session.existHeader && ctx.session.streamAdapter.isReadable(ctx.msg)) {
            if (ctx.incoming) {
                ctx.incoming.payload = ctx.msg;
            } else {
                ctx.incoming = { payload: ctx.msg };
            }
            if (!ctx.incoming.method) {
                ctx.incoming.method = ctx.options.transportOpts?.microservice ? MESSAGE : GET;
            }
            return of(ctx.incoming)
        }
        return next.handle(ctx)
    }
}


@Injectable()
export class IncomingMessageDecordeInterceptor<T = any> implements IncomingDecodeInterceptor<T> {

    intercept(ctx: IncomingContext<T>, next: IncomingDecoder<T>): Observable<IncomingPacket> {
        const msg = ctx.msg as IncomingPacket;
        if (msg?.req && msg?.res) {
            ctx.incoming = { ...msg };
            return of(ctx.incoming);
        }
        return next.handle(ctx)
    }

}



@Injectable()
export class BufferIncomingDecordeBackend<T = any> implements IncomingBackend<T> {

    packs: Map<string | number, CachePacket>;
    constructor() {
        this.packs = new Map();
    }

    handle(ctx: IncomingContext<T>): Observable<IncomingPacket> {

        return new Observable((subscriber: Subscriber<IncomingPacket>) => {

            if (!ctx.msg || !isBuffer(ctx.msg)) {
                subscriber.error(new ArgumentExecption('asset decoding input is not buffer.'));
                return;
            }

            let raw = ctx.msg;
            let id: string | number;
            if (ctx.incoming?.id) {
                id = ctx.incoming.id;
            } else {
                id = raw.readInt16BE(0);
                raw = raw.subarray(2);
            }
            let packet = this.packs.get(id);

            if (!packet) {
                if (ctx.incoming) {
                    packet = ctx.incoming as CachePacket;
                } else if (ctx.session.headDelimiter) {
                    const hidx = raw.indexOf(ctx.session.headDelimiter);
                    if (hidx >= 0) {
                        try {
                            packet = ctx.session.deserialize(raw.subarray(0, hidx)) as CachePacket;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        raw = raw.subarray(hidx + 1);
                    }
                } else {
                    packet = ctx.session.deserialize(raw) as CachePacket;
                }

                if (packet) {
                    const len = ctx.session.incomingAdapter?.getContentLength(packet);
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
            map(pkg => {
                if (!pkg.method) {
                    pkg.method = ctx.options.transportOpts?.microservice ? MESSAGE : GET;
                }
                ctx.incoming = pkg;
                return pkg;
            })
        )
    }
}

@Injectable()
export class TransportIncomingDecordeBackend<T extends IncomingContext = IncomingContext> implements IncomingBackend<T> {

    handle(ctx: T): Observable<TransportContext> {
        const injector = ctx.session.injector;
        if (!ctx.incoming) return throwError(() => new InternalServerExecption('incoming packet no ready.'));

        const context = injector.get(TransportContextFactory).create(injector, ctx.session, ctx.incoming, ctx.options);
        return of(context);
    }

}
