
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

/**
 * Response Packet.
 */
export interface ResponsePacket<TStatus = any> {
    status: TStatus,
    statusText?: string;
    body?: any;
}
