import { Abstract, Injectable, isString, tokenId } from '@tsdi/ioc';
import { ExecptionHandler, Interceptor, InvalidJsonException } from '@tsdi/core';
import { Message, MessageFactory, Packet, PacketOpts } from '@tsdi/common';
import { CodingType, CodingsNotHandleExecption, DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext } from './context';
import { StreamAdapter, isBuffer, toBuffer } from './StreamAdapter';
import { IReadableStream } from './stream';
import { throwError } from 'rxjs';
import { IncomingPacket, ClientIncomingPacket, IncomingFactory, ClientIncomingFactory } from './Incoming';
import { OutgoingPacket } from './Outgoing';


export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<Packet<any>, Packet<Buffer | IReadableStream>, TransportContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Packet<Buffer | IReadableStream>, Packet<any>, TransportContext>[]>('PACKET_DECODE_INTERCEPTORS');


@Abstract()
export abstract class HandlerSerialization {
    abstract serialize(packet: Packet): Buffer;
}

@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): PacketOpts;
}



@Injectable({ static: true })
export class PacketCodingsHandlers {

    constructor(private streamAdapter: StreamAdapter) { }

    @DecodeHandler(Message, { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    async messageDecode(context: TransportContext) {
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
                if (msg.headers['stream-length']) {
                    msg.headers['stream-length'] = msg.headers['stream-length'] as number - buffer.length;
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
        const { data: payload, ...opts } = msg;
        if (options.client) {
            return injector.get(ClientIncomingFactory).create({ payload, ...opts })
        }
        return injector.get(IncomingFactory).create({ payload, ...opts })

    }


    @EncodeHandler(Packet, { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    async packetEncode(context: TransportContext) {
        const options = context.options;

        const pkg = context.last<Packet>();

        const injector = context.session!.injector;

        let data = await this.streamAdapter.encode(pkg.payload, options.encoding);
        let json: any;
        if (options.headDelimiter) {
            const headDelimiter = Buffer.from(options.headDelimiter);

            const handlerSerialization = injector.get(HandlerSerialization, null);

            const hbuff = handlerSerialization ? handlerSerialization.serialize(pkg) : Buffer.from(JSON.stringify(pkg.headers.getHeaders()));

            if (this.streamAdapter.isReadable(data)) {
                let isFist = true;
                pkg.headers.set('stream-length', pkg.headers.getContentLength() + Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter));
                data = this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
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
                if (!data) {
                    data = Buffer.alloc(0)
                }
                const bbuff = isBuffer(data) ? data : Buffer.from(data as string);
                data = Buffer.concat([hbuff, headDelimiter, bbuff], Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter) + Buffer.byteLength(bbuff));
            }
            json = pkg.toJson();
        } else {
            if (this.streamAdapter.isReadable(data)) {
                data = await toBuffer(data, context.options.maxSize);
                json = pkg.clone({ payload: data }).toJson();
                data = Buffer.from(JSON.stringify(json))
            } else if (data) {
                data = isString(data) ? data : new TextDecoder().decode(data);
                json = pkg.clone({ payload: data }).toJson();
                data = Buffer.from(JSON.stringify(json))
            } else {
                json = pkg.toJson();
                data = Buffer.from(JSON.stringify(json)) // pkg.payload;
            }
        }
        json.data = data;
        return injector.get(MessageFactory).create(json);
    }

    @EncodeHandler(OutgoingPacket, { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    outgoingEncode(context: TransportContext) {
        return this.packetEncode(context)
    }


    // @ExecptionHandler(CodingsNotHandleExecption)
    // noHandle(execption: CodingsNotHandleExecption) {

    //     const context = execption.codingsContext as TransportContext;

    //     if (execption.target instanceof Message) {
    //         if (execption.codingType === CodingType.Encode) {
    //             return this.codings.encodeType(Message, execption.target, context)
    //         } else {
    //             return this.codings.decodeType(Message, execption.target, context)
    //         }
    //     }

    //     if (execption.target instanceof IncomingPacket) {
    //         if (execption.codingType === CodingType.Decode) {
    //             return this.codings.decodeType(IncomingPacket, execption.target, context);
    //         }
    //         return throwError(() => execption);
    //     } else if (execption.target instanceof OutgoingPacket) {
    //         if (execption.codingType === CodingType.Encode) {
    //             return this.codings.encodeType(OutgoingPacket, execption.target, context);
    //         }
    //         return throwError(() => execption);
    //     } else if (execption.target instanceof ClientIncomingPacket) {
    //         if (execption.codingType === CodingType.Decode) {
    //             return this.codings.decodeType(ClientIncomingPacket, execption.target, context);
    //         }
    //         return throwError(() => execption);
    //     } else if (execption.target instanceof Packet) {
    //         if (execption.codingType === CodingType.Encode) {
    //             return this.codings.encodeType(Packet, execption.target, context)
    //         } else {
    //             return this.codings.decodeType(Packet, execption.target, context)
    //         }
    //     }
    // }



    private parseJson(data: Buffer) {
        const jsonStr = new TextDecoder().decode(data);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr)
        }
    }


    private parsePacket(headBuffer: Buffer, payload: Buffer | IReadableStream, headerDeserialization?: HeaderDeserialization | null) {
        let packet: PacketOpts;
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

}

