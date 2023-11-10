import { ArgumentExecption } from '@tsdi/ioc';
import { IDuplexStream, IncomingPacket, hdr } from '@tsdi/common';
import { Observable, Subscriber, map, of } from 'rxjs';
import { TransportContext, TransportContextFactory } from '../TransportContext';
import { IncomingBackend } from './codings';
import { IncomingContext } from './session';



interface CachePacket extends IncomingPacket {
    cacheSize: number;
}

export class TransportIncomingBackend implements IncomingBackend {

    packs: Map<string | number, CachePacket>;
    constructor() {
        this.packs = new Map();
    }

    handle(ctx: IncomingContext): Observable<TransportContext> {
        if (ctx.session.existHeader && ctx.session.streamAdapter.isReadable(ctx.payload)) {
            const { session, ...pkg } = ctx;
            const context = session.injector.get(TransportContextFactory).create(session.injector, session, pkg.req ?? pkg, pkg.res ?? {});
            return of(context)
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
        }).pipe(
            map(pkg => {
                const { session } = ctx;
                const context = session.injector.get(TransportContextFactory).create(session.injector, session, pkg.req ?? pkg, pkg.res ?? {});
                return context
            })
        );
    }

}


