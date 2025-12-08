import { Abstract, isArray, isDefined, isNil, isString } from '@tsdi/ioc';

/**
 * header.
 */
export type Header = string | readonly string[] | number | undefined | null;


export interface IHeaders<T extends Header = Header> extends Record<string, T> {

}
/**
 * header mappings.
 */
export class HeaderMappings<T extends Header = Header> implements HeaderAccess<T> {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T> | null;
    private _normal: Map<string, string>;

    /**
     * create headers map.
     * @param headers 
     */
    constructor(headers?: string | HeadersLike<T> | HeaderAccess<T>) {

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
                });
            } else if (headers instanceof HeaderMappings) {
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

    getHeaders<Tx extends Header>(): IHeaders<Tx> {
        if (!this._rcd) {
            const rcd = this._rcd = {} as Record<string, T>;
            this.forEach((v, k) => {
                rcd[v] = k;
            });
        }
        return this._rcd as IHeaders<any>;
    }

    setHeaders(headers: HeadersLike | HeaderAccess): void {
        if (!headers) return;
        if ((headers as HeaderAccess).getHeaderNames) {
            (headers as HeaderAccess).getHeaderNames?.().forEach(n => this.set(n, (headers as HeaderAccess).getHeader?.(n) as T))
        } else {
            for (const f in headers) {
                this.set(f, (headers as IHeaders)[f] as T);
            }
        }
        this._rcd = null;
    }
    getHeader<Th = string | number>(name: string): Th;
    getHeader(name: string): Header;
    getHeader(name: string): Header {
        const values = this._hdrs.get(name.toLowerCase());
        if (isNil(values)) return undefined;
        return isArray(values) && values.length ? values[0] : values;
    }

    setHeader(name: string, val: T): this {
        return this.set(name, val)
    }

    hasHeader(name: string): boolean {
        return this.has(name)
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
            this._rcd = null;
            this._normal.delete(key);
            return this;
        }
        this.setNormalizedName(name, key);
        this._normal.set(key, name);
        this._hdrs.set(key, val);
        this._rcd = null;
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
        this._rcd = null;
        return this;
    }

    delete(name: string): this {
        const key = name.toLowerCase();
        this._hdrs.delete(key);
        this._normal.delete(key);
        this._rcd = null;
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


    private setNormalizedName(name: string, lcName: string): void {
        if (!this._normal.has(lcName)) {
            this._normal.set(lcName, name)
        }
    }
}


/**
 * Header like
 */
export type HeadersLike<T extends Header = Header> = IHeaders<T> | HeaderAccess<T> | HeaderMappings<T>;

/**
 * headr access.
 */
export interface HeaderAccess<T extends Header = Header> {
    headers?: IHeaders<T> | HeaderMappings<T>;
    hasHeader?(header: string): boolean;
    getHeader?(header: string): T;
    setHeader?(header: string, value: T): any;
    removeHeader?(header: string): any;
    removeHeaders?(): any;
    getHeaderNames?(): string[];
    getHeaders?(): IHeaders<T>
}


@Abstract()
export abstract class HeaderAdapter {

    abstract hasHeader(headers: HeadersLike, header: string): boolean;

    abstract getHeader<T = number | string>(headers: HeadersLike, header: string, join?: boolean): T | undefined

    abstract getHeaders(headers: HeadersLike): IHeaders;

    abstract setHeader<T extends HeadersLike>(access: T, header: string, value: Header): T;

    abstract removeHeader<T extends HeadersLike>(access: T, header: string): T;

    abstract removeHeaders<T extends HeadersLike>(headers: T): T;
    /**
     * has content type or not.
     */
    abstract hasContentType(headers: HeadersLike): boolean;
    /**
     * content type.
     */
    abstract getContentType(headers: HeadersLike): string;
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
    abstract setContentType<T extends HeadersLike>(headers: T, type: string | null | undefined): T;

    abstract hasContentLength(headers: HeadersLike): boolean;
    abstract setContentLength<T extends HeadersLike>(headers: T, len: number | null | undefined): T;
    abstract getContentLength(headers: HeadersLike): number;

    abstract hasContentEncoding(headers: HeadersLike): boolean;
    abstract getContentEncoding(headers: HeadersLike): string | undefined;
    abstract setContentEncoding<T extends HeadersLike>(headers: T, encoding: string | null | undefined): T;

    abstract hasTransferEncoding(headers: HeadersLike): boolean;
    abstract getTransferEncoding(headers: HeadersLike): string | undefined;
    abstract setTransferEncoding<T extends HeadersLike>(headers: T, encoding: string | null | undefined): T;


    abstract getContentDisposition(headers: HeadersLike): string | undefined;
    abstract setContentDisposition<T extends HeadersLike>(headers: T, disposition: string): T;

    abstract getIdentity(headers: HeadersLike): string | number | undefined;
    abstract setIdentity<T extends HeadersLike>(headers: T, identity: string | number | undefined): T;

    abstract getMethod(headers: HeadersLike, prefix?: boolean): string | undefined;
    abstract setMethod<T extends HeadersLike>(headers: T, method: string | undefined, prefix?: boolean): T;

    abstract getPath(headers: HeadersLike, prefix?: boolean): string | undefined;
    abstract setPath<T extends HeadersLike>(headers: T, path: string | undefined, prefix?: boolean): T;

    abstract getStatus(headers: HeadersLike, prefix?: boolean): string | number | undefined;
    abstract setStatus<T extends HeadersLike>(headers: T, status: string | number, prefix?: boolean): T;

    abstract getStatusMessage(headers: HeadersLike): string | undefined;
    abstract setStatusMessage<T extends HeadersLike>(headers: T, statusMessage: string | undefined): T;

    abstract getAccept(headers: HeadersLike): string | string[] | undefined;
    abstract setAccept<T extends HeadersLike>(headers: T, accept: string | string[] | undefined): T;

    abstract getAcceptCharset(headers: HeadersLike): string | undefined;
    abstract setAcceptCharset<T extends HeadersLike>(headers: T, charset: string | undefined): T;

    abstract getAcceptEncoding(headers: HeadersLike): string | undefined;
    abstract setAcceptEncoding<T extends HeadersLike>(headers: T, encodings: string | undefined): T;

    abstract getAcceptLanguage(headers: HeadersLike): string | undefined;
    abstract setAcceptLanguage<T extends HeadersLike>(headers: T, languages: string | undefined): T;

    abstract getLastModified(headers: HeadersLike): string | undefined;
    abstract setLastModified<T extends HeadersLike>(headers: T, modified: string | undefined): T;

    abstract getCacheControl(headers: HeadersLike): string | undefined;
    abstract setCacheControl<T extends HeadersLike>(headers: T, control: string | undefined): T;

    abstract getLocation(headers: HeadersLike): string | undefined;
    abstract setLocation<T extends HeadersLike>(headers: T, location: string | undefined): T;
}

/**
 * has header.
 */
export function hasHeader(headers: HeadersLike | undefined, header: string): boolean {
    if (!headers) return false;
    if (headers.hasHeader) return (headers as HeaderAccess).hasHeader?.(header) === true;
    if ((headers as HeaderAccess).headers) {
        const hdrs = (headers as HeaderAccess).headers!;
        return hdrs.hasHeader ? (hdrs as HeaderMappings).hasHeader(header) : isDefined((hdrs as IHeaders)[header]);
    }

    return isDefined((headers as IHeaders)[header])
}

/**
 * 
 * @param headers 
 * @param header 
 * @param join 
 * @returns 
 */
export function getHeader(headers: HeadersLike | undefined, header: string, join?: boolean): string | number | undefined {
    if (!headers) return undefined;
    let values: any;
    if (headers.getHeader) {
        values = (headers as HeaderAccess).getHeader!(header)
    } else if ((headers as HeaderAccess).headers) {
        const hdrs = (headers as HeaderAccess).headers!;
        values = hdrs.getHeader ? (hdrs as HeaderMappings).getHeader(header) : (hdrs as IHeaders)[header];
    } else {
        values = (headers as IHeaders)[header];
    }
    if (isNil(values)) return undefined;
    return isArray(values) ? (join ? values.join(', ') : String(values[0])) : values
}

/**
 * get headers
 * @param headers 
 * @returns 
 */
export function getHeaders<T extends Header = Header>(headers: HeadersLike<T> | undefined): IHeaders<T> | undefined {
    if (!headers) return headers;
    if (headers.getHeaders) return (headers as HeaderAccess).getHeaders?.() as IHeaders<T>;
    if ((headers as HeaderAccess).headers) {
        const hdrs = (headers as HeaderAccess).headers!;
        return hdrs.getHeaders ? (hdrs as HeaderMappings).getHeaders() : hdrs as IHeaders<T>;
    }
    return headers as IHeaders<T>;
}



/**
* content types.
*/
export namespace ContentType {
   /**
    * stream, buffer type. 
    */
   export const OCTET_STREAM = 'application/octet-stream';
   /**
    * application json.
    */
   export const APPL_JSON = 'application/json';
   /**
    * application json.
    */
   export const APPL_JSON_UTF8 = 'application/json; charset=utf-8';
   
   /**
    * application javascript.
    */
   export const APPL_JAVASCRIPT = 'application/javascript';
   /**
    * text html.
    */
   export const TEXT_HTML = 'text/html';
   /**
    * text html utf-8.
    */
   export const TEXT_HTML_UTF8 = 'text/html; charset=utf-8';
   /**
    * text plain.
    */
   export const TEXT_PLAIN = 'text/plain';
   /**
    * text plain utf-8.
    */
   export const TEXT_PLAIN_UTF8 = 'text/plain; charset=utf-8';
   /**
    * request default accept.
    */
   export const REQUEST_ACCEPT = 'application/json, text/plain, */*';

   export const X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded;charset=UTF-8'
}

