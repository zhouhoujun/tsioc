import { isArray, isNil, isString } from '@tsdi/ioc';


export type IncommingHeader = string | readonly string[] | undefined;
export type OutgoingHeader = IncommingHeader | number;

export type IncommingHeaders = Record<string, IncommingHeader>;
export type OutgoingHeaders = Record<string, OutgoingHeader>;


/**
 * transport headers.
 */
export class HeaderSet<T extends IncommingHeader | OutgoingHeader> {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T>;
    private _normal: Map<string, string>;

    constructor(headers?: string | Record<string, T> | HeaderSet<T>) {
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
            } else if (headers instanceof HeaderSet) {
                headers.forEach((n, v) => {
                    this.set(n, v as T);
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

    private setNormalizedName(name: string, lcName: string): void {
        if (!this._normal.has(lcName)) {
            this._normal.set(lcName, name)
        }
    }
}

/**
 * client request headers.
 */
export class ReqHeaders extends HeaderSet<IncommingHeader> {

}

/**
 * client response headers.
 */
export class ResHeaders extends HeaderSet<OutgoingHeader>  {

}

export type ReqHeadersLike = ReqHeaders | IncommingHeaders;
export type ResHeadersLike = ReqHeaders | OutgoingHeaders;

