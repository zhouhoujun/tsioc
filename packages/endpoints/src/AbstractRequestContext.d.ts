import { ParameterScope } from '@tsdi/core';
import { HeadersLike, IHeaders, HeaderAdapter, MessageException, RequestContext, Incoming, Outgoing, FileAdapter, MimeAdapter, StatusAdapter, StreamAdapter, ReadableLike, WritableLike, AcceptsPriority } from '@tsdi/common';
import { Session } from './sessions/Session';
import { ServiceConfig } from './server.options';
/**
 * abstract request context for sevice side.
 *
 * 请求上下文
 */
export declare abstract class AbstractRequestContext<TRequest extends ReadableLike<Incoming> = ReadableLike<Incoming>, TResponse extends WritableLike<Outgoing> = WritableLike<Outgoing>, TStatus = any> extends RequestContext {
    abstract get request(): TRequest;
    abstract get detailError(): boolean;
    /**
     * response.
     */
    abstract get response(): TResponse;
    /**
     * mime adapter.
     */
    get mimeAdapter(): MimeAdapter | null;
    /**
     * mime accepts priority
     */
    get acceptsPriority(): AcceptsPriority | null;
    /**
     * status adapter.
     */
    get statusAdapter(): StatusAdapter<TStatus> | null;
    /**
     * stream adapter
     */
    get headerAdapter(): HeaderAdapter;
    /**
     * stream adapter
     */
    get streamAdapter(): StreamAdapter;
    /**
     * file adapter
     */
    get fileAdapter(): FileAdapter;
    private _session?;
    get session(): Session;
    /**
     * Set response content length.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | null);
    /**
     * Get response content length
     *
     * @return {Number}
     * @api public
     */
    get length(): number | null;
    protected _explicitStatus?: boolean;
    /**
     * Get response status.
     */
    get status(): TStatus;
    /**
     * Set response status, defaults to OK.
     */
    set status(code: TStatus);
    protected beforeStatusChanged(code: TStatus): void;
    protected afterStatusChanged(code: TStatus): void;
    get statusMessage(): string;
    set statusMessage(msg: string);
    protected canSettatusMessage(): boolean;
    private _ok;
    /**
     * Whether the status code is ok
     */
    get ok(): boolean;
    /**
     * Whether the status code is ok
     */
    set ok(ok: boolean);
    private _body;
    protected _explicitNullBody?: boolean;
    get explicitNullBody(): boolean | undefined;
    /**
     * Get response body.
     *
     * @return {Mixed}
     * @api public
     */
    get body(): any;
    /**
     * Set response body.
     *
     * @param {String|Buffer|Object|Stream} val
     * @api public
     */
    set body(val: any);
    /**
     * on body changed. default do nothing.
     * @param newVal
     * @param oldVal
     */
    protected onBodyChanged(newVal: any, oldVal: any): void;
    /**
     * on body set null.
     */
    protected onNullBody(): void;
    /**
     * Get request rul
     */
    abstract get url(): string;
    /**
     * Set request url
     */
    abstract set url(value: string);
    /**
     * original url
     */
    abstract get originalUrl(): string;
    /**
     * request query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;
    /**
     * The request method.
     */
    get method(): string;
    /**
     * set response content length
     * @param len
     */
    setContentLength(len: number | null): void;
    /**
     * set response content encoding.
     * @param encoding
     */
    setContentEncoding(encoding: string | null): void;
    /**
     * set response content type
     * @param type
     */
    setContentType(type: string | null | undefined): void;
    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    getHeader(field: string): string | undefined;
    /**
     * has response header field or not.
     * @param field
     */
    hasHeader(field: string): boolean;
    /**
     * Set response header `field` to `val` or pass
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
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: Record<string, string | number | string[]> | IHeaders): void;
    setHeader(headers: HeadersLike): void;
    /**
     * Append additional header `field` with value `val`.
     *
     * Examples:
     *
     * ```
     * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
     * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
     * this.append('Warning', '199 Miscellaneous warning');
     * ```
     *
     * @param {String} field
     * @param {String|Array} val
     * @api public
     */
    appendHeader(field: string, val: string | number | string[]): void;
    /**
    * Remove response header `field`.
    *
    * @param {String} name
    * @api public
    */
    removeHeader(field: string): void;
    /**
     * Remove all response headers
     *
     * @api public
     */
    removeHeaders(): void;
    /**
     * Check if the incoming request contains the "Content-Type"
     * header field and if it contains any of the given mime `type`s.
     * If there is no request body, `null` is returned.
     * If there is no content type, `false` is returned.
     * Otherwise, it returns the first `type` that matches.
     *
     * Examples:
     *
     *     // With Content-Type: text/html; charset=utf-8
     *     this.is('html'); // => 'html'
     *     this.is('text/html'); // => 'text/html'
     *     this.is('text/*', 'application/json'); // => 'text/html'
     *
     *     // When Content-Type is application/json
     *     this.is('json', 'urlencoded'); // => 'json'
     *     this.is('application/json'); // => 'application/json'
     *     this.is('html', 'application/*'); // => 'application/json'
     *
     *     this.is('html'); // => false
     */
    is(type: string | string[]): string | null | false;
    /**
     * content type.
     */
    get contentType(): string;
    /**
     * Set Content-Type response header with `type` through `mime.lookup()`
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
    set contentType(type: string);
    /**
     * Set Content-Type response header with `type` through `mime.lookup()`
     * when it does not contain a charset.
     *
     * Examples:
     *
     *     this.type = '.html';
     *     this.type = 'html';
     *     this.type = 'json';
     *     this.type = 'application/json';
     *     this.type = 'png';
     *
     * @param {String} type
     * @api public
     */
    set type(type: string);
    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    get type(): string;
    /**
     * Get Content-Encoding or not.
     * @param packet
     */
    get contentEncoding(): string | undefined;
    /**
     * Set Content-Encoding.
     */
    set contentEncoding(encoding: string | null | undefined);
    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get headersSent(): boolean;
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
    /**
    * Set Content-Disposition header to "attachment" with optional `filename`.
    *
    * @param filname file name for download.
    * @param options content disposition.
    * @api public
    */
    attachment(filename: string, options?: {
        contentType?: string;
        /**
        * Specifies the disposition type.
        * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
        * but can convey additional information if both parties agree to it).
        * The `type` is normalized to lower-case.
        * @default 'attachment'
        */
        type?: 'attachment' | 'inline' | string | undefined;
        /**
         * If the filename option is outside ISO-8859-1,
         * then the file name is actually stored in a supplemental field for clients
         * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
         * @default true
         */
        fallback?: string | boolean | undefined;
    }): void;
    /**
     * throw execption to client.
     * @param execption
     */
    abstract throwException(execption: MessageException): void;
}
export declare function getScopeValue(req: any, scope: ParameterScope): any;
export declare abstract class RequestContextFactory {
    abstract create<TReq extends ReadableLike<Incoming>, TRes extends WritableLike<Outgoing>>(context: RequestContext, request: TReq, options: ServiceConfig, response?: TRes): AbstractRequestContext<TReq, TRes>;
}
/**
 * throw able.
 */
export interface Throwable {
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    throwError(status: number, message?: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    throwError(message: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param error error
     * @returns instance of {@link TransportError}
     */
    throwError(error: Error): Error;
}
