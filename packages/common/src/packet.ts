import { HeadersLike } from './headers';



/**
 * Packet
 */
export abstract class Packet<T> {
    /**
     * packet id
     */
    id?: string | number;
    /**
     * packet headers.
     */
    abstract get headers(): HeadersLike;
    /**
     * payload
     */
    abstract get payload(): T | null;
}



/**
 * json packet.
 */
export class JsonPacket implements Packet<any> {

    id: string | number | undefined;
    readonly headers: HeadersLike

    constructor(public payload: any, init?: {
        id?: string | number,
        headers?: HeadersLike
    }) {
        this.id = init?.id;
        this.headers = init?.headers ?? {};
    }

}

/**
 * topic packet.
 */
export class TopicPacket implements Packet<any> {

    id: string | number | undefined;
    readonly headers: HeadersLike

    constructor(readonly topic: string, public payload: any, init?: {
        id?: string | number,
        headers?: HeadersLike
    }) {
        this.id = init?.id;
        this.headers = init?.headers ?? {};
    }

}



// /**
//  * packet options.
//  */
// export interface PacketOpts<T = any> {
//     /**
//      * packet id.
//      */
//     id?: string | number,
//     /**
//      * headers of packet.
//      */
//     headers?: HeadersLike;
//     /**
//      * payload of packet.
//      */
//     payload?: T | null;
// }

// /**
//  * Packet
//  */
// export class Packet<T> {
//     /**
//      * payload
//      */
//     public payload: T | null;

//     /**
//      * packet id
//      */
//     id?: string | number;

//     /**
//      * packet headers.
//      */
//     readonly headers: HeaderMappings;

//     constructor(init?: PacketOpts<T>) {
//         if (init) {
//             this.id = init.id;
//             this.headers = new HeaderMappings(init.headers);
//             this.payload = init.payload ?? null;
//         } else {
//             this.headers = new HeaderMappings();
//             this.payload = null;
//         }
//     }
// }
