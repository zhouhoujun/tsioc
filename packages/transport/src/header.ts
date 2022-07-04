import { isNil, isString } from '@tsdi/ioc';

export type ReqHeaderItemType = string | number | string[];
export type ResHeaderItemType = string | number | boolean | string[];

export class MapHeaders<T = ReqHeaderItemType> {

    private _hdrs: Map<string, T>;
    body: any;

    constructor() {
        this._hdrs = new Map();
    }

    getHeaders() {
        return this._hdrs;
    }
    hasHeader(field: string): boolean {
        return this._hdrs.has(field);
    }
    getHeader(field: string): T | undefined {
        return this._hdrs.get(field);
    }
    setHeader(field: string, val: T): void;
    setHeader(fields: Record<string, T>): void;
    setHeader(field: any, val?: T): void {
        if (isString(field)) {
            isNil(val) ? this._hdrs.delete(field) : this._hdrs.set(field, val);
        } else if (field) {
            for (const f in field) {
                const v = field[f];
                isNil(v) ? this._hdrs.delete(f) : this._hdrs.set(f, v);
            }
        }
    }
    removeHeader(field: string): void {
        this._hdrs.delete(field)
    }
}

