import { Injectable, isPlainObject, isString } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { Packet, PacketData } from '../packet';
import { PacketLengthException } from '../execptions';
import { TransportContext } from '../context';
import { PacketIdGenerator } from '../PacketId';
import { PackageEncodeInterceptor } from './buffer.package';
import { IDuplexStream, IReadableStream } from '../stream';
import { StreamAdapter } from '../StreamAdapter';



/**
 * Channel buffer.
 */
export interface ChannelBuffer {
    channel: string;
    stream?: IDuplexStream | null;
    length: number;
    contentLength: number | null;
}

@Injectable()
export class PacketDecodeInterceptor implements Interceptor<Buffer | string | IReadableStream, Packet, TransportContext> {

    protected channels: Map<string, ChannelBuffer>;

    constructor(private streamAdapter: StreamAdapter) {
        this.channels = new Map();
    }


    intercept(input: Buffer | string | IReadableStream, next: Handler<Buffer | IReadableStream, Packet>, context: TransportContext): Observable<Packet> {

        if (this.streamAdapter.isReadable(input)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<IReadableStream>) => {

            const channel = context.channel ?? context.options.transport ?? '';

            let chl = this.channels.get(channel);

            if (!chl) {
                chl = {
                    channel,
                    stream: null,
                    length: 0,
                    contentLength: null
                }
                this.channels.set(channel, chl)
            }
            this.handleData(chl, input, subscriber, context);

            return subscriber;

        }).pipe(
            mergeMap(pkgBuffer => next.handle(pkgBuffer, context))
        );
    }

    protected handleData(chl: ChannelBuffer, dataRaw: Buffer | string, subscriber: Subscriber<IReadableStream>, context: TransportContext) {
        const options = context.options;
        const data = isString(dataRaw) ? Buffer.from(dataRaw) : dataRaw;

        const bLen = Buffer.byteLength(data);
        chl.length += bLen;
        if (!chl.stream) {
            chl.stream = this.streamAdapter.createPassThrough();
        }
        if (!chl.contentLength || chl.length <= chl.contentLength) {
            chl.stream.write(data);
        }

        if (chl.contentLength == null) {
            const delimiter = Buffer.from(options.delimiter!);
            const countLen = options.countLen || 4;
            const i = data.indexOf(delimiter);
            if (i !== -1) {
                const idx = chl.length - bLen + i + delimiter.length;
                const buffer = chl.stream.read(idx) as Buffer;
                const rawContentLength = buffer.readUIntBE(idx - countLen - delimiter.length, idx - delimiter.length);
                if (isNaN(rawContentLength) || (options.maxSize && rawContentLength > options.maxSize)) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.stream.end();
                    chl.stream = null;
                    const btpipe = context.session!.injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    chl.length -= idx;
                    chl.stream.length = chl.contentLength = rawContentLength;
                }
            }
        }

        if (chl.contentLength !== null) {
            if (chl.length === chl.contentLength) {
                this.handleMessage(chl, chl.stream, subscriber, true);
                subscriber.complete();
            } else if (chl.length > chl.contentLength) {
                const idx = chl.length - chl.contentLength - 1;
                chl.stream.write(data.subarray(0, idx));
                const rest = data.subarray(idx);
                this.handleMessage(chl, chl.stream, subscriber, !rest.length);
                if (rest.length) {
                    this.handleData(chl, rest, subscriber, context);
                }
            } else {
                subscriber.complete();
            }
        } else {
            subscriber.complete();
        }
    }
    protected handleMessage(chl: ChannelBuffer, message: IReadableStream, subscriber: Subscriber<IReadableStream>, clear: boolean) {
        chl.stream?.end();
        chl.stream = null;
        if (clear) {
            this.channels.delete(chl.channel);
        } else {
            chl.contentLength = null;
            chl.length = 0;
        }
        subscriber.next(message);
    }
}

@Injectable()
export class BindPacketIdDecodeInterceptor implements Interceptor<Buffer, PacketData, TransportContext> {

    intercept(input: Buffer, next: Handler<Buffer, PacketData>, context: TransportContext): Observable<PacketData> {
        return next.handle(input, context)
            .pipe(
                filter(packet => {
                    if (!context.options.client) return true;
                    const endcode = context.inputs.find(i => i != input && isPlainObject(i) && i.id);
                    return packet.id == endcode.id;
                })
            );
    }
}

@Injectable()
export class BindPacketIdEncodeInterceptor implements Interceptor<PacketData, Buffer | IReadableStream, TransportContext> {

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: TransportContext): Observable<Buffer | IReadableStream> {
        const length = input.payloadLength;
        const options = context.options;
        if (length && options.maxSize && length > options.maxSize && !context.session!.injector.has(PackageEncodeInterceptor)) {
            const btpipe = context.session!.injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(options.maxSize)}`));
        }
        if (!input.id && options.client) {
            input.id = context.session?.injector.get(PacketIdGenerator).getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketEncodeInterceptor implements Interceptor<Packet, Buffer | IReadableStream, TransportContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: PacketData<any>, next: Handler<Packet<any>, Buffer | IReadableStream, TransportContext>, context: TransportContext): Observable<Buffer | IReadableStream> {

        return next.handle(input, context)
            .pipe(map(data => {
                const countLen = context.options.countLen || 4;
                let buffLen: Buffer;
                const delimiter = Buffer.from(context.options.delimiter!);
                const delimiterLen = Buffer.byteLength(delimiter);
                if (this.streamAdapter.isReadable(data)) {
                    let first = true;
                    let subpacket = false;
                    return this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
                        transform: (chunk, encoding, callback) => {
                            if (chunk.indexOf(delimiter) >= 0) {
                                subpacket = true;
                            }
                            if (subpacket) {
                                callback(null, chunk);
                            } else {
                                if (!buffLen) {
                                    buffLen = Buffer.alloc(countLen)
                                    buffLen.writeUIntBE(input.streamLength!, 0, countLen);
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
                    }))

                } else {
                    buffLen = Buffer.alloc(countLen);
                    const dataLen = Buffer.byteLength(data);
                    buffLen.writeUIntBE(dataLen, 0, countLen);
                    const total = countLen + delimiterLen + dataLen;
                    return Buffer.concat([buffLen, delimiter, data], total);
                }
            }))
    }



}