import { Abstract } from '@tsdi/ioc';
import { Pattern, TransportHeaders } from '@tsdi/common';



@Abstract()
export abstract class Incoming<T = any> {

    abstract get id(): any;

    abstract get url(): string;
    abstract set url(val: string);

    abstract get method(): string;

    abstract get originalUrl(): string;

    abstract get pattern(): Pattern;

    abstract get headers(): TransportHeaders;

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
    abstract getContentLength(): number;

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
    abstract getHeader(field: string): string | null;

    /**
     * Get message body
     *
     * @return {Number}
     * @api public
     */
    abstract get body(): T | null;
    /**
     * Set message body
     *
     * @return {Number}
     * @api public
     */
    abstract set body(value: T | null);

    rawBody?: any;

    path?: any;

    abstract getAcceptType?(...contentTypes: string[]): string[];

    abstract getAcceptCharset?(...charsets: string[]): string[];

    abstract getAcceptEncoding?(...encodings: string[]): string[];

    abstract getAcceptLanguage?(...languages: string[]): string[];

    abstract getReferrer?(): string;
    abstract getLocation?(): string;

}
