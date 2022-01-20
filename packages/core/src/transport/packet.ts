import { Pattern } from './pattern';

/**
 * read packet.
 */
export interface ReadPacket<T = any> {
    /**
     * request pattern.
     */
    pattern: Pattern;
    /**
     * packet data.
     */
    body: T;
    event?: boolean;
}

/**
 * write packet.
 */
export interface WritePacket<T = any> {
    error?: Error;
    disposed?: boolean;
    status: string | number;
    ok?: boolean;
    body: T;
}

export type TransportEvent = ReadPacket;
export type TransportRequest = Required<{ id: string }> & ReadPacket;
export type TransportResponse = Required<{ id: string }> & WritePacket;

export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;
