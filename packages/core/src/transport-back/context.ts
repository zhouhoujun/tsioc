// import { Abstract } from '@tsdi/ioc';
// import { Incoming, Outgoing } from './packet';
// import { OkStatus, Status, StatusFactory } from './status';
// import { EndpointContext } from '../filters/context';


// /**
//  * client endpoint context.
//  */
// @Abstract()
// export abstract class ClientEndpointContext extends EndpointContext {
    
//     /**
//      * Get response status.
//      */
//     abstract get status(): Status;
//     /**
//      * Set response status, defaults to OK.
//      */
//     abstract set status(status: Status);

//     abstract get statusFactory(): StatusFactory;
//     /**
//      * response observe type
//      */
//     abstract get observe(): 'body' | 'events' | 'response';
// }


// /**
//  * Listen options.
//  */
// @Abstract()
// export abstract class ListenOpts {

//     [x: string]: any;

//     /**
//     * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
//     */
//     signal?: AbortSignal | undefined;
//     port?: number | undefined;
//     host?: string | undefined;
//     backlog?: number | undefined;
//     path?: string | undefined;
//     exclusive?: boolean | undefined;
//     readableAll?: boolean | undefined;
//     writableAll?: boolean | undefined;
//     /**
//      * @default false
//      */
//     ipv6Only?: boolean | undefined;
//     withCredentials?: boolean;
// }


// /**
//  * abstract server side endpoint context.
//  */
// @Abstract()
// export abstract class ServerEndpointContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends EndpointContext {
    
//     /**
//      * Get response status.
//      */
//     abstract get status(): Status;
//     /**
//      * Set response status, defaults to OK.
//      */
//     abstract set status(status: Status);

//     abstract get statusFactory(): StatusFactory;

//     /**
//      * transport request.
//      */
//     abstract get request(): TRequest;
//     /**
//      * transport response.
//      */
//     abstract get response(): TResponse;

//     /**
//      * protocol name
//      */
//     abstract get protocol(): string;

//     /**
//      * Get request rul
//      */
//     abstract get url(): string;

//     /**
//      * Set request url
//      */
//     abstract set url(value: string);

//     /**
//      * Get request pathname .
//      */
//     abstract get pathname(): string;
//     /**
//      * restful params. 
//      */
//     restfulParams?: any;
//     /**
//      * request URL query parameters.
//      */
//     abstract get query(): Record<string, string | string[] | number | any>;
//     /**
//      * request body, playload.
//      */
//     get playload(): any {
//         return this.request.body;
//     }
//     /**
//      * The outgoing request method.
//      */
//     abstract get method(): string;

//     /**
//      * The request body, or `null` if one isn't set.
//      *
//      * Bodies are not enforced to be immutable, as they can include a reference to any
//      * user-defined data type. However, middlewares should take care to preserve
//      * idempotence by treating them as such.
//      */
//     abstract get body(): any;
//     /**
//      * Set response body.
//      *
//      * @param {any} value
//      * @api public
//      */
//     abstract set body(value: any);

//     /**
//      * response body length.
//      */
//     abstract get length(): number | undefined;

//     /**
//      * Whether the status code is ok
//      */
//     get ok(): boolean {
//         return this.status instanceof OkStatus;
//     }
//     /**
//      * Whether the status code is ok
//      */
//     set ok(ok: boolean) {
//         const factory = this.get(StatusFactory);
//         this.status = ok ? factory.create('Ok') : factory.create('NotFound')
//     }


//     /**
//      * has sent or not.
//      */
//     abstract get sent(): boolean;


//     /**
//      * is update request or not.
//      */
//     abstract get update(): boolean;
//     /**
//      * is secure protocol or not.
//      *
//      * @return {Boolean}
//      * @api public
//      */
//     abstract get secure(): boolean;
//     /**
//      * the url is absolute url or not.
//      * @param url 
//      */
//     abstract isAbsoluteUrl(url: string): boolean;
//     /**
//      * url parse.
//      * @param url 
//      */
//     abstract parseURL(incoming: Incoming, opts: ListenOpts, proxy?: boolean): URL;

// }

// /**
//  * throw able.
//  */
// export interface Throwable {
//     /**
//      * create error instance of {@link TransportError}.
//      * @param status transport status
//      * @param messages transport messages.
//      * @returns instance of {@link TransportError}
//      */
//     throwError(status: number, message?: string): Error;
//     /**
//      * create error instance of {@link TransportError}.
//      * @param status transport status
//      * @param messages transport messages.
//      * @returns instance of {@link TransportError}
//      */
//     throwError(message: string): Error;
//     /**
//      * create error instance of {@link TransportError}.
//      * @param error error 
//      * @returns instance of {@link TransportError}
//      */
//     throwError(error: Error): Error;
// }


// /**
//  * asset context.
//  */
// @Abstract()
// export abstract class AssetContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends ServerEndpointContext<TRequest, TResponse> {
//     /**
//      * Return request header.
//      *
//      * The `Referrer` header field is special-cased,
//      * both `Referrer` and `Referer` are interchangeable.
//      *
//      * Examples:
//      *
//      *     this.get('Content-Type');
//      *     // => "text/plain"
//      *
//      *     this.get('content-type');
//      *     // => "text/plain"
//      *
//      *     this.get('Something');
//      *     // => ''
//      *
//      * @param {String} field
//      * @return {String}
//      * @api public
//      */
//     abstract getHeader(field: string): string | string[] | undefined;

//     /**
//      * has response header field or not.
//      * @param field 
//      */
//     abstract hasHeader(field: string): boolean;
//     /**
//      * Set response header `field` to `val` or pass
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
//     abstract setHeader(field: string, val: string | number | string[]): void;
//     /**
//      * Set response header `field` to `val` or pass
//      * an object of header fields.
//      *
//      * Examples:
//      *
//      *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
//      *
//      * @param {Record<string, string | number | string[]>} fields
//      * @param {String} val
//      * @api public
//      */
//     abstract setHeader(fields: Record<string, string | number | string[]>): void;
//     /**
//      * Remove response header `field`.
//      *
//      * @param {String} name
//      * @api public
//      */
//     abstract removeHeader(field: string): void;

//     /**
//      * Check if the incoming request contains the "Content-Type"
//      * header field and if it contains any of the given mime `type`s.
//      * If there is no request body, `null` is returned.
//      * If there is no content type, `false` is returned.
//      * Otherwise, it returns the first `type` that matches.
//      *
//      * Examples:
//      *
//      *     // With Content-Type: text/html; charset=utf-8
//      *     this.is('html'); // => 'html'
//      *     this.is('text/html'); // => 'text/html'
//      *     this.is('text/*', 'application/json'); // => 'text/html'
//      *
//      *     // When Content-Type is application/json
//      *     this.is('json', 'urlencoded'); // => 'json'
//      *     this.is('application/json'); // => 'application/json'
//      *     this.is('html', 'application/*'); // => 'application/json'
//      *
//      *     this.is('html'); // => false
//      */
//     abstract is(type: string | string[]): string | null | false;

//     /**
//      * content type.
//      */
//     abstract get contentType(): string;
//     /**
//      * Set Content-Type response header with `type` through `mime.lookup()`
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
//     abstract set contentType(type: string);

//     /**
//      * Set Content-Length field to `n`.
//      *
//      * @param {Number} n
//      * @api public
//      */
//     abstract set length(n: number | undefined);
//     /**
//      * Return parsed response Content-Length when present.
//      *
//      * @return {Number}
//      * @api public
//      */
//     abstract get length(): number | undefined;

//     /**
//      * Set Content-Type response header with `type` through `mime.lookup()`
//      * when it does not contain a charset.
//      *
//      * Examples:
//      *
//      *     this.type = '.html';
//      *     this.type = 'html';
//      *     this.type = 'json';
//      *     this.type = 'application/json';
//      *     this.type = 'png';
//      *
//      * @param {String} type
//      * @api public
//      */
//     abstract set type(type: string);

//     /**
//      * Return the response mime type void of
//      * parameters such as "charset".
//      *
//      * @return {String}
//      * @api public
//      */
//     abstract get type(): string;

//     /**
//      * Check if the given `type(s)` is acceptable, returning
//      * the best match when true, otherwise `false`, in which
//      * case you should respond with 406 "Not Acceptable".
//      *
//      * The `type` value may be a single mime type string
//      * such as "application/json", the extension name
//      * such as "json" or an array `["json", "html", "text/plain"]`. When a list
//      * or array is given the _best_ match, if any is returned.
//      *
//      * Examples:
//      *
//      *     // Accept: text/html
//      *     this.accepts('html');
//      *     // => "html"
//      *
//      *     // Accept: text/*, application/json
//      *     this.accepts('html');
//      *     // => "html"
//      *     this.accepts('text/html');
//      *     // => "text/html"
//      *     this.accepts('json', 'text');
//      *     // => "json"
//      *     this.accepts('application/json');
//      *     // => "application/json"
//      *
//      *     // Accept: text/*, application/json
//      *     this.accepts('image/png');
//      *     this.accepts('png');
//      *     // => false
//      *
//      *     // Accept: text/*;q=.5, application/json
//      *     this.accepts('html', 'json');
//      *     // => "json"
//      *
//      * @param {String|Array} type(s)...
//      * @return {String|Array|false}
//      * @api public
//      */

//     abstract accepts(...args: string[]): string | string[] | false;
//     /**
//     * Return accepted encodings or best fit based on `encodings`.
//     *
//     * Given `Accept-Encoding: gzip, deflate`
//     * an array sorted by quality is returned:
//     *
//     *     ['gzip', 'deflate']
//     *
//     * @param {String|Array} encoding(s)...
//     * @return {String|Array}
//     * @api public
//     */
//     abstract acceptsEncodings(...encodings: string[]): string | string[] | false;
//     /**
//      * Return accepted charsets or best fit based on `charsets`.
//      *
//      * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
//      * an array sorted by quality is returned:
//      *
//      *     ['utf-8', 'utf-7', 'iso-8859-1']
//      *
//      * @param {String|Array} charset(s)...
//      * @return {String|Array}
//      * @api public
//      */
//     abstract acceptsCharsets(...charsets: string[]): string | string[] | false;

//     /**
//      * Return accepted languages or best fit based on `langs`.
//      *
//      * Given `Accept-Language: en;q=0.8, es, pt`
//      * an array sorted by quality is returned:
//      *
//      *     ['es', 'pt', 'en']
//      *
//      * @param {String|Array} lang(s)...
//      * @return {Array|String}
//      * @api public
//      */
//     abstract acceptsLanguages(...langs: string[]): string | string[];


//     /**
//     * Set Content-Disposition header to "attachment" with optional `filename`.
//     *
//     * @param filname file name for download.
//     * @param options content disposition.
//     * @api public
//     */
//     abstract attachment(filename: string, options?: {
//         contentType?: string;
//         /**
//         * Specifies the disposition type.
//         * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
//         * but can convey additional information if both parties agree to it).
//         * The `type` is normalized to lower-case.
//         * @default 'attachment'
//         */
//         type?: 'attachment' | 'inline' | string | undefined;
//         /**
//          * If the filename option is outside ISO-8859-1,
//          * then the file name is actually stored in a supplemental field for clients
//          * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
//          * @default true
//          */
//         fallback?: string | boolean | undefined;
//     }): void;


//     /**
//      * Perform a 302 redirect to `url`.
//      *
//      * The string "back" is special-cased
//      * to provide Referrer support, when Referrer
//      * is not present `alt` or "/" is used.
//      *
//      * Examples:
//      *
//      *    this.redirect('back');
//      *    this.redirect('back', '/index.html');
//      *    this.redirect('/login');
//      *    this.redirect('http://google.com');
//      *
//      * @param {String} url
//      * @param {String} [alt]
//      * @api public
//      */
//     abstract redirect(url: string, alt?: string): void;

// }
