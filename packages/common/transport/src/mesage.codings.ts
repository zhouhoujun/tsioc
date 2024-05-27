import { Abstract, Injectable, isUndefined } from '@tsdi/ioc';
import { InvalidJsonException } from '@tsdi/core';
import { HeadersLike, IHeaders, Packet, PacketOpts } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext } from './context';
import { IReadableStream } from './stream';
import { StreamAdapter, toBuffer } from './StreamAdapter';


export class Message<T> extends Packet<T> {

    readonly id: string | number;

    constructor(init: {
        id: string | number,
        headers?: HeadersLike;
        payload?: T;
    }, options?: PacketOpts) {
        super(init, options);
        this.id = init.id
    }
}


export class JsonMessage extends Message<any> {
    constructor(init: {
        id: string | number,
        payload?: any,
        headers: IHeaders,
    }) {
        super(init);
    }
}

export class BufferMessage extends Message<Buffer> {
    constructor(init: {
        id: string | number,
        payload?: Buffer,
        headers: IHeaders,
    }) {
        super(init);
    }
}

export class StreamMessage extends Message<IReadableStream> {
    constructor(init: {
        id: string | number,
        payload?: IReadableStream,
        headers: IHeaders,
    }) {
        super(init);
    }
}


@Injectable({ static: true })
export class MessageCodingsHandlers {

    constructor(private streamAdapter: StreamAdapter) { }

    @DecodeHandler(StreamMessage)
    async streamMessageDecode(message: StreamMessage, context: TransportContext) {

        if (!message.headers) {
            let input: IReadableStream | undefined;
            if (message.payload) {
                input = message.payload
            } else if (this.streamAdapter.isReadable(message)) {
                input = message;
            }
            if (!input) return message;

            if (context.options.headDelimiter) {
                const headDelimiter = Buffer.from(context.options.headDelimiter);
                const injector = context.session!.injector;
                const headerDeserialization = injector.get(HeaderDeserialization, null);

                let buffer = input.read(1) as Buffer;
                while (buffer.indexOf(headDelimiter) < 0) {
                    buffer = Buffer.concat([buffer, input.read(1)]);
                }
                const headBuffer = buffer.subarray(0, buffer.length - headDelimiter.length);
                if (input.length) {
                    input.length = input.length - buffer.length;
                }
                const packet = this.parsePacket(headBuffer, input, headerDeserialization);
                if (!packet.id) {
                    packet.id = message.id;
                }
                return new StreamMessage(packet);
            } else {
                const buffers = await toBuffer(input, context.options.maxSize);
                const packet = this.parseJson(buffers);
                if (!packet.id) {
                    packet.id = message.id;
                }
                return new JsonMessage(packet);
            }

        }
        return message;
    }


    @DecodeHandler(BufferMessage)
    buffMessageDecode(message: BufferMessage, context: TransportContext) {
        if (!message.headers) {
            if (context.options.headDelimiter) {
                const headDelimiter = Buffer.from(context.options.headDelimiter);
                const idx = message.payload?.indexOf(headDelimiter);
                if (!isUndefined(idx) && idx > 0) {
                    const headBuffer = message.payload!.subarray(0, idx);
                    const injector = context.session!.injector;
                    const headerDeserialization = injector.get(HeaderDeserialization, null);
                    const packet = this.parsePacket(headBuffer, message.payload!.subarray(idx + Buffer.byteLength(headDelimiter)), headerDeserialization);
                    if (!packet.id) {
                        packet.id = message.id;
                    }
                    return new BufferMessage(packet)
                } else {
                    return message;
                }
            } else if (message.payload) {
                const packet = this.parseJson(message.payload);
                if (!packet.id) {
                    packet.id = message.id;
                }
                return new JsonMessage(packet);
            }
        }
        return message;
    }

    private parsePacket(headBuffer: Buffer, payload: Buffer | IReadableStream, headerDeserialization?: HeaderDeserialization | null) {
        let packet: any;
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

    parseJson(data: Buffer) {
        const jsonStr = new TextDecoder().decode(data);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr)
        }
    }


    @EncodeHandler(StreamMessage)
    streamEncode(message: StreamMessage, context: TransportContext) {
        let input: IReadableStream | undefined;
        if (message.payload) {
            input = message.payload
        } else if (this.streamAdapter.isReadable(message)) {
            input = message;
        }
        message.headers
        // input.streamLength = (input.payloadLength ?? 0) + Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter);
        // return this.streamAdapter.pipeline(data, this.streamAdapter.createPassThrough({
        //     transform: (chunk, encoding, callback) => {
        //         if (isFist) {
        //             isFist = false;
        //             callback(null, Buffer.concat([hbuff, headDelimiter, chunk], Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter) + Buffer.byteLength(chunk)))
        //         } else {
        //             callback(null, chunk)
        //         }
        //     }
        // }));


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
