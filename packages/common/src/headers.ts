import { Abstract, Injectable, isArray, isDefined, isNil, isString } from '@tsdi/ioc';

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

@Injectable()
export class HeaderAdapter {
    hasHeader(headers: HeadersLike | undefined, name: string): boolean {
        return hasHeader(headers, name);
    }

    getHeader(headers: HeadersLike | undefined, name: string, join?: boolean): string | undefined {
        const value = getHeader(headers, name, join);
        return isNil(value) ? undefined : String(value);
    }

    setHeader<T extends HeadersLike | undefined>(headers: T, name: string, value: Header): T {
        if (!headers) return headers;
        if ((headers as HeaderAccess).setHeader) {
            (headers as HeaderAccess).setHeader!(name, value);
        } else if ((headers as HeaderAccess).headers) {
            const hdrs = (headers as HeaderAccess).headers!;
            if ((hdrs as HeaderAccess).setHeader) {
                (hdrs as HeaderAccess).setHeader!(name, value);
            } else {
                (hdrs as IHeaders)[name] = value;
            }
        } else {
            (headers as IHeaders)[name] = value;
        }
        return headers;
    }

    removeHeader<T extends HeadersLike | undefined>(headers: T, name: string): T {
        if (!headers) return headers;
        if ((headers as HeaderAccess).removeHeader) {
            (headers as HeaderAccess).removeHeader!(name);
        } else if ((headers as HeaderAccess).headers) {
            const hdrs = (headers as HeaderAccess).headers!;
            if ((hdrs as HeaderAccess).removeHeader) {
                (hdrs as HeaderAccess).removeHeader!(name);
            } else {
                delete (hdrs as IHeaders)[name];
            }
        } else {
            delete (headers as IHeaders)[name];
        }
        return headers;
    }

    removeHeaders<T extends HeadersLike | undefined>(headers: T): T {
        if (!headers) return headers;
        if ((headers as HeaderAccess).removeHeaders) {
            (headers as HeaderAccess).removeHeaders!();
        } else if ((headers as HeaderAccess).headers) {
            const hdrs = (headers as HeaderAccess).headers!;
            if ((hdrs as HeaderAccess).removeHeaders) {
                (hdrs as HeaderAccess).removeHeaders!();
            } else {
                Object.keys(hdrs as IHeaders).forEach(k => delete (hdrs as IHeaders)[k]);
            }
        } else {
            Object.keys(headers as IHeaders).forEach(k => delete (headers as IHeaders)[k]);
        }
        return headers;
    }

    hasContentType(headers: HeadersLike | undefined): boolean {
        return this.hasHeader(headers, 'content-type');
    }

    getContentType(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'content-type');
    }

    setContentType<T extends HeadersLike | undefined>(headers: T, type: string | null | undefined): T {
        return this.setHeader(headers, 'content-type', type as Header);
    }

    hasContentLength(headers: HeadersLike | undefined): boolean {
        return this.hasHeader(headers, 'content-length');
    }

    getContentLength(headers: HeadersLike | undefined): number {
        const len = this.getHeader(headers, 'content-length');
        return isNil(len) ? 0 : Number(len);
    }

    setContentLength<T extends HeadersLike | undefined>(headers: T, len: number | null | undefined): T {
        return this.setHeader(headers, 'content-length', len as Header);
    }

    hasContentEncoding(headers: HeadersLike | undefined): boolean {
        return this.hasHeader(headers, 'content-encoding');
    }

    getContentEncoding(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'content-encoding');
    }

    setContentEncoding<T extends HeadersLike | undefined>(headers: T, encoding: string | null | undefined): T {
        return this.setHeader(headers, 'content-encoding', encoding as Header);
    }

    getAccept(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'accept', true);
    }

    getAcceptEncoding(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'accept-encoding', true);
    }

    getAcceptCharset(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'accept-charset', true);
    }

    getAcceptLanguage(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'accept-language', true);
    }

    getLastModified(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'last-modified');
    }

    setLastModified<T extends HeadersLike | undefined>(headers: T, value: string | null | undefined): T {
        return this.setHeader(headers, 'last-modified', value as Header);
    }

    getCacheControl(headers: HeadersLike | undefined): string | undefined {
        return this.getHeader(headers, 'cache-control');
    }

    setCacheControl<T extends HeadersLike | undefined>(headers: T, value: string | null | undefined): T {
        return this.setHeader(headers, 'cache-control', value as Header);
    }

    setContentDisposition<T extends HeadersLike | undefined>(headers: T, value: string | null | undefined): T {
        return this.setHeader(headers, 'content-disposition', value as Header);
    }
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

