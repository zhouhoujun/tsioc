import { Pattern, TransportHeaders } from '@tsdi/common';
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
    headers?: TransportHeaders;
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
export interface ResponsePacket<T = any, TStatus= any> extends Packet<T> {
    type?: number | string;
    status?: TStatus;
    statusText?: string;
    ok?: boolean;
    error?: any;
}
