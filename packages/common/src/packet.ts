import { Abstract } from '@tsdi/ioc';
import { Pattern } from './pattern';
import { HeaderFields, HeadersLike, TransportHeaders } from './headers';



/**
 * packet data.
 */
export interface PacketInitOpts<T = any> {
    id?: any;
    type?: number | string;
    pattern?: Pattern;
    url?: string;
    topic?: string;
    method?: string;
    headers?: HeadersLike;
    payload?: T;
    error?: any;
}




export interface PacketOpts {
    readonly headerFields?: HeaderFields;
    readonly defaultMethod?: string;
}



/**
 * packet.
 */
export class Packet<T = any> {

    payload: T | null;

    get body(): T | null {
        return this.payload;
    }

    readonly headers: TransportHeaders;
    constructor(init: {
        headers?: HeadersLike;
        payload?: T;
    }, options?: PacketOpts) {
        this.headers = new TransportHeaders(init.headers, options?.headerFields);
        this.payload = init.payload ?? null;
    }
}



@Abstract()
export abstract class PacketFactory {
    abstract create<T>(packet: PacketInitOpts<T>, options?: PacketOpts): Packet<T>
}