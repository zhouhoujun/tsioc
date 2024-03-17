import { Abstract } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';



@Abstract()
export abstract class Incoming<T = any, TMsg = any> {

    abstract get message(): TMsg;

    /**
     * has content type or not.
     */
    abstract hasContentType(): boolean;
    /**
     * content type.
     */
    abstract getContentType(): string;

    /**
     * Get Content-Encoding.
     * @param packet
     */
    abstract getContentEncoding(): string;
    /**
     * Get packet content length
     *
     * @return {Number}
     * @api public
     */
    abstract getContentLength(): number | undefined;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    abstract hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    abstract getHeader(field: string): string;

    /**
     * Get packet status code.
     *
     * @return {StatusCode}
     * @api public
     */
    abstract getStatus(): StatusCode;
    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    abstract getStatusText(): string;
    /**
     * Get message payload
     *
     * @return {Number}
     * @api public
     */
    abstract get payload(): T;

    abstract getAcceptType(...contentTypes: string[]): string[];

    abstract getAcceptCharset(...charsets: string[]): string[];

    abstract getAcceptEncoding(...encodings: string[]): string[];

    abstract getAcceptLanguage(...languages: string[]): string[];

    abstract getReferrer?(): string;
    abstract getLocation(): string;

}
