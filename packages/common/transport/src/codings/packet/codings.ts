import { Abstract, ArgumentExecption, Injectable, isNil, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { TransportHeaders } from '@tsdi/common';
import { DecodeHandler, EncodeHandler } from '../metadata';
import { CodingsContext } from '../context';
import { Observable } from 'rxjs';
import { StreamAdapter, toBuffer } from '../../StreamAdapter';
import { Packet, PacketData } from '../../packet';
import { Codings } from '../Codings';
import { IReadableStream } from '../../stream';


export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer, PacketData, CodingsContext>[]>('PACKET_DECODE_INTERCEPTORS');


@Injectable({ static: true })
export class PacketCodingsHandlers {

    constructor(private streamAdapter: StreamAdapter) { }

    @DecodeHandler('PACKET', { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    async bufferDecode(context: CodingsContext) {
        const options = context.options;
        if (!options.headDelimiter) throw new ArgumentExecption('headDelimiter');

        const data = context.last<string | Buffer | IReadableStream>();
        let input = isString(data) ? Buffer.from(data) : data;


        const injector = context.session!.injector;
        const headDelimiter = Buffer.from(options.headDelimiter);
        const headerDeserialization = injector.get(HeaderDeserialization, null);

        let packet: PacketData;

        if (this.streamAdapter.isReadable(input)) {
            if (input.payload) {
                return { payload: input };
            }
            input = await toBuffer(input, options.maxSize);
        }

        const idx = input.indexOf(headDelimiter);
        if (idx > 0) {
            const headers = headerDeserialization ? headerDeserialization.deserialize(input.subarray(0, idx)) : JSON.parse(new TextDecoder().decode(input.subarray(0, idx)));
            packet = headers;
            packet.payload = input.subarray(idx + Buffer.byteLength(headDelimiter));
        } else {
            packet = { payload: input };
        }

        return packet;
    }



    @EncodeHandler('PACKET', { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    bufferEncode(context: CodingsContext) {
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

        if (this.streamAdapter.isReadable(payload)) {
            let isFist = true;
            input.streamLength = (input.payloadLength ?? 0) + Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter);
            return this.streamAdapter.pipeline(payload, this.streamAdapter.createPassThrough({
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
            const payloadSerialization = injector.get(PayloadSerialization, null);

            const bbuff = isNil(payload) ? Buffer.alloc(0) : (payloadSerialization ? payloadSerialization.serialize(payload) : Buffer.from(JSON.stringify(payload)));
            return Buffer.concat([hbuff, headDelimiter, bbuff], Buffer.byteLength(hbuff) + Buffer.byteLength(headDelimiter) + Buffer.byteLength(bbuff));

        }

    }
}


@Abstract()
export abstract class HandlerSerialization {
    abstract serialize(packet: Packet): Buffer;
}


@Abstract()
export abstract class PayloadSerialization {
    abstract serialize(packet: Packet): Buffer;
}


@Abstract()
export abstract class HeaderDeserialization {
    abstract deserialize(data: Buffer): Packet;
}


@Abstract()
export abstract class PayloadDeserialization {
    abstract deserialize(data: Buffer): Packet;
}



@Injectable()
export class PackageifyDecodeInterceptor implements Interceptor<any, any, CodingsContext> {
    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {
        if (context.options.headDelimiter) {
            return this.codings.decodeType('PACKET', input, context);
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class PackageifyEncodeInterceptor implements Interceptor<any, any, CodingsContext> {

    constructor(private codings: Codings) { }

    intercept(input: any, next: Handler<any, any, CodingsContext>, context: CodingsContext): Observable<any> {
        if (context.options.headDelimiter) {
            return this.codings.encodeType('PACKET', input, context);
        }
        return next.handle(input, context);
    }

}

