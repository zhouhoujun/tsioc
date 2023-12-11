import { Abstract, EMPTY, Injector, OperationArgumentResolver, isArray, isDefined, isNil, isNumber, isString, isUndefined, lang } from '@tsdi/ioc';
import { EndpointContext, MODEL_RESOLVERS, createPayloadResolver } from '@tsdi/core';
import { ENOENT, IncomingHeader, IncomingPacket, MessageExecption, OutgoingHeader, OutgoingHeaders, ResponsePacket, StatusCode, ctype, isBuffer, xmlRegExp } from '@tsdi/common';
import { lastValueFrom } from 'rxjs';
import { ServerOpts } from './Server';
import { ServerTransportSession } from './transport/session';

/**
 * abstract transport context.
 * 
 * 传输节点上下文
 */
@Abstract()
export abstract class TransportContext<TRequest = any, TResponse = any, TSocket = any, TServOpts extends ServerOpts = ServerOpts> extends EndpointContext<TRequest> {

    protected override playloadDefaultResolvers(): OperationArgumentResolver[] {
        return [...primitiveResolvers, ...this.injector.get(MODEL_RESOLVERS, EMPTY)];
    }

    abstract get serverOptions(): TServOpts;
    /**
     * transport session
     */
    abstract get session(): ServerTransportSession<TSocket>;

    get incomingAdapter() {
        return this.session.incomingAdapter
    }

    get outgoingAdapter() {
        return this.session.outgoingAdapter
    }

    get mimeAdapter() {
        return this.session.mimeAdapter
    }

    get statusAdapter() {
        return this.session.statusAdapter
    }

    get streamAdapter() {
        return this.session.streamAdapter
    }

    get fileAdapter() {
        return this.session.fileAdapter
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
     * The request method.
     */
    abstract get method(): string;

    /**
     * transport request.
     */
    abstract get request(): TRequest;

    /**
     * Get transport response.
     */
    abstract get response(): TResponse;

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

    private _filepath?: string | null;
    getRequestFilePath() {
        if (isUndefined(this._filepath)) {
            const pathname = this.getRequestPath();
            if (this.session.mimeAdapter) {
                this.session.mimeAdapter.lookup(pathname);
                this._filepath = this.session.mimeAdapter.lookup(pathname) ? pathname : null;
            } else {
                this._filepath = pathname;
            }
        }
        return this._filepath;
    }

    protected getRequestPath() {
        return this.originalUrl || this.url
    }


    private _len?: number;
    /**
     * Set response content length.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        this._len = n;
        if (!this.outgoingAdapter) return
        if (isNumber(n) && !this.outgoingAdapter.hasContentEncoding(this.response)) {
            this.outgoingAdapter.setContentLength(this.response, n)
        } else {
            this.outgoingAdapter.removeContentLength(this.response)
        }
    }
    /**
     * Get response content length
     *
     * @return {Number}
     * @api public
     */
    get length(): number | undefined {
        if (!this.outgoingAdapter) return this._len
        if (this.outgoingAdapter.hasContentLength(this.response)) {
            return this.outgoingAdapter.getContentLength(this.response)
        }
        if (!isNil(this._len)) return this._len
        if (isNil(this.body) || this.streamAdapter.isStream(this.body)) return undefined
        if (isString(this.body)) return Buffer.byteLength(this.body)
        if (Buffer.isBuffer(this.body)) return this.body.length
        return Buffer.byteLength(JSON.stringify(this.body))
    }

    protected _body: any;
    protected _explicitStatus?: boolean;
    protected _explicitNullBody?: boolean;
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
            this.outgoingAdapter?.clearContent(this.response);
            return
        }

        // set the status
        if (!this._explicitStatus || this.statusAdapter?.isNotFound(this.status)) this.ok = true;

        if (!this.outgoingAdapter) return;

        // set the content-type only if not yet set
        const setType = !this.outgoingAdapter.hasContentType(this.response);

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
                if (null != original) this.outgoingAdapter.removeContentLength(this.response)
            }

            if (setType) this.contentType = ctype.OCTET_STREAM;
            return
        }

        // json
        this.outgoingAdapter.removeContentLength(this.response);
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
        if (!this.statusAdapter) return;
        this.status = ok ? this.statusAdapter.ok : this.statusAdapter.notFound
    }

    /**
     * has sent or not.
     */
    abstract get sent(): boolean;

    rawBody?: Buffer | null;

    /**
     * request query parameters.
     */
    abstract get query(): Record<string, string | string[] | number | any>;

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
    getHeader(field: string): IncomingHeader {
        return this.incomingAdapter?.getHeader(this.request, field)
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
     * content type.
     */
    get contentType(): string {
        const ctype = this.outgoingAdapter?.getContentType(this.response);
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
        this.outgoingAdapter?.setContentType(this.response, type)
    }

    /**
     * has response header field or not.
     * @param field 
     */
    hasHeader(field: string): boolean {
        if (!this.outgoingAdapter) return false;
        return this.outgoingAdapter.hasHeader(this.response, field)
    }
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.setHeader('Foo', ['bar', 'baz']);
     *    this.setHeader('Accept', 'application/json');
     *    this.setHeader({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: OutgoingHeader): void;
    /**
     * Set response header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.setHeader({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {OutgoingHeaders} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: OutgoingHeaders): void;
    setHeader(field: string | OutgoingHeaders, val?: string | number | string[]) {
        if (this.sent || !this.outgoingAdapter) return;
        if (val) {
            this.outgoingAdapter.setHeader(this.response, field as string, val)
        } else {
            const fields = field as OutgoingHeaders;
            for (const key in fields) {
                this.outgoingAdapter.setHeader(this.response, key, fields[key])
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
        if (this.sent || !this.outgoingAdapter) return;
        const prev = this.outgoingAdapter.getHeader(this.response, field);
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
        this.outgoingAdapter?.removeHeader(this.response, field);
    }

    /**
     * Remove all response headers
     *
     * @api public
     */
    removeHeaders(): void {
        if (this.sent) return;
        this.outgoingAdapter?.removeHeaders(this.response);
    }

    /**
     * set response with response packet
     * @param headers 
     */
    abstract setResponse(packet: ResponsePacket): void;


    get writable() {
        if (!this.outgoingAdapter) return true;
        return this.outgoingAdapter?.writable(this.response)
    }

    /**
     * send response to client.
     */
    async respond(): Promise<any> {
        if (this.destroyed || !this.writable) return;
        return await lastValueFrom(this.session.send(this));
    }

    /**
     * throw execption to client.
     * @param execption 
     */
    async throwExecption(err: MessageExecption): Promise<void> {
        let headerSent = false;
        if (this.sent || !this.writable) {
            headerSent = err.headerSent = true
        }

        // nothing we can do here other
        // than delegate to the app-level
        // handler and log.
        if (headerSent) {
            return
        }

        // first unset all headers
        this.removeHeaders();

        // then set those specified
        if (err.headers) this.setHeader(err.headers);

        this.execption = err;

        const statusAdapter = this.statusAdapter;
        let status = err.status || err.statusCode;
        if (statusAdapter) {
            // ENOENT support
            if (ENOENT === err.code) status = statusAdapter.notFound;

            // default to serverError
            if (!statusAdapter.isStatus(status)) status = statusAdapter.serverError;
        }

        this.status = status;

        // empty response.
        if (!statusAdapter || !statusAdapter.isEmptyExecption(status)) {
            // respond
            let msg: any;
            msg = err.message;

            // force text/plain
            this.type = 'text';
            msg = Buffer.from(msg ?? this.statusMessage ?? '');
            this.length = Buffer.byteLength(msg);
            this.rawBody = msg;
        }

        return await lastValueFrom(this.session.send(this));

    }

}


/**
 * transport context factory.
 */
@Abstract()
export abstract class TransportContextFactory {
    /**
     * create transport context.
     * @param injector 
     * @param session 
     * @param incoming 
     * @param options 
     */
    abstract create(injector: Injector, session: ServerTransportSession, incoming: IncomingPacket, options?: ServerOpts): TransportContext;
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
