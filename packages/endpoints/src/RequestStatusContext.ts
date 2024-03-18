import { Abstract, Injector } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';
import { TransportSession, StatusAdapter, FileAdapter, Incoming, Outgoing } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { ServerOpts } from './Server';

/**
 * abstract request context with status.
 * 
 * 支持状态的请求上下文
 */
@Abstract()
export abstract class RequestStatusContext<TServOpts extends ServerOpts = ServerOpts> extends RequestContext {

    abstract get serverOptions(): TServOpts;

    /**
     * protocol name
     */
    abstract get protocol(): string;
    /**
     * has sent or not.
     */
    abstract readonly sent: boolean;

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
 * request status context factory.
 */
@Abstract()
export abstract class RequestStatusContextFactory{
    /**
     * create request status context.
     * @param injector 
     * @param session 
     * @param request 
     * @param response 
     * @param options 
     */
    abstract create(injector: Injector, session: TransportSession, request: Incoming, response: Outgoing, options: ServerOpts): RequestStatusContext;
}