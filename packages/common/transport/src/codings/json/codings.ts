import { Injectable, isString, tokenId } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { TransportHeaders } from '@tsdi/common';
import { of, throwError } from 'rxjs';
import { DecodeHandler, EncodeHandler } from '../metadata';
import { CodingsContext } from '../context';
import { Packet, PacketData } from '../../packet';
import { InvalidJsonException } from '../../execptions';


export const JSON_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('JSON_ENCODE_INTERCEPTORS');

export const JSON_DECODE_INTERCEPTORS = tokenId<Interceptor<Buffer, PacketData, CodingsContext>[]>('JSON_DECODE_INTERCEPTORS');

@Injectable()
export class JsonCodingsHandlers {

    @DecodeHandler('JSON', { interceptorsToken: JSON_DECODE_INTERCEPTORS })
    decodeHandle(context: CodingsContext) {
        const input = context.last<string | Buffer>();
        const jsonStr = isString(input) ? input : new TextDecoder().decode(input);
        try {
            const buff = JSON.parse(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => new InvalidJsonException(err, jsonStr));
        }
    }

    @EncodeHandler('JSON', { interceptorsToken: JSON_ENCODE_INTERCEPTORS })
    encode(context: CodingsContext) {
        const input = { ...context.last<Packet>() };
        try {
            if (input.headers instanceof TransportHeaders) {
                input.headers = input.headers.getHeaders();
            }
            const jsonStr = JSON.stringify(input);
            const buff = Buffer.from(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => err);
        }
    }
}
