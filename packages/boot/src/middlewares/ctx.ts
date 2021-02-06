import { IInjector, IProvider, Token } from '@tsdi/ioc';
import { ProdverOption } from '../Context';

/**
 * Request
 */
export interface RequestOption extends ProdverOption {
    /**
     * request body.
     */
    readonly body?: any;
    /**
     * request query params
     */
    readonly query?: any;

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
     * response error.
     */
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
    providers?: IProvider;

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


export interface IRouteVaildator {
    isRoute(url: string): boolean;
    vaildify(routePath: string, foreNull?: boolean): string;
    isActiveRoute(ctx: MessageContext, route: string, routePrefix: string);
    getReqRoute(ctx: MessageContext, routePrefix: string): string;
}