import { Injectable, Injector, isArray, isString, Singleton } from '@tsdi/ioc';
import { RouteVaildator, Context, Request, Response, RequestOption, Headers, ContextFactory } from './ctx';

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

    private _err!: Error;
    set error(err: Error) {
        this._err = err;
        if (err) {
            this.message = err.stack ?? err.message;
            this.status = 500;
        }
    }
}

export class RequestBase extends Request {
    get headers(): Headers {
        throw new Error('Method not implemented.');
    }
    set headers(headers: Headers) {
        throw new Error('Method not implemented.');
    }
    get originalUrl(): string {
        throw new Error('Method not implemented.');
    }
    get url(): string {
        throw new Error('Method not implemented.');
    }
    set url(url: string) {
        throw new Error('Method not implemented.');
    }
    get method(): string {
        throw new Error('Method not implemented.');
    }
    set method(val: string) {
        throw new Error('Method not implemented.');
    }
    get path(): string {
        throw new Error('Method not implemented.');
    }
    set path(path: string) {
        throw new Error('Method not implemented.');
    }
    get query(): any {
        throw new Error('Method not implemented.');
    }
    set query(obj: any) {
        throw new Error('Method not implemented.');
    }
    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(obj: any) {
        throw new Error('Method not implemented.');
    }
    get querystring(): string {
        throw new Error('Method not implemented.');
    }
    set querystring(str: string) {
        throw new Error('Method not implemented.');
    }
    get host(): string {
        throw new Error('Method not implemented.');
    }
    get hostname(): string {
        throw new Error('Method not implemented.');
    }
    get length(): number {
        throw new Error('Method not implemented.');
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get subdomains(): string[] {
        throw new Error('Method not implemented.');
    }
    get type(): string {
        throw new Error('Method not implemented.');
    }
    get accept(): Object {
        throw new Error('Method not implemented.');
    }
    set accept(obj: Object) {
        throw new Error('Method not implemented.');
    }
    accepts(type: string[]): string | boolean | string[];
    accepts(types: string[]): string | boolean | string[];
    accepts(types: any): string | boolean | string[] {
        throw new Error('Method not implemented.');
    }
    constructor(option: RequestOption | Request) {
        super();
    }
}

const empty: any = {
    204: true,
    205: true,
    304: true
};

export type HeadersInit = string[][] | Record<string, string> | Headers | string;

export class HeadersBase extends Headers {
    /**
     * Internal map of lowercase header names to values.
     */
    private headers!: Map<string, string[]>;


    constructor(headers?: HeadersInit) {
        super();
        this.headers = new Map();
        if (headers) this.init(headers);
    }

    protected init(headers: HeadersInit) {
        if (isString(headers)) {
            headers.split('\n').forEach(line => {
                const index = line.indexOf(':');
                if (index > 0) {
                    const name = line.slice(0, index);
                    const key = name.toLowerCase();
                    const value = line.slice(index + 1).trim();
                    if (this.headers.has(key)) {
                        this.headers.get(key)?.push(value);
                    } else {
                        this.headers.set(key, [value]);
                    }
                }
            });
        } else if (isArray(headers)) {
            headers.forEach(line => {
                const index = line.length
                if (index > 0) {
                    const key = line[0].toLowerCase();
                    const value = line[1].trim();
                    this.headers.set(key, isString(value) ? [value] : value);
                }
            });
        } else {
            Object.keys(headers).forEach(name => {
                let values: string | string[] = (headers as Record<string, string>)[name];
                const key = name.toLowerCase();
                this.headers.set(key, isString(values) ? [values] : values);

            })
        }
    }

    append(name: string, value: string | string[]): void {
        this.headers.set(name, isString(value) ? [value] : value);
    }

    delete(name: string): void {
        this.headers.delete(name);
    }
    get(name: string): string | null {
        const values = this.headers.get(name.toLowerCase());
        return values && values.length > 0 ? values[0] : null;
    }

    has(name: string): boolean {
        return this.headers.has(name);
    }

    set(name: string, value: string | string[]): void {
        this.headers.set(name, isString(value) ? [value] : value);
    }

    forEach(callbackfn: (value: string[], key: string, parent: Headers) => void, thisArg?: any): void {
        this.headers.forEach((v, k) => callbackfn(v, k, this), this);
    }


}

export interface ResponseInit {
    headers?: HeadersInit;
    status?: number;
    statusText?: string;
}

export class ResponseBase extends Response {

    constructor(init?: ResponseInit) {
        super();
        this.init(init);
    }

    protected init(init?: ResponseInit) {
        this._headers = new HeadersBase(init?.headers);
        if(init){
            if(init.status) this._status = init.status;
        }
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

    private _status: number = 404;
    get status(): number {
        return this._status;
    }
    set status(code: number) {
        this._status = code;
        if (empty[code]) this.body = null;
    }

    private _msg: string | undefined;
    get message(): string | undefined {
        return this._msg;
    }
    set message(msg: string | undefined) {
        this._msg = msg;
    }

    private _body: any;
    get body(): any {
        return this._body;
    }
    set body(val: any) {
        const original = this._body;
        this._body = val;

        // no content
        if (null == val) {
            if (!empty[this.status]) this.status = 204;
            return;
        }
        if (empty[this.status]) this.status = 200;
        // set the content-type only if not yet set
        const setType = !this.has('Content-Type');

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

    private _type = '';
    get type(): string {
        return this._type;
    }
    set type(type: string) {
        this._type = type;
    }
}

export const BASE_CONTEXT_FACTORY_IMPL: ContextFactory = {
    create(request: Request | RequestOption, injector: Injector): Context {
        let req: Request = request instanceof Request ? request : new RequestBase(request);
        let rep = new ResponseBase();
        return new ContextBase(req, rep, injector);
    }
}
