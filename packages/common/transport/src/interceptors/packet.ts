import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../execptions';
import { PacketIdGenerator } from '../PacketId';
import { IDuplex } from '../stream';
import { IncomingMessage } from '../Incoming';
import { OutgoingMessage } from '../Outgoing';
import { TransportContext } from '../context';
import { AbstractTransport } from '../transports';
import { isBuffer } from '../StreamAdapter';
import { Packet } from '../socket';



@Injectable()
export class PacketDeserializeInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

    protected channels: Map<string, Packet<IDuplex>>;

    constructor() {
        this.channels = new Map();
    }

    intercept(input: Packet, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (!input.payload || context.transport.streamAdapter.isReadable(input.payload)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Packet<IDuplex>>) => {

            const channel = context.transport.protocol;

            let cache = this.channels.get(channel);
            const packet = input.payload as Buffer;
            if (!cache) {
                cache = input as Packet<IDuplex>;
                cache.payload = null;
                cache.length = 0;
                cache.contentLength = null;
                this.channels.set(channel, cache)
            }
            this.handleData(channel, cache, packet, subscriber, context);

            return subscriber;

        }).pipe(
            mergeMap(pkg => next.handle(pkg, context))
        );
    }

    protected handleData(channel: string, cache: Packet<IDuplex>, data: Buffer, subscriber: Subscriber<Packet<IDuplex>>, context: TransportContext) {

        const transport = context.transport as AbstractTransport;
        const options = transport.options;

        const bLen = Buffer.byteLength(data);
        if (!isNumber(cache.length)) {
            cache.length = 0;
        }
        cache.length += bLen;
        if (!cache.payload) {
            cache.payload = transport.streamAdapter.createPassThrough();
        }
        if (!cache.contentLength || cache.length <= cache.contentLength) {
            cache.payload.write(data);
        }

        if (cache.contentLength == null) {
            const delim = Buffer.from(options.delimiter || '#');
            const countLen = 4;
            const i = data.indexOf(delim);
            if (i !== -1) {
                const idx = cache.length - bLen + i + delim.length;
                const buffer = cache.payload.read(idx) as Buffer;
                const rawContentLength = buffer.readUIntBE(idx - countLen - delim.length, idx - delim.length);
                if (isNaN(rawContentLength) || (options.maxSize && rawContentLength > options.maxSize)) {
                    cache.contentLength = null;
                    cache.length = 0;
                    cache.payload.end();
                    cache.payload = null;
                    const btpipe = transport.injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    cache.length -= idx;
                    cache.contentLength = rawContentLength;
                }
            }
        }

        if (cache.contentLength !== null && cache.contentLength !== undefined) {
            if (cache.length === cache.contentLength) {
                this.handleMessage(channel, cache, subscriber, true);
                subscriber.complete();
            } else if (cache.length > cache.contentLength) {
                const idx = cache.length - cache.contentLength - 1;
                cache.payload.write(data.subarray(0, idx));
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

    protected handleMessage(channel: string, cache: Packet<IDuplex>, subscriber: Subscriber<Packet<IDuplex>>, clear: boolean) {
        const data = { ...cache };
        cache.payload?.end();
        cache.payload = null;
        if (clear) {
            this.channels.delete(channel);
        } else {
            cache.contentLength = null;
            cache.length = 0;
        }
        subscriber.next(data);
    }
}


@Injectable()
export class DeatchPacketIdInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

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
export class PacketifyInterceptor implements Interceptor<any, IncomingMessage, TransportContext> {

    intercept(input: any, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (isString(input)) {
            input = { payload: Buffer.from(input) } as Packet;
        } else if (isBuffer(input) || context.transport.streamAdapter.isReadable(input)) {
            input = { payload: input } as Packet;
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class PacketVaildateInterceptor implements Interceptor<OutgoingMessage, Packet, TransportContext> {

    intercept(input: OutgoingMessage, next: Handler<OutgoingMessage, Packet>, context: TransportContext): Observable<Packet> {
        const { injector, headerAdapter, options, client } = context.transport as AbstractTransport;
        const length = headerAdapter?.getContentLength(input.headers);
        if (length && options.maxSize && length > options.maxSize) {
            const btpipe = injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(options.maxSize)}`));
        }
        if (!input.id && client) {
            input.id = injector.get(PacketIdGenerator).getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketSerializeInterceptor implements Interceptor<OutgoingMessage, Packet, TransportContext> {

    intercept(input: OutgoingMessage, next: Handler<OutgoingMessage, Packet, TransportContext>, context: TransportContext): Observable<Packet> {

        return next.handle(input, context)
            .pipe(map(msg => {
                const { streamAdapter, options } = context.transport as AbstractTransport;
                const countLen = 4;
                let buffLen: Buffer;
                const delimiterStr = options.delimiter || '#';
                // const headDelimiterStr = options.delimiter || '|';
                // const headDelimiter = Buffer.from(headDelimiterStr);
                // const headLen = msg.headerLenght || 0;
                const delimiter = Buffer.from(delimiterStr);
                const delimiterLen = Buffer.byteLength(delimiter);
                let data = msg.payload;
                if (streamAdapter.isReadable(data)) {
                    let first = true;
                    let subpacket = false;
                    data = streamAdapter.pipeline(data, streamAdapter.createPassThrough({
                        transform: (chunk, encoding, callback) => {
                            if (chunk.indexOf(delimiter) >= 0) {
                                subpacket = true;
                            }
                            if (subpacket) {
                                callback(null, chunk);
                            } else {
                                if (!buffLen) {
                                    buffLen = Buffer.alloc(countLen);
                                    buffLen.writeUIntBE(msg.contentLength!, 0, countLen);
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
                } else {
                    if (isString(data)) {
                        data = Buffer.from(data);
                    }
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
