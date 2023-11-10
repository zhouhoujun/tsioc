import { ArgumentExecption } from '@tsdi/ioc';
import { IDuplexStream, Packet, hdr } from '@tsdi/common';
import { Observable, Subscriber, map, of } from 'rxjs';
import { TransportContext, TransportContextFactory } from '../TransportContext';
import { IncomingBackend } from './codings';
import { IncomingContext } from './session';



interface CachePacket extends Packet {
    cacheSize: number;
}

export class TransportIncomingBackend implements IncomingBackend {

    packs: Map<string | number, CachePacket>;
    constructor() {
        this.packs = new Map();
    }

    handle(ctx: IncomingContext): Observable<TransportContext> {
        if (ctx.packet && ctx.session.streamAdapter.isReadable(ctx.raw)) {
            ctx.packet.payload = ctx.raw;
            const context = ctx.session.injector.get(TransportContextFactory).create(ctx.session.injector, ctx.session, ctx.req ?? ctx.packet, ctx.res ?? {});
            return of(context)
        }

        return new Observable((subscriber: Subscriber<CachePacket>) => {

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
                        ctx.length = len;
                        packet.cacheSize = raw.length;
                        if (packet.cacheSize >= ctx.length) {
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
                if (packet.cacheSize >= (ctx.length || 0)) {
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
                const { session, req, res, packet } = ctx;
                const context = session.injector.get(TransportContextFactory).create(session.injector, session, req ?? { ...packet, ...pkg }, res ?? {});
                return context
            })
        );
    }

}


