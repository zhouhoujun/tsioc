
import { Injectable, isPlainObject } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap } from 'rxjs';
import { Packet, PacketData } from '../../packet';
import { PacketLengthException } from '../../execptions';
import { CodingsContext } from '../context';
import { TransportOpts } from '../../TransportSession';
import { PacketIdGenerator } from '../PacketId';




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
        const options = context.options as TransportOpts;
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
            this.handleData(chl, input, subscriber, options);

            return subscriber;

        }).pipe(
            mergeMap(pkgBuffer => next.handle(pkgBuffer, context))
        );
    }

    protected handleData(chl: ChannelBuffer, dataRaw: string | Buffer | Uint8Array, subscriber: Subscriber<Buffer>, options: TransportOpts) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        chl.buffers.push(data);
        chl.length += Buffer.byteLength(data);

        if (chl.contentLength == null) {
            const i = data.indexOf(options.delimiter!);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).readUInt32BE(0);
                chl.contentLength = rawContentLength;

                if (isNaN(chl.contentLength) || (options.maxSize && chl.contentLength > options.maxSize)) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.buffers = [];
                    throw new PacketLengthException(rawContentLength.toString());
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
                    this.handleData(chl, rest, subscriber, options);
                }
            } else {
                subscriber.complete();
            }
        } else {
            subscriber.complete();
        }
    }

    protected concatCaches(chl: ChannelBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
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
export class BindPacketIdEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (!input.id && context.options.client) {
            input.id = context.session?.injector.get(PacketIdGenerator).getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketEncodeInterceptor implements Interceptor<Packet, Buffer, CodingsContext> {

    intercept(input: Packet<any>, next: Handler<Packet<any>, Buffer, CodingsContext>, context: CodingsContext): Observable<Buffer> {
        return next.handle(input)
            .pipe(map(data => {
                const options = context.options as TransportOpts;
                const len = Buffer.alloc(4);
                len.writeUInt32BE(data.length);
                return Buffer.concat([len, Buffer.from(options.delimiter!), data])
            }))
    }



}