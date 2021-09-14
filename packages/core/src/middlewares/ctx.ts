import { Abstract, Injector, ObjectMap, ProviderType, Token } from '@tsdi/ioc';

/**
 * Request
 */
export interface RequestOption {
    /**
     * request url.
     */
    url?: string;
    /**
     * restful params.
     */
    readonly restful?: ObjectMap<string | number>;
    /**
     * protocol.
     */
    readonly protocol?: string;
    /**
     * request body.
     */
    readonly body?: any;
    /**
     * request query params
     */
    readonly query?: any;
    /**
     * reuqest method
     */
    readonly method?: string;
    /**
     * event
     */
    readonly event?: string;
    /**
     * the target raise request.
     */
    readonly target?: any;

    /**
     * providers.
     */
    providers?: ProviderType[];
}


@Abstract()
export abstract class Context1 {

    abstract get request(): Request;
    abstract get response(): Response;
    abstract get url(): string;
    abstract get pathname(): string;

    /**
     * injector of.
     */
    abstract get injector(): Injector;

    /**
     * Get response body.
     */
    abstract get body(): any;
    /**
     * Set response body.
     */
    abstract set body(body: any);

    get method() {
        return this.request.method;
    }

    get status(): number {
        return this.response.status;
    }

    abstract get message(): string;
    abstract set message(msg: string);

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

}

@Abstract()
export abstract class ContextFactory {
    abstract create(request: Request, injector: Injector, providers: ProviderType[]): Context;
}

/**
 * context for middlewares.
 */
export interface Context {
    /**
     * navigate message
     */
    readonly url: string;

    readonly protocol?: string;
    readonly host?: string;
    readonly port?: number;
    readonly pathname?: string;


    /**
     * request.
     */
    readonly request: RequestOption;

    /**
     * reuqest method
     */
    readonly method?: string;

    readonly event?: string;
    /**
     * response status
     */
    status?: number;
    /**
     * response error message.
     */
    message?: string;

    error?: Error;

    /**
     * response body data.
     */
    body?: any;

    /**
     * injector of message queue.
     */
    injector: Injector;

    /**
     * the context providers.
     */
    readonly providers?: ProviderType[];

    /**
     * route vaildator.
     */
    vaild?: IRouteVaildator;

    /**
     * get value to context
     * @param token
     */
    getValue<T>(token: Token<T>): T;
    /**
     * set value
     * @param token
     * @param value 
     */
    setValue(token: Token, value: any): void;
}

/**
 * route vaildator.
 */
export interface IRouteVaildator {
    /**
     * is route url or not.
     * @param url 
     */
    isRoute(url: string): boolean;
    /**
     * vaildify
     * @param routePath route path. 
     * @param foreNull fore null.
     */
    vaildify(routePath: string, foreNull?: boolean): string;
    /**
     * is active route or not.
     * @param ctx context.
     * @param route route.
     * @param routePrefix route prefix.
     */
    isActiveRoute(ctx: Context, route: string, routePrefix: string): boolean;
    /**
     * get request route.
     * @param ctx context.
     * @param routePrefix route prefix.
     */
    getReqRoute(ctx: Context, routePrefix: string): string;
}