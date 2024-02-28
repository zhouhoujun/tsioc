import { StatusCode, HeaderRecords, Pattern } from '@tsdi/common';


/**
 * packet data.
 */
export interface HeaderPacket {
    id?: any;
    type?: number | string;
    pattern?: Pattern;
    url?: string;
    topic?: string;
    method?: string;
    headers?: HeaderRecords;
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

/**
 * response packet data.
 */
export interface ResponsePacket<T = any> extends Packet<T> {
    type?: number | string;
    status?: StatusCode;
    statusText?: string;
}

