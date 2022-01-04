/**
 * read packet.
 */
export interface ReadPacket<T = any> {
    pattern: any;
    data: T;
}

/**
 * write packet.
 */
export interface WritePacket<T = any> {
    err?: any;
    error?: Error;
    response?: T;
    disposed?: boolean;
    status?: string | number;
    ok?: boolean;
    body?: any;
}

export type TransportEvent = ReadPacket;
export type TransportRequest = Required<{ id: string }> & ReadPacket;
export type TransportResponse = Required<{ id: string }> & WritePacket;
