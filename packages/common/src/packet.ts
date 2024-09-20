import { HeadersLike, HeaderMappings } from './headers';



/**
 * packet options.
 */
export interface PacketOpts<T = any> {
    /**
     * packet id.
     */
    id?: string | number,
    /**
     * headers of packet.
     */
    headers?: HeadersLike;
    /**
     * payload of packet.
     */
    payload?: T | null;
}

/**
 * Packet
 */
export abstract class Packet<T> {
    id?: string | number;
    
    abstract get headers(): HeaderMappings;
    abstract set headers(val: HeaderMappings);

    abstract get payload(): T | null;
    abstract set payload(val: T | null);

    abstract attachId(id: string | number): void;
}

/**
 * base packet.
 */
export abstract class BasePacket<T> implements Packet<T> {

    public payload: T | null;

    id?: string | number;

    readonly headers: HeaderMappings;

    constructor(init?: PacketOpts<T>) {
        if (init) {
            this.id = init.id;
            this.headers = new HeaderMappings(init.headers);
            this.payload = init.payload ?? null;
        } else {
            this.headers = new HeaderMappings();
            this.payload = null;
        }
    }

    attachId(id: string | number) {
        this.id = id;
    }

}
