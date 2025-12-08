import { IHeaders } from './headers';


export interface Packet<T = any> {
    /**
     * packet id
     */
    id?: string | number;

    /**
     * topic
     */
    topic?: string;

    /**
     * properties
     */
    properties?: Record<string, any>;

    /**
     * packet headers.
     */
    headers?: IHeaders;

    /**
     * packet
     */
    payload: T | null;

    /**
     * cache length
     */
    length?: number;

    /**
     * content lenght
     */
    contentLength?: number | null;
}