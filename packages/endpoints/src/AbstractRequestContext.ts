import { Abstract, isArray, isNil, isString, lang } from '@tsdi/ioc';
import { ParameterScope } from '@tsdi/core';
import {
    HeadersLike, IHeaders, HeaderMappings, HeaderAdapter, HeaderAccess, InternalServerException, MessageException,
    RequestContext, Incoming, Outgoing, FileAdapter, MimeAdapter, StatusAdapter, StreamAdapter, xmlRegExp, ContentType,
    ReadableLike, WritableLike
} from '@tsdi/common';
import { isBuffer } from '@tsdi/common/transport';
import { CONTENT_DISPOSITION_TOKEN } from './content';
import { AcceptsPriority } from './accepts';
import { Session } from './sessions/Session';
import { ServiceConfig } from './server.options';

/**
 * abstract request context.
 * 
 * 请求上下文
 */
@Abstract()
export abstract class AbstractRequestContext<
    TRequest extends ReadableLike<Incoming> = ReadableLike<Incoming>,
    TResponse extends WritableLike<Outgoing> = WritableLike<Outgoing>,
    TStatus = any> extends RequestContext {

    abstract get request(): TRequest;


    abstract get detailError(): boolean;

    /**
     * response.
     */
    abstract get response(): TResponse;

    /**
     * mime adapter.
     */
    get mimeAdapter(): MimeAdapter | null {
        return this.get(MimeAdapter)
    }
    /**
     * mime accepts priority
     */
    get acceptsPriority(): AcceptsPriority | null {
        return this.get(AcceptsPriority)
    }
    /**
     * status adapter.
     */
    get statusAdapter(): StatusAdapter<TStatus> | null {
        return this.get(StatusAdapter)
    }
    /**
     * stream adapter
     */
    get headerAdapter(): HeaderAdapter {
        return this.get(HeaderAdapter)
    }
    /**
     * stream adapter
     */
    get streamAdapter(): StreamAdapter {
        return this.get(StreamAdapter)
    }
    /**
     * file adapter
     */
    get fileAdapter(): FileAdapter {
        return this.get(FileAdapter)
    }

    private _session?: Session;
    get session(): Session {
        if (this._session === undefined) {
            this._session = this.get(Session) ?? null;
        }
        return this._session;
    }

    /**
     * Set response content length.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | null) {
        if (!this.headerAdapter.hasContentEncoding(this.response)) {
            this.headerAdapter.setContentLength(this.response, n)
        } else {
            this.headerAdapter.setContentLength(this.response, null)
        }
    }
    /**
     * Get response content length
     *
     * @return {Number}
     * @api public
     */
    get length(): number | null {
        if (this.headerAdapter.hasContentLength(this.response)) {
            return this.headerAdapter.getContentLength(this.response)
        }

        if (isNil(this.body) || this.streamAdapter.isStream(this.body)) return null
        if (isString(this.body)) return Buffer.byteLength(this.body)
        if (Buffer.isBuffer(this.body)) return this.body.length
        return Buffer.byteLength(JSON.stringify(this.body))
    }


    protected _explicitStatus?: boolean;
    /**
     * Get response status.
     */
    get status(): TStatus {
        return this.response.statusCode;
    }
    /**
     * Set response status, defaults to OK.
     */
    set status(code: TStatus) {
        if (this.headersSent) return;
        this.beforeStatusChanged(code);
        if (this.statusAdapter && !this.statusAdapter.isStatus(code)) throw new InternalServerException(`invalid status code: ${code}`)
        this._explicitStatus = true;
        this.response.statusCode = code;
        if (!isNil(this.body) && this.statusAdapter?.isEmpty(code)) this.body = null;
        this.afterStatusChanged(code);
    }

    protected beforeStatusChanged(code: TStatus) { }

    protected afterStatusChanged(code: TStatus) { }

    get statusMessage() {
        return this.response.statusMessage
    }

    set statusMessage(msg: string) {
        if (this.canSettatusMessage()) this.response.statusMessage = msg
    }

    protected canSettatusMessage() {
        return true;
    }

    private _ok = true;
    /**
     * Whether the status code is ok
     */
    get ok(): boolean {
        return this.statusAdapter?.isOk(this.status) ?? this._ok;
    }

    /**
     * Whether the status code is ok
     */
    set ok(ok: boolean) {
        this._ok = ok;
        if (!this.statusAdapter) {
            if (!ok) {
                this.body = null;
            }
            return;
        }
        this.status = ok ? this.statusAdapter.ok : this.statusAdapter.notFound
    }

    private _body: any;
    protected _explicitNullBody?: boolean;

    get explicitNullBody() {
        return this._explicitNullBody;
    }
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
            if (this.statusAdapter && !this.statusAdapter.isEmpty(this.status)) {
                this.status = this.statusAdapter.noContent;
            }
            if (val === null) this.onNullBody();
            this.setContentEncoding(null);
            this.setContentLength(null);
            this.setContentType(null);
            return
        }

        // set the status
        if (!this._explicitStatus || this.statusAdapter?.isNotFound(this.status)) this.ok = true;


        // set the content-type only if not yet set
        const setType = !this.headerAdapter.hasContentType(this.response);

        // string
        if (isString(val)) {
            if (setType) this.contentType = xmlRegExp.test(val) ? ContentType.TEXT_HTML : ContentType.TEXT_PLAIN;
            this.length = Buffer.byteLength(val);
            return
        }

        // buffer
        if (isBuffer(val)) {
            if (setType) this.contentType = ContentType.OCTET_STREAM;
            this.length = val.length;
            return
        }

        // stream
        if (this.streamAdapter.isStream(val)) {
            if (original != val) {
                // overwriting
                if (null != original) this.headerAdapter.setContentLength(this.response, null)
            }

            if (setType) this.contentType = ContentType.OCTET_STREAM;
            return
        }

        // json
        this.headerAdapter.setContentLength(this.response, null);
        this.contentType = ContentType.APPL_JSON;
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
     * request query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;

    /**
     * The request method.
     */
    get method(): string {
        return this.request.method!
    }
    // /**
    //  * get request encoding.
    //  * @returns 
    //  */
    // getContentEncoding() {
    //     return this.headerAdapter.getContentEncoding(this.request);
    // }
    // /**
    //  * get request content type
    //  * @param type 
    //  */
    // getContentType(type: string | null | undefined): string {
    //     return this.headerAdapter.getContentType(this.request);
    // }

    // /**
    //  * set request content length
    //  * @param len 
    //  */
    // getContentLength(): number {
    //     return this.headerAdapter.getContentLength(this.request);
    // }

    /**
     * set response content length
     * @param len 
     */
    setContentLength(len: number | null) {
        super.setContentLength(len);
        this.headerAdapter.setContentLength(this.response, len);
    }
    /**
     * set response content encoding.
     * @param encoding 
     */
    setContentEncoding(encoding: string | null) {
        super.setContentEncoding(encoding);
        this.headerAdapter.setContentEncoding(this.response, encoding);
    }
    /**
     * set response content type
     * @param type 
     */
    setContentType(type: string | null | undefined) {
        super.setContentType(type);
        this.headerAdapter.setContentType(this.response, type);
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
    getHeader(field: string): string | undefined {
        return this.headerAdapter.getHeader(this.request, field);
    }


    /**
     * has response header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean {
        return this.headerAdapter.hasHeader(this.response, field);
    }

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
    setHeader(field: string, val: string | number | string[]): void;
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
    setHeader(fields: Record<string, string | number | string[]> | IHeaders): void;
    setHeader(headers: HeadersLike): void;
    setHeader(field: string | HeadersLike, val?: string | number | string[]) {
        if (this.headersSent) return;
        if (val) {
            this.headerAdapter.setHeader(this.response, field as string, val)
        } else if (field instanceof HeaderMappings) {
            field.forEach((name, values) => {
                this.headerAdapter.setHeader(this.response, name, values);
            })
        } else if ((field as HeaderAccess).getHeaders) {
            const headers = (field as HeaderAccess).getHeaders?.();
            if (headers) {
                for (const key in headers) {
                    this.headerAdapter.setHeader(this.response, key, headers[key])
                }
            }
        } else if ((field as HeaderAccess).getHeaderNames) {
            (field as HeaderAccess).getHeaderNames?.().forEach(name => {
                this.headerAdapter.setHeader(this.response, name, (field as HeaderAccess).getHeader?.(name));
            })
        } else {
            const fields = field as Record<string, string | number | string[]>;
            for (const key in fields) {
                this.headerAdapter.setHeader(this.response, key, fields[key])
            }
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
        if (this.headersSent) return;
        const prev = this.headerAdapter.getHeader(this.response, field);
        if (prev) {
            val = Array.isArray(prev)
                ? prev.concat(Array.isArray(val) ? val : String(val))
                : [String(prev)].concat(Array.isArray(val) ? val : String(val))
        }

        return this.setHeader(field, val)
    }

    /**
    * Remove response header `field`.
    *
    * @param {String} name
    * @api public
    */
    removeHeader(field: string): void {
        if (this.headersSent) return;
        this.headerAdapter.removeHeader(this.response, field);
    }

    /**
     * Remove all response headers
     *
     * @api public
     */
    removeHeaders(): void {
        if (this.headersSent) return;
        this.headerAdapter.removeHeaders(this.response)
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

        const encoding = this.headerAdapter.getContentEncoding(this.request);
        const len = this.headerAdapter.getContentLength(this.request);
        //no body
        if (encoding && !len) {
            return null
        }

        const ctype = this.headerAdapter.getContentType(this.request);
        if (!ctype) return false;
        if (!this.mimeAdapter) {
            const itype = isArray(type) ? type[0] : type;
            if (ctype.indexOf(itype) >= 0 || itype.indexOf(ctype) >= 0) {
                return itype;
            }
            return false;
        }
        const normaled = this.mimeAdapter.normalize(ctype);
        if (!normaled) return false;

        const types = isArray(type) ? type : [type];
        return this.mimeAdapter.match(types, normaled)
    }

    /**
     * content type.
     */
    get contentType(): string {
        const ctype = this.headerAdapter.getContentType(this.response);
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
        this.headerAdapter.setContentType(this.response, type);
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
        const contentType = this.mimeAdapter?.contentType(type) ?? type;
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
     * Get Content-Encoding or not.
     * @param packet
     */
    get contentEncoding(): string | undefined {
        return this.headerAdapter.getContentEncoding(this.response)
    }
    /**
     * Set Content-Encoding.
     */
    set contentEncoding(encoding: string | null | undefined) {
        if (this.headersSent) return;
        this.headerAdapter.setContentEncoding(this.response, encoding)
        // if (isNil(encoding)) {
        //     this.resHeaders.setContentEncoding(encoding)
        // } else {
        //     const old = this.resHeaders.getContentEncoding();
        //     this.resHeaders.setContentEncoding(encoding);
        //     if (old != encoding) {
        //         this.resHeaders.setContentLength(null);
        //     }
        // }
    }

    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get headersSent() {
        return this.response.headersSent == true;
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
        if (!this.acceptsPriority) return '*';
        const accepts = this.headerAdapter.getAccept(this.request) ?? '*';
        if (!args.length) {
            return accepts ?? false
        }

        const medias = args.map(a => a.indexOf('/') === -1 ? this.mimeAdapter?.lookup(a) ?? a : a).filter(a => isString(a)) as string[];
        return lang.first(this.acceptsPriority.priority(accepts, medias, 'media')) ?? false
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
        if (!this.acceptsPriority) return '*';
        const accepts = this.headerAdapter.getAcceptEncoding(this.request) ?? '*';
        if (!encodings.length) {
            return accepts
        }
        return lang.first(this.acceptsPriority.priority(accepts, encodings, 'encodings')) ?? false
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
        if (!this.acceptsPriority) return '*';
        const accepts = this.headerAdapter.getAcceptCharset(this.request) ?? '*';
        if (!charsets.length) {
            return accepts
        }
        return lang.first(this.acceptsPriority.priority(accepts, charsets, 'charsets')) ?? false
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
        if (!this.acceptsPriority) return '*';
        const accepts = this.headerAdapter.getAcceptLanguage(this.request) ?? '*';
        if (!langs.length) {
            return accepts
        }
        return lang.first(this.acceptsPriority.priority(accepts, langs, 'lang')) ?? false
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
        const func = this.get(CONTENT_DISPOSITION_TOKEN);
        this.headerAdapter.setContentDisposition(this.response, func(filename, options))
    }

    /**
     * throw execption to client.
     * @param execption 
     */
    abstract throwException(execption: MessageException): void;

}


export function getScopeValue(req: any, scope: ParameterScope) {
    if (!req) {
        return null;
    }
    switch (scope) {
        case 'body':
            return req['body'] ?? req['payload'];
        case 'payload':
            return req['payload'] ?? req['body'];
        default:
            return req[scope]
    }
}

@Abstract()
export abstract class RequestContextFactory {
    abstract create<TReq extends ReadableLike<Incoming>, TRes extends WritableLike<Outgoing>>(context: RequestContext,
        request: TReq,
        options: ServiceConfig,
        response?: TRes
    ): AbstractRequestContext<TReq, TRes>;
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
