import { Abstract, Injector } from '@tsdi/ioc';
import { EndpointInvokeOpts } from '@tsdi/core';
import { Incoming, Outgoing, normalize, InternalServerExecption, TransportSession } from '@tsdi/common';
import { ServerTransportSession } from '../transport/session';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';


/**
 * abstract mime asset transport context.
 * 
 * 类型资源传输节点上下文
 */
@Abstract()
export abstract class RestfulContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing, TSocket = any, TServOpts extends ServerOpts = any> extends TransportContext<TRequest, TResponse, TSocket, TServOpts> {

    private _URL?: URL;
    readonly originalUrl: string;
    private _url?: string;


    constructor(injector: Injector, readonly session: ServerTransportSession, readonly request: TRequest, readonly response: TResponse, readonly serverOptions: TServOpts, options?: EndpointInvokeOpts<TRequest>) {
        super(injector, { isDone: (ctx: RestfulContext<TRequest>) => !ctx.session.statusAdapter?.isNotFound(ctx.status), ...options, args: request });
        this.setValue(TransportSession, session);
        this.originalUrl = this.getOriginalUrl(request);
        this.init(request);
    }

    protected override onExecption(err: any): void {
        const status = err?.status ?? err?.statusCode;
        if (status) {
            this.status = status;
            this.statusMessage = err.message;
        }
    }

    protected getOriginalUrl(request: TRequest) {
        return normalize(request.originalUrl || request.topic || '');
    }

    protected override getRequestPath(): string {
        return this.pathname || this.originalUrl || this.url
    }

    protected init(request: TRequest) {
        if (this.statusAdapter) this.status = this.statusAdapter.notFound;
        this._url = request.url || request.topic || '';
        if (this.isAbsoluteUrl(this._url)) {
            this._url = normalize(this.URL.pathname);
        } else {
            const sidx = this._url.indexOf('?');
            if (sidx > 0) {
                this._url = this._url.slice(0, sidx);
            }
            this._url = normalize(this._url);
        }
        (this.request as any)['query'] = this.query;
    }

    /**
     * Get url path.
     *
     * @return {String}
     * @api public
     */
    get url(): string {
        if (!this._url) {
            this._url = this.pathname + this.URL.search;
        }
        return this._url
    }

    /**
     * Set url path
     */
    set url(value: string) {
        this._url = value
    }

    get socket() {
        return this.request.socket;
    }

    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    get URL(): URL {
        /* istanbul ignore else */
        if (!this._URL) {
            this._URL = this.createURL();
        }
        return this._URL!;
    }

    protected createURL() {
        try {
            return this.parseURL(this.request, !!this.serverOptions.proxy);
        } catch (err: any) {
            throw new InternalServerExecption(err.message);
        }
    }


    /**
     * the url is absolute url or not.
     * @param url 
     */
    abstract isAbsoluteUrl(url: string): boolean;
    /**
     * parse URL.
     */
    protected abstract parseURL(req: TRequest, proxy?: boolean): URL;

    get pathname(): string {
        return this.URL.pathname
    }

    get params(): URLSearchParams {
        return this.URL.searchParams
    }

    /**
     * Get full request URL.
     *
     * @return {String}
     * @api public
     */

    get href() {
        return this.URL.href;
    }

    get protocol(): string {
        const protocol = this.URL.protocol;
        return protocol.substring(0, protocol.length - 1)
    }

    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = { ...this.request.params } as Record<string, any>;
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
    get search() {
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
     * Get request method.
     *
     * @return {String}
     * @api public
     */

    get method(): string {
        return this.request.method ?? ''
    }


    /**
     * Return request header, alias as request.header
     *
     * @return {Object}
     * @api public
     */
    get headers() {
        return this.request.headers
    }

    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get sent() {
        return this.response.headersSent!
    }



}
