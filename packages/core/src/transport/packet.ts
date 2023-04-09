
/**
 * packet data.
 */
export interface Packet<T = any> {
    id?: any;
    url: string;
    type?: number;
    payload?: T;
    error?: Error;
}

