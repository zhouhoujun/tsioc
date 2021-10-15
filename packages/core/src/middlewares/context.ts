import { Abstract, DecorDefine, Destroyable, Injector, Token } from '@tsdi/ioc';
import { RequestOption, Request } from './request';
import { Response } from './response';

/**
 * context for middlewares.
 */
@Abstract()
export abstract class Context implements Destroyable {
    activeRouteMetadata?: DecorDefine;
    private _destroyed = false;
    protected _dsryCbs: (() => void)[] = [];
    private _vaild!: RouteVaildator
    get vaild(): RouteVaildator {
        if (!this._vaild) {
            this._vaild = this.injector.get(RouteVaildator);
        }
        return this._vaild;
    }

    abstract set error(err: Error);

    abstract get request(): Request;
    abstract get response(): Response;

    get querystring(): string {
        return this.request.querystring;
    }
    // set querystring(val: string) {
    //     this.request.querystring = val;
    // }

    get search(): string {
        return this.request.search;
    }
    // set search(val: string) {
    //     this.request.search = val;
    // }

    get method(): string {
        return this.request.method;
    }
    set method(val: string) {
        this.request.method = val;
    }

    get query(): any {
        return this.request.query;
    }
    set query(val: any) {
        this.request.query = val;
    }

    get path(): string {
        return this.request.path;
    }
    // set path(path: string) {
    //     this.request.path = path;
    // }

    get url(): string {
        return this.request.url;
    }
    set url(val: string) {
        this.request.url = val;
    }

    // get accept(): Object {
    //     return this.request.accept;
    // }
    // set accept(val: Object) {
    //     this.request.accept = val;
    // }

    get origin(): string {
        return this.request.origin;
    }

    get href(): string {
        return this.request.href;
    }

    abstract get subdomains(): string[];

    get protocol(): string {
        return this.request.protocol;
    }

    get host(): string {
        return this.request.host;
    }

    get hostname(): string {
        return this.request.hostname;
    }

    /**
     * injector of.
     */
    abstract get injector(): Injector;

    get status(): number {
        return this.response.status;
    }

    set status(status: number) {
        this.response.status = status;
    }

    get message(): string {
        return this.response.message;
    }
    set message(msg: string) {
        this.response.message = msg;
    }

    /**
     * Get response body.
     */
    get body(): any {
        return this.response.body;
    }
    /**
     * Set response body.
     */
    set body(body: any) {
        this.response.body = body;
    }

    /**
     * Get Content-Length.
     */
    get length(): number {
        return this.response.length;
    }
    /**
     * Set Content-Length field to `n`.
     */
    set length(val: number) {
        this.response.length = val;
    }

    /**
     * Return the response mime type void of
     * parameters such as "charset".
     *
     * @return {String}
     * @api public
     */
    get type(): string {
        return this.response.type;
    }
    /**
     * Set Content-Type response header with `type` through `mime.lookup()`
     * when it does not contain a charset.
     * or event type.
     *
     * Examples:
     *
     *     this.type = '.html';
     *     this.type = 'html';
     *     this.type = 'json';
     *     this.type = 'application/json';
     *     this.type = 'png';
     *
     * @param {String} type
     * @api public
     */
    set type(type: string) {
        this.response.type = type;
    }

    /**
     * get value to context
     * @param token
     */
    getValue<T>(token: Token<T>): T {
        return this.injector.get(token);
    }
    /**
     * set value
     * @param token
     * @param value 
     */
    setValue(token: Token, value: any): void {
        this.injector.setValue(token, value);
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null!;
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs?.unshift(callback);
    }

    protected destroying(): void {
        (this as { request: Request | null }).request = null;
        (this as { response: Response | null }).response = null;
        this.injector.destroy();
        (this as { injector: Injector | null }).injector = null;
    }

}

/**
 * middleware context factory.
 */
@Abstract()
export abstract class ContextFactory {
    abstract create(request: Request | RequestOption, injector: Injector): Context;
}


/**
 * route vaildator.
 */
@Abstract()
export abstract class RouteVaildator {
    /**
     * is route url or not.
     * @param url 
     */
    abstract isRoute(url: string): boolean;
    /**
     * vaildify
     * @param routePath route path. 
     * @param foreNull fore null.
     */
    abstract vaildify(routePath: string, foreNull?: boolean): string;
    /**
     * is active route or not.
     * @param ctx context.
     * @param route route.
     * @param routePrefix route prefix.
     */
    abstract isActiveRoute(ctx: Context, route: string, routePrefix: string): boolean;
    /**
     * get request route.
     * @param ctx context.
     * @param routePrefix route prefix.
     */
    abstract getReqRoute(ctx: Context, routePrefix: string): string;
}