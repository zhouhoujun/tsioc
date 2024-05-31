import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Packet } from '@tsdi/common';
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
    packet: Packet;
    stream?: IDuplexStream | null;
    length: number;
    contentLength: number | null;
}

@Injectable()
export class PacketDecodeInterceptor implements Interceptor<Packet<Buffer>, Packet, TransportContext> {

    protected channels: Map<string, ChannelCache>;

    constructor(private streamAdapter: StreamAdapter) {
        this.channels = new Map();
    }

    intercept(input: Packet<Buffer>, next: Handler<Packet<Buffer | IReadableStream>, Packet>, context: TransportContext): Observable<Packet> {

        if (this.streamAdapter.isReadable(input)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Packet<IReadableStream>>) => {

            const channel = context.channel ?? context.options.transport ?? '';

            let cache = this.channels.get(channel);
            const payload = input.payload!;

            if (!cache) {
                cache = {
                    packet: input.clone({ payload: null }),
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

    protected handleData(channel: string, cache: ChannelCache, data: Buffer, subscriber: Subscriber<Packet<IReadableStream>>, context: TransportContext) {
        const options = context.options;

        const bLen = Buffer.byteLength(data);
        cache.length += bLen;
        if (!cache.stream) {
            cache.stream = this.streamAdapter.createPassThrough();
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
                    cache.packet.headers.setHeader('stream-length',rawContentLength);
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
    protected handleMessage(channel: string, cache: ChannelCache, subscriber: Subscriber<Packet<IReadableStream>>, clear: boolean) {
        cache.stream?.end();
        const payload = cache.stream;
        const packet = cache.packet.clone({ payload });
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
export class BindPacketIdDecodeInterceptor implements Interceptor<Packet, Packet, TransportContext> {

    intercept(input: Packet, next: Handler<Packet, Packet>, context: TransportContext): Observable<Packet> {
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
export class BindPacketIdEncodeInterceptor implements Interceptor<Packet, Packet, TransportContext> {

    intercept(input: Packet, next: Handler<Packet, Packet>, context: TransportContext): Observable<Packet> {
        const length = input.headers.getContentLength();
        const options = context.options;
        if (length && options.maxSize && length > options.maxSize && !context.session!.injector.has(PackageEncodeInterceptor)) {
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
export class PacketEncodeInterceptor implements Interceptor<Packet, Packet<IReadableStream | Buffer>, TransportContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: Packet<any>, next: Handler<Packet, Packet<IReadableStream | Buffer>, TransportContext>, context: TransportContext): Observable<Packet<IReadableStream | Buffer>> {

        return next.handle(input, context)
            .pipe(map(pkt => {
                const countLen = context.options.countLen || 4;
                let buffLen: Buffer;
                const delimiter = Buffer.from(context.options.delimiter!);
                const delimiterLen = Buffer.byteLength(delimiter);
                const headers = pkt.headers;
                let payload: IReadableStream | Buffer = pkt.payload ?? Buffer.alloc(0);
                if (this.streamAdapter.isReadable(payload)) {
                    let first = true;
                    let subpacket = false;
                    payload = this.streamAdapter.pipeline(payload, this.streamAdapter.createPassThrough({
                        transform: (chunk, encoding, callback) => {
                            if (chunk.indexOf(delimiter) >= 0) {
                                subpacket = true;
                            }
                            if (subpacket) {
                                callback(null, chunk);
                            } else {
                                if (!buffLen) {
                                    buffLen = Buffer.alloc(countLen)
                                    buffLen.writeUIntBE(input.headers.getHeader('stream-length')!, 0, countLen);
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
                    headers.removeHeader('stream-length');
                } else {
                    buffLen = Buffer.alloc(countLen);
                    const dataLen = Buffer.byteLength(payload);
                    buffLen.writeUIntBE(dataLen, 0, countLen);
                    const total = countLen + delimiterLen + dataLen;
                    payload = Buffer.concat([buffLen, delimiter, payload], total);
                }
                return pkt.clone({ headers, payload });
            }))
    }



}