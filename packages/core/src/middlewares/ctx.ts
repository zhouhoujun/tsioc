import { Abstract, Injector, ProviderType, Token } from '@tsdi/ioc';

/**
 * Request
 */
export interface RequestOption {
    /**
     * request url.
     */
    url?: string;
    /**
     * protocol.
     */
    readonly protocol?: string;
    /**
     * request body.
     */
    readonly body?: any;
    /**
     * request query params
     */
    readonly query?: any;
    /**
     * reuqest method
     */
    readonly method?: string;
    /**
     * event
     */
    readonly event?: string;
    /**
     * the target raise request.
     */
    readonly target?: any;

    /**
     * providers.
     */
    providers?: ProviderType[];
}

interface Headers {
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
    forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
}

@Abstract()
export abstract class Request {
    /**
     * Return request header, alias as request.header
     *
     * @return {Object}
     * @api public
     */
    abstract get headers(): Headers;
    /**
     * Set request header, alias as request.header.
     * 
     * @api public
     */
    abstract set headers(headers: Headers);

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
        return `${this.protocol}://${this.host}`;
    }

    /**
     * Get full request URL.
     *
     * @return {String}
     * @api public
     */
    get href() {
        // support: `GET http://example.com/foo`
        if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
        return this.origin + this.originalUrl;
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
    abstract get path(): string;

    /**
     * Set pathname, retaining the query-string when present.
     *
     * @param {String} path
     * @api public
     */
    abstract set path(path: string);

    /**
     * Get parsed query-string.
     *
     * @return {any}
     * @api public
     */
    abstract get query(): any;
    /**
     * Set query-string as an object.
     *
     * @param {any} obj
     * @api public
     */
    abstract set query(obj: any);
    /**
     * Get parsed request data to body.
     *
     * @return {any}
     * @api public
     */
    abstract get body(): any;
    /**
     * Set parsed request data to body.
     *
     * @param {any} obj
     * @api public
     */
    abstract set body(obj: any);

    /**
     * Get query string.
     *
     * @return {String}
     * @api public
     */
    abstract get querystring(): string;
    /**
     * Set querystring.
     *
     * @param {String} str
     * @api public
     */
    abstract set querystring(str);

    /**
   * Get the search string. Same as the querystring
   * except it includes the leading ?.
   *
   * @return {String}
   * @api public
   */
    get search() {
        if (!this.querystring) return '';
        return `?${this.querystring}`;
    }

    /**
     * Set the search string. Same as
     * request.querystring= but included for ubiquity.
     *
     * @param {String} str
     * @api public
     */
    set search(str: string) {
        this.querystring = str;
    }

    /**
     * Parse the "Host" header field host
     * and support X-Forwarded-Host when a
     * proxy is enabled.
     *
     * @return {String} hostname:port
     * @api public
     */
    abstract get host(): string;

    /**
     * Parse the "Host" header field hostname
     * and support X-Forwarded-Host when a
     * proxy is enabled.
     *
     * @return {String} hostname
     * @api public
     */
    abstract get hostname(): string;

    /**
     * Return parsed Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    abstract get length(): number;

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
    abstract get protocol(): string;

    /**
     * Short-hand for:
     *
     *    this.protocol == 'https'
     *
     * @return {Boolean}
     * @api public
     */
    get secure() {
        return 'https' === this.protocol;
    }

    /**
     * Return subdomains as an array.
     *
     * Subdomains are the dot-separated parts of the host before the main domain
     * of the app. By default, the domain of the app is assumed to be the last two
     * parts of the host. This can be changed by setting `app.subdomainOffset`.
     *
     * For example, if the domain is "tobi.ferrets.example.com":
     * If `app.subdomainOffset` is not set, this.subdomains is
     * `["ferrets", "tobi"]`.
     * If `app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.
     *
     * @return {Array}
     * @api public
     */
    abstract get subdomains(): string[];


    /**
     * Return the request mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    abstract get type(): string;

    /**
     * Get accept object.
     * Lazily memoized.
     *
     * @return {Object}
     * @api private
     */
    abstract get accept(): Object;
    /**
     * Set accept object.
     *
     * @param {Object}
     * @api private
     */
    abstract set accept(obj: Object);

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
     *     this.accepts(['html', 'json']);
     *     this.accepts('html', 'json');
     *     // => "json"
     *
     * @param {String|Array} type(s)...
     * @return {String|Array|false}
     * @api public
     */
    abstract accepts(type: string[]): string | string[] | boolean;
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
     *     this.accepts(['html', 'json']);
     *     this.accepts('html', 'json');
     *     // => "json"
     *
     * @param {...ObjectMapstring[]} type(s)...
     * @return {String|Array|false}
     * @api public
     */
    abstract accepts(types: string[]): string | string[] | boolean;

}

@Abstract()
export abstract class Response {
    /**
     * Get response status code.
     *
     * @return {Number}
     * @api public
     */
    abstract get status(): number;
    /**
     * Set response status code.
     *
     * @param {Number} code
     * @api public
     */
    abstract set status(code: number);

    /**
     * Get response status message
     *
     * @return {String}
     * @api public
     */
    abstract get message(): string | undefined;
    /**
     * Set response status message
     *
     * @param {String} msg
     * @api public
     */

    abstract set message(msg: string | undefined);


    /**
     * Get response body.
     *
     * @return {Mixed}
     * @api public
     */
    abstract get body(): any;
    /**
     * Set response body.
     *
     * @param {String|Buffer|Object|Stream} val
     * @api public
     */
    abstract set body(val: any);

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    abstract get length(): number;
    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    abstract set length(n: number);

    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    abstract get type(): string;
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

}

/**
 * context for middlewares.
 */
@Abstract()
export abstract class Context {

    private _vaild!: RouteVaildator
    get vaild(): RouteVaildator {
        if (!this._vaild) {
            this._vaild = this.injector.get(RouteVaildator);
        }
        return this._vaild;
    }

    abstract set error(err: Error);

    abstract get request(): Request;
    abstract get response(): Response;

    get querystring(): string {
        return this.request.querystring;
    }
    set querystring(val: string) {
        this.request.querystring = val;
    }

    get search(): string {
        return this.request.search;
    }
    set search(val: string) {
        this.request.search = val;
    }

    get method(): string {
        return this.request.method;
    }
    set method(val: string) {
        this.request.method = val;
    }

    get query(): any {
        return this.request.query;
    }
    set query(val: any) {
        this.request.query = val;
    }

    get path(): string {
        return this.request.path;
    }
    set path(path: string) {
        this.request.path = path;
    }

    get url(): string {
        return this.request.url;
    }
    set url(val: string) {
        this.request.url = val;
    }

    get accept(): Object {
        return this.request.accept;
    }
    set accept(val: Object) {
        this.request.accept = val;
    }

    get origin(): string {
        return this.request.origin;
    }

    get href(): string {
        return this.request.href;
    }

    get subdomains(): string[] {
        return this.request.subdomains;
    }

    get protocol(): string {
        return this.request.protocol;
    }

    get host(): string {
        return this.request.host;
    }

    get hostname(): string {
        return this.request.hostname;
    }

    get headers(): Headers {
        return this.request.headers;
    }

    get secure(): boolean {
        return this.request.secure;
    }

    /**
     * injector of.
     */
    abstract get injector(): Injector;



    get status(): number {
        return this.response.status;
    }

    set status(status: number) {
        this.response.status = status;
    }

    get message(): string | undefined {
        return this.response.message;
    }
    set message(msg: string | undefined) {
        this.response.message = msg;
    }

    /**
     * Get response body.
     */
    get body(): any {
        return this.response.body;
    }
    /**
     * Set response body.
     */
    set body(body: any) {
        this.response.body = body;
    }

    /**
     * Get Content-Length.
     */
    get length(): number {
        return this.response.length;
    }
    /**
     * Set Content-Length field to `n`.
     */
    set length(val: number) {
        this.response.length = val;
    }

    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    get type(): string {
        return this.response.type;
    }
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
    set type(type: string) {
        this.response.type = type;
    }

    /**
     * get value to context
     * @param token
     */
    getValue<T>(token: Token<T>): T {
        return this.injector.get(token);
    }
    /**
     * set value
     * @param token
     * @param value 
     */
    setValue(token: Token, value: any): void {
        this.injector.setValue(token, value);
    }

}

/**
 * middleware context factory.
 */
@Abstract()
export abstract class ContextFactory {
    abstract create(request: Request | RequestOption, injector: Injector): Context;
}


/**
 * route vaildator.
 */
@Abstract()
export abstract class RouteVaildator {
    /**
     * is route url or not.
     * @param url 
     */
    abstract isRoute(url: string): boolean;
    /**
     * vaildify
     * @param routePath route path. 
     * @param foreNull fore null.
     */
    abstract vaildify(routePath: string, foreNull?: boolean): string;
    /**
     * is active route or not.
     * @param ctx context.
     * @param route route.
     * @param routePrefix route prefix.
     */
    abstract isActiveRoute(ctx: Context, route: string, routePrefix: string): boolean;
    /**
     * get request route.
     * @param ctx context.
     * @param routePrefix route prefix.
     */
    abstract getReqRoute(ctx: Context, routePrefix: string): string;
}