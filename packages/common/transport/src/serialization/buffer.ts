import { Injectable } from '@tsdi/ioc';
import { HandlerFn, Interceptable, PipeTransform } from '@tsdi/core';
import { Packet } from '@tsdi/common';
import { IncomingMessage } from '../Incoming';
import { mergeMap, Observable, Subscriber } from 'rxjs';
import { TransportContext } from '../context';
import { IDuplexStream } from '../stream';
import { PacketLengthException } from '../execptions';


@Injectable()
export class BufferTransport {

    protected channels: Map<string, ChannelCache>;

    constructor() {
        this.channels = new Map();
    }

    @Interceptable(Packet, {order: 0})
    unpacket(input: Packet, next: HandlerFn<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (context.transport.streamAdapter.isReadable(input.payload)) return next(input, context);

        return new Observable((subscriber: Subscriber<Packet>) => {

            const channel = context.transport.protocol ?? '';

            let cache = this.channels.get(channel);
            const payload = input.payload as Buffer;
            input.payload = null;
            if (!cache) {
                cache = {
                    packet: input,
                    stream: null,
                    length: 0,
                    contentLength: null,
                    streamLength: null,
                }
                this.channels.set(channel, cache)
            }
            this.handleData(channel, cache, payload, subscriber, context);

            return subscriber;

        }).pipe(
            mergeMap(pkg => next(pkg, context))
        );
    }

    // @Interceptable(Packet, {order: 0})
    // packet(input: Packet, next: HandlerFn<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {

    // }



    protected handleData(channel: string, cache: ChannelCache, data: Buffer, subscriber: Subscriber<Packet>, context: TransportContext) {
        const { options, streamAdapter, injector } = context.transport;

        const bLen = Buffer.byteLength(data);
        cache.length += bLen;

        if (!cache.stream) {
            cache.stream = streamAdapter.createPassThrough();
        }
        
        if (!cache.contentLength || cache.length <= cache.contentLength) {
            cache.stream.write(data);
        }

        if (cache.contentLength == null) {
            const delimiter = Buffer.from(options.delimiter!);
            const countLen = options.countLen || 4;
            const i = data.indexOf(delimiter);
            if (i !== -1) {
                const idx = cache.length - bLen + i + delimiter.length;
                const buffer = cache.stream.read(idx) as Buffer;
                const rawContentLength = buffer.readUIntBE(idx - countLen - delimiter.length, idx - delimiter.length);
                if (isNaN(rawContentLength) || (options.maxSize && rawContentLength > options.maxSize)) {
                    cache.contentLength = null;
                    cache.length = 0;
                    cache.stream.end();
                    cache.stream = null;
                    const btpipe = injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    cache.length -= idx;
                    cache.contentLength = rawContentLength;
                    cache.streamLength = rawContentLength;
                }
            }
        }

        if (cache.contentLength !== null) {
            if (cache.length === cache.contentLength) {
                this.handleMessage(channel, cache, subscriber, true);
                subscriber.complete();
            } else if (cache.length > cache.contentLength) {
                const idx = cache.length - cache.contentLength - 1;
                cache.stream.write(data.subarray(0, idx));
                const rest = data.subarray(idx);
                this.handleMessage(channel, cache, subscriber, !rest.length);
                if (rest.length) {
                    this.handleData(channel, cache, rest, subscriber, context);
                }
            } else {
                subscriber.complete();
            }
        } else {
            subscriber.complete();
        }
    }

    protected handleMessage(channel: string, cache: ChannelCache, subscriber: Subscriber<Packet>, clear: boolean) {
        const data = cache.stream;
        data?.end();
        const Packet = cache.packet;
        Packet.payload = data;
        cache.stream = null;
        if (clear) {
            this.channels.delete(channel);
        } else {
            cache.contentLength = null;
            cache.length = 0;
        }
        subscriber.next(Packet);
    }
}

/**
 * Channel cache.
 */
export interface ChannelCache {
    packet: Packet;
    stream: IDuplexStream | null;
    length: number;
    contentLength: number | null;
    streamLength: number | null;
}
