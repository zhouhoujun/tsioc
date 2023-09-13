import { Handler, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';


export interface DecodingContext {

}

@Abstract()
export abstract class Decoder implements Handler<Buffer, Packet> {

    decode(input: Buffer): Observable<Packet> {
        return this.handle(input);
    }

    abstract handle(input: Buffer): Observable<Packet>;
}

export const DECODINGS = tokenId<Interceptor<Buffer, Packet>[]>('DECODINGS');