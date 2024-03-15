import { StatusCode, HeaderRecord, Pattern } from '@tsdi/common';
import { IReadableStream } from './stream';


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
    headers?: HeaderRecord;
}

/**
 * packet data.
 */
export interface Packet<T = any> extends HeaderPacket {
    payload?: T;
}

export interface PacketData<T = any> extends Packet<T> {
    headerBuffer?: Buffer;
    headerLength?: number;
    /**
     * payload length.
     */
    payloadLength?: number;
}

export interface Message {
    id?: any;
    type?: number | string;
    header?: Buffer;
    headerLength: number;
    payload?: Buffer | IReadableStream;
    payloadLenght: number;
}


/**
 * response packet data.
 */
export interface ResponsePacket<T = any> extends Packet<T> {
    type?: number | string;
    status?: StatusCode;
    statusText?: string;
    error?: any;
}

