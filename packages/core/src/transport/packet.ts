/**
 * packet data.
 */
export interface Packet<T = any> {
    id?: any;
    url?: string;
    type?: number;
    payload?: T;
}

/**
 * Response Packet.
 */
export interface ResponsePacket<TStatus = any> {
    error?: Error;
    status: TStatus,
    statusText?: string;
    body?: any;
}
