import { Pattern } from './pattern';

/**
 * read packet.
 */
export interface ReadPacket<T = any> {
    pattern: Pattern;
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

export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;
