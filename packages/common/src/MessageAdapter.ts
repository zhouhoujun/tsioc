import { Abstract } from '@tsdi/ioc';
import { IncomingHeader, OutgoingHeader } from './headers';
import { StatusCode } from './packet';


@Abstract()
export abstract class IncomingAdapter<TPacket = any> {
    /**
     * has content type or not.
     */
    abstract hasContentType(packet: TPacket): boolean;
    /**
     * content type.
     */
    abstract getContentType(packet: TPacket): string;

    /**
     * Get Content-Encoding.
     * @param packet
     */
    abstract getContentEncoding(packet: TPacket): string;
    /**
     * Get packet content length
     *
     * @return {Number}
     * @api public
     */
    abstract getContentLength(packet: TPacket): number | undefined;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    abstract hasHeader(packet: TPacket, field: string): IncomingHeader;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    abstract getHeader(packet: TPacket, field: string): IncomingHeader;
    /**
     * Get packet content
     *
     * @return {Number}
     * @api public
     */
    abstract getContent(packet: TPacket): any;

    abstract getAcceptType(packet: TPacket, ...contentTypes: string[]): string[];

    abstract getAcceptCharset(packet: TPacket, ...charsets: string[]): string[];

    abstract getAcceptEncoding(packet: TPacket, ...encodings: string[]): string[];

    abstract getAcceptLanguage(packet: TPacket, ...languages: string[]): string[];

}


@Abstract()
export abstract class OutgoingAdapter<TPacket = any> {
    /**
     * has content type or not.
     */
    abstract hasContentType(packet: TPacket): boolean;
    /**
     * content type.
     */
    abstract getContentType(packet: TPacket): string;
    /**
     * Set Content-Type packet header with `type` through `mime.lookup()`
     * when it does not contain a charset.
     *
     * Examples:
     *
     *     this.contentType = 'application/json';
     *     this.contentType = 'application/octet-stream';  // buffer stream
     *     this.contentType = 'image/png';      // png
     *     this.contentType = 'image/pjpeg';   //jpeg
     *     this.contentType = 'text/plain';    // text, txt
     *     this.contentType = 'text/html';    // html, htm, shtml
     *     this.contextType = 'text/javascript'; // javascript text
     *     this.contentType = 'application/javascript'; //javascript file .js, .mjs
     *
     * @param {String} type
     * @api public
     */
    abstract setContentType(packet: TPacket, type: string | null | undefined): TPacket;
    /**
     * remove content type.
     * @param packet 
     */
    abstract removeContentType(packet: TPacket): TPacket;

    /**
     * has Content-Encoding or not.
     * @param packet
     */
    abstract hasContentEncoding(packet: TPacket): boolean;
    /**
     * Get Content-Encoding.
     * @param packet
     */
    abstract getContentEncoding(packet: TPacket): string;
    /**
     * Set Content-Encoding.
     * @param packet
     * @param encoding 
     */
    abstract setContentEncoding(packet: TPacket, encoding: string | null | undefined): TPacket;
    /**
     * remove content encoding.
     * @param packet 
     */
    abstract removeContentEncoding(packet: TPacket): TPacket;

    /**
     * has packet content length or not.
     *
     * @return {Number}
     * @api public
     */
    abstract hasContentLength(packet: TPacket): number | undefined;
    /**
     * Set packet content length.
     *
     * @param {Number} n
     * @api public
     */
    abstract setContentLength(packet: TPacket, n: number | undefined): TPacket;
    /**
     * Get packet content length
     *
     * @return {Number}
     * @api public
     */
    abstract getContentLength(packet: TPacket): number | undefined;
    /**
     * remove content length.
     * @param packet 
     */
    abstract removeContentLength(packet: TPacket): TPacket;

    /**
     * Get packet content
     *
     * @return {Number}
     * @api public
     */
    abstract getContent(packet: TPacket): any;
    /**
     * Set packet content
     *
     * @return {Number}
     * @api public
     */
    abstract setContent(packet: TPacket, body: any): TPacket;
    /**
     * remove content encoding, length and type.
     * @param packet 
     */
    abstract clearContent(packet: TPacket): TPacket;

    /**
     * Get packet status code.
     *
     * @return {StatusCode}
     * @api public
     */
    abstract getStatus(packet: TPacket): StatusCode;
    /**
     * Set packet status code.
     *
     * @return {TPacket}
     * @api public
     */
    abstract setStatus(packet: TPacket, code: StatusCode): TPacket;

    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    abstract getStatusText(packet: TPacket): string;
    /**
     * Set packet status message
     *
     * @return {TPacket}
     * @api public
     */
    abstract setStatusText(packet: TPacket, statusText: string): TPacket;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    abstract hasHeader(packet: TPacket, field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    abstract getHeader(packet: TPacket, field: string): OutgoingHeader;
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
    abstract setHeader(packet: TPacket, field: string, val: OutgoingHeader): TPacket;
    // /**
    //  * Set header `field` to `val` or pass
    //  * an object of header fields.
    //  *
    //  * Examples:
    //  *
    //  *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
    //  *
    //  * @param {OutgoingHeaders} fields
    //  * @param {String} val
    //  * @api public
    //  */
    // abstract setHeader(packet: TPacket, fields: OutgoingHeaders): TPacket;

    /**
     * remove header in packet.
     * @param packet 
     * @param field 
     */
    abstract removeHeader(packet: TPacket, field: string): TPacket;
    /**
     * remove all headers.
     * @param packet 
     */
    abstract removeHeaders(packet: TPacket): TPacket;
    /**
     * is writable or not.
     * @param packet 
     */
    abstract writable(packet: TPacket): boolean;


    /**
     * set no cache
     * @param packet 
     */
    abstract noCache(packet: TPacket): boolean;

    abstract getLastModified(packet: TPacket):  string; 
    abstract setLastModified(packet: TPacket, control: string):  TPacket; 

    abstract getCacheControl(packet: TPacket):  string; 

    abstract setCacheControl(packet: TPacket, control: string):  TPacket;
    
    
    abstract getContentDisposition(packet: TPacket): string;
    abstract setContentDisposition(packet: TPacket, disposition: string): TPacket;
    abstract removeContentDisposition(packet: TPacket): TPacket;


}
