import { Injector, InstanceOf, Provider, Token, TypeOf, getToken, isFunction, isNumber, isType, token } from '@tsdi/ioc';
import { PatternFormatter, Transport, defaultFormatter } from '@tsdi/common';
import { InternalServerException } from '@tsdi/common';
import { Routes } from './route';
import { Router } from './router';

import { OptimizedRouter } from './router.optimize';
import { TrieOptions } from './trie';
import { getRouterToken } from '../tokens';
import { ServiceConfig } from '../server.options';



/**
 * global router prefix.
 */
export const ROUTER_PREFIX = token<string>('ROUTER_PREFIX');


/**
 * microservice message routers.
 */
export const MESSAGE_ROUTERS = token<Router[]>('MESSAGE_ROUTERS');


/**
 *  service routers.
 */
export const ROUTERS = token<Router[]>('ROUTERS');

export function getRouter(injector: Injector, transport?: Transport, microservice?: boolean): Router {
    const routers = injector.get(microservice ? MESSAGE_ROUTERS : ROUTERS, null);
    if (!routers) throw new InternalServerException(`${transport ? Transport[transport] : ''} ${microservice ? 'micro' : ''}service router has not register.`);
    if (!transport && routers.length > 1) throw new InternalServerException(`has mutil ${microservice ? 'micro' : ''}service, protocol param can not empty`);
    const router = routers.find(r => r.transport == transport) ?? routers.find(r => r.asDefault) ?? routers[0];
    if (!router) throw new InternalServerException(`${transport ?? ''} ${microservice ? 'micro' : ''}service router has not register.`);
    return router;
}



export function createRouteProviders(config: ServiceConfig, token?: Token<Router>, optsify: InstanceOf<RouteOpts> = {}, asDefault?: boolean): Provider[] {
    token ??= getRouterToken(config);
    return [
        {
            provide: token,
            useFactory: (injector: Injector) => {
                const opts = isFunction(optsify) ? optsify(injector)! : optsify;
                return new OptimizedRouter(injector,
                    opts.formatter ? (isType(opts.formatter) ? injector.get(opts.formatter) : opts.formatter) : injector.get(PatternFormatter, defaultFormatter),
                    opts.prefix,
                    config.transport,
                    opts.options,
                    opts.routes,
                    config.microservice
                )
            },
            deps: [Injector],
        },
        {
            provide: config.microservice ? MESSAGE_ROUTERS : ROUTERS,
            useExisting: token,
            multi: true
        }
    ]
}


export interface RouteOpts {
    formatter?: TypeOf<PatternFormatter>;
    microservice?: boolean;
    prefix?: string;
    options?: Partial<TrieOptions>;
    routes?: Routes;
}

