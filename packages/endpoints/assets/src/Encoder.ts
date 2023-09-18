import { Packet } from '@tsdi/common';
import { Handler, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';

export interface PacketOptions {
    /**
     * server side or not.
     */
    serverSide?: boolean;
    /**
     * packet delimiter flag
     */
    delimiter?: string;
    /**
     * packet size limit.
     */
    limit?: number;
    /**
     * payload max size limit.
     */
    maxSize?: number;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;

}


export interface EncodingContext {
    packet: Packet;
    chunk: Buffer | null;
    options: PacketOptions;

}

@Abstract()
export abstract class Encoder implements Handler<EncodingContext, Buffer> {

    encode(input: EncodingContext): Observable<Buffer> {
        return this.handle(input);
    }

    abstract handle(input: EncodingContext): Observable<Buffer>;
}

@Abstract()
export abstract class HeaderEncoder extends Encoder {

}

export const ENCODINGS = tokenId<Interceptor<EncodingContext, Buffer>[]>('ENCODINGS');