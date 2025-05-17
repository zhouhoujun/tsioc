import { Injector, InstanceOf, Module, ModuleWithProviders, Provider, Token, TypeOf, getToken, isFunction, isString, isType, tokenId } from '@tsdi/ioc';
import { PatternFormatter, Protocols, defaultFormatter } from '@tsdi/common';
import { ROUTES, Routes } from './route';
import { MESSAGE_ROUTERS, RouteMatcher, Router, ROUTERS } from './router';

import { MappingRouter, DefaultRouteMatcher } from './router.mapping';



/**
 * global router prefix.
 */
export const ROUTER_PREFIX = tokenId<string>('ROUTER_PREFIX');



export function getRouterToken(protocol: Protocols, microservice?: boolean): Token<Router> {
    return getToken(microservice ? 'MicroServiceRouter' : Router, protocol)
}

export function createRouteProviders(protocol: Protocols, microservice: boolean, optsify: InstanceOf<RouteOpts>= {}, asDefault?: boolean): Provider[] {
    const token = getRouterToken(protocol, microservice); // getToken(microservice ? 'MicroServiceRouter' : Router, protocol);
    return [
        {
            provide: token,
            useFactory: (injector: Injector) => {
                const opts = isFunction(optsify) ? optsify(injector) : optsify;
                return new MappingRouter(injector,
                    opts.matcher ? (isType(opts.matcher) ? injector.get(opts.matcher) : opts.matcher) : new DefaultRouteMatcher(),
                    opts.formatter ? (isType(opts.formatter) ? injector.get(opts.formatter) : opts.formatter) : injector.get(PatternFormatter, defaultFormatter),
                    protocol,
                    opts.prefix,
                    opts.routes,
                    microservice,
                    asDefault)
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
    matcher?: TypeOf<RouteMatcher>;
    formatter?: TypeOf<PatternFormatter>;
    prefix?: string;
    routes?: Routes;
}

