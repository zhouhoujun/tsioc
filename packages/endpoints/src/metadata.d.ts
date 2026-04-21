import { AbstractType, ClassMethodDecorator, AnnotationMetadata, Handler, TokenOf } from '@tsdi/ioc';
import { CanHandle, TransportParameterDecorator, GuardLike } from '@tsdi/core';
import { Pattern, RequestMethod, Transport } from '@tsdi/common';
import { RouteOptions } from './router/route';
import { RouteMappingMetadata, RouteMappingOptions, Router } from './router/router';
export { Topic, Payload } from '@tsdi/core';
/**
 * Subscribe decorator, use to handle subscribe message event.
 *
 * @export
 * @interface Subscribe
 */
export interface Subscribe {
    /**
     * Subscribe handle. use to handle subscribe message event.
     *
     * @param {string} topic message match pattern.
     * @param {RouteOptions} option message match option.
     */
    (topic: string, option?: RouteOptions): MethodDecorator;
    /**
     * Subscribe handle. use to handle subscribe message event.
     *
     * @param {string} topic message match pattern.
     * @param {RouteOptions} option message match option.
     */
    (topic: string, transport?: Transport, option?: RouteOptions): MethodDecorator;
}
/**
 * Subscribe decorator, use to handle subscribe message event.
 * @Handle
 *
 * @exports {@link Handle}
 */
export declare const Subscribe: Subscribe;
export type HandleDecorator = <TFunction extends AbstractType<Handler>>(target: TFunction) => TFunction | void;
/**
 * Handle decorator. use to define the class as middleware or define method as message handler.
 *
 * @export
 * @interface Handle
 */
export interface Handle {
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {RouteMappingMetadata} option message match option.
     */
    (option: RouteMappingMetadata): HandleDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {RouteOptions} option message match option.
     */
    (pattern: Pattern, option?: RouteOptions): MethodDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Pattern} pattern message match pattern.
     * @param {Transport} transport message transport.
     * @param {Omit<RouteOptions, 'transport'>} option message match option.
     */
    (pattern: Pattern, transport?: Transport, option?: Omit<RouteOptions, 'transport'>): MethodDecorator;
}
/**
 * Handle decorator. use to define the class as middleware or define method as message handler.
 * @Handle
 *
 * @exports {@link Handle}
 */
export declare const Handle: Handle;
/**
 * decorator used to define Request route mapping.
 *
 * @export
 * @interface RouteMapping
 */
export interface RouteMapping {
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {AbstractType<Router>} [parent] the middlewares for the route.
     */
    (route: string, parent?: Exclude<TokenOf<Router>, string>): ClassDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {AbstractType<CanHandle>[]} [guards] the guards for the route.
     */
    (route: string, guards?: TokenOf<CanHandle>[]): ClassMethodDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteMappingMetadata): ClassDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {RequestMethod} [method] set request method.
     */
    (route: string, method: RequestMethod): MethodDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
    /**
     * route decorator. define the controller as an route.
     *
     * @param {RouteMappingMetadata} [metadata] route metadata.
     */
    (metadata: RouteMappingMetadata): ClassDecorator;
    /**
     * route decorator. define the method as an route.
     *
     * @param {RouteMappingMetadata} [metadata] route metadata.
     */
    (metadata: RouteMappingMetadata): MethodDecorator;
}
export declare function createMappingDecorator<T extends RouteMappingMetadata<any>>(name: string, controllerOnly?: boolean): any;
/**
 * RouteMapping decorator
 *
 * @exports  {@link RouteMapping}
 */
export declare const RouteMapping: RouteMapping;
/**
 * Request header param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
export declare const RequestHeader: TransportParameterDecorator;
/**
 * Request path param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
export declare const RequestPath: TransportParameterDecorator;
/**
 * Request query param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
export declare const RequestParam: TransportParameterDecorator;
/**
 * Request body param decorator.
 *
 * @exports {@link TransportParameterDecorator}
 */
export declare const RequestBody: TransportParameterDecorator;
/**
 * decorator used to define Request restful route mapping.
 *
 * @export
 * @interface Controller
 */
export interface Controller {
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     */
    (route?: string, parent?: AbstractType<Router>): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {TokenOf<GuardLike>[]} [guards] the guards for the route.
     */
    (route?: string, guards?: TokenOf<GuardLike>[]): ClassMethodDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: Omit<RouteMappingOptions, 'route' | 'response'>): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {RouteMetadata} [metadata] route metadata.
     */
    (metadata: Omit<RouteMappingOptions, 'response'>): ClassMethodDecorator;
}
/**
 * Controller decorator
 */
export declare const Controller: Controller;
/**
 * RestController decorator
 * @alias of Controller
 */
export declare const RestController: Controller;
/**
 * custom define Request method. route decorator type define.
 *
 * @export
 */
export interface RouteMethodDecorator {
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     */
    (route: string, contentType?: string): MethodDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * create route decorator.
 *
 * @export
 * @template T
 * @param {RequestMethod} [method]
 * @param { MetadataExtends<T>} [metaExtends]
 */
export declare function createRouteDecorator(method: RequestMethod): any;
/**
 * Head decorator. define the route method as head.
 *
 * @Head
 *
 * @export
 * @interface HeadDecorator
 */
export interface HeadDecorator {
    /**
     * Head decorator. define the controller method as head route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route?: string, contentType?: string): MethodDecorator;
    /**
     * Head decorator. define the controller method as head route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Head decorator. define the route method as head.
 *
 * @Head
 */
export declare const Head: HeadDecorator;
/**
 * Options decorator. define the route method as an options.
 *
 * @Options
 */
export interface OptionsDecorator {
    /**
     * Options decorator. define the controller method as options route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route?: string, contentType?: string): MethodDecorator;
    /**
     * Options decorator. define the controller method as options route.
     *
     * @param {string} route route sub path.
     * @param options route metadata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Options decorator. define the route method as an options.
 *
 * @Options
 */
export declare const Options: OptionsDecorator;
/**
 * Get decorator. define the route method as get.
 *
 * @Get
 */
export interface GetDecorator {
    /**
     * Get decorator. define the controller method as get route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route?: string, contentType?: string): MethodDecorator;
    /**
     * Get decorator. define the controller method as get route.
     *
     * @param {string} route route sub path.
     * @param options route metadata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Get decorator. define the route method as get.
 *
 * @Get
 */
export declare const Get: GetDecorator;
/**
 * Delete decorator. define the route method as delete.
 *
 * @Delete
 */
export interface DeleteDecorator {
    /**
     * Delete decorator. define the controller method as delete route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route: string, contentType?: string): MethodDecorator;
    /**
     * Delete decorator. define the controller method as delete route.
     *
     * @param {string} route route sub path.
     * @param options route metadata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Delete decorator. define the route method as delete.
 *
 * @Delete
 */
export declare const Delete: DeleteDecorator;
/**
 * Patch decorator. define the route method as an Patch.
 *
 * @Patch
 */
export interface PatchDecorator {
    /**
     * Patch decorator. define the controller method as patch route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route: string, contentType?: string): MethodDecorator;
    /**
     * Patch decorator. define the controller method as patch route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Patch decorator. define the route method as patch.
 *
 * @Patch
 */
export declare const Patch: PatchDecorator;
/**
 * Post decorator. define the route method as an Post.
 *
 * @Post
 */
export interface PostDecorator {
    /**
     * Post decorator. define the controller method as post route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route?: string, contentType?: string): MethodDecorator;
    /**
     * Post decorator. define the controller method as post route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Post decorator. define the route method as post.
 *
 * @Post
 */
export declare const Post: PostDecorator;
/**
 * Put decorator. define the route method as an Put.
 *
 * @Put
 */
export interface PutDecorator {
    /**
     * Put decorator. define the controller method as put route.
     *
     * @param {string} route route sub path.
     * @param {string} [contentType] set request contentType.
     */
    (route?: string, contentType?: string): MethodDecorator;
    /**
     * Put decorator. define the controller method as put route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: RouteOptions): MethodDecorator;
}
/**
 * Put decorator. define the route method as put.
 *
 * @Put
 */
export declare const Put: PutDecorator;
/**
 * Handle metadata. use to define the class as handle handle register in global handle queue.
 *
 * @export
 * @interface RegisterForMetadata
 */
export interface HandleMetadata<TArg = any> extends AnnotationMetadata, RouteOptions<TArg> {
    /**
     * handle route
     */
    route?: Pattern;
    router?: AbstractType<Router>;
    /**
     * version of api.
     */
    version?: string;
    /**
     * route prefix.
     */
    prefix?: string;
    /**
     * transport protocol
     */
    transport?: Transport;
}
