import { isArray, isNil, isString } from '@tsdi/ioc';

/**
 * header.
 */
export type Header = string | readonly string[] | number | undefined | null;


export interface HeaderRecord {
    [x: string]: Header;
}


/**
 * transport headers.
 */
export class TransportHeaders<T extends Header = Header> {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T>;
    private _normal: Map<string, string>;

    constructor(headers?: string | HeadersLike<T>) {
        this._hdrs = new Map();
        this._normal = new Map();
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

    getHeaders(): Record<string, T> {
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

    has(name: string): boolean {
        return this._hdrs.has(name.toLowerCase());
    }

    get(name: string): string | number | null {
        const values = this._hdrs.get(name);
        if (isNil(values)) return null;
        return isArray(values) && values.length ? values[0] : values;
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
        this._hdrs.delete(name);
        this._rcd = null!;
        return this;
    }

    forEach(fn: (name: string, values: T) => void) {
        Array.from(this._normal.keys())
            .forEach(key => fn(this._normal.get(key)!, this._hdrs.get(key)!))
    }

    protected contentType = 'content-type';
    /**
     * has content type or not.
     */
    hasContentType(): boolean {
        return this.has(this.contentType)
    }
    /**
     * content type.
     */
    getContentType(): string {
        const ty = this.get(this.contentType);
        return isArray(ty) ? ty[0] : ty;
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
    setContentType(type: T): this {
        if (isNil(type)) {
            this.delete(this.contentType);
        } else {
            this.set(this.contentType, type);
        }
        return this;
    }
    /**
     * remove content type.
     * @param packet 
     */
    removeContentType(): this {
        this.delete(this.contentType);
        return this;
    }


    protected contentEncoding = 'content-encoding';
    /**
     * has Content-Encoding or not.
     * @param packet
     */
    hasContentEncoding(): boolean {
        return this.has(this.contentEncoding)
    }
    /**
     * Get Content-Encoding.
     * @param packet
     */
    getContentEncoding(): string {
        let encoding = this.get(this.contentEncoding);
        return isArray(encoding) ? encoding[0] : encoding
    }
    /**
     * Set Content-Encoding.
     * @param packet
     * @param encoding 
     */
    setContentEncoding(encoding: T): this {
        this.set(this.contentEncoding, encoding);
        return this
    }
    /**
     * remove content encoding.
     * @param packet 
     */
    removeContentEncoding(): this {
        this.delete(this.contentEncoding);
        return this
    }

    protected contentLength = 'content-length';
    hasContentLength() {
        return this.has(this.contentLength)
    }

    setContentLenght(len: number) {
        this.set(this.contentLength, len as T);
        return this
    }

    getContentLength() {
        const len = this.get(this.contentLength) ?? '0';
        return ~~len
    }

    removeContentLength() {
        this.delete(this.contentLength);
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
export type HeadersLike<T extends Header = Header> = TransportHeaders<T> | HeaderRecord;

