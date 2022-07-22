import { IncommingHeaders, OutgoingHeader, OutgoingHeaders, ReqHeaders, ResHeaders } from './headers';


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
     * headers
     */
    readonly headers?: Record<string, any>;
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    readonly body?: T | null;
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


/**
 * client request packet.
 */
export interface RequestPacket<T = any> extends Packet<T> {
    /**
     * packet id.
     */
    readonly id?: string;
    /**
     * headers
     */
    readonly headers: ReqHeaders;
    /**
     * Outgoing URL
     */
    get url(): string;
    /**
     * Outgoing URL parameters.
     */
    get params(): Record<string, string | string[] | number | any>;
    /**
     * The outgoing request method.
     */
    get method(): string | undefined;
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
 * client request packet
 */
export interface ClientRequsetPacket<T = any> extends RequestPacket<T> {
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    get body(): T | null;
    /**
     * set body.
     */
    set body(val: T | null);

    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     * 
     * @returns type of  ArrayBuffer | Stream | Buffer | Blob | FormData | string | null
     */
    serializeBody(): any;

    /**
     * Examine the body and attempt to infer an appropriate MIME type
     * for it.
     *
     * If no such type can be inferred, this method will return `null`.
     */
    detectContentTypeHeader(): string | null
}


/**
 * client response packet.
 */
export interface ResponseHeader<T = any> extends Packet<T> {
    /**
     * request url.
     */
    readonly url?: string;
    /**
     * headers
     */
    readonly headers: ResHeaders;
    /**
     * is response status ok or not.
     */
    readonly ok?: boolean;
    /**
     * Get response status code.
     */
    get status(): number;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusMessage(): string;
}

/**
 * client response packet.
 */
export interface ResponsePacket<T = any> extends ResponseHeader<T> {
    /**
     * Get response body.
     *
     * @return {T}
     * @api public
     */
    get body(): T | null;
}

/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 */
export interface ResponseJsonParseError {
    error: Error;
    text: string;
}

/**
 * client response event.
 */
export type ResponseEvent<T = any> = ResponsePacket<T> | ResponseHeader;




/**
 * server side incoming packet.
 */
export interface IncomingPacket<T = any> extends Packet<any> {
    /**
     * packet id.
     */
    readonly id?: string;
    /**
     * headers
     */
    readonly headers: IncommingHeaders;
    /**
     * Outgoing URL
     */
    readonly url?: string;
    /**
     * Outgoing URL parameters.
     */
    readonly params?: Record<string, string | string[] | number | any>;
    /**
     * The outgoing request method.
     */
    readonly method?: string;
    /**
     * pipe
     * @param destination 
     * @param options 
     */
    pipe(destination: T, options?: { end?: boolean | undefined; }): T;
}

/**
 * server outgoing packet
 */
export interface OutgoingPacket {
    /**
     * Get response status code.
     */
    get statusCode(): number;
    /**
     * Set response status code.
     */
    set statusCode(status: number);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusMessage(): string;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    set statusMessage(msg: string);

    /**
     * headers has sent or not.
     */
    get headersSent(): boolean;
    /**
     * Get all headers.
     */
    getHeaders(): OutgoingHeaders;

    /**
     * has header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * Return header.
     *
     * Examples:
     *
     *     this.getHeader('Content-Type');
     *     // => "text/plain"
     *
     *     this.getHeader('content-type');
     *     // => "text/plain"
     *
     *     this.getHeader('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    getHeader(field: string): OutgoingHeader;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.setHeader('Foo', ['bar', 'baz']);
     *    this.setHeader('Accept', 'application/json');
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: OutgoingHeader): void;
    /**
     * append header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.appendHeader('Foo', ['bar', 'baz']);
     *    this.appendHeader('Accept', 'application/json');
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    appendHeader?(field: string, val: OutgoingHeader): void;
    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void;

    /**
     * write head
     * @param statusCode 
     * @param headers 
     */
    writeHead(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    /**
     * write head
     * @param statusCode 
     * @param statusMessage 
     * @param headers 
     */
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[]): this;
}

