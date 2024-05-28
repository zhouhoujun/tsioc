import { Abstract } from '@tsdi/ioc';
import { Pattern } from './pattern';
import { HeaderFields, HeadersLike, HeaderMappings } from './headers';



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

    private _id: string | number | undefined;
    get id(): string | number | undefined {
        return this.id;
    }

    readonly headers: HeaderMappings;
    constructor(init: {
        id?: string | number,
        headers?: HeadersLike;
        payload?: T;
    }, options?: PacketOpts) {
        this._id = init.id;
        this.headers = new HeaderMappings(init.headers, options?.headerFields);
        this.payload = init.payload ?? null;
    }

    attachId(id: string | number) {
        this._id = id;
    }
}



@Abstract()
export abstract class PacketFactory {
    abstract create<T>(packet: PacketInitOpts<T>, options?: PacketOpts): Packet<T>
}