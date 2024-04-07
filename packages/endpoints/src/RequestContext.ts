import { Abstract, EMPTY, Injector, OperationArgumentResolver, isArray, isDefined, isNil, isString, lang } from '@tsdi/ioc';
import { HandlerContext, MODEL_RESOLVERS, createPayloadResolver } from '@tsdi/core';
import { HeaderRecord, TransportHeaders } from '@tsdi/common';
import {
    FileAdapter, Incoming, InternalServerExecption, MessageExecption, MimeAdapter, Outgoing, ResponsePacket,
    StatusAdapter, StreamAdapter, ctype, isBuffer, xmlRegExp
} from '@tsdi/common/transport';
import { ServerOpts } from './Server';
import { CONTENT_DISPOSITION_TOKEN } from './content';
import { TransportSession } from './transport.session';

/**
 * abstract request context.
 * 
 * 请求上下文
 */
@Abstract()
export abstract class RequestContext<TSocket = any, TOptions extends ServerOpts = ServerOpts, TStatus = any> extends HandlerContext<Incoming> {

    protected override playloadDefaultResolvers(): OperationArgumentResolver[] {
        return [...primitiveResolvers, ...this.injector.get(MODEL_RESOLVERS, EMPTY)];
    }

    abstract get serverOptions(): TOptions;

    /**
     * transport session
     */
    abstract get session(): TransportSession<TSocket>;

    /**
     * mime adapter.
     */
    abstract get mimeAdapter(): MimeAdapter | null;

    /**
     * status adapter.
     */
    abstract get statusAdapter(): StatusAdapter<TStatus> | null;
    /**
     * stream adapter
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * file adapter
     */
    abstract get fileAdapter(): FileAdapter;

    /**
     * transport response.
     */
    abstract get request(): Incoming;

    /**
     * transport response.
     */
    abstract get response(): Outgoing;

    /**
     * Set response content length.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        if (!this.response.hasContentEncoding()) {
            this.response.setContentLength(n)
        } else {
            this.response.removeContentLength()
        }
    }
    /**
     * Get response content length
     *
     * @return {Number}
     * @api public
     */
    get length(): number | undefined {
        if (this.response.hasContentLength()) {
            return this.response.getContentLength()
        }

        if (isNil(this.body) || this.streamAdapter.isStream(this.body)) return undefined
        if (isString(this.body)) return Buffer.byteLength(this.body)
        if (Buffer.isBuffer(this.body)) return this.body.length
        return Buffer.byteLength(JSON.stringify(this.body))
    }


    private _explicitStatus?: boolean;
    /**
     * Get response status.
     */
    get status(): TStatus {
        return this.response.status;
    }
    /**
     * Set response status, defaults to OK.
     */
    set status(code: TStatus) {
        if (this.sent) return;
        if (this.statusAdapter && !this.statusAdapter.isStatus(code)) throw new InternalServerExecption(`invalid status code: ${code}`)
        this._explicitStatus = true;
        this.response.status = code;
        if (!isNil(this.body) && this.statusAdapter?.isEmpty(code)) this.body = null;
    }

    get statusMessage() {
        return this.response.statusText
    }

    set statusMessage(msg: string) {
        this.response.statusText = msg
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
    private _explicitNullBody?: boolean;

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
            this.response.removeContentEncoding();
            this.response.removeContentLength();
            this.response.removeContentType();
            return
        }

        // set the status
        if (!this._explicitStatus || this.statusAdapter?.isNotFound(this.status)) this.ok = true;


        // set the content-type only if not yet set
        const setType = !this.response.hasContentType();

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
                if (null != original) this.response.removeContentLength()
            }

            if (setType) this.contentType = ctype.OCTET_STREAM;
            return
        }

        // json
        this.response.removeContentLength();
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
     * Get request rul
     */
    get url(): string {
        return this.request.url
    }
    /**
     * Set request url
     */
    set url(value: string) {
        this.request.url = value;
    }

    /**
     * original url
     */
    get originalUrl(): string {
        return this.request.originalUrl
    }

    /**
     * request query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;

    /**
     * The request method.
     */
    get method(): string {
        return this.request.method
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
        return this.request.getHeader(field);
    }


    /**
     * has response header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean {
        return this.response.hasHeader(field)
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
    setHeader(fields: Record<string, string | number | string[]> | HeaderRecord): void;
    setHeader(headers: TransportHeaders): void;
    setHeader(field: string | Record<string, string | number | string[]> | HeaderRecord | TransportHeaders, val?: string | number | string[]) {
        if (this.sent) return;
        if (val) {
            this.response.setHeader(field as string, val)
        } else if (field instanceof TransportHeaders) {
            field.forEach((name, values) => {
                this.response.setHeader(name, values);
            })
        } else {
            const fields = field as Record<string, string | number | string[]>;
            for (const key in fields) {
                this.response.setHeader(key, fields[key])
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
        if (this.sent) return;
        const prev = this.response.getHeader(field);
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
        if (this.sent) return;
        this.response.removeHeader(field);
    }

    /**
     * Remove all response headers
     *
     * @api public
     */
    removeHeaders(): void {
        if (this.sent) return;
        this.response.removeHeaders()
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
        const adapter = this.mimeAdapter;
        if (!adapter) return null;

        //no body
        const encoding = this.request.getContentEncoding();
        const len = this.request.getContentLength();

        if (encoding && !len) {
            return null
        }
        const ctype = this.request.getContentType();
        if (!ctype) return false;
        const normaled = adapter.normalize(ctype);
        if (!normaled) return false;

        const types = isArray(type) ? type : [type];
        return adapter.match(types, normaled)
    }

    /**
     * content type.
     */
    get contentType(): string {
        const ctype = this.response.getContentType();
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
        this.response.setContentType(type);
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
    get contentEncoding(): string {
        return this.response.getContentEncoding()
    }
    /**
     * Set Content-Encoding.
     */
    set contentEncoding(encoding: string | null | undefined) {
        if (this.sent) return;
        if (isNil(encoding)) {
            this.response.removeContentEncoding()
        } else {
            const old = this.response.getContentEncoding();
            this.response.setContentEncoding(encoding);
            if (old != encoding) {
                this.response.removeContentLength();
            }
        }
    }

    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get sent() {
        return this.response.sent;
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
        if (!this.request.getAcceptType) return '*';
        if (!args.length) {
            return this.request.getAcceptType()
        }

        const medias = args.map(a => a.indexOf('/') === -1 ? this.mimeAdapter?.lookup(a) ?? a : a).filter(a => isString(a)) as string[];
        return lang.first(this.request.getAcceptType(...medias)) ?? false
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
        if (!this.request.getAcceptEncoding) return '*';
        if (!encodings.length) {
            return this.request.getAcceptEncoding()
        }
        return lang.first(this.request.getAcceptEncoding(...encodings)) ?? false
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
        if (!this.request.getAcceptCharset) return '*';
        if (!charsets.length) {
            return this.request.getAcceptCharset()
        }
        return lang.first(this.request.getAcceptCharset(...charsets)) ?? false
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
        if (!this.request.getAcceptLanguage) return '*';
        if (!langs.length) {
            return this.request.getAcceptLanguage()
        }
        return lang.first(this.request.getAcceptLanguage(...langs)) ?? false
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
        this.response.setContentDisposition(func(filename, options))
    }

    /**
     * send response to client.
     */
    abstract respond(): Promise<any>;

    /**
     * set response with response packet
     * @param headers 
     */
    abstract setResponse(packet: ResponsePacket): void;

    /**
     * throw execption to client.
     * @param execption 
     */
    abstract throwExecption(execption: MessageExecption): Promise<void>;

}

@Abstract()
export abstract class IncomingFactory<TMsg = any> {
    abstract create(session: TransportSession, message: TMsg): Incoming;
}


@Abstract()
export abstract class OutgoingFactory<TMsg = any> {
    abstract create(session: TransportSession, message: TMsg): Outgoing;
}

/**
 * request context factory.
 */
@Abstract()
export abstract class RequestContextFactory<TSocket = any> {
    /**
     * create request context.
     * @param session 
     * @param request 
     * @param response 
     * @param options 
     */
    abstract create(session: TransportSession, request: Incoming, response: Outgoing, options?: ServerOpts): RequestContext<TSocket>;
}


export function getScopeValue(payload: any, scope: string) {
    return payload[scope] ?? (scope == 'body' ? payload['payload'] : undefined);
}

const primitiveResolvers = createPayloadResolver(
    (ctx, scope, field) => {
        let data = ctx.args;

        if (field && !scope) {
            scope = 'query'
        }
        if (scope) {
            data = getScopeValue(data, scope);
            if (field) {
                data = isDefined(data) ? data[field] : null;
            }
        }
        return data;
    },
    (param, payload) => payload && isDefined(getScopeValue(payload, param.scope ?? 'query')));


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
