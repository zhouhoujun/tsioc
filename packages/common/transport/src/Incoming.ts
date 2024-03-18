import { Abstract } from '@tsdi/ioc';
import { Pattern } from '@tsdi/common';



@Abstract()
export abstract class Incoming<TMsg = any, T = any, TStatus= any> {

    abstract get id(): any;

    abstract get url(): string;
    abstract set url(val: string);

    abstract get method(): string;

    abstract get originalUrl(): string;

    abstract get pattern(): Pattern;

    abstract get headers(): Record<string, string | string[] | number | undefined>;

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
     * @return {TStatus}
     * @api public
     */
    abstract get status(): TStatus;
    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    abstract get statusText(): string;
    /**
     * Get message payload
     *
     * @return {Number}
     * @api public
     */
    abstract get payload(): T;
    /**
     * Set message payload
     *
     * @return {Number}
     * @api public
     */
    abstract set payload(value: T);

    get body() {
        return this.payload;
    }

    abstract get rawBody(): Buffer;
    abstract set rawBody(value: Buffer);

    /**
     * requery query params.
     */
    query?: Record<string, any>;
    /**
     * request path params.
     */
    path?: Record<string, any>;

    /**
     * error message
     */
    abstract get error(): any;
    /**
     * error message
     */
    abstract set error(err: any);


    abstract get ok(): boolean;


    abstract getAcceptType?(...contentTypes: string[]): string[];

    abstract getAcceptCharset?(...charsets: string[]): string[];

    abstract getAcceptEncoding?(...encodings: string[]): string[];

    abstract getAcceptLanguage?(...languages: string[]): string[];

    abstract getReferrer?(): string;
    abstract getLocation?(): string;

}
