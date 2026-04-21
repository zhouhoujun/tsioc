import { Context, ContextToken, Injector, Token, RunContext } from '@tsdi/ioc';
import { HeadersLike } from './headers';
import { Outgoing } from './outgoing';
import { Incoming } from './incoming';
export declare const REQUEST: ContextToken<Incoming<any, any> | null>;
export declare const RESPONSE: ContextToken<Outgoing<any, any> | null>;
export declare class RequestContext extends RunContext {
    getRequest(): Incoming;
    protected createResponse(response: {
        incoming?: Incoming;
        id?: any;
        socket?: any;
        pattern?: string;
        /**
         * event type
         */
        type?: number;
        status?: any;
        statusMessage?: string;
        statusCode?: any;
        statusText?: string;
        ok?: boolean;
        error?: any;
        headers?: HeadersLike;
        payload?: any;
    }): Outgoing<any, any>;
    getResponse(): Outgoing<any, any>;
    /**
     * get response content encoding.
     * @returns
     */
    getContentEncoding(): string | null;
    /**
     * set response content encoding.
     * @param encoding
     */
    setContentEncoding(encoding: string | null): void;
    /**
     * get response content type
     * @param type
     */
    getContentType(): string | null | undefined;
    /**
     * set response content type
     * @param type
     */
    setContentType(type: string | null | undefined): void;
    /**
     * get response content length
     * @returns
     */
    getContentLength(): number | null;
    /**
     * set response content length
     * @param len
     */
    setContentLength(len: number | null): void;
    /**
     * Check if the given `type(s)` is acceptable, returning
     * the best match when true, otherwise `false`, in which
     * case you should respond with 406 "Not Acceptable".
     *
     * The `type` value may be a single mime type string
     * such as "application/json", the extension name
     * such as "json" or an array `["json", "html", "text/plain"]`. When a list
     * or array is given the _best_ match, if any is returned.
     *
     * Examples:
     *
     *     // Accept: text/html
     *     this.accepts('html');
     *     // => "html"
     *
     *     // Accept: text/*, application/json
     *     this.accepts('html');
     *     // => "html"
     *     this.accepts('text/html');
     *     // => "text/html"
     *     this.accepts('json', 'text');
     *     // => "json"
     *     this.accepts('application/json');
     *     // => "application/json"
     *
     *     // Accept: text/*, application/json
     *     this.accepts('image/png');
     *     this.accepts('png');
     *     // => false
     *
     *     // Accept: text/*;q=.5, application/json
     *     this.accepts('html', 'json');
     *     // => "json"
     *
     * @param {String|Array} type(s)...
     * @return {String|Array|false}
     * @api public
     */
    accepts(...args: string[]): string | string[] | false;
    /**
    * Return accepted encodings or best fit based on `encodings`.
    *
    * Given `Accept-Encoding: gzip, deflate`
    * an array sorted by quality is returned:
    *
    *     ['gzip', 'deflate']
    *
    * @param {String|Array} encoding(s)...
    * @return {String|Array}
    * @api public
    */
    acceptsEncodings(...encodings: string[]): string | string[] | false;
    /**
     * Return accepted charsets or best fit based on `charsets`.
     *
     * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
     * an array sorted by quality is returned:
     *
     *     ['utf-8', 'utf-7', 'iso-8859-1']
     *
     * @param {String|Array} charset(s)...
     * @return {String|Array}
     * @api public
     */
    acceptsCharsets(...charsets: string[]): string | string[] | false;
    /**
     * Return accepted languages or best fit based on `langs`.
     *
     * Given `Accept-Language: en;q=0.8, es, pt`
     * an array sorted by quality is returned:
     *
     *     ['es', 'pt', 'en']
     *
     * @param {String|Array} lang(s)...
     * @return {Array|String}
     * @api public
     */
    acceptsLanguages(...langs: string[]): string | string[];
}
export declare function createRequestContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export declare function createRequestContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
