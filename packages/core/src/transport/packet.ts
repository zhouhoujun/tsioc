import { isArray, isNil, isString } from "@tsdi/ioc";

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

export type IncommingHeader = string | readonly string[] | undefined;
export type OutgoingHeader = IncommingHeader | number;

export type IncommingHeaders = Record<string, IncommingHeader>;
export type OutgoingHeaders = Record<string, OutgoingHeader>;


/**
 * transport headers.
 */
export class HeaderSet<T extends IncommingHeader | OutgoingHeader> {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T>;
    private _normal: Map<string, string>;

    constructor(headers?: string | Record<string, T> | HeaderSet<T>) {
        this._hdrs = new Map();
        this._normal = new Map();
        if (headers) {
            if (isString(headers)) {
                headers.split('\n').forEach(line => {
                    const index = line.indexOf(':');
                    if (index > 0) {
                        const name = line.slice(0, index);
                        const value = line.slice(index + 1).trim();
                        this.append(name, value as T);
                    }
                })
            } else if (headers instanceof HeaderSet) {
                headers.forEach((n, v) => {
                    this.set(n, v as T);
                });
            } else {
                this.setHeaders(headers);
            }
        }
    }

    get headers() {
        return this.getHeaders();
    }

    getHeaders(): Record<string, T> {
        if (!this._rcd) {
            const rcd = this._rcd = {} as Record<string, T>;
            this.forEach((v, k) => {
                rcd[v] = k;
            });
        }
        return this._rcd;
    }

    setHeaders(headers: Record<string, T>): void {
        for (const f in headers) {
            this.set(f, headers[f]);
        }
        this._rcd = null!;
    }

    has(name: string): boolean {
        return this._hdrs.has(name.toLowerCase());
    }

    get(name: string): string | number | null {
        const values = this._hdrs.get(name);
        if (isNil(values)) return null;
        return isArray(values) && values.length ? values[0] : values;
    }

    set(name: string, val: T): this {
        const key = name.toLowerCase();
        if (isNil(val)) {
            this._hdrs.delete(key);
            this._normal.delete(key);
            return this;
        }
        this._normal.set(key, name);
        this._hdrs.set(key, val)

        this._rcd = null!;
        return this;
    }

    append(name: string, val: T): this {
        if (isNil(val)) {
            return this;
        }
        const key = name.toLowerCase();
        this.setNormalizedName(name, key);
        if (this._hdrs.has(key)) {
            const old = this._hdrs.get(key);
            let nv: T;
            if (!isNil(old)) {
                nv = [...isArray(old) ? old : [String(old)], ...isArray(val) ? val : [String(val)]] as any
            } else {
                nv = val;
            }
            this._hdrs.set(key, nv);
        } else {
            this._hdrs.set(key, val)
        }
        this._rcd = null!;
        return this;
    }

    delete(name: string): this {
        this._hdrs.delete(name);
        this._rcd = null!;
        return this;
    }

    forEach(fn: (name: string, values: T) => void) {
        Array.from(this._normal.keys())
            .forEach(key => fn(this._normal.get(key)!, this._hdrs.get(key)!))
    }

    private setNormalizedName(name: string, lcName: string): void {
        if (!this._normal.has(lcName)) {
            this._normal.set(lcName, name)
        }
    }
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
    readonly headers: HeaderSet<IncommingHeader>;
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
export interface ClientReqPacket<T = any> extends RequestPacket<T> {
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
    readonly headers: HeaderSet<OutgoingHeader>;
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
     * Get all headers.
     */
    getHeaders(): Record<string, OutgoingHeader>;

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
}

