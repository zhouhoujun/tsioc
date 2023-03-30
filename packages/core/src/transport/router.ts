import { Abstract, Type, TypeDef } from '@tsdi/ioc';
import { Protocols, RequestMethod } from './protocols';
import { EndpointOptions } from '../EndpointService';
import { EndpointContext } from '../endpoints/context';
import { Endpoint } from '../Endpoint';
import { Backend } from '../Handler';
import { Pattern } from './pattern';

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
     * routes.
     */
    abstract get routes(): Map<string, T>;

    /**
     * has route or not.
     * @param route route
     */
    abstract has(route: string): boolean;
    /**
     * use route.
     * @param route
     * @param endpoint endpoint. 
     */
    abstract use(route: string, endpoint: T): this;

    /**
     * unuse route.
     * @param route 
     */
    abstract unuse(route: string): this;
}


/**
 * route options
 */
export interface RouteOptions<TArg = any> extends EndpointOptions<TArg> {
    /**
     * protocol
     */
    protocol?: Protocols | string;
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
 * Protocol route mapping options.
 */
export interface ProtocolRouteMappingOptions<TArg = any> extends RouteOptions<TArg> {
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


