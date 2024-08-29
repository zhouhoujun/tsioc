import { HeadersLike } from './headers';

/**
 * Incoming message
 */
export interface Incoming<T> {

    id?: number | string;

    url?: string;
    pattern?: string;
    method?: string;

    headers: HeadersLike;

    params?: Record<string, any>;

    query?: Record<string, any>

    payload?: any;

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
 * Client Outgoing message
 */
export interface ClinetOutgoing<T>  extends Incoming<T> {

}