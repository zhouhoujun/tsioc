import { Abstract, tokenId } from '@tsdi/ioc';
import { IncomingHeaders, OutgoingHeader, OutgoingHeaders, ReqHeaders, ResHeaders } from './headers';
import { Packet } from './packet';
import { ReadableStream, WritableStream, DuplexStream, EventEmitter } from './stream';

/**
 * Socket interface.
 */
export interface Socket extends DuplexStream {

    /**
     * Set the encoding for the socket as a `Readable Stream`. See `readable.setEncoding()` for more information.
     * @since v0.1.90
     * @return The socket itself.
     */
    setEncoding(encoding?: BufferEncoding): this;

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
/**
 * Socket token.
 */
export const SOCKET = tokenId<Socket>('SOCKET');

/**
 * Connection interface.
 */
export interface Connection<TSocket extends EventEmitter = EventEmitter> extends DuplexStream {
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
 * Connention token.
 */
export const CONNECTION = tokenId<Connection>('CONNECTION');


/**
 * server side incoming message.
 */
export interface Incoming<T = any, TSocket = any> extends Packet<T>, ReadableStream {
    /**
     * packet id.
     */
    readonly id?: number;
    /**
     * headers
     */
    readonly headers: IncomingHeaders;
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
    
    readonly socket: TSocket;

    setTimeout?: (msecs: number, callback: () => void) => void;

    body?: any;

    rawBody?: any;
}

@Abstract()
export abstract class IncomingFactory<TSocket = any> {
    /**
     * create server incoming.
     * @param socket 
     * @param headers 
     */
    abstract create<T>(socket: TSocket, headers: ReqHeaders): Incoming<T, TSocket>;
}

/**
 * server outgoing message stream.
 */
export interface Outgoing<TSocket = any> extends WritableStream {

    readonly socket: TSocket;
    /**
     * Get response status code.
     */
    get statusCode(): number | string;
    /**
     * Set response status code.
     */
    set statusCode(status: number | string);
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
     * get header names
     */
    getHeaderNames?(): string[];

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


@Abstract()
export abstract class OutgoingFactory<TSocket = any> {
    /**
     * create server outgoing stream.
     * @param socket 
     * @param headers 
     */
    abstract create(socket: TSocket, headers: ResHeaders): Outgoing<TSocket>;
}

/**
 * client duplex message stream.
 */
export interface ClientStream<TSocket = any> extends DuplexStream {
    /**
     * headers
     */
    readonly headers: OutgoingHeaders;

    readonly socket?: TSocket;
}
@Abstract()
export abstract class ClientStreamFactory<TSocket = any> {
    /**
     * create client duplex stream.
     * @param socket 
     * @param headers 
     */
    abstract create(socket: TSocket, headers: ReqHeaders): ClientStream<TSocket>;
}

/**
 * Server duplex message stream.
 */
export interface ServerStream<TSocket = any> extends DuplexStream {
    /**
     * headers
     */
    readonly headers: IncomingHeaders;

    readonly socket?: TSocket;
}

@Abstract()
export abstract class ServerStreamFactory<TSocket = any> {
    /**
     * create client duplex stream.
     * @param socket 
     * @param headers 
     */
    abstract create(socket: TSocket, headers: ReqHeaders): ClientStream<TSocket>;
}
