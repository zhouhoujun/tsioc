import { Abstract, Injector, ProvidedInMetadata, Token, tokenId, Type, TypeDef } from '@tsdi/ioc';
import { ApplicationInterceptor, Backend, ApplicationHandler, InvocationHanlderOptions } from '@tsdi/core';
import { RequestMethod, Pattern, Protocols, PatternFormatter } from '@tsdi/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { Route } from './route';
import { RequestHandler } from '../RequestHandler';
import { InternalServerException } from '@tsdi/common/transport';
import { MiddlewareLike } from '../middleware/middleware';

/**
 * route.
 */
export type RouteHanlder = RequestHandler | MiddlewareLike | Array<RequestHandler | MiddlewareLike>;


/**
 * router
 * 
 * public api for global router
 */
@Abstract()
export abstract class Router<T = RouteHanlder> implements Backend<RequestContext>, ApplicationInterceptor<RequestContext> {
    /**
     * protocol
     */
    abstract get protocol(): Protocols | null;

    asDefault?: boolean;

    abstract handle(input: RequestContext): Observable<any>;
    /**
     * route prefix.
     */
    abstract get prefix(): string;

    abstract get routes(): Map<string, T>;
    /**
     * pattern formatter.
     */
    abstract get formatter(): PatternFormatter;
    /**
    * route matcher.
    */
    abstract get matcher(): RouteMatcher;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: Route): this;
    /**
     * use route.
     * @param route The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * @param endpoint endpoint. 
     * @param subscribe as subscribe or not.
     */
    abstract use(route: Pattern, endpoint: T, callback?: (route: string, regExp?: RegExp) => void): this;
    /**
     * unuse route.
     * @param route The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * @param endpoint endpoint.
     */
    abstract unuse(route: Pattern, endpoint?: T): this;

    /**
     * intercept
     * @param input 
     * @param next 
     */
    abstract intercept(input: RequestContext, next: ApplicationHandler): Observable<any>;

}

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


/**
 * math url path with register route.
 */
@Abstract()
export abstract class RouteMatcher {
    /**
     * get register topic patterns.
     */
    abstract getPatterns<T = string>(): T[]

    /**
     * each topic patterns.
     */
    abstract eachPattern<T = string>(callback: (transformed: T, pattern: string) => void): void
    /**
     * is pattern route or not.
     * @param route 
     */
    abstract isPattern(route: string): boolean;
    /**
     * register route matcher. 
     * @param route The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * @param params dynamic token values for route path.  
     * 
     * #### Examples
     * 
     * ```ts
     * 'path/#'
     * 'path/**'
     * 'path/*'
     * 'path/+'
     * 'path/:id'
     * 'path/${id}'
     * 
     * ```
     *  
     * @returns subscribe topics. 
     */
    abstract register(route: string, subscribe?: boolean): void;
    /**
     * register route matcher. 
     * @param route The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * @param params dynamic token values for route path.  
     * 
     * #### Examples
     * 
     * ```ts
     * 'path/#'
     * 'path/**'
     * 'path/*'
     * 'path/+'
     * 'path/:id'
     * 'path/${id}'
     * 
     * ```
     *  
     * @returns subscribe topics. 
     */
    abstract register(route: string, params?: Record<string, any>, subscribe?: boolean): void;

    /**
     * get the url path match route
     * @param path url path
     * @returns matched route.
     */
    abstract match(path: string): string | null;

    abstract unregister(route: string): void;

    abstract clear(): void;
}


/**
 * route options
 */
export interface RouteOptions<T = any> extends InvocationHanlderOptions<T> {
    /**
     * pipe extends args.
     */
    args?: any[];
    /**
     * dynamic tokens for path of topic.  
     */
    paths?: Record<string, Token>;
}

/**
 * route mapping metadata.
 */
export interface RouteMappingMetadata<T = any> extends RouteOptions<T> {
    /**
     * route.
     *
     * @type {Pattern}
     * @memberof RouteMappingMetadata
     */
    route?: Pattern;
    /**
     * route `RegExp` matcher.
     */
    regExp?: RegExp;
    /**
     * request method.
     */
    method?: RequestMethod;
    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMappingMetadata
     */
    contentType?: string;
}

/**
 * Protocol route options.
 */
export interface ProtocolRouteOptions<T = any> extends RouteOptions<T> {
    /**
     * transport protocol
     */
    protocol?: Protocols;
}

/**
 * Protocol route mapping options.
 */
export interface ProtocolRouteMappingOptions<T = any> extends ProtocolRouteOptions<T> {
    /**
     * parent router.
     * default register in root handle queue.
     */
    router?: Type<Router>;
    /**
     * version of api.
     */
    version?: string;
    /**
     * route prefix.
     */
    prefix?: string;

}

/**
 * protocol route mapping metadata.
 */
export interface ProtocolRouteMappingMetadata<T = any> extends ProtocolRouteMappingOptions<T>, ProvidedInMetadata {
    /**
     * route.
     *
     * @type {string}
     * @memberof ProtocolRouteMappingMetadata
     */
    route?: string;

    /**
     * request method.
     */
    method?: RequestMethod;
}

/**
 * mapping type def.
 */
export interface MappingDef<T = any> extends TypeDef<T>, ProtocolRouteMappingMetadata<any> {

}


