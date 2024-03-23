import { Abstract, ArgumentExecption, Inject, Injectable, Injector, Module, Optional, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder, InputContext } from '@tsdi/common';
import { Observable, Subscriber, mergeMap, throwError } from 'rxjs';
import { Packet, PacketData } from '../packet';
import { StreamAdapter, isBuffer } from '../StreamAdapter';
import { PACKET_CODING_OPTIONS, PacketIdGenerator, PacketOptions } from './packet.encodings';
import { IDuplexStream } from '../stream';
import { PacketLengthException } from '../execptions';


@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): Packet;
}


@Abstract()
export abstract class PayloadDeserialization {
    abstract deserialize(data: Buffer): Packet;
}


@Injectable()
export class PacketDecodeBackend implements Backend<Buffer, Packet, InputContext> {
    packs: Map<string | number, PacketData & { cacheSize: number }>;

    constructor(
        private idGenerator: PacketIdGenerator,
        private streamAdapter: StreamAdapter,
        @Optional() private headerDeserialization: HeaderDeserialization,
        @Optional() private payloadDeserialization: PayloadDeserialization,
        @Inject(PACKET_CODING_OPTIONS) private options: PacketOptions
    ) {
        this.packs = new Map();
    }

    handle(input: Buffer, context: InputContext): Observable<Packet> {

        if (!isBuffer(input)) {
            return throwError(() => new ArgumentExecption('asset decoding input is not buffer'));
        }

        return new Observable((subscriber: Subscriber<Packet>) => {
            const id = this.idGenerator.readId(input);
            input = input.subarray(this.idGenerator.idLenght);

            let packet = this.packs.get(id);
            if (!packet) {
                if (this.options.headDelimiter) {
                    const hidx = input.indexOf(this.options.headDelimiter);
                    if (hidx >= 0) {
                        const headerBuf = input.subarray(0, hidx);
                        try {
                            packet = this.headerDeserialization ? this.headerDeserialization.deserialize(headerBuf) : JSON.parse(new TextDecoder().decode(headerBuf));
                            packet!.cacheSize = 0;
                        } catch (err) {
                            subscriber.error(err);
                        }
                        input = input.subarray(hidx + 1);
                    }
                } else {
                    packet = this.headerDeserialization ? this.headerDeserialization.deserialize(input) : JSON.parse(new TextDecoder().decode(input));
                }

                if (packet) {
                    const len = packet.payloadLength;
                    if (!len) {
                        packet.payload = input;
                        subscriber.next(packet);
                        subscriber.complete();
                    } else {
                        packet.payloadLength = len;
                        packet.cacheSize = input.length;
                        if (packet.cacheSize >= packet.payloadLength) {
                            packet.payload = input;
                            subscriber.next(packet);
                            subscriber.complete();
                        } else {
                            const stream = packet.payload = this.streamAdapter.createPassThrough();
                            stream.write(input);
                            this.packs.set(id, packet);
                            subscriber.complete();
                        }
                    }
                } else {
                    subscriber.complete();
                }
            } else {
                packet.cacheSize += input.length;
                (packet.payload as IDuplexStream).write(input);
                if (packet.cacheSize >= (packet.payloadLength || 0)) {
                    (packet.payload as IDuplexStream).end();
                    this.packs.delete(packet.id);
                    subscriber.next(packet);
                    subscriber.complete();
                } else {
                    subscriber.complete();
                }
            }

            return subscriber;
        });


    }
}

@Abstract()
export abstract class PacketDecodeHandler implements Handler<Buffer, Packet, InputContext> {
    abstract handle(input: Buffer, context: InputContext): Observable<Packet>
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
export class ConcatPacketDecodeInterceptor implements Interceptor<Buffer, Packet, InputContext> {

    protected channels: Map<string, ChannelBuffer>;

    constructor(
        @Inject(PACKET_CODING_OPTIONS) private options: PacketOptions
    ) {
        this.channels = new Map();
    }



    intercept(input: Buffer, next: Handler<Buffer, Packet>, context: InputContext): Observable<Packet> {
        return new Observable((subscriber: Subscriber<Buffer>) => {
            let chl = this.channels.get(this.options.transport ?? '');

            const channel = this.options.transport ?? '';
            if (!chl) {
                chl = {
                    channel,
                    buffers: [],
                    length: 0,
                    contentLength: null
                }
                this.channels.set(channel, chl)
            }
            this.handleData(chl, input, subscriber);

            return subscriber;

        }).pipe(
            mergeMap(pkgBuffer => next.handle(pkgBuffer, context))
        );
    }

    protected handleData(chl: ChannelBuffer, dataRaw: string | Buffer | Uint8Array, subscriber: Subscriber<Buffer>) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        chl.buffers.push(data);
        chl.length += Buffer.byteLength(data);

        if (chl.contentLength == null) {
            const i = data.indexOf(this.options.delimiter!);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength) || (this.options.maxSize && chl.contentLength > this.options.maxSize)) {
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
                    this.handleData(chl, rest, subscriber);
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

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer | string, any>[]>('PACKET_DECODE_INTERCEPTORS');

@Injectable()
export class PacketDecodeInterceptingHandler extends InterceptingHandler<Buffer, any, InputContext>  {
    constructor(backend: PacketDecodeBackend, injector: Injector) {
        super(backend, () => injector.get(PACKET_DECODE_INTERCEPTORS))
    }
}


@Injectable()
export class PacketDecoder extends Decoder<Buffer, any> {

    constructor(readonly handler: PacketDecodeHandler) {
        super()
    }
}


@Module({
    providers: [
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: ConcatPacketDecodeInterceptor, multi: true },
        { provide: PacketDecodeHandler, useClass: PacketDecodeInterceptingHandler },
        PacketDecoder,
    ]
})
export class PacketDecodingsModule {

}