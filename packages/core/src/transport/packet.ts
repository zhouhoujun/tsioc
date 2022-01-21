/**
 * pattern type.
 */
export type Pattern = string | number | Record<string, string | number | Record<string, string | number>>;

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
}

/**
 * transport protocol.
 */
 export type Protocol = 'tcp' | 'grpc' | 'rmq' | 'kafka' | 'redis'
 | 'amqp' | 'msg' | 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'ssl' | 'wx' | 'wxs';

/**
 * write packet.
 */
export interface WritePacket<T = any> {
    error?: Error;
    disposed?: boolean;
    status?: string | number;
    ok?: boolean;
    body?: T;
}

export type TransportEvent = ReadPacket;
export type TransportRequest = Required<{ id: string }> & ReadPacket;
export type TransportResponse = Required<{ id: string }> & WritePacket;

export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;
