import { Abstract, DefaultInvocationContext } from '@tsdi/ioc';

/**
 * endpoint context.
 */
@Abstract()
export abstract class EndpointContext extends DefaultInvocationContext {
    /**
     * host client or server. instance of  `TransportClient` or `TransportServer`
     */
    abstract get target(): any;

    protected override clear(): void {
        super.clear();
        (this as any).target = null;
    }
}

/**
 * transport context.
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any> extends EndpointContext {
    /**
     * host client or server. instance of `TransportServer`
     */
    abstract get target(): any;
    /**
     * transport request.
     */
    abstract get request(): TRequest;
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
     * The outgoing HTTP request method.
     */
    abstract get method(): string;
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

    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(status: number, message?: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param status transport status
     * @param messages transport messages.
     * @returns instance of {@link TransportError}
     */
    abstract throwError(message: string): Error;
    /**
     * create error instance of {@link TransportError}.
     * @param error error 
     * @returns instance of {@link TransportError}
     */
    abstract throwError(error: Error): Error;


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
    abstract getHeader(field: string): string | string[] | number | undefined;


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

}
