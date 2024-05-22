import { Abstract, ArgumentExecption, Injectable, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InvalidJsonException } from '@tsdi/core';
import { TransportHeaders } from '@tsdi/common';
import { DecodeHandler, EncodeHandler, Codings } from '@tsdi/common/codings';
import { TransportContext } from './context';
import { Observable } from 'rxjs';
import { StreamAdapter, isBuffer } from './StreamAdapter';
import { Packet, PacketData } from './packet';
import { IReadableStream } from './stream';


export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, TransportContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer, PacketData, TransportContext>[]>('PACKET_DECODE_INTERCEPTORS');

export class JsonPacket {

    constructor(options: Packet) {

    }

}

export class BufferPacket {
    constructor(options: Packet, readonly headDelimiter: string) {

    }
}


export class StreamPacket {
    constructor(options: Packet, readonly headDelimiter: string) {

    }
}


@Injectable({ static: true })
export class PacketCodingsHandlers {

    constructor(private streamAdapter: StreamAdapter) { }

    @DecodeHandler('PACKET', { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    async bufferDecode(context: TransportContext) {
        const options = context.options;
        if (!options.headDelimiter) throw new ArgumentExecption('headDelimiter');

        const data = context.last<string | Buffer | IReadableStream>();
        const input = isString(data) ? Buffer.from(data) : data;


        const injector = context.session!.injector;
        const headDelimiter = Buffer.from(options.headDelimiter);
        const headerDeserialization = injector.get(HeaderDeserialization, null);

        let packet: PacketData;

        if (this.streamAdapter.isReadable(input)) {
            if (input.payload) {
                packet = { payload: input };
            } else {
                let buffer = input.read(1) as Buffer;
                while (buffer.indexOf(headDelimiter) < 0) {
                    buffer = Buffer.concat([buffer, input.read(1)]);
                }
                const headBuffer = buffer.subarray(0, buffer.length - headDelimiter.length);
                if (input.length) {
                    input.length = input.length - buffer.length;
                }
                packet = this.parsePacket(headBuffer, input, headerDeserialization);
            }
        } else {
            const idx = input.indexOf(headDelimiter);
            if (idx > 0) {
                const headBuffer = input.subarray(0, idx);
                packet = this.parsePacket(headBuffer, input.subarray(idx + Buffer.byteLength(headDelimiter)), headerDeserialization);
            } else {
                packet = { payload: input };
            }
        }

        return packet;
    }

    private parsePacket(headBuffer: Buffer, payload: Buffer | IReadableStream, headerDeserialization?: HeaderDeserialization | null) {
        let packet: Packet;
        if (headerDeserialization) {
            packet = headerDeserialization.deserialize(headBuffer)
        } else {
            const jsonStr = new TextDecoder().decode(headBuffer);
            try {
                packet = JSON.parse(jsonStr);
            } catch (err) {
                throw new InvalidJsonException(err, jsonStr)
            }
        }
        packet.payload = payload;
        return packet;
    }


    @EncodeHandler('PACKET', { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    async bufferEncode(context: TransportContext) {
        const options = context.options;
        if (!options.headDelimiter) throw new ArgumentExecption('headDelimiter');

        const input = context.last<PacketData>();
        if (input.headers instanceof TransportHeaders) {
            input.headers = input.headers.getHeaders();
        }

        const injector = context.session!.injector;
        const headDelimiter = Buffer.from(options.headDelimiter);


        const handlerSerialization = injector.get(HandlerSerialization, null);
        const { payload, ...headers } = input;
        const hbuff = handlerSerialization ? handlerSerialization.serialize(headers) : Buffer.from(JSON.stringify(headers));

        const data = await this.streamAdapter.encode(payload, options.encoding);

        if (this.streamAdapter.isReadable(data)) {
            let isFist = true;
            input.streamLength = (input.payloadLength ?? 0) + Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter);
            return this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
                transform: (chunk, encoding, callback) => {
                    if (isFist) {
                        isFist = false;
                        callback(null, Buffer.concat([hbuff, headDelimiter, chunk], Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter) + Buffer.byteLength(chunk)))
                    } else {
                        callback(null, chunk)
                    }
                }
            }));
        } else {
            const bbuff = isBuffer(data) ? data : Buffer.from(data as string);
            return Buffer.concat([hbuff, headDelimiter, bbuff], Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter) + Buffer.byteLength(bbuff));
        }
    }
}


@Abstract()
export abstract class HandlerSerialization {
    abstract serialize(packet: Packet): Buffer;
}

@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): Packet;
}


@Injectable()
export class PackageifyDecodeInterceptor implements Interceptor<any, any, TransportContext> {
    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        if (context.options.headDelimiter) {
            return this.codings.decodeType('PACKET', input, context);
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class PackageifyEncodeInterceptor implements Interceptor<any, any, TransportContext> {

    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
        if (context.options.headDelimiter) {
            return this.codings.encodeType('PACKET', input, context);
        }
        return next.handle(input, context);
    }

}

