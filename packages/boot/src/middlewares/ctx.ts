import { Injector, ObjectMap, ProviderType, Token } from '@tsdi/ioc';

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
    readonly restful?: ObjectMap<string|number>;
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

/**
 * message context for middlewares.
 */
export interface MessageContext {
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
    readonly providers?: Injector;

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
    isActiveRoute(ctx: MessageContext, route: string, routePrefix: string): boolean;
    /**
     * get request route.
     * @param ctx context.
     * @param routePrefix route prefix.
     */
    getReqRoute(ctx: MessageContext, routePrefix: string): string;
}