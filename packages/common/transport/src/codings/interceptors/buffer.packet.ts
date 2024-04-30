
import { Injectable, isPlainObject } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { Packet, PacketData } from '../../packet';
import { PacketLengthException } from '../../execptions';
import { CodingsContext } from '../context';
import { PacketIdGenerator } from '../PacketId';
import { PackageEncodeInterceptor } from './buffer.package';
import { IReadableStream } from '../../stream';
import { StreamAdapter } from '../../StreamAdapter';




/**
 * Channel buffer.
 */
export interface ChannelBuffer {
    channel: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}

@Injectable()
export class PacketDecodeInterceptor implements Interceptor<Buffer, Packet, CodingsContext> {

    protected channels: Map<string, ChannelBuffer>;

    constructor() {
        this.channels = new Map();
    }


    intercept(input: Buffer, next: Handler<Buffer, Packet>, context: CodingsContext): Observable<Packet> {
        const options = context.options;
        return new Observable((subscriber: Subscriber<Buffer>) => {
            let chl = this.channels.get(options.transport ?? '');

            const channel = options.transport ?? '';
            if (!chl) {
                chl = {
                    channel,
                    buffers: [],
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

    protected handleData(chl: ChannelBuffer, dataRaw: Buffer, subscriber: Subscriber<Buffer>, context: CodingsContext) {
        const options = context.options;
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        chl.buffers.push(data);
        chl.length += Buffer.byteLength(data);

        if (chl.contentLength == null) {
            const delimiter = Buffer.from(options.delimiter!);
            const i = data.indexOf(delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - Buffer.byteLength(data) + i;
                const countLen = options.countLen || 4;
                const rawContentLength = buffer.readUIntBE(idx - countLen, idx);
                chl.contentLength = rawContentLength;

                if (isNaN(rawContentLength) || (options.maxSize && rawContentLength > options.maxSize)) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.buffers = [];
                    const btpipe = context.session!.injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                }
                chl.buffers = [buffer.subarray(idx + 1)];
                chl.length -= (idx + 1);
            }
        }

        if (chl.contentLength !== null) {
            if (chl.length === chl.contentLength) {
                this.handleMessage(chl, this.concatCaches(chl), subscriber);
                subscriber.complete();
            } else if (chl.length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, message, subscriber);
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

    protected concatCaches(chl: ChannelBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers, chl.length) : chl.buffers[0]
    }

    protected handleMessage(chl: ChannelBuffer, message: Buffer, subscriber: Subscriber<Buffer>) {
        chl.contentLength = null;
        chl.length = 0;
        chl.buffers = [];
        subscriber.next(message);
    }
}

@Injectable()
export class BindPacketIdDecodeInterceptor implements Interceptor<Buffer, PacketData, CodingsContext> {

    intercept(input: Buffer, next: Handler<Buffer, PacketData>, context: CodingsContext): Observable<PacketData> {
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
export class BindPacketIdEncodeInterceptor implements Interceptor<PacketData, Buffer | IReadableStream, CodingsContext> {

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: CodingsContext): Observable<Buffer | IReadableStream> {
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
export class PacketEncodeInterceptor implements Interceptor<Packet, Buffer | IReadableStream, CodingsContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    intercept(input: PacketData<any>, next: Handler<Packet<any>, Buffer | IReadableStream, CodingsContext>, context: CodingsContext): Observable<Buffer | IReadableStream> {

        return next.handle(input, context)
            .pipe(map(data => {
                const countLen = context.options.countLen || 4;
                const buffLen = Buffer.alloc(countLen);
                const delimiter = Buffer.from(context.options.delimiter!);
                if (this.streamAdapter.isReadable(data)) {
                    buffLen.writeUIntBE(input.streamLength!, 0, countLen);
                    let first = true;
                    return this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
                        transform: (chunk, encoding, callback) => {
                            if (first) {
                                first = false;
                                const total = buffLen.length + delimiter.length + chunk.length;
                                callback(null, Buffer.concat([buffLen, delimiter, chunk], total))
                            } else {
                                callback(null, chunk)
                            }
                        }
                    }))

                } else {
                    buffLen.writeUIntBE(data.length, 0, countLen);
                    const total = buffLen.length + delimiter.length + data.length;
                    return Buffer.concat([buffLen, delimiter, data], total);
                }
            }))
    }



}