import { EMPTY_OBJ, Injectable, Injector, isArray, isDefined, isString } from '@tsdi/ioc';
import { Context } from '../context';
import { HeadersOption } from '../header';
import { RequestOption, Request } from '../request';
import { ResponseOption, Response } from '../response';

@Injectable()
export class ContextBase extends Context {
    constructor(readonly request: Request, readonly response: Response, readonly injector: Injector) {
        super();
    }

    get subdomains(): string[] {
        throw new Error('Method not implemented.');
    }
}

const empty: any = {
    204: true,
    205: true,
    304: true
};

function toRecords(headers?: HeadersOption): Record<string, string | string[] | number> {
    let records: Record<string, string | string[] | number> = {};
    if (isString(headers)) {
        headers.split('\n').forEach(line => {
            const index = line.indexOf(':');
            if (index > 0) {
                const key = line.slice(0, index).trim();
                const value = line.slice(index + 1).trim();
                if (records[key]) {
                    let old = records[key];
                    if (isArray(old)) {
                        old.push(value)
                    } else {
                        records[key] = [old.toString(), value];
                    }
                } else {
                    records[key] = value;
                }
            }
        });
    } else if (isArray(headers)) {
        headers.forEach(line => {
            if (line.length > 0) {
                const key = line[0].trim();
                const value = line[1].trim();
                records[key] = value;
            }
        });
    } else {
        headers && Object.keys(headers).forEach(key => {
            let values = headers[key];
            records[key] = isArray(values) ? values.slice(0) : values;
        })
    }

    return records;
}

export class RequestBase extends Request {

    constructor(init?: RequestOption | Request) {
        super();
        this.init(init);
    }

    protected toRecords(headers?: Record<string, string | string[]> | HeadersOption) {
        return toRecords(headers);
    }

    protected init(option?: RequestOption | Request) {
        const init = (option || EMPTY_OBJ) as RequestOption | Request;
        if (init instanceof Request) {
            this._headers = this.toRecords(init.getHeaders()) as Record<string, string | string[]>;
            this._originalUrl = init.originalUrl;
            this._URL = init.URL;
            this._url = init.url;
            this.body = init.body;
            this._method = init.method;
            this.query = init.query;
        } else {
            this._headers = this.toRecords(init?.headers) as Record<string, string | string[]>;
            const { url: originalUrl, body, method, restful, query } = init;
            let url = originalUrl || '';
            if (restful) {
                let matchs = url.match(/\/:\w+/gi);
                if (matchs) {
                    matchs.forEach(m => {
                        const pn = m.slice(2);
                        if (restful[pn]) {
                            url = url.replace(m, `/${restful[pn]}`);
                        }
                    });
                }
            }
            const uri = this.parseURL(url);
            this._URL = uri;
            url = uri.pathname + uri.search;
            this._originalUrl = url;
            this._url = String(url);
            this.body = body;
            this._method = method || 'GET';
            if (query) this.query = query;
            init.type && this.setHeader('Content-Type', init.type);
        }
    }


    private _headers!: Record<string, string | string[]>;
    get headers(): Record<string, string | string[]> {
        return this._headers;
    }

    private _originalUrl!: string;
    get originalUrl(): string {
        return this._originalUrl;
    }

    private _url!: string;
    get url(): string {
        return this._url;
    }
    set url(url: string) {
        const uri = this._URL = this.parseURL(url);
        this._url = uri.pathname + uri.search;
    }

    private _method!: string;
    get method(): string {
        return this._method;
    }
    set method(val: string) {
        this._method = val;
    }

    body: any;

    get secure(): boolean {
        return this.protocol == 'https';
    }

    getHeaders() {
        return this.headers;
    }

    getHeader(name: string): string | string[] {
        return this.headers[name] as (string | string[]) ?? '';
    }

    hasHeader(name: string): boolean {
        return isDefined(this.headers[name]);
    }
    setHeader(name: string, value: string | string[]): void {
        this.headers[name] = value;
    }
    removeHeader(name: string): void {
        this.headers[name] = undefined!;
    }

}

export class ResponseBase extends Response {

    constructor(init?: ResponseOption) {
        super();
        this.init(init);
    }

    protected toRecords(headers?: HeadersOption) {
        return toRecords(headers);
    }

    protected init(option?: ResponseOption) {
        const init = option || EMPTY_OBJ as ResponseOption;
        this._headers = this.toRecords(init?.headers);
        if (init.status) this._status = init.status;
    }

    private _headers!: Record<string, string | string[] | number>;
    /**
     * Return response header.
     *
     * @return {Object}
     * @api public
     */
    get headers(): Record<string, string | string[] | number> {
        return this._headers;
    }

    protected _status: number = 404;
    get status(): number {
        return this._status;
    }
    set status(code: number) {
        this._status = code;
        if (empty[code]) this.body = null;
    }

    private _msg!: string;
    get message(): string {
        return this._msg;
    }
    set message(msg: string) {
        this._msg = msg;
    }

    private _err: any;
    /**
     * get response error
     */
    get error(): any {
        return this._err;
    }
    /**
     * set response error
     */
    set error(err: any) {
        this._err = err;
        if (!err) return;

        this.status = err.status ?? 500;
        this.message = err.message ?? err.toString();
    }


    private _body: any;
    get body(): any {
        return this._body;
    }
    set body(val: any) {
        const original = this._body;
        this._body = val;
        this.onBodyChange(val, original);
    }

    protected onBodyChange(val: any, original: any) {
        // no content
        if (null == val) {
            if (!empty[this.status]) this.status = 204;
            return;
        }

        this.status = 200;
        // set the content-type only if not yet set
        const setType = !this.hasHeader('Content-Type');

        // string
        if (isString(val)) {
            if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text';
            this.length = Buffer.byteLength(val);
            return;
        }

        // buffer
        if (Buffer.isBuffer(val)) {
            if (setType) this.type = 'bin';
            this.length = val.length;
            return;
        }

        // json
        this.type = 'json';
    }

    private _length: number = 0;
    get length(): number {
        return this._length;
    }
    set length(n: number) {
        this._length = n;
    }


    private _headersSent = false;
    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    get headersSent() {
        return this._headersSent;
    }

    getHeaders() {
        return this.headers;
    }

    getHeader(name: string): string | string[] | number {
        return this.headers[name] ?? '';
    }
    hasHeader(name: string): boolean {
        return isDefined(this.headers[name]);
    }
    setHeader(name: string, value: number | string | string[]): void {
        if (this.headersSent) return;
        this.headers[name] = value;
    }
    removeHeader(name: string): void {
        if (this.headersSent) return;
        this.headers[name] = undefined!;
    }
}
