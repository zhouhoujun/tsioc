import { Injectable, isString } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Packet } from '@tsdi/common';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../execptions';
import { TransportContext } from '../context';
import { PacketIdGenerator } from '../PacketId';
import { IDuplexStream, IReadableStream } from '../stream';
import { PackageEncodeInterceptor } from './buffer.package';
import { Serialization } from '../packet';



/**
 * Channel cache.
 */
export interface ChannelCache {
    message: Serialization;
    stream: IDuplexStream | null;
    length: number;
    contentLength: number | null;
}

@Injectable()
export class PacketDecodeInterceptor implements Interceptor<Serialization, Packet<any>, TransportContext> {

    protected channels: Map<string, ChannelCache>;

    constructor() {
        this.channels = new Map();
    }

    intercept(input: Serialization, next: Handler<Serialization, Packet<any>>, context: TransportContext): Observable<Packet<any>> {
        if (context.session.streamAdapter.isReadable(input.payload)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Serialization>) => {

            const channel = context.channel ?? context.session.options.transport ?? '';

            let cache = this.channels.get(channel);
            const payload = input.payload as Buffer;
            input.payload = null;
            if (!cache) {
                cache = {
                    message: input,
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

    protected handleData(channel: string, cache: ChannelCache, data: Buffer, subscriber: Subscriber<Serialization>, context: TransportContext) {
        const { options, streamAdapter, injector } = context.session;

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
                    cache.message.streamLength = rawContentLength;
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

    protected handleMessage(channel: string, cache: ChannelCache, subscriber: Subscriber<Serialization>, clear: boolean) {
        const data = cache.stream;
        data?.end();
        const message = cache.message;
        message.payload = data;
        cache.stream = null;
        if (clear) {
            this.channels.delete(channel);
        } else {
            cache.contentLength = null;
            cache.length = 0;
        }
        subscriber.next(message);
    }
}

@Injectable()
export class BindPacketIdDecodeInterceptor implements Interceptor<Serialization, Packet<any>, TransportContext> {

    intercept(input: Serialization, next: Handler<Serialization, Packet<any>>, context: TransportContext): Observable<Packet<any>> {
        return next.handle(input, context)
            .pipe(
                filter(packet => {
                    if (!context.session.options.client) return true;
                    return packet.id == input.id;
                })
            );
    }
}

@Injectable()
export class BindPacketIdEncodeInterceptor implements Interceptor<Packet<any>, Serialization, TransportContext> {

    intercept(input: Packet<any>, next: Handler<Packet<any>, Serialization>, context: TransportContext): Observable<Serialization> {
        const { options, injector, headerAdapter } = context.session;
        const length = headerAdapter.getContentLength(input.headers);
        if (length && options.maxSize && length > options.maxSize && !options.headDelimiter && !injector.has(PackageEncodeInterceptor)) {
            const btpipe = injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(options.maxSize)}`));
        }
        if (!input.id && options.client) {
            input.attachId(injector.get(PacketIdGenerator).getPacketId());
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketEncodeInterceptor implements Interceptor<Packet<any>, Serialization, TransportContext> {

    intercept(input: Packet<any>, next: Handler<Packet<any>, Serialization, TransportContext>, context: TransportContext): Observable<Serialization> {

        return next.handle(input, context)
            .pipe(map(msg => {
                const { streamAdapter, options } = context.session;
                const countLen = options.countLen || 4;
                let buffLen: Buffer;
                const delimiter = Buffer.from(options.delimiter!);
                const delimiterLen = Buffer.byteLength(delimiter);
                // const headers = msg.headers;
                let data: IReadableStream | Buffer | string | null = msg.payload;
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
                    data = countLen + options.delimiter! + data;
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
