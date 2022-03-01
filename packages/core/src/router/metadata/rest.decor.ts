import { ClassMethodDecorator, createDecorator, isArray, isString, lang, Type } from '@tsdi/ioc';
import { PipeTransform } from '../../pipes/pipe';
import { CanActivate } from '../../transport/guard';
import { RequestMethod } from '../../transport/packet';
import { MiddlewareType } from '../middlewares';
import { RouteRefFactoryResolver } from '../route';
import { MappingReflect, ProtocolRouteMappingMetadata, Router, RouterResolver } from '../router';


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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
export const RestController: RestController = createDecorator<ProtocolRouteMappingMetadata>('RestController', {
    props: (route: string, arg2?: Type<Router> | Type<CanActivate>[] | { guards?: Type<CanActivate>[], middlewares?: MiddlewareType[], pipes?: Type<PipeTransform>[] }) => {
        if (isArray(arg2)) {
            return { route, guards: arg2 };
        } else if (lang.isBaseOf(arg2, Router)) {
            return { route, parent: arg2 };
        } else {
            return { ...arg2, route };
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const reflect = ctx.reflect as MappingReflect;
            const { protocol, parent } = reflect.annotation;
            const injector = ctx.injector;
            let router: Router;
            if (parent) {
                router = injector.get(parent);
            } else {
                router = injector.get(RouterResolver).resolve(protocol);
            }

            if (!router) throw new Error(lang.getClassName(parent) + 'has not registered!');
            if (!(router instanceof Router)) throw new Error(lang.getClassName(router) + 'is not message router!');

            const prefix = router.prefix;
            const routeRef = injector.get(RouteRefFactoryResolver).resolve(reflect).create(injector, { prefix });
            routeRef.onDestroy(() => router.unuse(routeRef));
            router.use(routeRef);

            next();
        }
    }
});

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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
            arg2?: string | { protocol?: string, middlewares: MiddlewareType[], guards?: Type<CanActivate>[], contentType?: string, method?: string }
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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
