import { Abstract } from '@tsdi/ioc';


/**
 * http request method.
 */
export type HttpRequestMethod = 'HEAD' | 'OPTIONS' | 'GET' | 'DELETE' | 'PATCH' | 'POST' | 'PUT' | 'JSONP' | 'TRACE';
/**
 * grpc request method.
 */
export type GrpcRequestMethod = 'NO_STREAM' | 'RX_STREAM' | 'PT_STREAM' | 'METHOD';

/**
 * request method.
 */
export type RequestMethod = HttpRequestMethod | GrpcRequestMethod | 'EVENT' | 'MESSAGE';// event

/**
 * request method
 */
export namespace mths {
    //http
    export const HEAD = 'HEAD';
    export const OPTIONS = 'OPTIONS';
    export const GET = 'GET';
    export const DELETE = 'DELETE';
    export const PATCH = 'PATCH';
    export const POST = 'POST';
    export const PUT = 'PUT';
    export const TRACE = 'TRACE';
    export const JSONP = 'JSONP';

    //message
    export const EVENT = 'EVENT';
    export const MESSAGE = 'MESSAGE';

    //grpc
    export const NO_STREAM = 'NO_STREAM';
    export const RX_STREAM = 'RX_STREAM';
    export const PT_STREAM = 'PT_STREAM';
    export const METHOD = 'METHOD';
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
export type Protocol = 'tcp' | 'udp' | 'grpc' | 'rmq' | 'kafka' | 'redis' | 'amqp' | 'ssl' | 'msg' | HttpProtocol | MqttProtocol;

/**
 * packet.
 */
export interface Packet<T = any> {
    /**
     * packet id.
     */
    readonly id?: string;
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    get body(): T | null;
}

/**
 * package clonable.
 */
export interface PacketClonable<T = any> {
    /**
     * clone packet.
     * @param data 
     */
    clone?(data: { body?: T }): this;
}


export interface ReqPacket<T = any> extends Packet<T> {
    method?: string;
    url: string;
    params?: Record<string, any>;
} 

/**
 * request package.
 */
@Abstract()
export abstract class RequestBase<T = any> implements Packet<T> {
    /**
     * packet id.
     */
    readonly id?: string;
    /**
     * Outgoing URL
     */
    abstract get url(): string;
    /**
     * Outgoing URL parameters.
     */
    abstract get params(): Record<string, string | string[] | number | any>;
    /**
     * The outgoing request method.
     */
    abstract get method(): string | undefined;
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    abstract get body(): T | null;

}


/**
 * request headers.
 */
export interface RequestHeader<T = any> {
    /**
     * Get all response headers.
     */
    getHeaders(): T;
    /**
     * has header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    getHeader(field: string): string | string[] | number | undefined;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void;
}

/**
 * response base.
 */
@Abstract()
export abstract class ResponseBase<T = any> implements Packet<T> {
    /**
     * Get response status code.
     */
    abstract get status(): number;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract get statusMessage(): string;
    /**
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Get response body.
     *
     * @return {T}
     * @api public
     */
    abstract get body(): T | null;
}

/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 *
 */
export interface ResponseJsonParseError {
    error: Error;
    text: string;
}

/**
 * response headers.
 */
export interface ResponseHeader<T = any> {
    /**
     * Get all response headers.
     */
    getHeaders(): T;

    /**
     * has header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * Return response header.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    getHeader(field: string): string | string[] | number | undefined;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void;
}

export type ResponseEvent<T> = ResponseBase<T> | ResponseHeader;