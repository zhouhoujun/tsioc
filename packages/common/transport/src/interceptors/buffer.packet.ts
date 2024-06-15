import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../execptions';
import { TransportContext } from '../context';
import { PacketIdGenerator } from '../PacketId';
import { PackageEncodeInterceptor } from './buffer.package';
import { IDuplexStream, IReadableStream } from '../stream';
import { StreamAdapter } from '../StreamAdapter';



/**
 * Channel cache.
 */
export interface ChannelCache {
    message: Message;
    stream?: IDuplexStream | null;
    length: number;
    contentLength: number | null;
}

@Injectable()
export class PacketDecodeInterceptor implements Interceptor<Message, Packet, TransportContext> {

    protected channels: Map<string, ChannelCache>;

    constructor() {
        this.channels = new Map();
    }

    intercept(input: Message, next: Handler<Message, Packet>, context: TransportContext): Observable<Packet> {
        const streamAdapter = context.session.streamAdapter;
        if (streamAdapter.isReadable(input.data)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Message>) => {

            const channel = context.channel ?? context.options.transport ?? '';

            let cache = this.channels.get(channel);
            const data = input.data as Buffer;

            if (!cache) {
                cache = {
                    message: input.clone({ data: null }),
                    stream: null,
                    length: 0,
                    contentLength: null
                }
                this.channels.set(channel, cache)
            }
            this.handleData(streamAdapter, channel, cache, data, subscriber, context);

            return subscriber;

        }).pipe(
            mergeMap(pkg => next.handle(pkg, context))
        );
    }

    protected handleData(streamAdapter: StreamAdapter, channel: string, cache: ChannelCache, data: Buffer, subscriber: Subscriber<Message>, context: TransportContext) {
        const options = context.options;

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
                    const btpipe = context.session!.injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    cache.length -= idx;
                    cache.contentLength = rawContentLength;
                    cache.message.headers['stream-length'] = rawContentLength;
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
                    this.handleData(streamAdapter, channel, cache, rest, subscriber, context);
                }
            } else {
                subscriber.complete();
            }
        } else {
            subscriber.complete();
        }
    }
    protected handleMessage(channel: string, cache: ChannelCache, subscriber: Subscriber<Message>, clear: boolean) {
        const data = cache.stream;
        data?.end();
        const packet = cache.message.clone({ data });
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
export class BindPacketIdDecodeInterceptor implements Interceptor<Message, Packet, TransportContext> {

    intercept(input: Message, next: Handler<Message, Packet>, context: TransportContext): Observable<Packet> {
        return next.handle(input, context)
            .pipe(
                filter(packet => {
                    if (!context.options.client) return true;
                    return packet.id == input.id;
                })
            );
    }
}

@Injectable()
export class BindPacketIdEncodeInterceptor implements Interceptor<Packet, Message, TransportContext> {

    intercept(input: Packet, next: Handler<Packet, Message>, context: TransportContext): Observable<Message> {
        const length = input.headers.getContentLength();
        const options = context.options;
        if (length && options.maxSize && length > options.maxSize && !context.options.headDelimiter) {
            const btpipe = context.session!.injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(options.maxSize)}`));
        }
        if (!input.id && options.client) {
            input.attachId(context.session?.injector.get(PacketIdGenerator).getPacketId());
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketEncodeInterceptor implements Interceptor<Packet, Message, TransportContext> {

    intercept(input: Packet<any>, next: Handler<Packet, Message, TransportContext>, context: TransportContext): Observable<Message> {

        return next.handle(input, context)
            .pipe(map(msg => {
                const streamAdapter = context.session.streamAdapter;
                const countLen = context.options.countLen || 4;
                let buffLen: Buffer;
                const delimiter = Buffer.from(context.options.delimiter!);
                const delimiterLen = Buffer.byteLength(delimiter);
                const headers = msg.headers;
                let data: IReadableStream | Buffer = msg.data ?? Buffer.alloc(0);
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
                                    buffLen = Buffer.alloc(countLen)
                                    buffLen.writeUIntBE(msg.headers['stream-length'] as number, 0, countLen);
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
                    headers['stream-length'] = undefined;
                } else {
                    buffLen = Buffer.alloc(countLen);
                    const dataLen = Buffer.byteLength(data);
                    buffLen.writeUIntBE(dataLen, 0, countLen);
                    const total = countLen + delimiterLen + dataLen;
                    data = Buffer.concat([buffLen, delimiter, data], total);
                }
                return msg.clone({ headers, data });
            }))
    }



}