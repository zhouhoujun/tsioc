import { Abstract, Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { Observable, Subscriber, mergeMap } from 'rxjs';
import { Packet } from '../../packet';
import { PacketLengthException } from '../../execptions';
import { CodingsContext } from '../context';
import { TransportOpts } from '../../TransportSession';


@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): Packet;
}


@Abstract()
export abstract class PayloadDeserialization {
    abstract deserialize(data: Buffer): Packet;
}


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
export class ConcatPacketDecodeInterceptor implements Interceptor<Buffer, Packet, CodingsContext> {

    protected channels: Map<string, ChannelBuffer>;

    constructor(
    ) {
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
                const rawContentLength = buffer.subarray(0, idx).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength) || (options.maxSize && chl.contentLength > options.maxSize)) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.buffers = [];
                    throw new PacketLengthException(rawContentLength);
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
