import { Abstract, Injectable, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InvalidJsonException } from '@tsdi/core';
import { Message, MessageFactory, Packet, PacketFactory, PacketInitOpts } from '@tsdi/common';
import { DecodeHandler, EncodeHandler, Codings } from '@tsdi/common/codings';
import { TransportContext } from './context';
import { Observable } from 'rxjs';
import { StreamAdapter, isBuffer, toBuffer } from './StreamAdapter';
import { IReadableStream } from './stream';


export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<Packet<any>, Packet<Buffer | IReadableStream>, TransportContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Packet<Buffer | IReadableStream>, Packet<any>, TransportContext>[]>('PACKET_DECODE_INTERCEPTORS');



@Injectable({ static: true })
export class PacketCodingsHandlers {

    constructor(private streamAdapter: StreamAdapter) { }

    @DecodeHandler(Message, { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    async bufferDecode(context: TransportContext) {
        let msg = context.last<Message>();

        const options = context.options;
        const data = isString(msg.data) ? Buffer.from(msg.data) : msg.data;
        const injector = context.session!.injector;

        if (options.headDelimiter) {
            const headDelimiter = Buffer.from(options.headDelimiter);
            const headerDeserialization = injector.get(HeaderDeserialization, null);

            // let packet: Packet | undefined;
            if (this.streamAdapter.isReadable(data)) {
                let buffer = data.read(1) as Buffer;
                while (buffer.indexOf(headDelimiter) < 0) {
                    buffer = Buffer.concat([buffer, data.read(1)]);
                }
                const headBuffer = buffer.subarray(0, buffer.length - headDelimiter.length);
                if (msg.headers.has('stream-length')) {
                    msg.headers.set('stream-length', msg.headers['stream-length'] - buffer.length);
                }
                msg = msg.clone(this.parsePacket(headBuffer, data, headerDeserialization));

            } else if (data) {
                const idx = data.indexOf(headDelimiter);
                if (idx > 0) {
                    const headBuffer = data.subarray(0, idx);
                    msg = msg.clone(this.parsePacket(headBuffer, data.subarray(idx + Buffer.byteLength(headDelimiter)), headerDeserialization));
                } else {
                    msg = msg.clone({ data: data })
                }
            }
        } else {
            const buff = this.streamAdapter.isReadable(data) ? await toBuffer(data, context.options.maxSize) : data!;
            const packet = this.parseJson(buff);
            if (!packet.id) {
                packet.id = msg.id;
            }
            msg = msg.clone(packet)
        }

        return injector.get(PacketFactory).create({ payload: msg.data, ...msg })

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
        let packet: PacketInitOpts;
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

        const pkg = context.last<Packet>();

        const injector = context.session!.injector;

        let payload: any;
        if (options.headDelimiter) {
            const headDelimiter = Buffer.from(options.headDelimiter);

            const handlerSerialization = injector.get(HandlerSerialization, null);

            const hbuff = handlerSerialization ? handlerSerialization.serialize(pkg) : Buffer.from(JSON.stringify(pkg.headers.getHeaders()));

            const data = await this.streamAdapter.encode(pkg.payload, options.encoding);


            if (this.streamAdapter.isReadable(data)) {
                let isFist = true;
                pkg.headers.set('stream-length', pkg.headers.getContentLength() + Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter));
                payload = this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
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
                payload = Buffer.concat([hbuff, headDelimiter, bbuff], Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter) + Buffer.byteLength(bbuff));
            }
        } else {
            if (this.streamAdapter.isReadable(pkg.payload)) {
                payload = await toBuffer(pkg.payload, context.options.maxSize);
                payload = Buffer.from(JSON.stringify(pkg.clone({ payload })))
            } else if (isBuffer(pkg.payload)) {
                payload = new TextDecoder().decode(payload);
                payload = Buffer.from(JSON.stringify(pkg.clone({ payload })))
            } else {
                payload = Buffer.from(JSON.stringify(pkg)) // pkg.payload;
            }
        }

        return injector.get(MessageFactory).create(payload, pkg);
    }
}


@Abstract()
export abstract class HandlerSerialization {
    abstract serialize(packet: Packet): Buffer;
}

@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): PacketInitOpts;
}



// @Injectable()
// export class PackageifyDecodeInterceptor implements Interceptor<any, any, TransportContext> {
//     constructor(private codings: Codings) { }

//     intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
//         if (context.options.headDelimiter) {
//             return this.codings.decodeType('PACKET', input, context);
//         }
//         return next.handle(input, context);
//     }
// }

// @Injectable()
// export class PackageifyEncodeInterceptor implements Interceptor<any, any, TransportContext> {

//     constructor(private codings: Codings) { }

//     intercept(input: any, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
//         if (context.options.headDelimiter) {
//             return this.codings.encodeType('PACKET', input, context);
//         }
//         return next.handle(input, context);
//     }

// }

