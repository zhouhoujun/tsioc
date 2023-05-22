import { Abstract, Type, TypeDef } from '@tsdi/ioc';
import { Protocol, RequestMethod } from './protocols';
import { EndpointContext } from '../endpoints/context';
import { EndpointOptions } from '../endpoints/endpoint.service';
import { Endpoint } from '../endpoints/endpoint';
import { Backend } from '../Handler';
import { Pattern } from './pattern';
import { Route } from './route';

/***
 * router
 */
@Abstract()
export abstract class Router<T = Endpoint> extends Backend<EndpointContext> {
    /**
     * route prefix.
     */
    abstract get prefix(): string;
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
     */
    abstract use(route: string, endpoint: T): this;

    /**
     * unuse route.
     * @param route The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * @param endpoint endpoint.
     */
    abstract unuse(route: string, endpoint?: T): this;
    /**
     * find route by pattern
     * @param url
     */
    abstract findRoute(pattern: Pattern): T | undefined;
}


/**
 * route options
 */
export interface RouteOptions<TArg = any> extends EndpointOptions<TArg> {
    /**
     * pipe extends args.
     */
    args?: any[];
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

export interface ProtocolRouteOptions<TArg = any> extends RouteOptions<TArg> {
    /**
     * transport protocol
     */
    protocol?: Protocol;
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
export interface ProtocolRouteMappingMetadata<TArg> extends ProtocolRouteMappingOptions<TArg> {
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


