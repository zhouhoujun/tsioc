import { HeadersLike } from './headers';



/**
 * packet data.
 */
export interface HeaderPacket {
    id?: any;
    type?: number | string;
    headers?: HeadersLike;
    // url?: string;
    // topic?: string;
    // method?: string;
    // error?: any;
    // replyTo?: string;

}

/**
 * packet data.
 */
export interface Packet<T = any> extends HeaderPacket {
    /**
     * payload length.
     */
    length?: number;
    payload?: T;
}

export interface SendPacket extends Packet {
    /**
     * sent.
     */
    __sent?: boolean;
}




/**
 * status code
 */
export type StatusCode = string | number | undefined;

// /**
//  * response packet data.
//  */
// export interface ResponsePacket<T = any> extends Packet<T> {
//     type?: number | string;
//     headers?: OutgoingHeaders;
//     status?: StatusCode;
//     statusText?: string;
// }
