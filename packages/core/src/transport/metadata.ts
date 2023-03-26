import {
    isArray, isString, isType, lang, Type, isRegExp, createDecorator, ActionTypes, Execption,
    ClassMethodDecorator, createParamDecorator, ReflectiveFactory, TypeMetadata, PatternMetadata, TypeOf
} from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes/pipe';
import { joinprefix, normalize } from './route';
import { MappingDef, ProtocolRouteMappingMetadata, ProtocolRouteMappingOptions, RouteMappingMetadata, RouteOptions, Router } from './router';
import { DELETE, GET, HEAD, PATCH, POST, Protocols, PUT, RequestMethod } from './protocols';
import { Middleware, MiddlewareFn } from './middleware';
import { TransportParameterDecorator } from '../metadata';
import { TransportParameter } from '../endpoints/resolver';



export type HandleDecorator = <TFunction extends Type<Middleware>>(target: TFunction) => TFunction | void;


/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 *
 * @export
 * @interface Handle
 */
export interface Handle {
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {cmd?: string, pattern?: string } option message match option.
     */
    <TArg>(pattern: string | RegExp, protocol?: Protocols, option?: RouteOptions<TArg>): MethodDecorator;

    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {Record<string, any> & { protocol?: Protocols }} option message match option.
     */
    <TArg>(pattern: string | RegExp, option?: RouteOptions<TArg>): MethodDecorator;

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
export const Handle: Handle = createDecorator<HandleMetadata<any> & HandleMessagePattern>('Handle', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (parent?: Type<Router> | string | RegExp, options?: { guards?: Type<CanActivate>[], parent?: Type<Router> | string }) =>
        (isString(parent) || isRegExp(parent) ? ({ route: parent, ...options }) : ({ parent, ...options })) as HandleMetadata<any> & HandleMessagePattern,
    def: {
        class: (ctx, next) => {
            ctx.class.setAnnotation(ctx.define.metadata);
            return next();
        }
    },
    design: {
        method: (ctx, next) => {
            const def = ctx.class;
            const metadatas = def.getMetadatas<HandleMetadata<any>>(ctx.currDecor);

            const injector = ctx.injector;
            const factory = injector.get(ReflectiveFactory).create(def, injector);

            metadatas.forEach(metadata => {

                const { route, prefix, version, router, protocol, interceptors } = metadata;

                if (!isString(route) && !router) {
                    return next();
                }

                if (isString(route)) {
                    const path = joinprefix(prefix, version, route);
                    const routerInst = router ? injector.get(router) : injector.get(Router);
                    if (!(router instanceof Router)) {
                        throw new Execption(lang.getClassName(router) + 'is not message router!');
                    }
                    factory.onDestroy(() => router.unuse(path));
                    routerInst.use({
                        path,
                        protocol,
                        interceptors: interceptors?.map(i => isType(i) ? factory.resolve(i) : i),
                        middleware: factory.getInstance() as Middleware
                    });
                }
            })
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
    (route: string, parent?: TypeOf<Router>): ClassDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {Type<CanActivate>[]} [guards] the guards for the route.
     */
    (route: string, guards?: TypeOf<CanActivate>[]): ClassMethodDecorator;

    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    <TArg>(route: string, options: ProtocolRouteMappingOptions<TArg>): ClassDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;

    /**
     * route decorator. define the controller as an route.
     *
     * @param {ProtocolRouteMappingMetadata} [metadata] route metadata.
     */
    <TArg>(metadata: ProtocolRouteMappingMetadata<TArg>): ClassDecorator;
    /**
     * route decorator. define the method as an route.
     *
     * @param {RouteMappingMetadata} [metadata] route metadata.
     */
    <TArg>(metadata: RouteMappingMetadata<TArg>): MethodDecorator;
}


export function createMappingDecorator<T extends ProtocolRouteMappingMetadata<any>>(name: string, controllerOnly?: boolean) {
    return createDecorator<T>(name, {
        props: (route: string, arg2?: Type<Router> | Type<CanActivate>[] | string | T) => {
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
        def: controllerOnly ? undefined : {
            class: (ctx, next) => {
                ctx.class.setAnnotation(ctx.define.metadata);
                return next();
            }
        },
        design: {
            afterAnnoation: (ctx, next) => {
                const def = ctx.class.getAnnotation<MappingDef>();
                const { router: CustomRouter, version, prefix, guards, interceptors } = def;
                const injector = ctx.injector;
                let router: Router;
                if (CustomRouter) {
                    router = injector.get(CustomRouter);
                } else {
                    router = injector.get(Router);
                }

                if (!router) throw new Execption(lang.getClassName(parent) + 'has not registered!');
                if (!(router instanceof Router)) throw new Execption(lang.getClassName(router) + 'is not router!');

                // const factory = injector.get(ReflectiveFactory).create(ctx.class, injector);
                // const routes: string[] = [];
                // const formatter = factory.resolve(PatternFormatter);
                // ctx.class.methodDecors
                //     .filter(m => m && isString((m.metadata as RouteMappingMetadata).route))
                //     .sort((ra, rb) => ((rb.metadata as RouteMappingMetadata).route || '').length - ((ra.metadata as RouteMappingMetadata).route || '').length)
                //     .forEach(d => {
                //         if (d.name === 'Route') {
                //             const { route, method, guards, interceptors, pipes } = d.metadata as RouteMappingMetadata;
                //             const allinterceptors = [...interceptors ?? EMPTY, ...interceptors ?? EMPTY];
                //             const allguards = [...clsGuards ?? EMPTY, ...guards ?? EMPTY] as Type<CanActivate>[];
                //             const invoker = factory.createInvoker(d.propertyKey, async (ctx, run) => {

                //                 const context = ctx instanceof ServerEndpointContext ? ctx : ctx.resolve(ServerEndpointContext);

                //                 if (pipes && pipes.length) {
                //                     context.injector.inject(pipes);
                //                 }

                //                 if (allguards.length) {
                //                     if (!(await lang.some(
                //                         allguards.map(token => () => pomiseOf(factory.resolve(token)?.canActivate(context))),
                //                         vaild => vaild === false))) {
                //                         throw new ForbiddenExecption();
                //                     }
                //                 }

                //                 let result;
                //                 if (allinterceptors.length) {
                //                     const inters = allinterceptors.map(i => ctx.resolve(i) ?? i);
                //                     await new InterceptorMiddleware(async c => {
                //                         result = run(c);
                //                     }, inters).invoke(context, async () => { });
                //                 } else {
                //                     result = run(context);
                //                 }
                //                 if (isPromise(result)) {
                //                     result = await result
                //                 } else if (isObservable(result)) {
                //                     result = await lastValueFrom(result)
                //                 }

                //                 // // middleware.
                //                 // if (isFunction(result)) {
                //                 //     return await result(ctx)
                //                 // }

                //                 // if (result instanceof ResultValue) {
                //                 //     return await result.sendValue(context)
                //                 // }
                //                 return result

                //             });
                //             const pattern = formatter.format(route ?? '', method, prefix, version);
                //             routes.push(pattern);
                //             router.use(pattern, (c) => invoker.invoke(c))
                //         }
                //     });
                // factory.onDestroy(() => routes.forEach(path => router.unuse(path)));

                // const routeRef = injector.get(RouteFactoryResolver).resolve(ctx.class).create(injector);
                // const path = routeRef.path;
                // routeRef.onDestroy(() => router.unuse(path));
                // router.use(path, routeRef);

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
 * Request path param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestPath: TransportParameterDecorator = createParamDecorator('RequestPath', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        meta.scope = 'param'
    }
});

/**
 * Request query param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestParam: TransportParameterDecorator = createParamDecorator('RequestParam', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
        meta.scope = 'query';
    }
});

/**
 * Request body param decorator.
 * 
 * @exports {@link TransportParameterDecorator}
 */
export const RequestBody: TransportParameterDecorator = createParamDecorator('RequestBody', {
    props: (field: string, pipe?: { pipe: string | Type<PipeTransform>, args?: any[], defaultValue?: any }) => ({ field, ...pipe } as TransportParameter),
    appendProps: meta => {
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
    (route?: string, parent?: TypeOf<Router>): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {TypeOf<CanActivate>[]} [guards] the guards for the route.
     */
    (route?: string, guards?: TypeOf<CanActivate>[]): ClassMethodDecorator;

    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param options route metedata options.
     */
    <TArg>(route: string, options: ProtocolRouteMappingOptions<TArg>): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {RouteMetadata} [metadata] route metadata.
     */
    <TArg>(metadata: ProtocolRouteMappingMetadata<TArg>): ClassMethodDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
}


/**
 * create route decorator.
 *
 * @export
 * @template T
 * @param {RequestMethod} [method]
 * @param { MetadataExtends<T>} [metaExtends]
 */
export function createRouteDecorator<TArg>(method: RequestMethod) {
    return createDecorator<RouteMappingMetadata<TArg>>('Route', {
        props: (
            route: string,
            arg2?: string | { middlewares: (Middleware | MiddlewareFn)[], guards?: Type<CanActivate>[], contentType?: string, method?: string }
        ) => {
            route = normalize(route);
            return (isString(arg2) ? { route, contentType: arg2, method } : { route, ...arg2, method }) as ProtocolRouteMappingMetadata<TArg>
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;

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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
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
    <TArg>(route: string, options: RouteOptions<TArg>): MethodDecorator;
}
/**
 * Put decorator. define the route method as put.
 *
 * @Put
 */
export const Put: PutDecorator = createRouteDecorator(PUT);



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
export interface HandleMetadata<TArg> extends TypeMetadata, PatternMetadata, RouteOptions<TArg> {
    /**
     * handle route
     */
    route?: string;

    router?: Type<Router>;

    /**
     * version of api.
     */
    version?: string;
    /**
     * route prefix.
     */
    prefix?: string;

    /**
     * protocol
     */
    protocol?: string;
}
