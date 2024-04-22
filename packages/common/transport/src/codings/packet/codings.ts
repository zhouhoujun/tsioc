import { Abstract, ArgumentExecption, Injectable, isString, tokenId } from '@tsdi/ioc';
import { DecodeHandler, EncodeHandler } from '../metadata';
import { CodingsContext } from '../context';
import { of, throwError } from 'rxjs';
import { isBuffer } from '../../StreamAdapter';
import { Packet, PacketData } from '../../packet';
import { TransportOpts } from '../../TransportSession';
import { Interceptor } from '@tsdi/core';



export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('PACKET_ENCODE_INTERCEPTORS');

export const PACKET_DECODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('PACKET_DECODE_INTERCEPTORS');


@Injectable({ static: true })
export class PacketCodingsHandlers {

    @DecodeHandler('PACKET', { interceptorsToken: PACKET_DECODE_INTERCEPTORS })
    decodeHandle(context: CodingsContext) {
        const data = context.last<string | Buffer>();
        let input = isString(data) ? Buffer.from(data) : data;

        if (!isBuffer(input)) {
            return throwError(() => new ArgumentExecption('asset decoding input is not buffer'));
        }
        const options = context.options as TransportOpts;
        const injector = context.session!.injector;
        const headDelimiter = options.headDelimiter ? Buffer.from(options.headDelimiter) : null;

        const idLen = options.idLen ?? 2;

        const id = idLen > 4 ? input.subarray(0, idLen).toString() : input.readIntBE(0, idLen);
        input = input.subarray(idLen);
        
        let packet = {
            id
        } as PacketData;

        if (headDelimiter) {
            const headerDeserialization = injector.get(HeaderDeserialization, null);
            const payloadDeserialization = injector.get(PayloadDeserialization, null);
            const idx = input.indexOf(headDelimiter);
            if (idx > 0) {
                const headers = headerDeserialization ? headerDeserialization.deserialize(input.subarray(0, idx)) : JSON.parse(new TextDecoder().decode(input.subarray(0, idx)));
                packet.headers = headers;
                packet.payload = payloadDeserialization ? payloadDeserialization.deserialize(input.subarray(idx + headDelimiter.length)) : JSON.parse(new TextDecoder().decode(input.subarray(idx + headDelimiter.length)));
            } else {
                packet.payload = payloadDeserialization ? payloadDeserialization.deserialize(input) : JSON.parse(new TextDecoder().decode(input));
            }
        } else {
            packet = {
                id,
                ...JSON.parse(new TextDecoder().decode(input))
            };
        }

        return packet;
    }

    @EncodeHandler('PACKET', { interceptorsToken: PACKET_ENCODE_INTERCEPTORS })
    encode(context: CodingsContext) {
        const input = context.last<Packet>();
        const options = context.options as TransportOpts;
        const injector = context.session!.injector;
        const headDelimiter = options.headDelimiter ? Buffer.from(options.headDelimiter) : null;

        if (headDelimiter) {
            const handlerSerialization = injector.get(HandlerSerialization, null);
            const payloadSerialization = injector.get(PayloadSerialization, null);
            const {payload, ...headers} = input;
            const hbuff = handlerSerialization? handlerSerialization.serialize(headers) : Buffer.from(JSON.stringify(headers));
            const bbuff = payloadSerialization? payloadSerialization.serialize(payload) : Buffer.from(JSON.stringify(payload));
            return Buffer.concat([hbuff, headDelimiter, bbuff]);
        } else {
            try {
                const jsonStr = JSON.stringify(input);
                const buff = Buffer.from(jsonStr);
                return of(buff);
            } catch (err) {
                return throwError(() => err);
            }
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


