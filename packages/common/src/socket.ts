import { tokenId } from '@tsdi/ioc';
import { IReadableStream, IDuplexStream, IEventEmitter, IEnd } from './stream';
import { Packet, StatusCode } from './packet';
import { IncomingHeaders, OutgoingHeader, OutgoingHeaders } from './headers';

/**
 * Socket interface.
 */
export interface Socket extends IDuplexStream {

    /**
     * Set the encoding for the socket as a `Readable Stream`. See `readable.setEncoding()` for more information.
     * @since v0.1.90
     * @return The socket itself.
     */
    setEncoding(encoding?: string): this;

    /**
     * Pauses the reading of data. That is, `'data'` events will not be emitted.
     * Useful to throttle back an upload.
     * @return The socket itself.
     */
    pause(): this;

    /**
     * Resumes reading after a call to `socket.pause()`.
     * @return The socket itself.
     */
    resume(): this;

    /**
     * Sets the socket to timeout after `timeout` milliseconds of inactivity on
     * the socket. By default `net.Socket` do not have a timeout.
     *
     * When an idle timeout is triggered the socket will receive a `'timeout'` event but the connection will not be severed. The user must manually call `socket.end()` or `socket.destroy()` to
     * end the connection.
     *
     * ```js
     * socket.setTimeout(3000);
     * socket.on('timeout', () => {
     *   console.log('socket timeout');
     *   socket.end();
     * });
     * ```
     *
     * If `timeout` is 0, then the existing idle timeout is disabled.
     *
     * The optional `callback` parameter will be added as a one-time listener for the `'timeout'` event.
     * @since v0.1.90
     * @return The socket itself.
     */
    setTimeout?(timeout: number, callback?: () => void): this;

    /**
     * Enable/disable keep-alive functionality, and optionally set the initial
     * delay before the first keepalive probe is sent on an idle socket.
     *
     * Set `initialDelay` (in milliseconds) to set the delay between the last
     * data packet received and the first keepalive probe. Setting `0` for`initialDelay` will leave the value unchanged from the default
     * (or previous) setting.
     *
     * Enabling the keep-alive functionality will set the following socket options:
     *
     * * `SO_KEEPALIVE=1`
     * * `TCP_KEEPIDLE=initialDelay`
     * * `TCP_KEEPCNT=10`
     * * `TCP_KEEPINTVL=1`
     * @since v0.1.92
     * @param [enable=false]
     * @param [initialDelay=0]
     * @return The socket itself.
     */
    setKeepAlive?(enable?: boolean, initialDelay?: number): this;
}

export const HYBRID_HOST = tokenId<IEventEmitter>('HYBRID_HOST');


/**
 * Connection interface.
 */
export interface Connection<TSocket extends IEventEmitter = IEventEmitter> extends IDuplexStream {
    /**
     * destroyed or not.
     */
    get destroyed(): boolean;
    /**
     * socket.
     */
    get socket(): TSocket;
    /**
     * Enable/disable keep-alive functionality, and optionally set the initial
     * delay before the first keepalive probe is sent on an idle socket.
     *
     * Set `initialDelay` (in milliseconds) to set the delay between the last
     * data packet received and the first keepalive probe. Setting `0` for`initialDelay` will leave the value unchanged from the default
     * (or previous) setting.
     *
     * Enabling the keep-alive functionality will set the following socket options:
     *
     * * `SO_KEEPALIVE=1`
     * * `TCP_KEEPIDLE=initialDelay`
     * * `TCP_KEEPCNT=10`
     * * `TCP_KEEPINTVL=1`
     * @since v0.1.92
     * @param [enable=false]
     * @param [initialDelay=0]
     * @return The socket itself.
     */
    setKeepAlive(enable?: boolean, initialDelay?: number): this;
    /**
     * setTimeout
     * @param msecs 
     * @param callback 
     */
    setTimeout(msecs: number, callback?: () => void): this;

    /**
     * destroy connection
     * @param error 
     * @param callback 
     */
    destroy(error?: any, callback?: (err?: any) => void): void;
}



/**
 * server side incoming message.
 */
export interface Incoming<TSocket = any> extends Packet<Uint8Array>, IReadableStream {
    /**
     * packet id.
     */
    readonly id?: number;
    /**
     * headers
     */
    readonly headers: Record<string, any>;
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

    readonly socket?: TSocket;

    setTimeout?: (msecs: number, callback: () => void) => void;

    body?: any;

    rawBody?: Uint8Array;
}


/**
 * server outgoing message stream.
 */
export interface Outgoing<TSocket = any, TStatus extends StatusCode = StatusCode> extends IEnd {

    readonly socket?: TSocket;
    /**
     * Get response status code.
     */
    get statusCode(): TStatus;
    /**
     * Set response status code.
     */
    set statusCode(status: TStatus);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    statusMessage?: string;

    /**
     * headers has sent or not.
     */
    readonly headersSent?: boolean;
    /**
     * Get all headers.
     */
    getHeaders?(): OutgoingHeaders;

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
    setHeader(field: string, val: any): void;
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
     * get header names
     */
    getHeaderNames?(): string[];

    // /**
    //  * write head
    //  * @param statusCode 
    //  * @param headers 
    //  */
    // writeHead?(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    // /**
    //  * write head
    //  * @param statusCode 
    //  * @param statusMessage 
    //  * @param headers 
    //  */
    // writeHead?(statusCode: number, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[]): this;

}


/**
 * incoming packet.
 */
export interface IncomingPacket<T = any> extends Packet<T> {
    req?: Incoming;
    res?: Outgoing;
    headers?: IncomingHeaders;
    originalUrl?: string;
}