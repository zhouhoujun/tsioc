import { IHeaders, Pattern, HeaderMappings } from '@tsdi/common';
import { IReadableStream } from './stream';


/**
 * Incoming message
 */
export interface Incoming<T = any> {

    id?: number | string;

    url?: string;

    method?: string;

    pattern?: Pattern;

    get headers(): IHeaders;

    get tHeaders(): HeaderMappings;


    body?: T | null

    rawBody?: any;

    path?: any;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader?(field: string): string | undefined;

}

/**
 * Incoming stream
 */
export interface IncomingStream extends IReadableStream {
    get headers(): IHeaders;
}

/**
 * client incoming message.
 */
export interface ResponseIncoming<T = any> extends Incoming<T> {
    type?: string | number;
    error?: any;
    ok?: boolean;
    status?: string | number;
    statusText?: string;
    statusMessage?: string;
}

