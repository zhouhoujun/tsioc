import { Injectable, isString } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { BufferPacket, Packet } from '@tsdi/common';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../execptions';
import { PacketIdGenerator } from '../PacketId';
import { IDuplex } from '../stream';
import { IncomingMessage } from '../Incoming';
import { OutgoingMessage } from '../Outgoing';
import { TransportContext } from '../context';
import { SocketTransport } from '../transports';



/**
 * Channel cache.
 */
export interface ChannelCache {
    packet: BufferPacket<IDuplex>;
    stream: IDuplex | null;
    length: number;
    contentLength: number | null;
}

@Injectable()
export class PacketDeserializeInterceptor implements Interceptor<BufferPacket<IDuplex>, IncomingMessage, TransportContext> {

    protected channels: Map<string, ChannelCache>;

    constructor() {
        this.channels = new Map();
    }

    intercept(input: Packet, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (context.transport.streamAdapter.isReadable(input.payload)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Packet>) => {

            const channel = context.transport.protocol;

            let cache = this.channels.get(channel);
            const payload = input.payload as Buffer;
            input.payload = null;
            if (!cache) {
                cache = {
                    packet: input,
                    stream: null,
                    length: 0,
                    contentLength: null
                }
                this.channels.set(channel, cache)
            }
            this.handleData(channel, cache, payload, subscriber, context);

            return subscriber;

        }).pipe(
            mergeMap(pkg => next.handle(pkg, context))
        );
    }

    protected handleData(channel: string, cache: ChannelCache, data: Buffer, subscriber: Subscriber<Packet>, context: TransportContext) {

        const transport = context.transport as SocketTransport;

        const bLen = Buffer.byteLength(data);
        cache.length += bLen;
        if (!cache.stream) {
            cache.stream = transport.streamAdapter.createPassThrough();
        }
        if (!cache.contentLength || cache.length <= cache.contentLength) {
            cache.stream.write(data);
        }

        if (cache.contentLength == null) {
            const delim = Buffer.from(transport.delimiter);
            const countLen = 4;
            const i = data.indexOf(delim);
            if (i !== -1) {
                const idx = cache.length - bLen + i + delim.length;
                const buffer = cache.stream.read(idx) as Buffer;
                const rawContentLength = buffer.readUIntBE(idx - countLen - delim.length, idx - delim.length);
                if (isNaN(rawContentLength) || (transport.maxSize && rawContentLength > transport.maxSize)) {
                    cache.contentLength = null;
                    cache.length = 0;
                    cache.stream.end();
                    cache.stream = null;
                    const btpipe = transport.injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(transport.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    cache.length -= idx;
                    cache.contentLength = rawContentLength;
                    cache.packet.streamLength = rawContentLength;
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
        const packet = cache.packet;
        packet.payload = data;
        cache.stream = null;
        if (clear) {
            this.channels.delete(channel);
        } else {
            cache.contentLength = null;
            cache.length = 0;
        }
        subscriber.next(packet);
    }
}

@Injectable()
export class BindPacketIdDecodeInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

    intercept(input: Packet, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        return next.handle(input, context)
            .pipe(
                filter(packet => {
                    if (!context.transport.client) return true;
                    return packet.id == input.id;
                })
            );
    }
}

@Injectable()
export class BindPacketIdEncodeInterceptor implements Interceptor<OutgoingMessage, Packet, TransportContext> {

    intercept(input: OutgoingMessage, next: Handler<OutgoingMessage, Packet>, context: TransportContext): Observable<Packet> {
        const { injector, maxSize, headerAdapter, headDelimiter, client } = context.transport as SocketTransport;
        const length = headerAdapter?.getContentLength(input.headers);
        if (length && maxSize && length > maxSize && headDelimiter) {
            const btpipe = injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(maxSize)}`));
        }
        if (!input.id && client) {
            input.id = injector.get(PacketIdGenerator).getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketSerializeInterceptor implements Interceptor<OutgoingMessage, BufferPacket, TransportContext> {

    intercept(input: OutgoingMessage, next: Handler<OutgoingMessage, BufferPacket, TransportContext>, context: TransportContext): Observable<Packet> {

        return next.handle(input, context)
            .pipe(map(msg => {
                const transport = context.transport as SocketTransport;
                const countLen = 4;
                let buffLen: Buffer;
                const delimiter = Buffer.from(transport.delimiter);
                const delimiterLen = Buffer.byteLength(delimiter);
                // const headers = msg.headers;
                let data: IDuplex | Buffer | string | null = msg.payload;
                if (transport.streamAdapter.isReadable(data)) {
                    let first = true;
                    let subpacket = false;
                    data = transport.streamAdapter.pipeline(data, transport.streamAdapter.createPassThrough({
                        transform: (chunk, encoding, callback) => {
                            if (chunk.indexOf(delimiter) >= 0) {
                                subpacket = true;
                            }
                            if (subpacket) {
                                callback(null, chunk);
                            } else {
                                if (!buffLen) {
                                    buffLen = Buffer.alloc(countLen);
                                    buffLen.writeUIntBE(msg.streamLength!, 0, countLen);
                                }
                                if (first) {
                                    first = false;
                                    const total = countLen + delimiterLen + Buffer.byteLength(chunk);
                                    callback(null, Buffer.concat([buffLen, delimiter, chunk], total))
                                } else {
                                    callback(null, chunk)
                                }
                            }
                        }
                    }));
                } else if (isString(data)) {
                    data = countLen + transport.delimiter! + data;
                } else {
                    if (!data) data = Buffer.alloc(0);
                    buffLen = Buffer.alloc(countLen);
                    const dataLen = Buffer.byteLength(data);
                    buffLen.writeUIntBE(dataLen, 0, countLen);
                    const total = countLen + delimiterLen + dataLen;
                    data = Buffer.concat([buffLen, delimiter, data], total);
                }
                msg.payload = data;

                return msg;
            }))
    }

}
