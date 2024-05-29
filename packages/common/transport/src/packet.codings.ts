import { Abstract, ArgumentExecption, Injectable, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InvalidJsonException } from '@tsdi/core';
import { HeaderMappings, Packet } from '@tsdi/common';
import { DecodeHandler, EncodeHandler, Codings } from '@tsdi/common/codings';
import { TransportContext } from './context';
import { Observable } from 'rxjs';
import { StreamAdapter, isBuffer, toBuffer } from './StreamAdapter';
// import { Packet, PacketData } from './packet';
import { IReadableStream } from './stream';
import { HandlerSerialization, HeaderDeserialization } from './mesage.codings';


export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<Packet<any>, Packet<Buffer | IReadableStream>, TransportContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Packet<Buffer | IReadableStream>, Packet<any>, TransportContext>[]>('PACKET_DECODE_INTERCEPTORS');



@Injectable({ static: true })
export class PacketCodingsHandlers {

    constructor(private streamAdapter: StreamAdapter) { }

    @DecodeHandler(Packet, { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    async bufferDecode(context: TransportContext) {
        const pkg = context.last<Packet<string | Buffer | IReadableStream>>();
        if (pkg.headers) return pkg;

        const options = context.options;
        const input = isString(pkg.payload) ? Buffer.from(pkg.payload) : pkg.payload;

        if (options.headDelimiter) {
            const injector = context.session!.injector;
            const headDelimiter = Buffer.from(options.headDelimiter);
            const headerDeserialization = injector.get(HeaderDeserialization, null);

            let packet: Packet | undefined;
            if (this.streamAdapter.isReadable(input)) {
                let buffer = input.read(1) as Buffer;
                while (buffer.indexOf(headDelimiter) < 0) {
                    buffer = Buffer.concat([buffer, input.read(1)]);
                }
                const headBuffer = buffer.subarray(0, buffer.length - headDelimiter.length);
                if (input.length) {
                    input.length = input.length - buffer.length;
                }
                packet = this.parsePacket(headBuffer, input, headerDeserialization);

            } else if (input) {
                const idx = input.indexOf(headDelimiter);
                if (idx > 0) {
                    const headBuffer = input.subarray(0, idx);
                    packet = this.parsePacket(headBuffer, input.subarray(idx + Buffer.byteLength(headDelimiter)), headerDeserialization);
                } else {
                    packet = new Packet({ payload: input });
                }
            }
            return packet ?? pkg;
        } else {
            const buff = this.streamAdapter.isReadable(input) ? await toBuffer(input, context.options.maxSize) : input!;
            const packet = this.parseJson(buff);
            if (!packet.id) {
                packet.id = pkg.id;
            }
            return new Packet(packet)
        }

    }

    parseJson(data: Buffer) {
        const jsonStr = new TextDecoder().decode(data);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr)
        }
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


    @EncodeHandler(Packet, { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    async bufferEncode(context: TransportContext) {
        const options = context.options;

        const input = context.last<Packet>();
        // if (input.headers instanceof HeaderMappings) {
        //     input.headers = input.headers.getHeaders();
        // }

        const injector = context.session!.injector;
        if (options.headDelimiter) {
            const headDelimiter = Buffer.from(options.headDelimiter);

            const handlerSerialization = injector.get(HandlerSerialization, null);

            const hbuff = handlerSerialization ? handlerSerialization.serialize(input) : Buffer.from(JSON.stringify(input.headers.getHeaders()));

            const data = await this.streamAdapter.encode(input.payload, options.encoding);

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
        } else {

        }
    }
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

