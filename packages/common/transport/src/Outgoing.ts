import { Header, MapHeaders, Pattern, TransportHeaders } from '@tsdi/common';

export interface Outgoing<T = any> {

    id?: string | number;
    type?: string | number | null;

    pattern?: Pattern;

    headers?: MapHeaders;

    get tHeaders(): TransportHeaders;

    body?: T | null;

    error?: any;

    /**
     * Get packet status code.
     *
     * @return {TStatus}
     * @api public
     */
    get statusCode(): any;
    /**
     * Set packet status code.
     *
     * @api public
     */
    set statusCode(code: any);

    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    get statusMessage(): string;
    /**
     * Set packet status message
     *
     * @return {TPacket}
     * @api public
     */
    set statusMessage(statusText: string);

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader(field: string): string | number | string[] | undefined;
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
    setHeader(field: string, val: Header): void;

    /**
     * remove header in packet.
     * @param packet 
     * @param field 
     */
    removeHeader(field: string): void;


    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    sent?: boolean;
    
    /**
     * is writable or not.
     * @param packet 
     */
    writable?: boolean;

    // getLastModified?(): string;
    // setLastModified?(control: string): this;
    // removeLastModified?(): this;

    // getCacheControl?(): string;
    // setCacheControl?(control: string): this;
    // /**
    //  * set no cache
    //  * @param packet 
    //  */
    // noCache?(): this;

    // setContentDisposition(disposition: string): this;
    // setLocation?(location: string): this;

}



// @Abstract()
// export abstract class Outgoing<T = any, TStatus = any> {

//     abstract get id(): any;

//     abstract set id(val: any);

//     abstract get type(): string | number | null;
//     abstract set type(val: string | number| null);

//     abstract get pattern(): Pattern;

//     /**
//      * has content type or not.
//      */
//     abstract hasContentType(): boolean;
//     /**
//      * content type.
//      */
//     abstract getContentType(): string | null;
//     /**
//      * Set Content-Type packet header with `type` through `mime.lookup()`
//      * when it does not contain a charset.
//      *
//      * Examples:
//      *
//      *     this.contentType = 'application/json';
//      *     this.contentType = 'application/octet-stream';  // buffer stream
//      *     this.contentType = 'image/png';      // png
//      *     this.contentType = 'image/pjpeg';   //jpeg
//      *     this.contentType = 'text/plain';    // text, txt
//      *     this.contentType = 'text/html';    // html, htm, shtml
//      *     this.contextType = 'text/javascript'; // javascript text
//      *     this.contentType = 'application/javascript'; //javascript file .js, .mjs
//      *
//      * @param {String} type
//      * @api public
//      */
//     abstract setContentType(type: string | null | undefined): this;

//     /**
//      * has Content-Encoding or not.
//      * @param packet
//      */
//     abstract hasContentEncoding(): boolean;
//     /**
//      * Get Content-Encoding.
//      * @param packet
//      */
//     abstract getContentEncoding(): string | null;
//     /**
//      * Set Content-Encoding.
//      * @param packet
//      * @param encoding 
//      */
//     abstract setContentEncoding(encoding: string | null | undefined): this;

//     /**
//      * has packet content length or not.
//      *
//      * @return {Number}
//      * @api public
//      */
//     abstract hasContentLength(): boolean;
//     /**
//      * Get packet content length
//      *
//      * @return {Number}
//      * @api public
//      */
//     abstract getContentLength(): number | null;
//     /**
//      * Set packet content length.
//      *
//      * @param {Number} n
//      * @api public
//      */
//     abstract setContentLength(n: number | null | undefined): this;

//     abstract get headers(): TransportHeaders;

//     abstract set headers(headers: TransportHeaders);

//     /**
//      * Get packet body
//      *
//      * @return {Number}
//      * @api public
//      */
//     abstract get body(): T | null;
//     /**
//      * Set packet body
//      */
//     abstract set body(val: T | null);

//     /**
//      * Get error message
//      */
//     abstract get error(): any;

//     /**
//      * Set error message
//      */
//     abstract set error(err: any);

//     /**
//      * Get packet status code.
//      *
//      * @return {TStatus}
//      * @api public
//      */
//     abstract get statusCode(): TStatus;
//     /**
//      * Set packet status code.
//      *
//      * @api public
//      */
//     abstract set statusCode(code: TStatus);

//     /**
//      * Get packet status message.
//      *
//      * @return {String}
//      * @api public
//      */
//     abstract get statusMessage(): string;
//     /**
//      * Set packet status message
//      *
//      * @return {TPacket}
//      * @api public
//      */
//     abstract set statusMessage(message: string);


//     /**
//      * Check if a header has been written to the socket.
//      *
//      * @return {Boolean}
//      * @api public
//      */
//     abstract get sent(): boolean;

//     /**
//      * has header in packet or not.
//      * @param packet 
//      * @param field 
//      */
//     abstract hasHeader(field: string): boolean;
//     /**
//      * get header from packet.
//      * @param packet 
//      * @param field 
//      */
//     abstract getHeader(field: string): string | number | null;
//     /**
//      * Set header `field` to `val` or pass
//      * an object of header fields.
//      *
//      * Examples:
//      *
//      *    this.set('Foo', ['bar', 'baz']);
//      *    this.set('Accept', 'application/json');
//      *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
//      *
//      * @param {String|Object|Array} field
//      * @param {String} val
//      * @api public
//      */
//     abstract setHeader(field: string, val: Header): this;

//     /**
//      * remove header in packet.
//      * @param packet 
//      * @param field 
//      */
//     abstract removeHeader(field: string): this;
//     /**
//      * remove all headers.
//      * @param packet 
//      */
//     abstract removeHeaders(): this;

//     /**
//      * is writable or not.
//      * @param packet 
//      */
//     abstract get writable(): boolean;

//     abstract getLastModified?(): string;
//     abstract setLastModified?(control: string): this;
//     abstract removeLastModified?(): this;

//     abstract getCacheControl?(): string;
//     abstract setCacheControl?(control: string): this;
//     /**
//      * set no cache
//      * @param packet 
//      */
//     abstract noCache?(): this;

//     abstract setContentDisposition(disposition: string): this;
//     abstract setLocation?(location: string): this;

// }
