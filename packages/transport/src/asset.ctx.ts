import { AssetContext, Packet, RequestHeader, ResponseHeader, ServerContext } from '@tsdi/core';
import { Abstract, isArray, isNil, isNumber, isString, lang } from '@tsdi/ioc';
import { extname } from 'path';
import { ctype, hdr } from './consts';
import { CONTENT_DISPOSITION } from './content';
import { MimeAdapter } from './mime';
import { Negotiator } from './negotiator';
import { isBuffer, isStream, xmlRegExp } from './utils';


@Abstract()
export abstract class AssetServerContext<TRequest extends RequestHeader | Packet = any, TResponse extends Packet | ResponseHeader = any> extends ServerContext<TRequest, TResponse> implements AssetContext {

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
        const adapter = this.injector.get(MimeAdapter)
        const normaled = adapter.normalize(ctype);
        if (!normaled) return false;

        const types = isArray(type) ? type : [type];
        return adapter.match(types, normaled)
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
        const contentType = this.injector.get(MimeAdapter).contentType(type);
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
        const ctype = this.response.getHeader(hdr.CONTENT_TYPE);
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
            this.response.setHeader(hdr.CONTENT_TYPE, type)
        } else {
            this.response.removeHeader(hdr.CONTENT_TYPE)
        }
    }


    /**
     * Whether the status code is ok
     */
    get ok(): boolean {
        return this.adapter.isOk(this.status);
    }
    /**
     * Whether the status code is ok
     */
    set ok(ok: boolean) {
        this.status = ok ? this.adapter.ok : this.adapter.notFound
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
        (this.response as any).body = val;

        // no content
        if (null == val) {
            if (!this.adapter.isEmpty(this.status)) this.status = this.adapter.noContent;
            if (val === null) this.onNullBody();
            this.removeHeader(hdr.CONTENT_TYPE);
            this.removeHeader(hdr.CONTENT_LENGTH);
            this.removeHeader(hdr.TRANSFER_ENCODING);
            return
        }

        // set the status
        if (!this._explicitStatus) this.status = this.adapter.ok;

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
        if (isStream(val)) {
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

    protected onNullBody() { }

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
            return this.response.getHeader(hdr.CONTENT_LENGTH) as number || 0
        }

        const { body } = this;
        if (!body || isStream(body)) return undefined;
        if (isString(body)) return Buffer.byteLength(body);
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body))
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
        const negotiator = this.resolve(Negotiator);
        if (!args.length) {
            return negotiator.mediaTypes()
        }
        const mimeAdapter = this.resolve(MimeAdapter);
        const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter.lookup(a) : a).filter(a => isString(a)) as string[];
        return lang.first(negotiator.mediaTypes(...medias)) ?? false
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
        const negotiator = this.resolve(Negotiator);
        if (!encodings.length) {
            return negotiator.encodings()
        }
        return lang.first(negotiator.encodings(...encodings)) ?? false
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
        const negotiator = this.resolve(Negotiator);
        if (!charsets.length) {
            return negotiator.charsets()
        }
        return lang.first(negotiator.charsets(...charsets)) ?? false
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
        const negotiator = this.resolve(Negotiator);
        if (!langs.length) {
            return negotiator.languages()
        }
        return lang.first(negotiator.languages(...langs)) ?? false
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
            this.type = extname(filename);
        }
        const func = this.get(CONTENT_DISPOSITION);
        this.response.setHeader(hdr.CONTENT_DISPOSITION, func(filename, options))
    }



    getHeader(field: string): string | string[] | undefined {
        const h = (this.request as Packet).headers ? (this.request as Packet).headers?.[field] : (this.request as RequestHeader).getHeader(field);
        if (isNil(h)) return undefined;
        return isArray(h) ? h : String(h);
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
     * @param {Record<string, string | number | string[]>} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: string | Record<string, string | number | string[]>, val?: string | number | string[]) {
        if (this.sent) return;

        if (val) {
            this.response.setHeader(field as string, val)
        } else {
            const fields = field as Record<string, string | number | string[]>;
            for (const key in fields) {
                this.response.setHeader(key, fields[key])
            }
        }
    }

    /**
     * Remove header `field`.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void {
        if (this.sent) return;
        this.response.removeHeader(field);
    }

}