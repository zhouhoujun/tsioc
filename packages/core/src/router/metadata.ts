import {
    isArray, isString, lang, Type, isRegExp, createDecorator, OperationArgumentResolver, ActionTypes,
    ClassMethodDecorator, createParamDecorator, ParameterMetadata, ReflectiveFactory, Execption, isClassType, TypeMetadata, PatternMetadata, pomiseOf, EMPTY, isPromise, isFunction
} from '@tsdi/ioc';
import { PipeTransform } from '../pipes/pipe';
import { InterceptorType } from '../transport/endpoint';
import { InterceptorMiddleware, Middleware, MiddlewareFn } from '../transport/middleware';
import { mths, Protocols, RequestMethod } from '../transport/packet';
import { CanActivate } from '../transport/guard';
import { joinprefix, normalize, PatternFormatter, RouteFactoryResolver } from './route';
import { MappingDef, ProtocolRouteMappingMetadata, RouteMappingMetadata, Router } from './router';
import { ForbiddenExecption } from '../transport/execptions';
import { ServerEndpointContext } from '../transport/context';
import { isObservable, lastValueFrom, mergeMap, of } from 'rxjs';
import { ResultValue } from './result';


export type HandleDecorator = <TFunction extends Type<Middleware>>(target: TFunction) => TFunction | void;


/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 *
 * @export
 * @interface Handle
 */
export interface Handle {
    /**
     * Handle decorator, for class. use to define the class as route.
     *
     * @RegisterFor
     *
     * @param {route} route the route url.
     * @param options route metedata options.
     */
    (route: string, options?: {
        /**
         * route prefix.
         */
        prefix?: string;
        /**
         * version of route api.
         */
        version?: string;
        /**
         * parent router.
         */
        parent?: Router;
        /**
        * route guards.
        */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
    }): HandleDecorator;

    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {cmd?: string, pattern?: string } option message match option.
     */
    (pattern: string | RegExp, protocol?: Protocols, option?: Record<string, any>): MethodDecorator;

    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {Record<string, any> & { protocol?: Protocols }} option message match option.
     */
    (pattern: string | RegExp, option?: Record<string, any> & { protocol?: Protocols }): MethodDecorator;

    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Record<string, any> & { protocol?: Protocols, pattern?: string | RegExp }} option message match option.
     */
    (option: Record<string, any> & { protocol?: Protocols, pattern?: string | RegExp }): MethodDecorator;
}

/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 * @Handle
 * 
 * @exports {@link Handle}
 */
export const Handle: Handle = createDecorator<HandleMetadata & HandleMessagePattern>('Handle', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (parent?: Type<Router> | string | RegExp, options?: { guards?: Type<CanActivate>[], parent?: Type<Router> | string }) =>
        (isString(parent) || isRegExp(parent) ? ({ route: parent, ...options }) : ({ parent, ...options })) as HandleMetadata & HandleMessagePattern,
    def: {
        class: (ctx, next) => {
            ctx.typeRef.setAnnotation(ctx.metadata);
            return next();
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const def = ctx.typeRef;
            const metadata = def.getMetadata<HandleMetadata>(ctx.currDecor);
            const { route, prefix, version, parent, protocol, interceptors } = metadata;
            const injector = ctx.injector;

            if (!isString(route) && !parent) {
                return next();
            }

            if (isString(route)) {
                const path = joinprefix(prefix, version, route);
                const router = parent ? injector.get(parent) : injector.get(Router);
                if (!(router instanceof Router)) {
                    throw new Execption(lang.getClassName(router) + 'is not message router!');
                }
                const factory = injector.get(ReflectiveFactory).create(def, injector);
                factory.onDestroy(() => router.unuse(path));

                router.use({
                    path,
                    protocol,
                    interceptors: interceptors?.map(i => isClassType(i) ? factory.resolve(i) : i),
                    middleware: factory.resolve() as Middleware
                });
            }
            next();
        }
    },
    appendProps: (meta) => {
        meta.singleton = true;
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
     * @param {Type<Router>} [parent] the middlewares for the route.
     */
    (route: string, parent?: Type<Router>): ClassDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {Type<CanActivate>[]} [guards] the guards for the route.
     */
    (route: string, guards?: Type<CanActivate>[]): ClassMethodDecorator;

    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: {
        /**
         * version of api.
         */
        version?: string;
        /**
         * route prefix.
         */
        prefix?: string;
        /**
         * parent router.
         */
        parent?: Type<Router>;
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
        * pipes for the route.
        */
        pipes?: Type<PipeTransform>[];
    }): ClassDecorator;
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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * request contentType
         */
        contentType?: string;
        /**
         * protocol.
         */
        protocol?: Protocols;
        /**
         * request method.
         */
        method?: RequestMethod;
    }): MethodDecorator;

    /**
     * route decorator. define the controller as an route.
     *
     * @param {ProtocolRouteMappingMetadata} [metadata] route metadata.
     */
    (metadata: ProtocolRouteMappingMetadata): ClassDecorator;
    /**
     * route decorator. define the method as an route.
     *
     * @param {RouteMappingMetadata} [metadata] route metadata.
     */
    (metadata: ProtocolRouteMappingMetadata): MethodDecorator;
}


export function createMappingDecorator<T extends ProtocolRouteMappingMetadata>(name: string, controllerOnly?: boolean) {
    return createDecorator<T>(name, {
        props: (route: string, arg2?: Type<Router> | Type<CanActivate>[] | string | T) => {
            route = normalize(route);
            if (isArray(arg2)) {
                return { route, guards: arg2 } as T;
            } else if (!controllerOnly && isString(arg2)) {
                return { route, method: arg2 as RequestMethod } as T;
            } else if (lang.isBaseOf(arg2, Router)) {
                return { route, parent: arg2 } as T;
            } else {
                return { ...arg2 as T, route };
            }
        },
        def: controllerOnly ? undefined : {
            class: (ctx, next) => {
                ctx.typeRef.setAnnotation(ctx.metadata);
                return next();
            }
        },
        design: {
            afterAnnoation: (ctx, next) => {
                const def = ctx.typeRef.getAnnotation<MappingDef>();
                const { parent, version, prefix, guards: clsGuards, interceptors: clsInterceptors } = def;
                const injector = ctx.injector;
                let router: Router;
                if (parent) {
                    router = injector.get(parent);
                } else {
                    router = injector.get(Router);
                }

                if (!router) throw new Execption(lang.getClassName(parent) + 'has not registered!');
                if (!(router instanceof Router)) throw new Execption(lang.getClassName(router) + 'is not router!');

                // const factory = injector.get(ReflectiveFactory).create(def, injector);
                // const routes: string[] = [];
                // const formatter = factory.resolve(PatternFormatter);
                // def.class.methodDecors.forEach(d => {
                //     if (d.name === 'Route') {
                //         const { route, method, guards, interceptors, pipes } = d.metadata as RouteMappingMetadata;
                //         const allinterceptors = [...clsInterceptors ?? EMPTY, ...interceptors ?? EMPTY];
                //         const allguards = [...clsGuards ?? EMPTY, ...guards ?? EMPTY] as Type<CanActivate>[];
                //         const invoker = factory.createInvoker(d.propertyKey, true, async (ctx, run) => {

                //             const context = ctx instanceof ServerEndpointContext ? ctx : ctx.resolve(ServerEndpointContext);

                //             if (pipes && pipes.length) {
                //                 context.injector.inject(pipes);
                //             }

                //             if (allguards.length) {
                //                 if (!(await lang.some(
                //                     allguards.map(token => () => pomiseOf(factory.resolve(token)?.canActivate(context))),
                //                     vaild => vaild === false))) {
                //                     throw new ForbiddenExecption();
                //                 }
                //             }

                //             let result;
                //             if (allinterceptors.length) {
                //                 const inters = allinterceptors.map(i => ctx.resolve(i) ?? i);
                //                 await new InterceptorMiddleware(async c => {
                //                     result = run(c);
                //                 }, inters).invoke(context, async () => { });
                //             } else {
                //                 result = run(context);
                //             }
                //             if (isPromise(result)) {
                //                 result = await result
                //             } else if (isObservable(result)) {
                //                 result = await lastValueFrom(result)
                //             }

                //             // // middleware.
                //             // if (isFunction(result)) {
                //             //     return await result(ctx)
                //             // }

                //             // if (result instanceof ResultValue) {
                //             //     return await result.sendValue(context)
                //             // }
                //             return result

                //         });
                //         const pattern = formatter.format(route ?? '', method, prefix, version);
                //         routes.push(pattern);
                //         router.use(pattern, (c) => invoker.invoke(c))
                //     }
                // });
                // factory.onDestroy(() => routes.forEach(path => router.unuse(path)));

                const routeRef = injector.get(RouteFactoryResolver).resolve(ctx.typeRef).create(injector);
                const path = routeRef.path;
                routeRef.onDestroy(() => router.unuse(path));
                router.use(path, routeRef);

                next();
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
 * request parameter metadata.
 */
export interface RequsetParameterMetadata extends ParameterMetadata {
    /**
     * field scope.
     */
    scope?: 'body' | 'query' | 'restful';
    /**
     * field of request query params or body.
     */
    field?: string;
    /**
     * pipe
     */
    pipe?: string | Type<PipeTransform>;
    /**
     * pipe extends args
     */
    args?: any[];

}

export interface RequsetParameterDecorator {
    /**
     * Request Parameter decorator
     *
     * @param {string} field field of request query params or body.
     * @param options route metedata options.
     */
    (field?: string, option?: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Type;
        /**
         * pipes
         */
        pipe?: string | Type<PipeTransform>;
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any;

    }): ParameterDecorator;
    /**
     * Request Parameter decorator
     * @param meta.
     */
    (meta: {
        /**
         * field of request query params or body.
         */
        field?: string;
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Type;
        /**
         * pipes
         */
        pipe?: string | Type<PipeTransform>;
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any;
    }): ParameterDecorator;
}

/**
 * Request path param decorator.
 * 
 * @exports {@link RequsetParameterDecorator}
 */
export const RequestPath: RequsetParameterDecorator = createParamDecorator('RequestPath', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as RequsetParameterMetadata),
    appendProps: meta => {
        meta.scope = 'restful'
    }
});

/**
 * Request query param decorator.
 * 
 * @exports {@link RequsetParameterDecorator}
 */
export const RequestParam: RequsetParameterDecorator = createParamDecorator('RequestParam', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as RequsetParameterMetadata),
    appendProps: meta => {
        meta.scope = 'query';
    }
});

/**
 * Request body param decorator.
 * 
 * @exports {@link RequsetParameterDecorator}
 */
export const RequestBody: RequsetParameterDecorator = createParamDecorator('RequestBody', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as RequsetParameterMetadata),
    appendProps: meta => {
        meta.scope = 'body'
    }
});



/**
 * decorator used to define Request restful route mapping.
 *
 * @export
 * @interface RestController
 */
export interface RestController {
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {Type<Router>} [parent] the middlewares for the route.
     */
    (route?: string, parent?: Type<Router>): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {Type<CanActivate>[]} [guards] the guards for the route.
     */
    (route?: string, guards?: Type<CanActivate>[]): ClassMethodDecorator;

    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    (route: string, options: {
        /**
         * version of api.
         */
        version?: string;
        /**
         * route prefix.
         */
        prefix?: string;
        /**
         * parent router.
         */
        parent?: Type<Router>;
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
        * pipes for the route.
        */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
    }): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {RouteMetadata} [metadata] route metadata.
     */
    (metadata: ProtocolRouteMappingMetadata): ClassMethodDecorator;
}


/**
 * RestController decorator
 */
export const RestController: RestController = createMappingDecorator('RestController');

/**
 * Controller decorator
 * @alias of RestController
 */
export const Controller = RestController;

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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string
    }): MethodDecorator;
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
        props: (
            route: string,
            arg2?: string | { middlewares: (Middleware | MiddlewareFn)[], guards?: Type<CanActivate>[], contentType?: string, method?: string }
        ) => {
            route = normalize(route);
            return (isString(arg2) ? { route, contentType: arg2, method } : { route, ...arg2, method }) as ProtocolRouteMappingMetadata
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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string
    }): MethodDecorator;
}


/**
 * Head decorator. define the route method as head.
 *
 * @Head
 */
export const Head: HeadDecorator = createRouteDecorator(mths.HEAD);


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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string;
    }): MethodDecorator;
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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string;
    }): MethodDecorator;
}

/**
 * Get decorator. define the route method as get.
 *
 * @Get
 */
export const Get: GetDecorator = createRouteDecorator(mths.GET);



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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string;
    }): MethodDecorator;

}
/**
 * Delete decorator. define the route method as delete.
 *
 * @Delete
 */
export const Delete: DeleteDecorator = createRouteDecorator(mths.DELETE);



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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string;
    }): MethodDecorator;
}
/**
 * Patch decorator. define the route method as patch.
 *
 * @Patch
 */
export const Patch: PatchDecorator = createRouteDecorator(mths.PATCH);




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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string;
    }): MethodDecorator;
}
/**
 * Post decorator. define the route method as post.
 *
 * @Post
 */
export const Post: PostDecorator = createRouteDecorator(mths.POST);



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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * interceptors of route.
         */
        interceptors?: InterceptorType[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * pipe extends args.
         */
        args?: any[];
        /**
         * request contentType
         */
        contentType?: string;
    }): MethodDecorator;
}
/**
 * Put decorator. define the route method as put.
 *
 * @Put
 */
export const Put: PutDecorator = createRouteDecorator(mths.PUT);



/**
 * handle message pattern.
 */
export interface HandleMessagePattern {
    /**
     * message handle pattern for route mapping.
     */
    route?: string | RegExp;
    /**
     * message handle command for route mapping.
     */
    cmd?: string;
}

/**
 * Handle metadata. use to define the class as handle handle register in global handle queue.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface HandleMetadata extends TypeMetadata, PatternMetadata {
    /**
     * handle route
     */
    route?: string;
    /**
     * version of api.
     */
    version?: string;
    /**
     * route prefix.
     */
    prefix?: string;
    /**
     * route guards.
     */
    guards?: Type<CanActivate>[];
    /**
     * interceptors of route.
     */
    interceptors?: InterceptorType[];
    /**
     * handle parent.
     * default register in root handle queue.
     */
    parent?: Type<Router>;

    /**
     * transport protocol
     */
    protocol?: Protocols;
}
