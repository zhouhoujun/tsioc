import { ClassMethodDecorator, createDecorator, isArray, isString, lang, Type } from '@tsdi/ioc';
import { MappingReflect, RouteMappingRef, Middlewares, MiddlewareType, Route, RouteMappingMetadata, Router } from '@tsdi/core';
import { HttpRouter } from '../router';



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
     * @param {MiddlewareType[]} [middlewares] the middlewares for the route.
     */
    (route: string, middlewares?: MiddlewareType[]): ClassMethodDecorator;

    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
     *  [parent] set parent route.
     *  [middlewares] the middlewares for the route.
     */
    (route: string, options: { parent?: Type<Router>, middlewares: MiddlewareType[] }): ClassDecorator;
    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {RequestMethod} [method] set request method.
     */
    (route: string, method: string): MethodDecorator;

    /**
     * route decorator. define the controller method as an route.
     *
     * @param {string} route route sub path.
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
     *  [middlewares] the middlewares for the route.
     *  [contentType] set request contentType.
     *  [method] set request method.
     */
    (route: string, options: { middlewares: MiddlewareType[], contentType?: string, method?: string }): MethodDecorator;

    /**
     * route decorator. define the controller method as an route.
     *
     * @param {RouteMetadata} [metadata] route metadata.
     */
    (metadata: RouteMappingMetadata): ClassMethodDecorator;
}


/**
 * RestController decorator
 */
export const RestController: RestController = createDecorator<RouteMappingMetadata>('RestController', {
    props: (route: string, arg2?: Type<Router> | MiddlewareType[] | string | { middlewares: MiddlewareType[], contentType?: string, method?: string }) => {
        if (isArray(arg2)) {
            return { route, middlewares: arg2 };
        } else if (isString(arg2)) {
            return { route, method: arg2 };
        } else if (lang.isBaseOf(arg2, Router)) {
            return { route, parent: arg2 };
        } else {
            return { ...arg2, route };
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const { route, parent, middlewares } = ctx.reflect.class.getMetadata<RouteMappingMetadata>(ctx.currDecor);
            const injector = ctx.injector;
            let queue: Middlewares;
            if (parent) {
                queue = injector.platform().getInstance(parent);
            } else {
                queue = injector.get(HttpRouter);
            }

            if (!queue) throw new Error(lang.getClassName(parent) + 'has not registered!');
            if (!(queue instanceof Router)) throw new Error(lang.getClassName(queue) + 'is not message router!');

            const info = Route.create(route, queue.getPath());
            const mapping = new RouteMappingRef(info, ctx.reflect as MappingReflect, injector, middlewares);
            injector.onDestroy(() => queue.unuse(mapping));
            queue.use(mapping);

            next();
        }
    }
});
