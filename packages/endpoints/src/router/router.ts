import { Abstract, HandlerLike, ProvidedInMetadata, Type, TypeDef } from '@tsdi/ioc';
import { ApplicationInterceptor, Backend, ApplicationHandler } from '@tsdi/core';
import { Pattern, Protocols, PatternFormatter } from '@tsdi/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { Route, RouteOptions, Routes } from './route';


/**
 * route.
 */
export type RouteHanlder = HandlerLike<RequestContext> | Array<HandlerLike<RequestContext>>;


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

    abstract get routes(): Routes;

    abstract getPatterns(): string[];
    /**
     * route prefix.
     */
    abstract get prefix(): string;

    // abstract get routes(): Map<string, T>;
    /**
     * pattern formatter.
     */
    abstract get formatter(): PatternFormatter;
    // /**
    // * route matcher.
    // */
    // abstract get matcher(): RouteMatcher;
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
    abstract use(route: Pattern, endpoint: T, callback?: (route: Route) => void): this;
    /**
     * unuse route.
     * @param route The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * @param endpoint endpoint.
     */
    abstract unuse(route: Route): this;

    abstract forEach(cb: (route: Route) => void | false): void | false;

    /**
     * intercept
     * @param input 
     * @param next 
     */
    abstract intercept(input: RequestContext, next: ApplicationHandler): Observable<any>;

}


// /**
//  * math url path with register route.
//  */
// @Abstract()
// export abstract class RouteMatcher {
//     /**
//      * get register topic patterns.
//      */
//     abstract getPatterns<T = string>(): T[]

//     /**
//      * each topic patterns.
//      */
//     abstract eachPattern<T = string>(callback: (transformed: T, pattern: string) => void): void
//     /**
//      * is pattern route or not.
//      * @param route 
//      */
//     abstract isPattern(route: string): boolean;
//     /**
//      * register route matcher. 
//      * @param route The path to match against. Cannot be used together with a custom `matcher` function.
//      * A URL string that uses router matching notation.
//      * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
//      * @param params dynamic token values for route path.  
//      * 
//      * #### Examples
//      * 
//      * ```ts
//      * 'path/#'
//      * 'path/**'
//      * 'path/*'
//      * 'path/+'
//      * 'path/:id'
//      * 'path/${id}'
//      * 
//      * ```
//      *  
//      * @returns subscribe topics. 
//      */
//     abstract register(route: string, subscribe?: boolean): void;
//     /**
//      * register route matcher. 
//      * @param route The path to match against. Cannot be used together with a custom `matcher` function.
//      * A URL string that uses router matching notation.
//      * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
//      * @param params dynamic token values for route path.  
//      * 
//      * #### Examples
//      * 
//      * ```ts
//      * 'path/#'
//      * 'path/**'
//      * 'path/*'
//      * 'path/+'
//      * 'path/:id'
//      * 'path/${id}'
//      * 
//      * ```
//      *  
//      * @returns subscribe topics. 
//      */
//     abstract register(route: string, params?: Record<string, any>, subscribe?: boolean): void;

//     /**
//      * get the url path match route
//      * @param path url path
//      * @returns matched route.
//      */
//     abstract match(path: string): string | null;

//     abstract unregister(route: string): void;

//     abstract clear(): void;
// }



// /**
//  * route mapping metadata.
//  */
// export interface RouteMappingMetadata<T = any> extends RouteOptions<T> {
//     /**
//      * route.
//      *
//      * @type {Pattern}
//      * @memberof RouteMappingMetadata
//      */
//     route?: Pattern;
//     /**
//      * route `RegExp` matcher.
//      */
//     regExp?: RegExp;
//     /**
//      * request method.
//      */
//     method?: RequestMethod;
//     /**
//      * http content type.
//      *
//      * @type {string}
//      * @memberof RouteMappingMetadata
//      */
//     contentType?: string;
// }

// /**
//  * Protocol route options.
//  */
// export interface ProtocolRouteOptions<T = any> extends RouteOptions<T> {
//     /**
//      * transport protocol
//      */
//     protocol?: Protocols;
// }

/**
 * route mapping options.
 */
export interface RouteMappingOptions<T = any> extends RouteOptions<T> {
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
 * route mapping metadata.
 */
export interface RouteMappingMetadata<T = any> extends RouteMappingOptions<T>, ProvidedInMetadata {

}

/**
 * mapping type def.
 */
export interface MappingDef<T = any> extends TypeDef<T>, RouteMappingMetadata<any> {

}


