import { isArray, isNil, isString } from '@tsdi/ioc';

/**
 * header.
 */
export type Header = string | readonly string[] | number | undefined | null;


export interface MapHeaders<T extends Header = Header> extends Record<string, T> {

}

export interface HeaderFields {
    contentType: string;
    contentLength: string;
    contentEncoding?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    identity?: string;
    method?: string;
    status?: string;
    statusMessage?: string;
    path?: string;
    accept: string;
    acceptLanguage?: string;
    acceptCharset?: string;
    acceptEncoding?: string;
    lastModified?: string;
    cacheControl?: string;
    location?: string;
}

const defaultFields = {
    contentType: 'content-type',
    contentLength: 'content-length',
    contentEncoding: 'content-encoding',
    contentLanguage: 'content-language',
    contentDisposition: 'content-disposition',
    identity: 'identity',
    method: ':method',
    path: ':path',
    status: 'status',
    statusMessage: 'status-message',
    accept: 'accept',
    acceptLanguage: 'accept-language',
    acceptCharset: 'accept-charset',
    acceptEncoding: 'accept-encoding',
    lastModified: 'last-modified',
    cacheControl: 'cache-control',
    location: 'location'

} as HeaderFields;


/**
 * transport headers.
 */
export class TransportHeaders<T extends Header = Header> {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T>;
    private _normal: Map<string, string>;

    private _fields: HeaderFields;

    constructor(headers?: string | HeadersLike<T>, initFields?: HeaderFields) {
        this._hdrs = new Map();
        this._normal = new Map();
        this._fields = { ...defaultFields, ...initFields };
        if (headers) {
            if (isString(headers)) {
                headers.split('\n').forEach(line => {
                    const index = line.indexOf(':');
                    if (index > 0) {
                        const name = line.slice(0, index);
                        const value = line.slice(index + 1).trim();
                        this.append(name, value as T);
                    }
                })
            } else if (headers instanceof TransportHeaders) {
                headers.forEach((n, v) => {
                    this.set(n, v);
                });
            } else {
                this.setHeaders(headers as Record<string, T>);
            }
        }
    }

    get size() {
        return this._hdrs.size;
    }

    getHeaderNames(): string[] {
        return Array.from(this._normal.keys())
    }

    getHeaders(): MapHeaders {
        if (!this._rcd) {
            const rcd = this._rcd = {} as Record<string, T>;
            this.forEach((v, k) => {
                rcd[v] = k;
            });
        }
        return this._rcd;
    }

    setHeaders(headers: Record<string, T>): void {
        for (const f in headers) {
            this.set(f, headers[f]);
        }
        this._rcd = null!;
    }

    getHeader<Th = string | number>(name: string): Th | undefined {
        const values = this._hdrs.get(name);
        if (isNil(values)) return undefined;
        return isArray(values) && values.length ? values[0] : values;
    }

    setHeader(name: string, val: T): this {
        return this.set(name, val)
    }


    has(name: string): boolean {
        return this._hdrs.has(name.toLowerCase());
    }

    get(name: string): T | undefined {
        return this._hdrs.get(name);
    }

    set(name: string, val: T): this {
        const key = name.toLowerCase();
        if (isNil(val)) {
            this._hdrs.delete(key);
            this._normal.delete(key);
            return this;
        }
        this._normal.set(key, name);
        this._hdrs.set(key, val)

        this._rcd = null!;
        return this;
    }

    append(name: string, val: T): this {
        if (isNil(val)) {
            return this;
        }
        const key = name.toLowerCase();
        this.setNormalizedName(name, key);
        if (this._hdrs.has(key)) {
            const old = this._hdrs.get(key);
            let nv: T;
            if (!isNil(old)) {
                nv = [...isArray(old) ? old : [String(old)], ...isArray(val) ? val : [String(val)]] as any
            } else {
                nv = val;
            }
            this._hdrs.set(key, nv);
        } else {
            this._hdrs.set(key, val)
        }
        this._rcd = null!;
        return this;
    }

    delete(name: string): this {
        const key = name.toLowerCase();
        this._hdrs.delete(key);
        this._normal.delete(key);
        this._rcd = null!;
        return this;
    }

    removeHeader(name: string): this {
        return this.delete(name)
    }

    removeHeaders() {
        this._hdrs.clear();
        this._normal.clear();
        this._rcd = null!;
    }

    forEach(fn: (name: string, values: T) => void) {
        Array.from(this._normal.keys())
            .forEach(key => fn(this._normal.get(key)!, this._hdrs.get(key)!))
    }

    /**
     * has content type or not.
     */
    hasContentType(): boolean {
        return this.has(this._fields.contentType)
    }
    /**
     * content type.
     */
    getContentType(): string {
        const ty = this.getHeader(this._fields.contentType);
        return ty as string;
    }
    /**
     * Set Content-Type packet header with `type` through `mime.lookup()`
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
    setContentType(type: string | null | undefined): this {
        this.set(this._fields.contentType, type as T);
        return this;
    }

    hasContentLength() {
        return !!this.getHeader(this._fields.contentLength)
    }

    setContentLength(len: number | null | undefined) {
        this.set(this._fields.contentLength, len as T);
        return this
    }

    getContentLength() {
        const len = this.get(this._fields.contentLength) ?? '0';
        return ~~len
    }

    hasContentEncoding(): boolean {
        return !!this._fields.contentEncoding && this.has(this._fields.contentEncoding)
    }

    getContentEncoding(): string | undefined  {
        return this._fields.contentEncoding ? this.getHeader(this._fields.contentEncoding) : undefined
    }

    setContentEncoding(encoding: T): this {
        if (this._fields.contentEncoding) this.setHeader(this._fields.contentEncoding, encoding);
        return this;
    }

    getContentDisposition(): string | undefined  {
        return this._fields.contentDisposition ? this.getHeader(this._fields.contentDisposition) : undefined
    }
    setContentDisposition(disposition: T): this {
        if (this._fields.contentDisposition) this.setHeader(this._fields.contentDisposition, disposition);
        return this;

    }

    getIdentity() {
        return this._fields.identity ? this.getHeader(this._fields.identity) : undefined
    }
    setIdentity(identity: T): this {
        if (this._fields.identity) this.setHeader(this._fields.identity, identity);
        return this;
    }

    getMethod(): string | undefined {
        return this._fields.method ? this.getHeader(this._fields.method) : undefined
    }
    setMethod(method: T): this {
        if (this._fields.method) this.setHeader(this._fields.method, method);
        return this;
    }

    getPath(): string | undefined {
        return this._fields.path ? this.getHeader(this._fields.path) : undefined
    }
    setPath(path: T): this {
        if (this._fields.path) this.setHeader(this._fields.path, path);
        return this;
    }

    getStatus(): string | undefined {
        return this._fields.status ? this.getHeader(this._fields.status) : undefined
    }
    setStatus(status: T): this {
        if (this._fields.status) this.setHeader(this._fields.status, status);
        return this;
    }

    getStatusMessage(): string | undefined {
        return this._fields.statusMessage ? this.getHeader(this._fields.statusMessage) : undefined
    }
    setStatusMessage(statusMessage: T): this {
        if (this._fields.statusMessage) this.setHeader(this._fields.statusMessage, statusMessage);
        return this;
    }


    getAccept(): string | string[] | undefined  {
        return this._fields.accept ? this.getHeader(this._fields.accept) : '*'
    }

    setAccept(assept: T): this {
        if (this._fields.accept) this.setHeader(this._fields.accept, assept);
        return this;
    }


    getAcceptCharset(): string | undefined  {
        return this._fields.acceptCharset ? this.getHeader(this._fields.acceptCharset) : '*'
    }

    setAcceptCharset(charset: T): this {
        if (this._fields.acceptCharset) this.setHeader(this._fields.acceptCharset, charset);
        return this;
    }

    getAcceptEncoding(): string | undefined  {
        return this._fields.acceptEncoding ? this.getHeader(this._fields.acceptEncoding) : '*'
    }

    setAcceptEncoding(encodings: T): this {
        if (this._fields.acceptEncoding) this.setHeader(this._fields.acceptEncoding, encodings);
        return this;
    }

    getAcceptLanguage(): string | undefined  {
        return this._fields.acceptLanguage ? this.getHeader(this._fields.acceptLanguage) : '*'
    }

    setAcceptLanguage(languages: T): this {
        if (this._fields.acceptLanguage) this.setHeader(this._fields.acceptLanguage, languages);
        return this;
    }

    getLastModified(): string | undefined  {
        return this._fields.lastModified ? this.getHeader(this._fields.lastModified) : undefined
    }

    setLastModified(modified: T): this {
        if (this._fields.lastModified) this.setHeader(this._fields.lastModified, modified);
        return this;
    }

    getCacheControl(): string | undefined  {
        return this._fields.cacheControl ? this.getHeader(this._fields.cacheControl) : undefined
    }

    setCacheControl(control: T): this {
        if (this._fields.cacheControl) this.setHeader(this._fields.cacheControl, control);
        return this;
    }

    getLocation(): string | undefined  {
        return this._fields.location ? this.getHeader(this._fields.location) : undefined
    }

    setLocation(location: T): this {
        if (this._fields.location) this.setHeader(this._fields.location, location);
        return this;
    }


    private setNormalizedName(name: string, lcName: string): void {
        if (!this._normal.has(lcName)) {
            this._normal.set(lcName, name)
        }
    }
}


/**
 * Header like
 */
export type HeadersLike<T extends Header = Header> = TransportHeaders<T> | MapHeaders<T>;

