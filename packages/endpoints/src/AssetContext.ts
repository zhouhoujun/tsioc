import { Abstract, Injector } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';
import { TransportSession } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { FileAdapter } from './FileAdapter';
import { StatusVaildator } from './StatusVaildator';
import { ServerOpts } from './Server';

/**
 * abstract mime asset transport context.
 * 
 * 类型资源传输节点上下文
 */
@Abstract()
export abstract class AssetContext<TRequest = any, TResponse = any, TServOpts extends ServerOpts = ServerOpts> extends RequestContext<TRequest, TResponse> {

    abstract get serverOptions(): TServOpts;
    /**
     * file adapter
     */
    abstract get fileAdapter(): FileAdapter;
    /**
     * status vaildator
     */
    abstract get vaildator(): StatusVaildator;

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
     * The request method.
     */
    abstract get method(): string;

    /**
     * protocol name
     */
    abstract get protocol(): string;

    /**
     * transport request.
     */
    abstract get request(): TRequest;
    /**
     * transport response.
     */
    abstract get response(): TResponse;

    /**
     * has sent or not.
     */
    abstract readonly sent: boolean;
    /**
     * Get response status.
     */
    abstract get status(): StatusCode;
    /**
     * Set response status, defaults to OK.
     */
    abstract set status(status: StatusCode);

    /**
     * Get response status message.
     */
    abstract get statusMessage(): string;
    /**
     * Set response status message.
     */
    abstract set statusMessage(message: string);

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
     * is secure protocol or not.
     *
     * @return {Boolean}
     * @api public
     */
    abstract get secure(): boolean;

    /**
     * Get request pathname .
     */
    abstract get pathname(): string;

    /**
     * can response stream writeable
     */
    abstract get writable(): boolean;
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
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Whether the status code is ok
     */
    abstract set ok(ok: boolean);
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

/**
 * Asset context factory.
 */
@Abstract()
export abstract class AssetContextFactory<TIncoming = any> {
    /**
     * create context factory.
     * @param injector 
     * @param session 
     * @param incoming 
     * @param options 
     */
    abstract create(injector: Injector, session: TransportSession, incoming: TIncoming, options: ServerOpts): AssetContext;
}