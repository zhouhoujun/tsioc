import {
    isArray, isString, lang, Type, isRegExp, createDecorator, OperationArgumentResolver,
    ClassMethodDecorator, createParamDecorator, ParameterMetadata, ActionTypes
} from '@tsdi/ioc';
import { RequestMethod } from '../../transport/packet';
import { CanActivate } from '../../transport/guard';
import { Middleware } from '../middleware';
import { MiddlewareRefFactoryResolver, Middlewares, MiddlewareType } from '../middlewares';
import { RouteRefFactoryResolver } from '../route';
import { MappingReflect, ProtocolRouteMappingMetadata, Router, RouterResolver } from '../router';
import { HandleMetadata, HandlesMetadata, HandleMessagePattern } from './meta';
import { PipeTransform } from '../../pipes/pipe';


export type HandleDecorator = <TFunction extends Type<Middleware>>(target: TFunction) => TFunction | void;


/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 *
 * @export
 * @interface Handle
 */
export interface Handle {
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     */
    (): HandleDecorator;
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
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {Type<Middlewares>} parent the handle reg in the handle queue. default register in root handle queue.
     * @param [option] register this handle handle before this handle.
     */
    (parent: Type<Middlewares>, options?: {
        /**
         * register this handle handle before the handle.
         */
        before?: Type<Middleware>;
        /**
         * register this handle handle before the handle.
         */
        after?: Type<Middleware>;
        /**
        * route guards.
        */
        guards?: Type<CanActivate>[],
    }): HandleDecorator;
    /**
     * RegisterFor decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata: HandleMetadata): HandleDecorator;

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
    actionType: [ActionTypes.annoation, ActionTypes.autorun],
    props: (parent?: Type<Middlewares> | string | RegExp, options?: { guards?: Type<CanActivate>[], parent?: Type<Middlewares> | string, before?: Type<Middleware> }) =>
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
            if (reflect.class.isExtends(Middlewares)) {
                if (!(metadata as HandlesMetadata).autorun) {
                    (metadata as HandlesMetadata).autorun = 'setup';
                }
            }
            const { route, protocol, parent, before, after } = metadata;
            const injector = ctx.injector;

            if (!isString(route) && !parent) {
                return next();
            }

            let queue: Middlewares | undefined;

            const type = ctx.type;
            if (isString(route) || reflect.class.isExtends(Router)) {
                queue = parent ? (injector.get(parent) ?? injector.get(RouterResolver).resolve(protocol)) : injector.get(RouterResolver).resolve(protocol);
                if (!(queue instanceof Router)) {
                    throw new Error(lang.getClassName(queue) + 'is not message router!');
                }
                const router = queue as Router;
                const middlwareRef = injector.get(MiddlewareRefFactoryResolver).resolve(reflect).create(injector, { prefix: router.prefix });
                middlwareRef.onDestroy(() => router.unuse(middlwareRef));
                router.use(middlwareRef);
            } else if (parent) {
                queue = injector.get(parent);
                if (!queue) {
                    throw new Error(lang.getClassName(parent) + 'has not registered!')
                }
                const middlwareRef = injector.get(MiddlewareRefFactoryResolver).resolve(reflect).create(injector);
                if (before) {
                    queue.useBefore(middlwareRef, before);
                } else if (after) {
                    queue.useAfter(middlwareRef, after);
                } else {
                    queue.use(middlwareRef);
                }
                middlwareRef.onDestroy(() => queue?.unuse(type));
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
 * message handle decorator.
 * @deprecated use {@link Handle} instead.
 */
export const Message = Handle;




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
     * @param {{ middlewares?: MiddlewareType[], contentType?: string, method?: string}} options
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
        middlewares: MiddlewareType[];
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

/**
 * RouteMapping decorator
 * 
 * @exports  {@link RouteMapping}
 */
export const RouteMapping: RouteMapping = createDecorator<ProtocolRouteMappingMetadata>('RouteMapping', {
    props: (route: string, arg2?: Type<Router> | Type<CanActivate>[] | string | { protocol?: string, middlewares: MiddlewareType[], contentType?: string, method?: RequestMethod }) => {
        if (isArray(arg2)) {
            return { route, guards: arg2 };
        } else if (isString(arg2)) {
            return { route, method: arg2 as RequestMethod };
        } else if (lang.isBaseOf(arg2, Router)) {
            return { route, parent: arg2 };
        } else {
            return { ...arg2, route };
        }
    },
    reflect: {
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
            const routeRef = injector.get(RouteRefFactoryResolver).resolve(reflect).create(injector, { prefix });
            routeRef.onDestroy(() => router.unuse(routeRef));
            router.use(routeRef);

            next();
        }
    }
});

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
