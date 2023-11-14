import { ArgumentExecption, Injectable } from '@tsdi/ioc';
import { IDuplexStream, ResponsePacket, TransportEvent, hdr } from '@tsdi/common';
import { Observable, Subscriber, of } from 'rxjs';
import { ResponseBackend, ResponseContext, ResponseDecodeInterceptor, ResponseDecoder } from './codings';


interface ResponseCachePacket extends ResponsePacket {

}

@Injectable()
export class StreamResponseDecorder<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {

    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {
        if (ctx.packet && ctx.packet.payload) {
            return of(ctx.packet);
        }
        return next.handle(ctx)
    }
}

@Injectable()
export class PayloadStreamResponseDecorder<T extends TransportEvent = TransportEvent> implements ResponseDecodeInterceptor<T> {

    intercept(ctx: ResponseContext, next: ResponseDecoder<T>): Observable<T> {
        if (ctx.packet && !ctx.packet.payload && ctx.session.existHeader && ctx.session.streamAdapter.isReadable(ctx.raw)) {
            ctx.packet.payload = ctx.raw;
            return of(ctx.packet);
        }
        return next.handle(ctx)
    }

}


@Injectable()
export class BufferifyResponseDecodeBackend<T extends TransportEvent = TransportEvent> implements ResponseBackend<T> {
    packs: Map<string | number, ResponseCachePacket>;

    constructor() {
        this.packs = new Map();
    }

    handle(ctx: ResponseContext): Observable<T> {

        const session = ctx.session;

        return new Observable((subscriber: Subscriber<T>) => {

            if (!ctx.raw) {
                subscriber.error(new ArgumentExecption('asset decoding input empty'));
                return;
            }

            let raw = ctx.raw;
            let packet: ResponseCachePacket | undefined;
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
                    packet = ctx.packet as ResponseCachePacket;
                } else {
                    const hidx = raw.indexOf(session.headerDelimiter!);
                    if (hidx >= 0) {
                        try {
                            packet = session.parseHeader(raw.subarray(0, hidx)) as ResponseCachePacket;
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
        })
    }

}