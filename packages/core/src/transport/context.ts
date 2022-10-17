import { Abstract, DefaultInvocationContext } from '@tsdi/ioc';
import { Incoming, Outgoing } from './packet';
import { TransportEndpoint } from './transport';
import { TransportStrategy } from './strategy';
import { States, TransportStatus } from './status';

/**
 * endpoint context.
 */
@Abstract()
export abstract class EndpointContext extends DefaultInvocationContext {
    /**
     * host transport endpoint. instance of {@link TransportEndpoint}.
     */
    abstract get target(): TransportEndpoint;

    /**
     * transport.
     */
    abstract get transport(): TransportStatus;


    protected override clear(): void {
        super.clear();
        (this as any).target = null;
    }

}

/**
 * client endpoint context.
 */
@Abstract()
export abstract class ClientEndpointContext extends EndpointContext {
    /**
     * response observe type
     */
    abstract get observe(): 'body' | 'events' | 'response';
}


/**
 * abstract server side endpoint context.
 */
@Abstract()
export abstract class ServerEndpointContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends EndpointContext {
    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport response.
     */
    abstract get response(): TResponse;

    /**
     * state of transport.
     */
    abstract get transport(): TransportStrategy;

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
        return this.request.body;
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

    get state(): States {
        return this.transport.fromCode(this.status);
    }

    set state(state: States) {
        this.status = this.transport.toCode(state);
    }

    /**
     * Get response status code.
     */
    abstract get status(): number | string;
    /**
     * Set response status code, defaults to OK.
     */
    abstract set status(status: number | string);

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
    get ok(): boolean {
        return this.status === this.transport.toCode(States.Ok);
    }
    /**
     * Whether the status code is ok
     */
    set ok(ok: boolean) {
        this.status = this.transport.toCode(ok ? States.Ok : States.NotFound)
    }


    /**
     * has sent or not.
     */
    abstract get sent(): boolean;


    /**
     * match protocol.
     * @param protocol 
     * @returns 
     */
    match(protocol: string): boolean {
        return this.transport.match(protocol);
    }

    /**
     * is update request or not.
     */
    get update(): boolean {
        return this.transport.isUpdate(this.request);
    }

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
 * asset context.
 */
@Abstract()
export abstract class AssetContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends ServerEndpointContext<TRequest, TResponse> {
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
    abstract getHeader(field: string): string | string[] | undefined;

    /**
     * has response header field or not.
     * @param field 
     */
    abstract hasHeader(field: string): boolean;
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
    abstract setHeader(field: string, val: string | number | string[]): void;
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
    abstract setHeader(fields: Record<string, string | number | string[]>): void;
    /**
     * Remove response header `field`.
     *
     * @param {String} name
     * @api public
     */
    abstract removeHeader(field: string): void;

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
    abstract is(type: string | string[]): string | null | false;

    /**
     * content type.
     */
    abstract get contentType(): string;
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
    abstract set contentType(type: string);

    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    abstract set length(n: number | undefined);
    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    abstract get length(): number | undefined;

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
    abstract set type(type: string);

    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    abstract get type(): string;

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

    abstract accepts(...args: string[]): string | string[] | false;
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
    abstract acceptsEncodings(...encodings: string[]): string | string[] | false;
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
    abstract acceptsCharsets(...charsets: string[]): string | string[] | false;

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
    abstract acceptsLanguages(...langs: string[]): string | string[];


    /**
    * Set Content-Disposition header to "attachment" with optional `filename`.
    *
    * @param filname file name for download.
    * @param options content disposition.
    * @api public
    */
    abstract attachment(filename: string, options?: {
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
    abstract redirect(url: string, alt?: string): void;

}