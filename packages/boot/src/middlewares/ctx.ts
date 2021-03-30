import { IInjector, IProvider, ObjectMap, Token } from '@tsdi/ioc';
import { ProdverOption } from '../Context';

/**
 * Request
 */
export interface RequestOption extends ProdverOption {
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
}

/**
 * message context for middlewares.
 */
export interface MessageContext {
    /**
     * navigate message
     */
    readonly url?: string;

    readonly protocol?: string;
    readonly host?: string;
    readonly port?: number;
    readonly pathname?: string;


    /**
     * request.
     */
    readonly request?: RequestOption;

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
    injector?: IInjector;

    /**
     * the context providers.
     */
    readonly providers?: IProvider;

    /**
     * route vaildator.
     */
    vaild?: IRouteVaildator;

    /**
     * get value to context
     * @param token
     */
    getValue?<T>(token: Token<T>): T;
    /**
     * set value
     * @param token
     * @param value 
     */
    setValue?(token: Token, value: any): void;
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
    isActiveRoute(ctx: MessageContext, route: string, routePrefix: string);
    /**
     * get request route.
     * @param ctx context.
     * @param routePrefix route prefix.
     */
    getReqRoute(ctx: MessageContext, routePrefix: string): string;
}