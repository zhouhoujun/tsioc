import { IncomingHeaders, OutgoingHeaders } from './headers';



/**
 * packet data.
 */
export interface HeaderPacket {
    id?: any;
    url?: string;
    topic?: string;
    method?: string;
    type?: number | string;
    headers?: IncomingHeaders | OutgoingHeaders;
    error?: any;
    replyTo?: string;

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
export type StatusCode = string | number;

// /**
//  * response packet data.
//  */
// export interface ResponsePacket<T = any> extends Packet<T> {
//     type?: number | string;
//     headers?: OutgoingHeaders;
//     status?: StatusCode;
//     statusText?: string;
// }
