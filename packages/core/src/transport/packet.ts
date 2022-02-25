/**
 * pattern type.
 */
export type Pattern = string | number | Record<string, string | number | Record<string, string | number>>;


/**
 * request method.
 */
export type RequestMethod = 'HEAD' | 'OPTIONS' | 'GET' | 'DELETE' | 'PATCH' | 'POST' | 'PUT';

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
 * Transport Request.
 */
 export interface TransportRequest<T = any> {
    /**
     * request pattern.
     */
    pattern: Pattern;
    /**
     * request headers
     */
    headers?: Record<string, string | string[] | number>;
    /**
     * packet data.
     */
    body?: T;
}


/**
 * Transport esponse.
 */
 export interface TransportResponse<T = any>{
    error?: Error;
    type?: number;
    disposed?: boolean;
    status?: string | number;
    ok?: boolean;
    body?: T;
}

export type TransportEvent<T = any> = TransportResponse<T>;

export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;
