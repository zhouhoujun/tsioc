import {
    isArray, isString, lang, Type, isRegExp, createDecorator, ActionTypes, PatternMetadata,
    ClassMethodDecorator, createParamDecorator, TypeMetadata, TypeOf, Execption, isMetadataObject
} from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes/pipe';
import { TransportParameterDecorator } from '../metadata';
import { TransportParameter } from '../endpoints/resolver';
import { joinprefix, normalize } from './route';
import { MappingDef, ProtocolRouteMappingMetadata, ProtocolRouteMappingOptions, ProtocolRouteOptions, RouteMappingMetadata, RouteOptions, Router } from './router';
import { DELETE, GET, HEAD, PATCH, POST, Protocol, PUT, RequestMethod } from './protocols';
import { Middleware, MiddlewareFn } from './middleware';
import { RouteEndpointFactoryResolver } from './route.endpoint';
import { Pattern, patternToPath } from './pattern';
import { ControllerRouteReolver } from './controller';



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
     * @param {Record<string, any> & { protocol?: Protocols }} option message match option.
     */
    (topic: string, option?: RouteOptions): MethodDecorator;
    /**
     * Subscribe handle. use to handle subscribe message event.
     *
     * @param {string} topic message match pattern.
     * @param {Record<string, any> & { protocol?: Protocols }} option message match option.
     */
    (topic: string, protocol?: Protocol, option?: RouteOptions): MethodDecorator;
}

/**
 * Subscribe decorator, use to handle subscribe message event.
 * @Handle
 * 
 * @exports {@link Handle}
 */
export const Subscribe: Subscribe = createDecorator<HandleMetadata<any>>('Subscribe', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (route: string, arg1?: Protocol | ProtocolRouteOptions, option?: RouteOptions) =>
        (isString(arg1) ? ({ route, protocol: arg1, ...option }) : ({ route, ...arg1 })) as HandleMetadata<any>,
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString());
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;
            const mapping = ctx.class.getAnnotation<MappingDef>();

            const router = injector.get(mapping.router ?? Router);
            if (!router) throw new Execption('has no router!');
            if (!(router instanceof Router)) throw new Execption(lang.getClassName(router) + 'is not router!');

            const prefix = joinprefix(mapping.prefix, mapping.version, mapping.route);
            const factory = injector.get(RouteEndpointFactoryResolver).resolve(ctx.class, injector);

            defines.forEach(def => {
                const metadata = def.metadata as RouteMappingMetadata;
                const route = normalize(patternToPath(metadata.route!));
                const endpoint = factory.create(def.propertyKey, { ...metadata, prefix });
                router.use(route, endpoint);
                factory.onDestroy(() => router.unuse(route));
            });

            return next();
        }
    }
});

export type HandleDecorator = <TFunction extends Type<Middleware>>(target: TFunction) => TFunction | void;

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
    (option: ProtocolRouteMappingMetadata): HandleDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {ProtocolRouteOptions} option message match option.
     */
    (pattern: Pattern, option?: ProtocolRouteOptions): MethodDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Pattern} pattern message match pattern.
     * @param {cmd?: string, pattern?: string } option message match option.
     */
    (pattern: Pattern, protocol?: Protocol, option?: RouteOptions): MethodDecorator;
}

/**
 * Handle decorator. use to define the class as middleware or define method as message handler.
 * @Handle
 * 
 * @exports {@link Handle}
 */
export const Handle: Handle = createDecorator<HandleMetadata<any>>('Handle', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    isMatadata: (args) => {
        return isMetadataObject(args) && isString(args.route)
    },
    props: (route: Pattern, arg1?: Protocol | ProtocolRouteOptions, option?: RouteOptions) =>
        (isString(arg1) ? ({ route, protocol: arg1, ...option }) : ({ route, ...arg1 })) as HandleMetadata<any>,
    def: {
        class: (ctx, next) => {
            ctx.class.setAnnotation(ctx.define.metadata);
            return next();
        }
    },
    design: {
        method: (ctx, next) => {

            const defines = ctx.class.methodDefs.get(ctx.currDecor.toString());
            if (!defines || !defines.length) return next();

            const injector = ctx.injector;
            const mapping = ctx.class.getAnnotation<MappingDef>();

            const router = injector.get(mapping.router ?? Router);
            if (!router) throw new Execption(lang.getClassName(parent) + 'has not registered!');
            if (!(router instanceof Router)) throw new Execption(lang.getClassName(router) + 'is not router!');

            const prefix = joinprefix(mapping.prefix, mapping.version, mapping.route);
            const factory = injector.get(RouteEndpointFactoryResolver).resolve(ctx.class, injector);

            defines.forEach(def => {
                const metadata = def.metadata as RouteMappingMetadata;
                const route = normalize(patternToPath(metadata.route!));
                const endpoint = factory.create(def.propertyKey, { ...metadata, prefix });
                router.use(route, endpoint);
                factory.onDestroy(() => router.unuse(route));
            });

            return next();
        },

        afterAnnoation: (ctx, next) => {
            const mapping = ctx.class.getAnnotation<MappingDef>();
            const route = mapping.route;
            if (!route) throw new Execption(lang.getClassName(ctx.type) + 'has not route!');
            const injector = ctx.injector;

            const router = injector.get(mapping.router ?? Router);
            if (!router) throw new Execption(lang.getClassName(parent) + 'has not registered!');
            if (!(router instanceof Router)) throw new Execption(lang.getClassName(router) + 'is not router!');

            router.use({
                path: route,
                middleware: ctx.type
            });

            return next();
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
    (route: string, options: ProtocolRouteMappingOptions): ClassDecorator;
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
     * @param {ProtocolRouteMappingMetadata} [metadata] route metadata.
     */
    (metadata: ProtocolRouteMappingMetadata): ClassDecorator;
    /**
     * route decorator. define the method as an route.
     *
     * @param {RouteMappingMetadata} [metadata] route metadata.
     */
    (metadata: RouteMappingMetadata): MethodDecorator;
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
        appendProps: (meta) => {
            if (meta.route) {
                const regExp = createRestfulMatcher(meta.route);
                if (regExp) (meta as RouteMappingMetadata).regExp = regExp;
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

                const injector = ctx.injector;
                const mapping = ctx.class.getAnnotation<MappingDef>();

                const router = injector.get(mapping.router ?? Router);
                if (!router) throw new Execption(lang.getClassName(parent) + 'has not registered!');
                if (!(router instanceof Router)) throw new Execption(lang.getClassName(router) + 'is not router!');

                const endpoint = injector.get(ControllerRouteReolver).resolve(ctx.class, injector);
                const route = `${normalize(endpoint.prefix)}**`;
                router.use(route, endpoint);

                endpoint.factory.onDestroy(() => {
                    router.unuse(route)
                });
                return next();
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
    (route: string, options: ProtocolRouteMappingOptions): ClassDecorator;
    /**
     * controller decorator. define the controller method as an route.
     *
     * @param {RouteMetadata} [metadata] route metadata.
     */
    (metadata: ProtocolRouteMappingMetadata): ClassMethodDecorator;
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
        props: (
            route: string,
            arg2?: string | { middlewares: (Middleware | MiddlewareFn)[], guards?: Type<CanActivate>[], contentType?: string, method?: string }
        ) => {
            route = normalize(route);
            const regExp = createRestfulMatcher(route);
            return (isString(arg2) ? { route, regExp, contentType: arg2, method } : { route, regExp, ...arg2, method }) as ProtocolRouteMappingMetadata
        }
    });
}

const rest$ = /\/:\w+(\/)?/;
const pthRest$ = /\/:\w+/g;
const endRest$ = /\/:\w+$/g;
const pthRest = '/[^/]*';
const endRest = '/[^/]+';

function createRestfulMatcher(route: string) {
    if (rest$.test(route)) {
        return new RegExp('^' + route.replace(pthRest$, pthRest).replace(endRest$, endRest) + '$');
    }
    return undefined;
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
 * @extends {TypeMetadata}
 */
export interface HandleMetadata<TArg> extends TypeMetadata, PatternMetadata, RouteOptions<TArg> {
    /**
     * handle route
     */
    route?: Pattern;

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

