import { isArray, isNil, isString } from '@tsdi/ioc';

/**
 * header.
 */
export type Header = string | readonly string[] | number | undefined | null;


export interface MapHeaders<T extends Header = Header> extends Record<string, T> {

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

    getHeader<Th = string | number>(name: string): Th | null {
        const values = this._hdrs.get(name);
        if (isNil(values)) return null;
        return isArray(values) && values.length ? values[0] : values;
    }

    setHeader(name: string, val: T): this {
        return this.set(name, val)
    }


    has(name: string): boolean {
        return this._hdrs.has(name.toLowerCase());
    }

    get(name: string): T | null {
        return this._hdrs.get(name) ?? null;
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
        const ty = this.getHeader(this.contentType);
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
        this.set(this.contentType, type as T);
        return this;
    }


    protected contentLength = 'content-length';
    hasContentLength() {
        return !!this.getHeader(this.contentLength)
    }

    setContentLength(len: number | null | undefined) {
        this.set(this.contentLength, len as T);
        return this
    }

    getContentLength() {
        const len = this.get(this.contentLength) ?? '0';
        return ~~len
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

