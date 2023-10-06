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
    payload?: T;
}


/**
 * request packet data.
 */
export interface RequestPacket<T = any> extends Packet<T> {
    headers?: IncomingHeaders;
}

/**
 * response packet data.
 */
export interface ResponsePacket<T = any> extends Packet<T> {
    type?: number | string;
    headers?: OutgoingHeaders;
    status?: string | number;
    statusText?: string
}


