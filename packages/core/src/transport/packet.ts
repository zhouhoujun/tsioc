import { IncomingHeaders, OutgoingHeader, OutgoingHeaders } from "./headers";


/**
 * server side incoming message.
 */
export interface Incoming<TConn = any> {
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

    readonly connection: TConn;

    body?: any;

    rawBody?: any;
    /**
     * pipe
     * @param destination 
     * @param options 
     */
    pipe(destination: any, options?: { end?: boolean | undefined; }): any;

    /**
     * set timeout.
     * @param msecs 
     * @param callback 
     */
    setTimeout?(msecs: number, callback: () => void): void | this;

    emit?(event: string, ...args: any[]): void;
    on?(event: string, listener: (...args: any) => void): this;
    once?(event: string, listener: (...args: any) => void): this;
    off?(event: string, listener: (...args: any) => void): this;

}

/**
 * server outgoing message.
 */
export interface Outgoing<TConn = any> {

    readonly connection: TConn;
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

    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;



    emit?(event: string, ...args: any[]): void;
    on?(event: string, listener: (...args: any) => void): this;
    once?(event: string, listener: (...args: any) => void): this;
    off?(event: string, listener: (...args: any) => void): this;


    writable?: boolean;
    writableEnded?: boolean;

    finished?: boolean;
}
