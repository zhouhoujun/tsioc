import { Abstract, HandlerLike, ProvidedInMetadata, AbstractType, TypeDef } from '@tsdi/ioc';
import { Interceptor, Backend, Handler } from '@tsdi/core';
import { Pattern, Protocols, PatternFormatter } from '@tsdi/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { AssetRoute, Route, RouteOptions, Routes } from './route';


/**
 * route.
 */
export type RouteHanlder = HandlerLike<RequestContext> | Array<HandlerLike<RequestContext>>;


export interface RoutePatterns {
    /**
     * all route path 
     */
    routes: string[];
    /**
     * all route path without wildcard
     */
    paths: string[];
    /**
     * all route path with wildcard
     */
    patterns: string[];
    /**
     * all route path with wildcard regexp
     */
    regExps: RegExp[];
}

/**
 * router
 * 
 * public api for global router
 */
@Abstract()
export abstract class Router<T = RouteHanlder> implements Backend<RequestContext>, Interceptor<RequestContext> {
    /**
     * protocol
     */
    abstract get protocol(): Protocols | null;

    asDefault?: boolean;

    abstract handle(input: RequestContext): Observable<any>;

    abstract get routes(): Routes;

    abstract getPatterns(): RoutePatterns;
    /**
     * route prefix.
     */
    abstract get prefix(): string;

    // abstract get routes(): Map<string, T>;
    /**
     * pattern formatter.
     */
    abstract get formatter(): PatternFormatter;
    /**
     * use route.
     * @param route 
     */
    abstract use(route: AssetRoute): this;
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

    /**
     * intercept
     * @param input 
     * @param next 
     */
    abstract intercept(input: RequestContext, next: Handler): Observable<any>;

}


/**
 * route mapping options.
 */
export interface RouteMappingOptions<T = any> extends RouteOptions<T> {
    /**
     * parent router.
     * default register in root handle queue.
     */
    router?: AbstractType<Router>;
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


