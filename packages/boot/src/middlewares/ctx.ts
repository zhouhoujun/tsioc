import { IInjector } from '@tsdi/ioc';
import { ProdverOption } from '../Context';


export interface MsgContext extends ProdverOption {
    /**
     * navigate message
     */
    readonly url?: string;
    /**
     * query params.
     */
    readonly query?: any;
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
    isActiveRoute(ctx: MsgContext, route: string);
}