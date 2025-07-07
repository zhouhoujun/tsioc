import { Injector, InstanceOf, Provider, Token, TypeOf, getToken, isFunction, isType, tokenId } from '@tsdi/ioc';
import { PatternFormatter, Protocols, defaultFormatter } from '@tsdi/common';
import { InternalServerException } from '@tsdi/common/transport';
import { Route, Routes } from './route';
import { Router } from './router';

import { OptimizedRouter } from './router.optimize';
import { Wlidcard } from './trie';



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
                    // opts.matcher ? (isType(opts.matcher) ? injector.get(opts.matcher) : opts.matcher) : new DefaultRouteMatcher(),
                    opts.formatter ? (isType(opts.formatter) ? injector.get(opts.formatter) : opts.formatter) : injector.get(PatternFormatter, defaultFormatter),
                    opts.prefix,
                    protocol,
                    opts.equals,
                    opts.wildcards,
                    opts.routes,
                    microservice
                )
                // microservice,
                // asDefault)
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
    // matcher?: TypeOf<RouteMatcher>;
    formatter?: TypeOf<PatternFormatter>;
    prefix?: string;
    equals?: (r1: Route, r2: Route) => boolean;
    wildcards?: Wlidcard[];
    routes?: Routes;
}

