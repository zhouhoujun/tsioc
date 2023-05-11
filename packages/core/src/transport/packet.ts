import { IncomingHeaders } from './headers';

/**
 * packet data.
 */
export interface Packet<T = any> {
    id?: any;
    url?: string;
    topic?: string;
    method?: string;
    type?: number;
    headers?: IncomingHeaders;
    payload?: T;
    error?: any;
}
