/**
 * header.
 */
export type Header = string | readonly string[] | number | undefined | null;
export interface IHeaders<T extends Header = Header> extends Record<string, T> {
}
/**
 * header mappings.
 */
export declare class HeaderMappings<T extends Header = Header> implements HeaderAccess<T> {
    private _hdrs;
    private _rcd?;
    private _normal;
    /**
     * create headers map.
     * @param headers
     */
    constructor(headers?: string | HeadersLike<T> | HeaderAccess<T>);
    get size(): number;
    getHeaderNames(): string[];
    getHeaders<Tx extends Header>(): IHeaders<Tx>;
    setHeaders(headers: HeadersLike | HeaderAccess): void;
    getHeader<Th = string | number>(name: string): Th;
    getHeader(name: string): Header;
    setHeader(name: string, val: T): this;
    hasHeader(name: string): boolean;
    has(name: string): boolean;
    get(name: string): T | undefined;
    set(name: string, val: T): this;
    append(name: string, val: T): this;
    delete(name: string): this;
    removeHeader(name: string): this;
    removeHeaders(): void;
    forEach(fn: (name: string, values: T) => void): void;
    private setNormalizedName;
}
/**
 * Header like
 */
export type HeadersLike<T extends Header = Header> = IHeaders<T> | HeaderAccess<T> | HeaderMappings<T>;
/**
 * headr access.
 */
export interface HeaderAccess<T extends Header = Header> {
    headers?: IHeaders<T> | HeaderMappings<T>;
    hasHeader?(header: string): boolean;
    getHeader?(header: string): T;
    setHeader?(header: string, value: T): any;
    removeHeader?(header: string): any;
    removeHeaders?(): any;
    getHeaderNames?(): string[];
    getHeaders?(): IHeaders<T>;
}
export declare abstract class HeaderAdapter {
    abstract hasHeader(headers: HeadersLike, header: string): boolean;
    abstract getHeader<T = number | string>(headers: HeadersLike, header: string, join?: boolean): T | undefined;
    abstract getHeaders(headers: HeadersLike): IHeaders;
    abstract setHeader<T extends HeadersLike>(access: T, header: string, value: Header): T;
    abstract removeHeader<T extends HeadersLike>(access: T, header: string): T;
    abstract removeHeaders<T extends HeadersLike>(headers: T): T;
    /**
     * has content type or not.
     */
    abstract hasContentType(headers: HeadersLike): boolean;
    /**
     * content type.
     */
    abstract getContentType(headers: HeadersLike): string;
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
    abstract setContentType<T extends HeadersLike>(headers: T, type: string | null | undefined): T;
    abstract hasContentLength(headers: HeadersLike): boolean;
    abstract setContentLength<T extends HeadersLike>(headers: T, len: number | null | undefined): T;
    abstract getContentLength(headers: HeadersLike): number;
    abstract hasContentEncoding(headers: HeadersLike): boolean;
    abstract getContentEncoding(headers: HeadersLike): string | undefined;
    abstract setContentEncoding<T extends HeadersLike>(headers: T, encoding: string | null | undefined): T;
    abstract hasTransferEncoding(headers: HeadersLike): boolean;
    abstract getTransferEncoding(headers: HeadersLike): string | undefined;
    abstract setTransferEncoding<T extends HeadersLike>(headers: T, encoding: string | null | undefined): T;
    abstract getContentDisposition(headers: HeadersLike): string | undefined;
    abstract setContentDisposition<T extends HeadersLike>(headers: T, disposition: string): T;
    abstract getIdentity(headers: HeadersLike): string | number | undefined;
    abstract setIdentity<T extends HeadersLike>(headers: T, identity: string | number | undefined): T;
    abstract getMethod(headers: HeadersLike, prefix?: boolean): string | undefined;
    abstract setMethod<T extends HeadersLike>(headers: T, method: string | undefined, prefix?: boolean): T;
    abstract getPath(headers: HeadersLike, prefix?: boolean): string | undefined;
    abstract setPath<T extends HeadersLike>(headers: T, path: string | undefined, prefix?: boolean): T;
    abstract getStatus(headers: HeadersLike, prefix?: boolean): string | number | undefined;
    abstract setStatus<T extends HeadersLike>(headers: T, status: string | number, prefix?: boolean): T;
    abstract getStatusMessage(headers: HeadersLike): string | undefined;
    abstract setStatusMessage<T extends HeadersLike>(headers: T, statusMessage: string | undefined): T;
    abstract getAccept(headers: HeadersLike): string | string[] | undefined;
    abstract setAccept<T extends HeadersLike>(headers: T, accept: string | string[] | undefined): T;
    abstract getAcceptCharset(headers: HeadersLike): string | undefined;
    abstract setAcceptCharset<T extends HeadersLike>(headers: T, charset: string | undefined): T;
    abstract getAcceptEncoding(headers: HeadersLike): string | undefined;
    abstract setAcceptEncoding<T extends HeadersLike>(headers: T, encodings: string | undefined): T;
    abstract getAcceptLanguage(headers: HeadersLike): string | undefined;
    abstract setAcceptLanguage<T extends HeadersLike>(headers: T, languages: string | undefined): T;
    abstract getLastModified(headers: HeadersLike): string | undefined;
    abstract setLastModified<T extends HeadersLike>(headers: T, modified: string | undefined): T;
    abstract getCacheControl(headers: HeadersLike): string | undefined;
    abstract setCacheControl<T extends HeadersLike>(headers: T, control: string | undefined): T;
    abstract getLocation(headers: HeadersLike): string | undefined;
    abstract setLocation<T extends HeadersLike>(headers: T, location: string | undefined): T;
}
/**
 * has header.
 */
export declare function hasHeader(headers: HeadersLike | undefined, header: string): boolean;
/**
 *
 * @param headers
 * @param header
 * @param join
 * @returns
 */
export declare function getHeader(headers: HeadersLike | undefined, header: string, join?: boolean): string | number | undefined;
/**
 * get headers
 * @param headers
 * @returns
 */
export declare function getHeaders<T extends Header = Header>(headers: HeadersLike<T> | undefined): IHeaders<T> | undefined;
/**
* content types.
*/
export declare namespace ContentType {
    /**
     * stream, buffer type.
     */
    const OCTET_STREAM = "application/octet-stream";
    /**
     * application json.
     */
    const APPL_JSON = "application/json";
    /**
     * application json.
     */
    const APPL_JSON_UTF8 = "application/json; charset=utf-8";
    /**
     * application javascript.
     */
    const APPL_JAVASCRIPT = "application/javascript";
    /**
     * text html.
     */
    const TEXT_HTML = "text/html";
    /**
     * text html utf-8.
     */
    const TEXT_HTML_UTF8 = "text/html; charset=utf-8";
    /**
     * text plain.
     */
    const TEXT_PLAIN = "text/plain";
    /**
     * text plain utf-8.
     */
    const TEXT_PLAIN_UTF8 = "text/plain; charset=utf-8";
    /**
     * request default accept.
     */
    const REQUEST_ACCEPT = "application/json, text/plain, */*";
    const X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded;charset=UTF-8";
}
