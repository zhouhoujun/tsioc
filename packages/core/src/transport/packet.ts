/**
 * pattern type.
 */
export type Pattern = string | number | Record<string, string | number | Record<string, string | number>>;

/**
 * read packet.
 */
export interface ReadPacket<T = any> extends Record<string, any> {
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
 * mqtt protocol.
 */
export type MqttProtocol = 'mqtt' | 'mqtts' | 'tls' | 'ws' | 'wss' | 'wxs' | 'alis';
/**
 * http protocol.
 */
export type HttpProtocol = 'http' | 'https';
/**
 * transport protocol.
 */
export type Protocol = 'tcp' | 'grpc' | 'rmq' | 'kafka' | 'redis' | 'amqp' | 'ssl' | 'msg' | HttpProtocol | MqttProtocol;

/**
 * write packet.
 */
export interface WritePacket<T = any> extends Record<string, any> {
    error?: Error;
    disposed?: boolean;
    status?: string | number;
    ok?: boolean;
    body?: T;
}

export type TransportEvent<T = any> = ReadPacket<T>;
export type TransportRequest = Required<{ id: string }> & ReadPacket;
export type TransportResponse = Required<{ id: string }> & WritePacket;

export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;
