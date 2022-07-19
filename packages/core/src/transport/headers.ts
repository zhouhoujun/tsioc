import { isArray, isNil, isString } from '@tsdi/ioc';
import { ResponseHeader } from './packet';

export type ReqHeaderType = string | number | string[];
export type ResHeaderType = ReqHeaderType | boolean;

/**
 * transport headers.
 */
export class MapHeaders<T extends ReqHeaderType | ResHeaderType = ReqHeaderType> implements ResponseHeader {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T>;
    private _normal: Map<string, string>;

    constructor(headers?: string | Record<string, T> | MapHeaders<T>) {
        this._hdrs = new Map();
        this._normal = new Map();
        if (headers) {
            if (isString(headers)) {
                headers.split('\n').forEach(line => {
                    const index = line.indexOf(':');
                    if (index > 0) {
                        const name = line.slice(0, index);
                        const value = line.slice(index + 1).trim();
                        this.appendHeader(name, value as T);
                    }
                })
            } else if (headers instanceof MapHeaders) {
                headers.eachHeader((n, v) => {
                    this.setHeader(n, v as T);
                });
            } else {
                this.setHeaders(headers);
            }
        }
    }

    get headers() {
        return this.getHeaders();
    }

    getHeaders(): Record<string, T> {
        if (!this._rcd) {
            const rcd = this._rcd = {} as Record<string, T>;
            this.eachHeader((v, k) => {
                rcd[v] = k;
            });
        }
        return this._rcd;
    }

    setHeaders(headers: Record<string, T>): void {
        for (const f in headers) {
            this.setHeader(f, headers[f]);
        }
        this._rcd = null!;
    }

    hasHeader(name: string): boolean {
        return this._hdrs.has(name.toLowerCase());
    }

    getHeader(name: string): T | undefined {
        return this._hdrs.get(name.toLowerCase());
    }

    setHeader(name: string, val: T): this {
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

    appendHeader(name: string, val: T): this {
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

    removeHeader(name: string): this {
        this._hdrs.delete(name);
        this._rcd = null!;
        return this;
    }

    eachHeader(fn: (name: string, values: T) => void) {
        Array.from(this._normal.keys())
            .forEach(key => fn(this._normal.get(key)!, this._hdrs.get(key)!))
    }


    private setNormalizedName(name: string, lcName: string): void {
        if (!this._normal.has(lcName)) {
            this._normal.set(lcName, name)
        }
    }
}


export class TransportHeaders<T extends ReqHeaderType | ResHeaderType = any> extends MapHeaders<T> {

    set(name: string, val: T): this {
        return this.setHeader(name, val);
    }

    get(name: string): string | null {
        const values = this.getHeader(name);
        if (isNil(values)) return null;
        return isArray(values) && values.length ? values[0] : String(values);
    }

    delete(name: string) {
        return this.removeHeader(name);
    }

    has(name: string): boolean {
        return this.hasHeader(name);
    }

    forEach(fn: (name: string, values: T) => void): void {
        this.eachHeader(fn);
    }
}
