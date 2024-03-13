import { Abstract, Injector } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';
import { TransportSession, StatusVaildator, FileAdapter } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
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
     * Whether the status code is ok
     */
    abstract get ok(): boolean;
    /**
     * Whether the status code is ok
     */
    abstract set ok(ok: boolean);
   
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