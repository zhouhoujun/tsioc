import {
    isArray, isString, lang, AbstractType, TypeOf, createDecorator, InjectFlags,
    ClassMethodDecorator, createParamDecorator, Exception, isMetadataObject,
    AnnotationMetadata, Handler, Type, ActionType,
    getTypeName,
    isNumber
} from '@tsdi/ioc';
import { CanHandle, PipeTransform, TransportParameterDecorator, TransportParameter, GuardLike, typeResolveInterceptor } from '@tsdi/core';
import { joinPath, normalize, DELETE, GET, HEAD, PATCH, POST, Pattern, PUT, RequestMethod, Transport } from '@tsdi/common';
import { Route, RouteOptions } from './router/route';
import { MappingDef, RouteMappingMetadata, RouteMappingOptions, Router } from './router/router';
import { Middleware, MiddlewareFn } from './middleware/middleware';
import { createRouteHandler } from './impl/route.handler';
import { getRouter } from './router/router.providers';

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
export const Subscribe: Subscribe = createDecorator<HandleMetadata>('Subscribe', {
    actionType: ActionType.annoation | ActionType.runnable,
    props: (route: string, arg1?: Transport | RouteOptions, option?: RouteOptions) =>
        (isNumber(arg1) ? ({ route, transport: arg1, ...option }) : ({ route, ...arg1 })) as HandleMetadata,
    design: {
        method: (typeRef, ctx) => {

            const defines = typeRef.getDefines<HandleMetadata>(ctx.currDecor!);
            if (!defines || !defines.length) return;

            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);

            defines.forEach(def => {
                const metadata = def.metadata;
                const router = getRouter(injector, metadata.transport, true);

                const prefix = joinPath(metadata.prefix, metadata.version);
                const path = router.formatter.format(metadata.route!);
                const handler = createRouteHandler(invocation, { ...metadata, path, prefix }, def.propertyKey);
                const route = {
                    prefix,
                    path,
                    pattern: metadata.route,
                    paths: metadata.paths,
                    handler
                } as Route;
                router.use(route);
                invocation.onDestroy(() => router.unuse(route));
            });
        }
    }
});

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
export const Handle: Handle = createDecorator<HandleMetadata<any>>('Handle', {
    actionType: ActionType.annoation | ActionType.runnable,
    isMatadata: (args) => {
        return isMetadataObject(args) && isString(args.route)
    },
    appendProps: (meta) => {
        if (!meta.resolvers) {
            meta.resolvers = [];
        }
        meta.resolvers.push(typeResolveInterceptor);
    },
    props: (route: Pattern, arg1?: Transport | RouteOptions, option?: RouteOptions) =>
        (isNumber(arg1) ? ({ route, transport: arg1, ...option }) : ({ route, ...arg1 })) as HandleMetadata<any>,
    def: {
        class: (ctx) => {
            ctx.classRef.assignAnnotation(ctx.define.metadata);
        }
    },
    design: {
        method: (typeRef, ctx) => {

            const defines = typeRef.getDefines<HandleMetadata>(ctx.currDecor!);
            if (!defines || !defines.length) return;

            const injector = ctx.injector;
            const invocation = typeRef.createInvocation(injector);

            defines.forEach(def => {
                const metadata = def.metadata;
                const router = getRouter(injector, metadata.transport, true);

                const prefix = joinPath(metadata.prefix, metadata.version);
                if (!router || !(router instanceof Router)) throw new Exception(metadata.transport + ' microservice router has not register.');
                const path = router.formatter.format(metadata.route!);
                const handler = createRouteHandler(invocation, { ...metadata, path, prefix }, def.propertyKey);
                const route = {
                    prefix,
                    path,
                    pattern: metadata.route,
                    paths: metadata.paths,
                    handler
                } as Route;
                router.use(route);
                invocation.onDestroy(() => router.unuse(route));
            });
        },

        afterAnnoation: (typeRef, ctx) => {
            const mapping = typeRef.getAnnotation<MappingDef>();
            const injector = ctx.injector;
            const type = typeRef.type as Type<Handler>;

            const router = mapping.router ? injector.get(mapping.router) : getRouter(injector, mapping.transport);
            const route = mapping.route;
            if (!route) throw new Exception(getTypeName(typeRef.type) + ' has not route!');
            if (!router) throw new Exception(getTypeName(parent) + ' has not registered!');
            if (!(router instanceof Router)) throw new Exception(getTypeName(router) + ' is not router!');

            router.use({
                prefix: joinPath(mapping.prefix, mapping.version),
                path: router.formatter.format(route),
                pattern: mapping.route,
                paths: mapping.paths,
                handle: (input, ctx) => {
                    return injector.get(type).handle(input, ctx);
                },
                handler: type
            });
        }
    }
});


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
    (route: string, parent?: TypeOf<Router>): ClassDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {AbstractType<CanHandle>[]} [guards] the guards for the route.
     */
    (route: string, guards?: TypeOf<CanHandle>[]): ClassMethodDecorator;

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


export function createMappingDecorator<T extends RouteMappingMetadata<any>>(name: string, controllerOnly?: boolean) {
    return createDecorator<T>(name, {
        props: (route: string, arg2?: AbstractType<Router> | AbstractType<CanHandle>[] | string | T) => {
            route = normalize(route);
            if (isArray(arg2)) {
                return { route, guards: arg2 } as T;
            } else if (!controllerOnly && isString(arg2)) {
                return { route, method: arg2 as RequestMethod } as T;
            } else if (lang.isBaseOf(arg2, Router)) {
                return { route, router: arg2 } as T;
            } else {
                return { ...arg2 as T, route };
            }
        },
        appendProps: (meta) => {
            if (!meta.resolvers) {
                meta.resolvers = [];
            }
            meta.resolvers.push(typeResolveInterceptor);
        },
        def: controllerOnly ? undefined : {
            class: (ctx) => {
                ctx.classRef.assignAnnotation(ctx.define.metadata);
            }
        },
        design: {
            afterAnnoation: (typeRef, ctx) => {

                const injector = ctx.injector;
                const mapping = typeRef.getAnnotation<MappingDef>();

                const router = mapping.router ? injector.get(mapping.router) : getRouter(injector, mapping.transport);
                if (!router) throw new Exception(getTypeName(parent) + 'has not registered!');
                if (!(router instanceof Router)) throw new Exception(getTypeName(router) + 'is not router!');

                const route = {
                    prefix: joinPath(mapping.prefix, mapping.version),
                    path: router.formatter.format(mapping.route!),
                    pattern: mapping.route,
                    controller: typeRef.createInvocation(injector)
                };
                router.use(route);
                route.controller.onDestroy(() => {
                    router.unuse(route);
                });
            }
        }
    });
}

/**
 * RouteMapping decorator
 * 
 * @exports  {@link RouteMapping}
 */
export const RouteMapping: RouteMapping = createMappingDecorator('RouteMapping');

/**
 * Request header param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestHeader: TransportParameterDecorator = createParamDecorator('RequestHeader', {
    actionType: ActionType.inject,
    props: (field: string, pipe?: { pipe: string | AbstractType<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= InjectFlags.Request;
        } else {
            meta.flags = InjectFlags.Request;
        }
        meta.scope = 'headers'
    }
});


/**
 * Request path param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestPath: TransportParameterDecorator = createParamDecorator('RequestPath', {
    actionType: ActionType.inject,
    props: (field: string, pipe?: { pipe: string | AbstractType<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= InjectFlags.Request;
        } else {
            meta.flags = InjectFlags.Request;
        }
        meta.scope = 'path'
    }
});

/**
 * Request query param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestParam: TransportParameterDecorator = createParamDecorator('RequestParam', {
    actionType: ActionType.inject,
    props: (field: string, pipe?: { pipe: string | AbstractType<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= InjectFlags.Request;
        } else {
            meta.flags = InjectFlags.Request;
        }
        meta.scope = 'query';
    }
});

/**
 * Request body param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestBody: TransportParameterDecorator = createParamDecorator('RequestBody', {
    actionType: ActionType.inject,
    props: (field: string, pipe?: { pipe: string | AbstractType<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        if (meta.flags) {
            meta.flags |= InjectFlags.Request;
        } else {
            meta.flags = InjectFlags.Request;
        }
        meta.scope = 'body'
    }
});

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
     * @param {TypeOf<Router>} [parent] the middlewares for the route.
     */
    (route?: string, parent?: AbstractType<Router>): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {TypeOf<GuardLike>[]} [guards] the guards for the route.
     */
    (route?: string, guards?: TypeOf<GuardLike>[]): ClassMethodDecorator;

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
export const Controller: Controller = createMappingDecorator('Controller');

/**
 * RestController decorator
 * @alias of Controller
 */
export const RestController = Controller;

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
export function createRouteDecorator(method: RequestMethod) {
    return createDecorator<RouteMappingMetadata>('Route', {
        appendProps: (meta) => {
            if (!meta.resolvers) {
                meta.resolvers = [];
            }
            meta.resolvers.push(typeResolveInterceptor);
        },
        props: (
            route: string,
            arg2?: string | { middlewares: (Middleware | MiddlewareFn)[], guards?: AbstractType<CanHandle>[], contentType?: string, method?: string }
        ) => {
            route = normalize(route);
            return (isString(arg2) ? { route, contentType: arg2, method } : { route, ...arg2, method }) as RouteMappingMetadata
        }
    });
}


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
export const Head: HeadDecorator = createRouteDecorator(HEAD);


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
export const Options: OptionsDecorator = createRouteDecorator('OPTIONS');


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
export const Get: GetDecorator = createRouteDecorator(GET);



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
export const Delete: DeleteDecorator = createRouteDecorator(DELETE);



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
export const Patch: PatchDecorator = createRouteDecorator(PATCH);




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
export const Post: PostDecorator = createRouteDecorator(POST);



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
export const Put: PutDecorator = createRouteDecorator(PUT);



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

