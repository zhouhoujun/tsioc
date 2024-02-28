import { StatusCode, HeaderRecords } from '@tsdi/common';
import { IWritableStream } from './stream';

/**
 * server outgoing message stream.
 */
export interface Outgoing<T = any> extends IWritableStream {
    /**
    * packet id.
    */
    readonly id?: number;
    /**
     * topic.
     */
    readonly topic?: string;
    /**
     * message type.
     */
    readonly type?: number | string;
    /**
     * headers
     */
    readonly headers?: Record<string, any>;
    /**
     * incoming URL
     */
    readonly url?: string;
    /**
     * original url.
     */
    readonly originalUrl?: string;
    /**
     * error.
     */
    readonly error?: any;
    /**
     * replyTo
     */
    readonly replyTo?: string;

    /**
     * response status code
     */
    statusCode?: StatusCode;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    statusMessage?: string;

    body?: T;

    rawBody?: any;

    /**
     * headers has sent or not.
     */
    readonly headersSent?: boolean;
    /**
     * Get all headers.
     */
    getHeaders?(): HeaderRecords;

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
    getHeader(field: string): HeaderRecords;
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
    appendHeader?(field: string, val: HeaderRecords): void;
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
