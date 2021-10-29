import { Abstract, isArray, isString } from '@tsdi/ioc';
import { Headers, HeadersOption } from './header';


@Abstract()
export abstract class Request {
    /**
     * Get request originalUrl.
     *
     * @return {String}
     * @api public
     */
    abstract get originalUrl(): string;
    /**
     * Get request URL.
     *
     * @return {String}
     * @api public
     */
    abstract get url(): string;
    /**
     * Set request URL.
     *
     * @api public
     */
    abstract set url(url: string);

    /**
     * Get origin of URL.
     *
     * @return {String}
     * @api public
     */
    get origin() {
        return this.URL.origin;
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

    /**
     * Get request method.
     *
     * @return {String}
     * @api public
     */
    abstract get method(): string;

    /**
     * Set request method.
     *
     * @param {String} val
     * @api public
     */
    abstract set method(val: string);

    /**
     * Get request pathname.
     *
     * @return {String}
     * @api public
     */
    get path(): string {
        return this.URL.pathname;
    }

    private _querycache!: Record<string, any>;
    /**
     * Get parsed query-string.
     *
     * @return {any}
     * @api public
     */
    get query(): Record<string, any> {
        let qur = this._querycache;
        if (!qur) {
            qur = {};
            this.URL.searchParams.forEach((v, k) => {
                qur[k] = v;
            });
        }
        return qur;
    }
    /**
     * Set query-string as an object.
     *
     * @param {any} obj
     * @api public
     */
    set query(val: Record<string, any>) {
        let querystring = '';
        if (val) {
            Object.keys(val).forEach((n, idx) => {
                querystring = `${querystring}${idx > 0 ? ';' : ''}${n}=${val[n]}`;
            });
        }
        this.querystring = querystring;
        this._querycache = val;
    }

    /**
     * Get or set request body.
     *
     * @return {any}
     * @api public
     */
    body: any;


    /**
     * Get query string.
     *
     * @return {String}
     * @api public
     */
    get querystring(): string {
        return this.URL.search.slice(1);
    }

    /**
     * Set querystring.
     *
     * @param {String} str
     * @api public
     */
    set querystring(str) {
        if (this.URL.search === `?${str}`) return;
        this.URL.search = str;
        this.url = this.URL.pathname + this.URL.search;
    }

    /**
   * Get the search string. Same as the querystring
   * except it includes the leading ?.
   *
   * @return {String}
   * @api public
   */
    get search() {
        return this.URL.search;
    }

    /**
     * Parse the "Host" header field host
     * and support X-Forwarded-Host when a
     * proxy is enabled.
     *
     * @return {String} hostname:port
     * @api public
     */
    get host(): string {
        return this.URL.host;
    }

    /**
     * Parse the "Host" header field hostname
     * and support X-Forwarded-Host when a
     * proxy is enabled.
     *
     * @return {String} hostname
     * @api public
     */
    get hostname(): string {
        return this.URL.hostname;
    }

    protected _URL!: URL;
    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    get URL(): URL {
        if (!this._URL) {
            this._URL = this.parseURL(this.url);
        }
        return this._URL;
    }

    protected parseURL(url: string) {
        let uri: URL;
        url = url.trim();
        try {
            if (!/^\w+:\/\//.test(url)) {
                url = this.parseOrigin() + (/^\//.test(url) ? '' : '/') + url;
            }
            uri = new URL(url);
        } catch (err) {
            console.log(url, 'parseURL:', err);
            uri = null!;
        }
        return uri;
    }

    protected parseOrigin() {
        const proto = this.getHeader('X-Forwarded-Proto');
        let protocol = proto && isString(proto) ? proto.split(/\s*,\s*/, 1)[0] : 'msg'
        let host = this.getHeader('X-Forwarded-Host') ??
            this.getHeader(':authority') ?? this.getHeader('Host');
        return `${protocol}://${host || '0.0.0.0'}`
    }

    /**
     * Return parsed Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    get length(): number {
        const len = this.getHeaderFirst('Content-Length') || '';
        if (len === '') return 0;
        return ~~len;
    }

    /**
     * Return the protocol string "http" or "https"
     * when requested with TLS. When the proxy setting
     * is enabled the "X-Forwarded-Proto" header
     * field will be trusted. If you're running behind
     * a reverse proxy that supplies https for you this
     * may be enabled.
     *
     * @return {String}
     * @api public
     */
    get protocol(): string {
        return this.URL.protocol;
    }

    /**
     * is the protocol secure or not.
     */
    abstract get secure(): boolean;

    /**
     * Return the request mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    get type(): string {
        return this.getHeaderFirst('Content-Type') as string;
    }

    getHeaderFirst(name: string): string {
        const vals = this.getHeader(name);
        return isArray(vals) ? vals[0] : vals;
    }

    abstract getHeaders(): Headers | Record<string, string | string[]>;

    abstract getHeader(name: string): string | string[];

    abstract hasHeader(name: string): boolean;

    abstract setHeader(name: string, value: string | string[]): void;

    abstract removeHeader(name: string): void;

}

export type ProtocolType = 'http://' | 'https://'| 'mqtt://' | 'amqp://' | 'coap://'
     | 'tcp://' | 'udp://' | 'ftp://' | 'smtp://' | 'telnet://' | 'dns://' | 'msg://';

export interface RequestInit {
    headers?: HeadersOption;
    /**
     * protocol.
     */
    readonly protocol?: string;
    /**
     * restful params.
     */
    readonly restful?: Record<string, string | number | boolean>;
    /**
     * request body.
     */
    readonly body?: any;
    /**
     * request query params
     */
    readonly query?: Record<string, any>;
    /**
     * reuqest method
     */
    readonly method?: string;
    /**
     * event, request type
     */
    readonly type?: string;
    /**
     * the target raise request.
     */
    readonly target?: any;

    /**
     * A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
     */
    referrer?: string;
}

/**
 * Request
 */
export interface RequestOption extends RequestInit {

    /**
     * request url.
     */
    url: string;
}

