import { Injector, InstanceOf, Provider, Token, TokenOf } from '@tsdi/ioc';
import { PatternFormatter, Transport } from '@tsdi/common';
import { Routes } from './route';
import { Router } from './router';
import { TrieOptions } from './trie';
import { ServiceConfig } from '../server.options';
/**
 * global router prefix.
 */
export declare const ROUTER_PREFIX: import("@tsdi/ioc").InjectToken<string>;
/**
 * microservice message routers.
 */
export declare const MESSAGE_ROUTERS: import("@tsdi/ioc").InjectToken<Router<import("./router").RouteHanlder>[]>;
/**
 *  service routers.
 */
export declare const ROUTERS: import("@tsdi/ioc").InjectToken<Router<import("./router").RouteHanlder>[]>;
export declare function getRouter(injector: Injector, transport?: Transport, microservice?: boolean): Router;
export declare function createRouteProviders(config: ServiceConfig, token?: Token<Router>, optsify?: InstanceOf<RouteOpts>, asDefault?: boolean): Provider[];
export interface RouteOpts {
    formatter?: TokenOf<PatternFormatter>;
    microservice?: boolean;
    prefix?: string;
    options?: Partial<TrieOptions>;
    routes?: Routes;
}
