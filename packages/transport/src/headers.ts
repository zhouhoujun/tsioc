import { isNil, isString } from '@tsdi/ioc';

export type ReqHeaderItemType = string | number | string[];
export type ResHeaderItemType = string | number | boolean | string[];

export class MapHeaders<T = ReqHeaderItemType> {

    private _hdrs: Map<string, T>;
    private _rcd?: Record<string, T>;
    body: any;

    constructor() {
        this._hdrs = new Map();
    }

    getHeaders(): Record<string, T> {
        if (!this._rcd) {
            const rcd = this._rcd = {} as Record<string, T>;
            this._hdrs.forEach((v, k) => {
                rcd[k] = v;
            });
        }
        return this._rcd;
    }

    setHeaders(headers: Record<string, T>): void {
        for (const f in headers) {
            const v = headers[f];
            isNil(v) ? this._hdrs.delete(f) : this._hdrs.set(f, v);
        }
        this._rcd = null!;
    }

    hasHeader(field: string): boolean {
        return this._hdrs.has(field);
    }
    getHeader(field: string): T | undefined {
        return this._hdrs.get(field);
    }
    setHeader(field: string, val: T): void {
        isNil(val) ? this._hdrs.delete(field) : this._hdrs.set(field, val);
        this._rcd = null!;
    }
    removeHeader(field: string): void {
        this._hdrs.delete(field);
        this._rcd = null!;
    }
}

