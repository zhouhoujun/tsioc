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
export class Packet<T> {
    /**
     * payload
     */
    public payload: T | null;

    /**
     * packet id
     */
    id?: string | number;

    /**
     * packet headers.
     */
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
}
