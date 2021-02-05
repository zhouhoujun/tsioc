import { IInjector } from '@tsdi/ioc';
import { ProdverOption } from '../Context';

/**
 * message context for middlewares.
 */
export interface MessageContext extends ProdverOption {
    /**
     * navigate message
     */
    readonly url?: string;

    /**
     * request.
     */
    readonly request?: { body: any, query: any, target?: any }

    readonly method?: string;
    /**
     * response status
     */
    status?: number;

    /**
     * response body data.
     */
    body?: any;

    /**
     * injector of message queue.
     */
    injector?: IInjector;

    vaild?: IRouteVaildator;
}


export interface IRouteVaildator {
    isRoute(url: string): boolean;
    vaildify(routePath: string, foreNull?: boolean): string;
    isActiveRoute(ctx: MessageContext, route: string, routePrefix: string);
    getReqRoute(ctx: MessageContext, routePrefix: string): string;
}