import { Injector, InstanceOf, Provider, Token, TypeOf, getToken, isFunction, isAbstractType, tokenId } from '@tsdi/ioc';
import { PatternFormatter, Protocols, defaultFormatter } from '@tsdi/common';
import { InternalServerException } from '@tsdi/common/transport';
import { Routes } from './route';
import { Router } from './router';

import { OptimizedRouter } from './router.optimize';
import { TrieOptions } from './trie';



/**
 * global router prefix.
 */
export const ROUTER_PREFIX = tokenId<string>('ROUTER_PREFIX');


/**
 * microservice message routers.
 */
export const MESSAGE_ROUTERS = tokenId<Router[]>('MESSAGE_ROUTERS');


/**
 *  service routers.
 */
export const ROUTERS = tokenId<Router[]>('ROUTERS');

export function getRouter(injector: Injector, protocol?: Protocols, microservice?: boolean): Router;
export function getRouter(injector: Injector, protocol?: string, microservice?: boolean): Router;
export function getRouter(injector: Injector, protocol?: string, microservice?: boolean): Router {
    const routers = injector.get(microservice ? MESSAGE_ROUTERS : ROUTERS, null);
    if (!routers) throw new InternalServerException(`${protocol ?? ''} ${microservice ? 'micro' : ''}service router has not register.`);
    if (!protocol && routers.length > 1) throw new InternalServerException(`has mutil ${microservice ? 'micro' : ''}service, protocol param can not empty`);
    const router = routers.find(r => r.protocol == protocol) ?? routers.find(r => r.asDefault) ?? routers[0];
    if (!router) throw new InternalServerException(`${protocol ?? ''} ${microservice ? 'micro' : ''}service router has not register.`);
    return router;
}


export function getRouterToken(protocol: Protocols, microservice?: boolean): Token<Router> {
    return getToken(microservice ? 'MicroRouter' : Router, protocol)
}

export function createRouteProviders(protocol: Protocols, microservice: boolean, optsify: InstanceOf<RouteOpts> = {}, asDefault?: boolean): Provider[] {
    const token = getRouterToken(protocol, microservice);
    return [
        {
            provide: token,
            useFactory: (injector: Injector) => {
                const opts = isFunction(optsify) ? optsify(injector)! : optsify;
                return new OptimizedRouter(injector,
                    opts.formatter ? (isAbstractType(opts.formatter) ? injector.get(opts.formatter) : opts.formatter) : injector.get(PatternFormatter, defaultFormatter),
                    opts.prefix,
                    protocol,
                    opts.options,
                    opts.routes,
                    microservice
                )
            },
            deps: [Injector],
        },
        {
            provide: microservice ? MESSAGE_ROUTERS : ROUTERS,
            useExisting: token,
            multi: true
        }
    ]
}


export interface RouteOpts {
    formatter?: TypeOf<PatternFormatter>;
    prefix?: string;
    options?: Partial<TrieOptions>;
    routes?: Routes;
}

