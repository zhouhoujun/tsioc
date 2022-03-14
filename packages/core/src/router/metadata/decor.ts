import {
    isArray, isString, lang, Type, isRegExp, createDecorator, OperationArgumentResolver,
    ClassMethodDecorator, createParamDecorator, ParameterMetadata, ActionTypes
} from '@tsdi/ioc';
import { PipeTransform } from '../../pipes/pipe';
import { RequestMethod } from '../../transport/packet';
import { CanActivate } from '../../transport/guard';
import { Middlewarable, Middleware } from '../../transport/endpoint';
import { RouteFactoryResolver } from '../route';
import { MappingReflect, ProtocolRouteMappingMetadata, Router, RouterResolver } from '../router';
import { HandleMetadata, HandleMessagePattern } from './meta';


export type HandleDecorator = <TFunction extends Type<Middlewarable>>(target: TFunction) => TFunction | void;


/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 *
 * @export
 * @interface Handle
 */
export interface Handle {
    // /**
    //  * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
    //  *
    //  */
    // (): HandleDecorator;
    /**
     * Handle decorator, for class. use to define the class as route.
     *
     * @RegisterFor
     *
     * @param {route} route the route url.
     * @param [option] route option.
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
    }): HandleDecorator;
    // /**
    //  * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
    //  *
    //  * @RegisterFor
    //  *
    //  * @param {Type<Middlewares>} parent the handle reg in the handle queue. default register in root handle queue.
    //  * @param [option] register this handle handle before this handle.
    //  */
    // (parent: Type<Middlewares>, options?: {
    //     /**
    //      * register this handle handle before the handle.
    //      */
    //     before?: Type<Middleware>;
    //     /**
    //      * register this handle handle before the handle.
    //      */
    //     after?: Type<Middleware>;
    //     /**
    //     * route guards.
    //     */
    //     guards?: Type<CanActivate>[],
    // }): HandleDecorator;
    // /**
    //  * RegisterFor decorator, for class. use to define the class as handle register in global handle queue or parent.
    //  *
    //  * @RegisterFor
    //  *
    //  * @param {ClassMetadata} [metadata] metadata map.
    //  */
    // (metadata: HandleMetadata): HandleDecorator;

    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {cmd?: string, pattern?: string } option message match option.
     */
    (pattern: string | RegExp, option?: { cmd?: string }): MethodDecorator;
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {cmd?: string, pattern?: string } option message match option.
     */
    (option: { cmd?: string, pattern?: string | RegExp }): MethodDecorator;
}

/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 * @Handle
 * 
 * @exports {@link Handle}
 */
export const Handle: Handle = createDecorator<HandleMetadata & HandleMessagePattern>('Handle', {
    actionType: [ActionTypes.annoation, ActionTypes.runnable],
    props: (parent?: Type<Router> | string | RegExp, options?: { guards?: Type<CanActivate>[], parent?: Type<Router> | string, before?: Type<Middleware> }) =>
        (isString(parent) || isRegExp(parent) ? ({ route: parent, ...options }) : ({ parent, ...options })) as HandleMetadata & HandleMessagePattern,
    reflect: {
        class: (ctx, next) => {
            ctx.reflect.annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const reflect = ctx.reflect;
            const metadata = reflect.class.getMetadata<HandleMetadata>(ctx.currDecor);
            const { route, protocol, parent } = metadata;
            const injector = ctx.injector;

            if (!isString(route) && !parent) {
                return next();
            }

            let queue: Middlewarable | undefined;
            if (isString(route) || reflect.class.isExtends(Router)) {
                queue = parent ? (injector.get(parent) ?? injector.get(RouterResolver).resolve(protocol)) : injector.get(RouterResolver).resolve(protocol);
                if (!(queue instanceof Router)) {
                    throw new Error(lang.getClassName(queue) + 'is not message router!');
                }
                const router = queue as Router;
                const routeRef = injector.get(RouteFactoryResolver).resolve(reflect).create(injector, { prefix: router.prefix });
                const path = routeRef.path;
                routeRef.onDestroy(() => router.unuse(path));
                router.use(path, routeRef);
            }
            next();
        },
        // method: (ctx, next) => {
        //     // todo register message handle
        // }
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
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [parent] set parent route.
     *  [middlewares] the middlewares for the route.
     */
    (route: string, options: {
        /**
         * version of api.
         */
        version?: string;
        /**
         * protocol type.
         */
        protocol?: string;
        /**
         * parent router.
         */
        parent?: Type<Router>;
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * version of api.
         */
        version?: string;
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[];
        /**
         * request contentType
         */
        contentType?: string;
        /**
         * request method.
         */
        method?: RequestMethod;
    }): MethodDecorator;

    /**
     * route decorator. define the controller method as an route.
     *
     * @param {RouteMetadata} [metadata] route metadata.
     */
    (metadata: ProtocolRouteMappingMetadata): ClassMethodDecorator;
}


export function createMappingDecorator<T extends ProtocolRouteMappingMetadata>(name: string, controllerOnly?: boolean) {
    return createDecorator<T>(name, {
        props: (route: string, arg2?: Type<Router> | Type<CanActivate>[] | string | T) => {
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
        reflect: controllerOnly ? undefined : {
            class: (ctx, next) => {
                ctx.reflect.annotation = ctx.metadata;
                return next();
            }
        },
        design: {
            afterAnnoation: (ctx, next) => {
                const reflect = ctx.reflect as MappingReflect;
                const { protocol, version, parent } = reflect.annotation;
                const injector = ctx.injector;
                let router: Router;
                if (parent) {
                    router = injector.get(parent);
                } else {
                    router = injector.get(RouterResolver).resolve(protocol);
                }

                if (!router) throw new Error(lang.getClassName(parent) + 'has not registered!');
                if (!(router instanceof Router)) throw new Error(lang.getClassName(router) + 'is not router!');
                const prefix = router.prefix;
                const routeRef = injector.get(RouteFactoryResolver).resolve(reflect).create(injector, { prefix });
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
     * @param option option.
     */
    (field: string, option?: {
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
        meta.scope = 'restful';
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
        meta.scope = 'body';
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
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [parent] set parent route.
     *  [middlewares] the middlewares for the route.
     */
    (route: string, options: {
        /**
         * version of api.
         */
        version?: string;
        /**
         * protocol type.
         */
        protocol?: string;
        /**
         * parent router.
         */
        parent?: Type<Router>;
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
     * route decorator. define the controller method as an route.
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
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
    return createDecorator<ProtocolRouteMappingMetadata>('Route', {
        props: (
            route: string,
            arg2?: string | { protocol?: string, middlewares: Middleware[], guards?: Type<CanActivate>[], contentType?: string, method?: string }
        ) => (isString(arg2) ? { route, contentType: arg2 } : { route, ...arg2, method })
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
    (route: string, contentType?: string): MethodDecorator;

    /**
     * Head decorator. define the controller method as head route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
export const Head: HeadDecorator = createRouteDecorator('HEAD');


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
    (route: string, contentType?: string): MethodDecorator;

    /**
     * Options decorator. define the controller method as options route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
    (route: string, contentType?: string): MethodDecorator;

    /**
     * Get decorator. define the controller method as get route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
export const Get: GetDecorator = createRouteDecorator('GET');



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
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
export const Delete: DeleteDecorator = createRouteDecorator('DELETE');



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
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
export const Patch: PatchDecorator = createRouteDecorator('PATCH');




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
    (route: string, contentType?: string): MethodDecorator;

    /**
     * Post decorator. define the controller method as post route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
export const Post: PostDecorator = createRouteDecorator('POST');



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
    (route: string, contentType?: string): MethodDecorator;

    /**
     * Put decorator. define the controller method as put route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: Middleware[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
        /**
         * middlewares for the route.
         */
        middlewares: Middleware[];
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
export const Put: PutDecorator = createRouteDecorator('PUT');
