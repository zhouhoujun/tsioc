import { Abstract, Injector } from '@tsdi/ioc';
import { TransportSession, Incoming, Outgoing, encodeUrl, escapeHtml, ctype } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { ServerOpts } from './Server';

/**
 * abstract Restful request context.
 * 
 * 支持状态的请求上下文
 */
@Abstract()
export abstract class RestfulRequestContext<TServOpts extends ServerOpts = ServerOpts, TStatus = any> extends RequestContext<TServOpts, TStatus> {

    abstract get serverOptions(): TServOpts;

    abstract get socket(): any;


    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    abstract get URL(): URL;

    get params(): URLSearchParams {
        return this.URL.searchParams
    }

    /**
     * Get full request URL.
     *
     * @return {String}
     * @api public
     */

    get href(): string {
        return this.URL.href
    }

    /**
     * Get request pathname .
     */
    get pathname(): string {
        return this.URL.pathname
    }
    /**
     * protocol name
     */
    abstract get protocol(): string;
    /**
     * is secure protocol or not.
     *
     * @return {Boolean}
     * @api public
     */
    abstract get secure(): boolean;

    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = { ...this.request.query } as Record<string, any>;
            this.URL.searchParams?.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this._query;
    }

    /**
     * Get the search string. Same as the query string
     * except it includes the leading ?.
     *
     * @return {String}
     * @api public
     */
    get search(): string {
        return this.URL.search
    }
    /**
     * Set the search string. Same as
     * request.querystring= but included for ubiquity.
     *
     * @param {String} str
     * @api public
     */
    set search(str: string) {
        this.URL.search = str;
        this._query = null!
    }


    /**
     * Get query string.
     *
     * @return {String}
     * @api public
     */

    get querystring() {
        return this.URL.search?.slice(1)
    }
    /**
     * Set query string.
     *
     * @param {String} str
     * @api public
     */
    set querystring(str) {
        this.search = `?${str}`
    }


    /**
     * can response stream writeable
     */
    get writable(): boolean {
        return this.response.writable
    }


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
    redirect(url: string, alt?: string): void {
        if(!this.statusAdapter) return;

        if ('back' === url) url = this.getHeader('referrer') as string || alt || '/';
        this.setHeader('location', encodeUrl(url));
        // status
        if (!this.statusAdapter.isRedirect(this.status)) this.status = this.statusAdapter.found;

        // html
        if (this.accepts('html')) {
            url = escapeHtml(url);
            this.type = ctype.TEXT_HTML_UTF8;
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return
        }

        // text
        this.type = ctype.TEXT_PLAIN_UTF8;
        this.body = `Redirecting to ${url}.`
    }

}

/**
 * Restful request context factory.
 */
@Abstract()
export abstract class RestfulRequestContextFactory {
    /**
     * create Restful request context.
     * @param injector 
     * @param session 
     * @param request 
     * @param response 
     * @param options 
     */
    abstract create(injector: Injector, session: TransportSession, request: Incoming, response: Outgoing, options: ServerOpts): RestfulRequestContext;
}