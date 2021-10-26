import { EMPTY_OBJ, Injectable, Injector, isArray, isNumber, isString, Singleton } from '@tsdi/ioc';
import { RouteVaildator, Context, ContextFactory } from './context';
import { HeadersOption, Headers } from './header';
import { RequestOption, Request } from './request';
import { ResponseOption, Response } from './response';

const urlReg = /\/((\w|%|\.))+\.\w+$/;
const noParms = /\/\s*$/;
const hasParms = /\?\S*$/;
const subStart = /^\s*\/|\?/;

/**
 * route vaildator.
 */
@Singleton()
export class MsgRouteVaildator implements RouteVaildator {

    isRoute(url: string): boolean {
        return !urlReg.test(url);
    }

    vaildify(routePath: string, foreNull = false): string {
        if (foreNull && routePath === '/') {
            routePath = '';
        }
        if (noParms.test(routePath)) {
            routePath = routePath.substring(0, routePath.lastIndexOf('/'));
        }
        if (hasParms.test(routePath)) {
            routePath = routePath.substring(0, routePath.lastIndexOf('?'));
        }
        return routePath;
    }

    isActiveRoute(ctx: Context, route: string, routePrefix: string) {
        let routeUrl = this.getReqRoute(ctx, routePrefix);
        if (route === '' || route === routeUrl) {
            return true;
        }
        return routeUrl.startsWith(route) && subStart.test(routeUrl.substring(route.length));
    }

    getReqRoute(ctx: Context, routePrefix: string): string {
        let reqUrl = this.vaildify(ctx.url, true);

        if (routePrefix) {
            return reqUrl.replace(routePrefix, '');
        }
        return reqUrl;
    }
}

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

export class HeadersBase extends Headers {
    /**
     * Internal map of lowercase header names to values.
     */
    private headers: Map<string, string | string[] | number> = new Map();


    constructor(headers?: HeadersOption | Headers) {
        super();
        if (headers) this.init(headers);
    }

    protected init(headers: HeadersOption | Headers) {
        if (isString(headers)) {
            headers.split('\n').forEach(line => {
                const index = line.indexOf(':');
                if (index > 0) {
                    const key = line.slice(0, index).trim();
                    const value = line.slice(index + 1).trim();
                    this.append(key, value);
                }
            });
        } else if (isArray(headers)) {
            headers.forEach(line => {
                if (line.length > 0) {
                    const key = line[0].trim();
                    const value = line[1].trim();
                    this.headers.set(key, value);
                }
            });
        } else if (headers instanceof Headers) {
            this._referrer = headers.referrer;
            headers.forEach((v, k) => {
                this.headers.set(k, v);
            });
        } else {
            this._referrer = headers.referrer as string;
            Object.keys(headers).forEach(key => {
                let values = headers[key];
                this.headers.set(key, values);

            })
        }
    }

    private _referrer: string = '';
    get referrer(): string {
        return this._referrer;
    }

    append(name: string, value: string | string[] | number): void {
        if (!isNumber(value) && this.headers.has(name)) {
            const val = this.headers.get(name);
            if (isArray(val)) {
                isArray(value) ? val.push(...value) : val.push(value);
            } else {
                let cv: string | string[] = value;
                if (isString(val)) {
                    cv = isArray(value) ? [...value, val] : [value, val];
                }
                this.headers.set(name, cv)
            }
        } else {
            this.headers.set(name, value);
        }
    }

    delete(name: string): void {
        this.headers.delete(name);
    }

    get(name: string): string | string[] | number {
        return this.headers.get(name) ?? '';
    }

    has(name: string): boolean {
        return this.headers.has(name);
    }

    set(name: string, value: string | string[] | number): void {
        this.headers.set(name, value);
    }

    forEach(callbackfn: (value: string | string[] | number, key: string, parent: Headers) => void, thisArg?: any): void {
        this.headers.forEach((v, k) => callbackfn(v, k, this), this);
    }
}

export class RequestBase extends Request {

    constructor(init?: RequestOption | Request) {
        super();
        this.init(init);
    }

    protected createHeader(headers?: Headers | Record<string, string | string[]> | HeadersOption) {
        return new HeadersBase(headers);
    }

    protected init(option?: RequestOption | Request) {
        const init = (option || EMPTY_OBJ) as RequestOption | Request;
        if (init instanceof Request) {
            this._headers = this.createHeader(init.getHeaders())
            this._originalUrl = init.originalUrl;
            this._URL = init.URL;
            this._url = init.url;
            this.body = init.body;
            this._method = init.method;
            this.query = init.query;
        } else {
            this._headers = this.createHeader(init?.headers)
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


    private _headers!: Headers;
    get headers(): Headers {
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
        return this.headers.get(name) as (string | string[]) ?? '';
    }

    hasHeader(name: string): boolean {
        return this.headers.has(name.toLowerCase());
    }
    setHeader(name: string, value: string | string[]): void {
        this.headers.set(name, value);
    }
    removeHeader(name: string): void {
        this.headers.delete(name);
    }

}

export class ResponseBase extends Response {

    constructor(init?: ResponseOption) {
        super();
        this.init(init);
    }

    protected createHeader(headers?: Headers | HeadersOption) {
        return new HeadersBase(headers);
    }

    protected init(option?: ResponseOption) {
        const init = option || EMPTY_OBJ as ResponseOption;
        this._headers = this.createHeader(init?.headers);
        if (init.status) this._status = init.status;
    }

    private _headers!: Headers;
    /**
     * Return response header.
     *
     * @return {Object}
     * @api public
     */
    get headers(): Headers {
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
        return this.headers.get(name) ?? '';
    }
    hasHeader(name: string): boolean {
        return this.headers.has(name);
    }
    setHeader(name: string, value: number | string | string[]): void {
        if (this.headersSent) return;
        this.headers.set(name, value);
    }
    removeHeader(name: string): void {
        if (this.headersSent) return;
        this.headers.delete(name);
    }
}

export const BASE_CONTEXT_FACTORY_IMPL: ContextFactory = {
    create(request: Request | RequestOption, injector: Injector): Context {
        const req: Request = request instanceof Request ? request : new RequestBase(request);
        const headers = req.getHeaders();
        const rep = new ResponseBase({ headers });
        return new ContextBase(req, rep, injector);
    }
}
