import { IncomingHeaders, OutgoingHeaders } from './headers';

/**
 * packet data.
 */
export interface Packet<T = any> {
    id?: any;
    url?: string;
    topic?: string;
    method?: string;
    type?: number | string;
    headers?: IncomingHeaders | OutgoingHeaders;
    payload?: T;
    error?: any;
}
