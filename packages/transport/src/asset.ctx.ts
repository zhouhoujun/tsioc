import { EndpointInvokeOpts } from '@tsdi/core';
import { Abstract, Injector, isArray, isFunction, isNil, isNumber, isString, lang } from '@tsdi/ioc';
import { OutgoingHeader, IncomingHeader, OutgoingHeaders, normalize } from '@tsdi/common';
import { Buffer } from 'buffer';
import { ctype, hdr } from './consts';
import { CONTENT_DISPOSITION } from './content';
import { MimeAdapter } from './mime';
import { Negotiator } from './negotiator';
import { encodeUrl, escapeHtml, isBuffer, xmlRegExp } from './utils';
import { ContentOptions } from './server/content';
import { StatusVaildator } from './status';
import { Incoming, Outgoing } from './socket';
import { StreamAdapter } from './stream.adapter';
import { FileAdapter } from './file.adapter';
import { AssetContext } from './context';


export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}

export interface ServerOptions extends Record<string, any> {
    proxy?: ProxyOpts;
    content?: ContentOptions | boolean
}

/**
 * asset server context.
 */
@Abstract()
export abstract class AbstractAssetContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing, TStatus = number | string, TServOpts extends ServerOptions = any> extends AssetContext<TRequest, TResponse, TStatus, TServOpts> {
    public _explicitNullBody?: boolean;
    private _URL?: URL;
    readonly originalUrl: string;
    private _url?: string;

    readonly vaildator: StatusVaildator<TStatus>;
    readonly streamAdapter: StreamAdapter;
    readonly fileAdapter: FileAdapter;
    readonly negotiator: Negotiator;
    readonly mimeAdapter: MimeAdapter;


    constructor(injector: Injector, readonly request: TRequest, readonly response: TResponse, readonly serverOptions: TServOpts, options?: EndpointInvokeOpts<TRequest>) {
        super(injector, { isDone: (ctx: AbstractAssetContext<TRequest>) => !ctx.vaildator.isNotFound(ctx.status), ...options, payload: request });
        this.vaildator = injector.get(StatusVaildator);
        this.streamAdapter = injector.get(StreamAdapter);
        this.fileAdapter = injector.get(FileAdapter);
        this.negotiator = injector.get(Negotiator);
        this.mimeAdapter = injector.get(MimeAdapter);
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
        return normalize(request.url?.toString() ?? '');
    }

    protected init(request: TRequest) {
        this.status = this.vaildator.notFound;
        this._url = request.url ?? '';

        if (this.isAbsoluteUrl(this._url)) {
            this._url = normalize(this.URL.pathname);
        } else {
            const sidx = this._url.indexOf('?');
            if (sidx > 0) {
                this._url = this._url.slice(0, sidx);
            }
            this.url = normalize(this._url);
        }
        (this.request as any)['query'] = this.query;
    }

    override getRequestFilePath() {
        const pathname = this.pathname;
        this.mimeAdapter.lookup(pathname);
        return this.mimeAdapter.lookup(pathname) ? pathname : null;
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

    /**
     * Whether the status code is ok
     */
    get ok(): boolean {
        return this.vaildator.isOk(this.status);
    }

    /**
     * Whether the status code is ok
     */
    set ok(ok: boolean) {
        this.status = ok ? this.vaildator.ok : this.vaildator.notFound
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
        } catch (err) {
            return Object.create(null);
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
    is(type: string | string[]): string | null | false {
        //no body
        if (this.getHeader(hdr.TRANSFER_ENCODING) && !this.getHeader(hdr.CONTENT_LENGTH)) {
            return null
        }
        const ctype = this.getHeader(hdr.CONTENT_TYPE) as string;
        if (!ctype) return false;
        const adapter = this.mimeAdapter;
        const normaled = adapter.normalize(ctype);
        if (!normaled) return false;

        const types = isArray(type) ? type : [type];
        return adapter.match(types, normaled)
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
    getHeader(field: string): string {
        field = this.toHeaderName(field);
        let h: IncomingHeader;
        switch (field) {
            case 'referer':
            case 'referrer':
            case 'Referer':
            case 'Referrer':
                h = this.request.headers.referrer ?? this.request.headers.referr;
                break;
            default:
                h = this.request.headers[field];
                break;
        }
        if (isNil(h)) return '';
        return isArray(h) ? h[0] : String(h);
    }

    protected toHeaderName(field: string) {
        return field.toLowerCase();
    }


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
    accepts(...args: string[]): string | string[] | false {
        if (!args.length) {
            return this.negotiator.mediaTypes(this)
        }

        const medias = args.map(a => a.indexOf('/') === -1 ? this.mimeAdapter.lookup(a) : a).filter(a => isString(a)) as string[];
        return lang.first(this.negotiator.mediaTypes(this, ...medias)) ?? false
    }

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
    acceptsEncodings(...encodings: string[]): string | string[] | false {
        if (!encodings.length) {
            return this.negotiator.encodings(this)
        }
        return lang.first(this.negotiator.encodings(this, ...encodings)) ?? false
    }

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
    acceptsCharsets(...charsets: string[]): string | string[] | false {
        if (!charsets.length) {
            return this.negotiator.charsets(this)
        }
        return lang.first(this.negotiator.charsets(this, ...charsets)) ?? false
    }

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
    acceptsLanguages(...langs: string[]): string | string[] {
        if (!langs.length) {
            return this.negotiator.languages(this)
        }
        return lang.first(this.negotiator.languages(this, ...langs)) ?? false
    }

    /**
     * Checks if the request is writable.
     * Tests for the existence of the socket
     * as node sometimes does not set it.
     */
    abstract get writable(): boolean;



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
        const contentType = this.mimeAdapter.contentType(type);
        if (contentType) {
            this.contentType = contentType
        }
    }

    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */

    get type(): string {
        const type = this.contentType;
        if (!type) return '';
        return type.split(';', 1)[0]
    }

    /**
     * content type.
     */
    get contentType(): string {
        const ctype = this.getRespHeader(hdr.CONTENT_TYPE);
        return (isArray(ctype) ? lang.first(ctype) : ctype) as string ?? ''
    }

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
    set contentType(type: string) {
        if (type) {
            this.setHeader(hdr.CONTENT_TYPE, type)
        } else {
            this.removeHeader(hdr.CONTENT_TYPE)
        }
    }


    protected _body: any;
    protected _explicitStatus?: boolean;
    /**
     * Get response body.
     *
     * @return {Mixed}
     * @api public
     */
    get body() {
        return this._body
    }

    /**
     * Set response body.
     *
     * @param {String|Buffer|Object|Stream} val
     * @api public
     */
    set body(val) {
        const original = this._body;
        this._body = val;
        if (original !== val) {
            this.onBodyChanged(val, original);
        }

        // no content
        if (null == val) {
            if (!(this.vaildator.isEmpty(this.status))) {
                this.status = this.vaildator.noContent;
            }
            if (val === null) this.onNullBody();
            this.removeHeader(hdr.CONTENT_TYPE);
            this.removeHeader(hdr.CONTENT_LENGTH);
            this.removeHeader(hdr.TRANSFER_ENCODING);
            return
        }

        // set the status
        if (!this._explicitStatus || this.vaildator.isNotFound(this.status)) this.ok = true;

        // set the content-type only if not yet set
        const setType = !this.hasHeader(hdr.CONTENT_TYPE);

        // string
        if (isString(val)) {
            if (setType) this.contentType = xmlRegExp.test(val) ? ctype.TEXT_HTML : ctype.TEXT_PLAIN;
            this.length = Buffer.byteLength(val);
            return
        }

        // buffer
        if (isBuffer(val)) {
            if (setType) this.contentType = ctype.OCTET_STREAM;
            this.length = val.length;
            return
        }

        // stream
        if (this.streamAdapter.isStream(val)) {
            if (original != val) {
                // overwriting
                if (null != original) this.removeHeader(hdr.CONTENT_LENGTH)
            }

            if (setType) this.contentType = ctype.OCTET_STREAM;
            return
        }

        // json
        this.removeHeader(hdr.CONTENT_LENGTH);
        this.contentType = ctype.APPL_JSON;
    }

    /**
     * on body changed. default do nothing.
     * @param newVal 
     * @param oldVal 
     */
    protected onBodyChanged(newVal: any, oldVal: any) { }

    /**
     * on body set null.
     */
    protected onNullBody() {
        this._explicitNullBody = true;
    }

    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        if (isNumber(n) && !this.hasHeader(hdr.TRANSFER_ENCODING)) {
            this.setHeader(hdr.CONTENT_LENGTH, n)
        } else {
            this.removeHeader(hdr.CONTENT_LENGTH)
        }
    }

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    get length(): number | undefined {
        if (this.hasHeader(hdr.CONTENT_LENGTH)) {
            return ~~(this.getRespHeader(hdr.CONTENT_LENGTH) || 0)
        }

        const { body } = this;
        if (!body || this.streamAdapter.isStream(body)) return undefined;
        if (isString(body)) return Buffer.byteLength(body);
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body))
    }

    /**
     * Set Content-Disposition header to "attachment" with optional `filename`.
     *
     * @param filname file name for download.
     * @param options content disposition.
     * @api public
     */
    attachment(filename: string, options?: {
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
    }): void {
        if (options?.contentType) {
            this.contentType = options.contentType;
        } else if (filename) {
            this.type = this.fileAdapter.extname(filename);
        }
        const func = this.get(CONTENT_DISPOSITION);
        this.setHeader(hdr.CONTENT_DISPOSITION, func(filename, options))
    }


    /**
     * Set the Last-Modified date using a string or a Date.
     *
     *     this.response.lastModified = new Date();
     *
     * @param {String|Date} type
     * @api public
     */
    set lastModified(val: Date | null) {
        if (!val) {
            this.removeHeader(hdr.LAST_MODIFIED);
            return
        }
        this.setHeader(hdr.LAST_MODIFIED, val.toUTCString())
    }

    /**
     * Get the Last-Modified date in Date form, if it exists.
     *
     * @return {Date}
     * @api public
     */
    get lastModified(): Date | null {
        const date = this.response.getHeader(hdr.LAST_MODIFIED) as string;
        return date ? new Date(date) : null
    }

    /**
     * Set the etag of a response.
     * This will normalize the quotes if necessary.
     *
     *     this.response.etag = 'md5hashsum';
     *     this.response.etag = '"md5hashsum"';
     *     this.response.etag = 'W/"123456789"';
     *
     * @param {String} etag
     * @api public
     */
    set etag(val: string) {
        if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
        this.setHeader(hdr.ETAG, val)
    }

    /**
     * Get the etag of a response.
     *
     * @return {String}
     * @api public
     */
    get etag(): string {
        return this.response.getHeader(hdr.ETAG) as string
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
        if ('back' === url) url = this.getHeader(hdr.REFERRER) as string || alt || '/';
        this.setHeader(hdr.LOCATION, encodeUrl(url));
        // status
        if (!this.vaildator.isRedirect(this.status)) this.status = this.vaildator.found;

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

    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get sent() {
        return this.response.headersSent!
    }

    /**
     * Returns true if the header identified by name is currently set in the outgoing headers.
     * The header name matching is case-insensitive.
     *
     * Examples:
     *
     *     this.hasHeader('Content-Type');
     *     // => true
     *
     * @param {String} field
     * @return {boolean}
     * @api public
     */
    hasHeader(field: string) {
        return this.response.hasHeader(field)
    }

    /**
     * Set header `field` to `val` or pass
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
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {OutgoingHeaders} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: OutgoingHeaders): void;
    setHeader(field: string | OutgoingHeaders, val?: string | number | string[]) {
        if (this.sent) return;
        if (val) {
            this.response.setHeader(field as string, val)
        } else {
            const fields = field as OutgoingHeaders;
            for (const key in fields) {
                this.response.setHeader(key, fields[key])
            }
        }
    }

    getRespHeader(field: string): OutgoingHeader {
        return this.response.getHeader(field)
    }

    /**
     * Remove header `field` of response.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void {
        if (this.sent) return;
        this.response.removeHeader(field)
    }

    /**
     * Remove all header of response.
     * @api public
     */
    removeHeaders(): void {
        if (this.sent) return;
        // first unset all headers
        const res = this.response;
        if (isFunction(res.getHeaderNames)) {
            res.getHeaderNames().forEach((name: string) => res.removeHeader(name))
        } else if ((res as any)._headers) {
            (res as any)._headers = {} // Node < 7.7
        }

    }

    /**
     * Append additional header `field` with value `val`.
     *
     * Examples:
     *
     * ```
     * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
     * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
     * this.append('Warning', '199 Miscellaneous warning');
     * ```
     *
     * @param {String} field
     * @param {String|Array} val
     * @api public
     */
    appendHeader(field: string, val: string | number | string[]) {
        const prev = this.response.getHeader(field);
        if (prev) {
            val = Array.isArray(prev)
                ? prev.concat(Array.isArray(val) ? val : String(val))
                : [String(prev)].concat(Array.isArray(val) ? val : String(val))
        }

        return this.setHeader(field, val)
    }

}
