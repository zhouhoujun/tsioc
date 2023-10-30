import { Abstract, Token, Type, TypeDef } from '@tsdi/ioc';
import { Endpoint, EndpointOptions, Interceptor, Backend, Handler } from '@tsdi/core';
import { Transport, RequestMethod, Pattern } from '@tsdi/common';
import { Observable } from 'rxjs';
import { TransportContext } from '../TransportContext';
import { Route } from './route';

/**
 * router
 * 
 * public api for global router
 */
@Abstract()
export abstract class Router<T = Endpoint> implements Backend<TransportContext>, Interceptor<TransportContext> {
    
    abstract handle(input: TransportContext): Observable<any>;
    /**
     * route prefix.
     */
    abstract get prefix(): string;

    abstract get routes(): Map<string, T>;
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
    abstract intercept(input: TransportContext, next: Handler): Observable<any>;

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
export interface RouteOptions<TArg = any> extends EndpointOptions<TArg> {
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
export interface RouteMappingMetadata<TArg = any> extends RouteOptions<TArg> {
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
export interface ProtocolRouteOptions<TArg = any> extends RouteOptions<TArg> {
    /**
     * transport protocol
     */
    protocol?: Transport;
}

/**
 * Protocol route mapping options.
 */
export interface ProtocolRouteMappingOptions<TArg = any> extends ProtocolRouteOptions<TArg> {
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
export interface ProtocolRouteMappingMetadata<TArg = any> extends ProtocolRouteMappingOptions<TArg> {
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


