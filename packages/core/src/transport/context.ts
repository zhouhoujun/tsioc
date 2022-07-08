import { Abstract, DefaultInvocationContext } from '@tsdi/ioc';
import { Protocol } from './packet';
import { TransportEndpoint } from './transport';

/**
 * endpoint context.
 */
@Abstract()
export abstract class EndpointContext extends DefaultInvocationContext {
    /**
     * host transport endpoint. instance of {@link TransportEndpoint}.
     */
    abstract get target(): TransportEndpoint;

    protected override clear(): void {
        super.clear();
        (this as any).target = null;
    }
}

/**
 * request context.
 */
@Abstract()
export abstract class RequestContext extends EndpointContext {
    /**
     * response observe type
     */
    abstract get observe(): 'body' | 'events' | 'response';
    /**
     * response data type.
     */
    abstract responseType: 'arraybuffer' | 'blob' | 'json' | 'text';
}

/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any> extends EndpointContext {
    /**
     * server transport protocol.
     */
    abstract get protocol(): Protocol | undefined;
    /**
     * host transport endpoint. instance of {@link TransportEndpoint}.
     */
    abstract get target(): TransportEndpoint;
    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport request.
     */
    abstract set request(req: TRequest);
    /**
     * transport response.
     */
    abstract get response(): TResponse;

    /**
     * Get request rul
     */
    abstract get url(): string;

    /**
     * Set request url
     */
    abstract set url(value: string);

    /**
     * Get request pathname .
     */
    abstract get pathname(): string;
    /**
     * restful params. 
     */
    restfulParams?: any;
    /**
     * request URL query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;
    /**
     * request body, playload.
     */
    get playload(): any {
        return (this.request as any).body
    }
    /**
     * The outgoing request method.
     */
    abstract get method(): string;

    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, middlewares should take care to preserve
     * idempotence by treating them as such.
     */
    abstract get body(): any;
    /**
     * Set response body.
     *
     * @param {any} value
     * @api public
     */
    abstract set body(value: any);

    /**
     * response body length.
     */
    abstract get length(): number | undefined;

    /**
     * is update modle resquest.
     */
    abstract isUpdate(): boolean;

    /**
     * Get response status code.
     */
    abstract get status(): number;
    /**
     * Set response status code, defaults to OK.
     */
    abstract set status(status: number);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract get statusMessage(): string;
    /**
     * Set Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    abstract set statusMessage(msg: string);
    /**
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Whether the status code is ok
     */
    abstract set ok(ok: boolean);

    /**
     * has sent or not.
     */
    abstract get sent(): boolean;

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

/**
 * header context with tansport.
 */
export interface HeaderContext {
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
    getHeader(field: string): string | string[] | undefined;

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
    setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove response header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void;

}

/**
 * redirect context.
 */
export interface RedirectContext {
    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    redirect(url: string, alt?: string): void;
}

/**
 * asset context.
 */
export interface AssetContext extends HeaderContext {
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
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined);
    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    get length(): number | undefined;


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
    }): void

}