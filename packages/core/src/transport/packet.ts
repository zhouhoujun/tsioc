import { InvocationContext } from '@tsdi/ioc';

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
 * transport status.
 */
 export type TransportStatus = 'Bad Request' | 'Forbidden' | 'Internal Server Error' | 'Not Acceptable' | 'Not Found' | 'Unauthorized' | 'Method Not Allowed' | number;


// /**
//  * Request packet.
//  */
//  export interface RequestPacket<T = any> {
//     /**
//      * request url.
//      */
//     get url(): string;
//     /**
//      * request protocol.
//      */
//     get protocol(): Protocol;
//     /**
//      * Whether this request should be sent with outgoing credentials (cookies).
//      */
//     get withCredentials(): boolean;
//     /**
//      * request params.
//      * Outgoing URL parameters.
//      */
//     get params(): any;
//     /**
//      * The outgoing request method.
//      */
//     get method(): string;
//     /**
//      * Shared and mutable context that can be used by middlewares
//      */
//     context: InvocationContext;
//     /**
//      * The request body, or `null` if one isn't set.
//      *
//      * Bodies are not enforced to be immutable, as they can include a reference to any
//      * user-defined data type. However, interceptors should take care to preserve
//      * idempotence by treating them as such.
//      */
//     get body(): T | null;
// }



// /**
//  * response packet.
//  */
//  export interface ResponsePacket<T = any>{
//     error?: Error;
//     type?: number;
//     status?: any;
//     statusText?: string;
//     ok?: boolean;
//     body?: T;
// }

// export type TransportEvent<T = any> = ResponsePacket<T>;

// export type HeadersOption = string[][] | Record<string, string | string[] | number> | string;
