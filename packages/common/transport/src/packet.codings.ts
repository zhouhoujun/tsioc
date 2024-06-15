import { Abstract, Injectable, isNil, isString, tokenId } from '@tsdi/ioc';
import { Interceptor, InvalidJsonException } from '@tsdi/core';
import { Message, Packet, PacketOpts, RequestParams, isArrayBuffer, isBlob, isFormData } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
import { TransportContext } from './context';
import { StreamAdapter, isBuffer, toBuffer } from './StreamAdapter';
import { IReadableStream } from './stream';
import { OutgoingPacket } from './Outgoing';
import { ctype } from './consts';
import { UnsupportedMediaTypeExecption } from './execptions';


export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<Packet<any>, Packet<Buffer | IReadableStream>, TransportContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Packet<Buffer | IReadableStream>, Packet<any>, TransportContext>[]>('PACKET_DECODE_INTERCEPTORS');


@Abstract()
export abstract class HeaderSerialization {
    abstract serialize(packet: Packet): Buffer;
}

@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): PacketOpts;
}



@Injectable({ static: true })
export class PacketCodingsHandlers {

    @DecodeHandler(Message, { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    async messageDecode(context: TransportContext) {
        let msg = context.last<Message>();
        const { streamAdapter, incomingFactory } = context.session;
        const options = context.options;
        const data = isString(msg.data) ? Buffer.from(msg.data) : msg.data;
        const injector = context.session!.injector;

        let packet: any;
        if (options.headDelimiter) {
            const headDelimiter = Buffer.from(options.headDelimiter);
            const headerDeserialization = injector.get(HeaderDeserialization, null);

            // let packet: Packet | undefined;
            if (streamAdapter.isReadable(data)) {
                let buffer = data.read(1) as Buffer;
                while (buffer.indexOf(headDelimiter) < 0) {
                    buffer = Buffer.concat([buffer, data.read(1)]);
                }
                const headBuffer = buffer.subarray(0, buffer.length - headDelimiter.length);
                if (msg.headers['stream-length']) {
                    msg.headers['stream-length'] = msg.headers['stream-length'] as number - buffer.length;
                }
                packet = this.parsePacket(headBuffer, data, headerDeserialization);
                msg = msg.clone({ data: packet.payload ?? null, ...packet });

            } else if (data) {
                const idx = data.indexOf(headDelimiter);
                if (idx > 0) {
                    const headBuffer = data.subarray(0, idx);
                    packet = this.parsePacket(headBuffer, data.subarray(idx + Buffer.byteLength(headDelimiter)), headerDeserialization);
                    msg = msg.clone({ data: packet.payload ?? null, ...packet });
                } else {
                    msg = msg.clone({ data: data })
                }
            }
        } else {
            const buff = streamAdapter.isReadable(data) ? await toBuffer(data, context.options.maxSize) : data!;
            const opts = this.parseJson(buff);
            msg = msg.clone({ data: opts.payload ?? null, ...opts });
            packet = opts;
        }

        const { data: payload, headers, ...opts } = msg;

        return incomingFactory.create({ payload, defaultMethod: context.options.defaultMethod, ...opts, ...packet, headers })

    }


    @EncodeHandler(Packet, { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    async packetEncode(context: TransportContext) {
        const { streamAdapter, injector, messageFactory } = context.session;
        const options = context.options;

        const pkg = context.last<Packet>();


        let json: any, data: any;
        if (options.headDelimiter) {
            data = await this.encodePayload(streamAdapter, pkg, options.encoding);
            const headDelimiter = Buffer.from(options.headDelimiter);

            const headerSerialization = injector.get(HeaderSerialization, null);

            const hbuff = headerSerialization ? headerSerialization.serialize(pkg) : this.serializeHeader(pkg);

            if (streamAdapter.isReadable(data)) {
                let isFist = true;
                pkg.headers.set('stream-length', pkg.headers.getContentLength() + Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter));
                data = streamAdapter.pipeline(data, streamAdapter.createPassThrough({
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
            json = pkg.toJson();
            data = await this.encodePacket(streamAdapter, pkg, context.options.maxSize, context.options.encoding);
        }
        json.data = data;
        return messageFactory.create(json);
    }

    @EncodeHandler(OutgoingPacket, { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    outgoingEncode(context: TransportContext) {
        return this.packetEncode(context)
    }


    async encodePacket(streamAdapter: StreamAdapter, packet: Packet, maxSize?: number, encoding?: string): Promise<Buffer> {

        let source: string | Buffer | IReadableStream | null = null;

        if (isArrayBuffer(packet.payload)) {
            source = Buffer.from(packet.payload);
        } else if (Buffer.isBuffer(packet.payload)) {
            source = packet.payload;
        } else if (isBlob(packet.payload)) {
            packet.headers.setContentType(packet.payload.type);
            const arrbuff = await packet.payload.arrayBuffer();
            source = Buffer.from(arrbuff);
        } else if (streamAdapter.isFormDataLike(packet.payload)) {
            let data = packet.payload;
            if (isFormData(data)) {
                const form = streamAdapter.createFormData();
                data.forEach((v, k, parent) => {
                    form.append(k, v);
                });
                data = form;
            }
            source = data.getBuffer();
        } else if (streamAdapter.isReadable(packet.payload)) {
            source = await toBuffer(packet.payload, maxSize);
        }

        if (source) {
            source = JSON.stringify(packet.clone({ payload: isBuffer(source) ? new TextDecoder().decode(source) : source }).toJson());
        } else {
            source = JSON.stringify(packet.toJson());
        }

        source = Buffer.from(source)

        if (encoding) {
            switch (encoding) {
                case 'gzip':
                case 'deflate':
                    source = await toBuffer((streamAdapter.isReadable(source) ? source : streamAdapter.pipeline(source, streamAdapter.createPassThrough())).pipe(streamAdapter.createGzip()));
                    break;
                case 'identity':
                    break;
                default:
                    throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
            }
        }
        return source;
    }

    async encodePayload(streamAdapter: StreamAdapter, packet: Packet, encoding?: string): Promise<string | Buffer | IReadableStream | null> {
        if (isNil(packet.payload)) return null;

        let source: string | Buffer | IReadableStream;
        if (isArrayBuffer(packet.payload)) {
            source = Buffer.from(packet.payload);
        } else if (Buffer.isBuffer(packet.payload)) {
            source = packet.payload;
        } else if (isString(packet.payload)) {
            if (!packet.headers.hasContentType()) packet.headers.setContentType(ctype.TEXT_PLAIN);
            source = packet.payload;
        } else if (isBlob(packet.payload)) {
            packet.headers.setContentType(packet.payload.type);
            const arrbuff = await packet.payload.arrayBuffer();
            source = Buffer.from(arrbuff);
        } else if (streamAdapter.isFormDataLike(packet.payload)) {
            let data = packet.payload;
            if (isFormData(data)) {
                const form = streamAdapter.createFormData();
                data.forEach((v, k, parent) => {
                    form.append(k, v);
                });
                data = form;
            }
            source = data.getBuffer();
        } else if (streamAdapter.isReadable(packet.payload)) {
            source = packet.payload;
        } else if (packet.payload instanceof RequestParams) {
            packet.headers.setContentType(ctype.X_WWW_FORM_URLENCODED);
            source = packet.payload.toString();
        } else {
            packet.headers.setContentType(ctype.APPL_JSON);
            source = JSON.stringify(packet.payload);
        }
        if (encoding) {
            switch (encoding) {
                case 'gzip':
                case 'deflate':
                    source = (streamAdapter.isReadable(source) ? source : streamAdapter.pipeline(source, streamAdapter.createPassThrough())).pipe(streamAdapter.createGzip());
                    break;
                case 'identity':
                    break;
                default:
                    throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
            }
        }
        return source;
    }

    private serializeHeader(packet: Packet): Buffer {
        const { payload, ...headers } = packet.toJson();
        return Buffer.from(JSON.stringify(headers));
    }

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

