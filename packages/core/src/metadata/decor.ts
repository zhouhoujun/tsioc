import {
    isUndefined, ROOT_INJECTOR, EMPTY_OBJ, isArray, isString, lang, Type, isRegExp, Injector,
    createDecorator, ClassMethodDecorator, ClassMetadata, createParamDecorator, ParameterMetadata, ModuleReflect, TypeReflect
} from '@tsdi/ioc';
import { Service } from '../services/service';
import { AnnotationReflect } from './ref';
import { Middleware, Middlewares, MiddlewareType, RouteInfo, RouteReflect } from '../middlewares/middleware';
import { ROOT_QUEUE } from '../middlewares/root';
import { CanActive } from '../middlewares/guard';
import { RouteResolver, Route } from '../middlewares/route';
import { RootRouter, Router } from '../middlewares/router';
import { MappingReflect, MappingRoute, ProtocolRouteMappingMetadata } from '../middlewares/mapping';
import { SERVICES, SERVERS } from './tk';
import { BootMetadata, HandleMetadata, HandlesMetadata, PipeMetadata, HandleMessagePattern } from './meta';
import { PipeTransform } from '../pipes/pipe';
import { Server } from '../server/server';


/**
 * boot decorator.
 */
export type BootDecorator = <TFunction extends Type<Service>>(target: TFunction) => TFunction | void;

/**
 * Boot decorator, use to define class as statup service when bootstrap application.
 *
 * @export
 * @interface Boot
 * @template T
 */
export interface Boot {
    /**
     * Boot decorator, use to define class as statup service when bootstrap application.
     *
     * @Boot()
     *
     * @param {BootMetadata} [metadata] bootstrap metadate config.
     */
    (metadata?: BootMetadata): BootDecorator;
}

/**
 * Boot decorator, use to define class as statup service when bootstrap application.
 *
 * @Boot()
 * @exports {@link Boot}
 */
export const Boot: Boot = createDecorator<BootMetadata>('Boot', {
    actionType: 'annoation',
    reflect: {
        class: [
            (ctx, next) => {
                ctx.reflect.singleton = true;
                // (ctx.reflect as ModuleReflect).annoType = 'boot';
                // (ctx.reflect as ModuleReflect).annoDecor = ctx.decor;
                ctx.reflect.annotation = ctx.metadata;
                return next();
            }
        ]
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const root = ctx.injector.get(ROOT_INJECTOR);
            if (!root) return next();
            let boots = root.get(SERVICES);
            if (!boots) {
                boots = [];
                root.setValue(SERVICES, boots);
            }
            const meta = ctx.reflect.class.getMetadata<BootMetadata>(ctx.currDecor) || EMPTY_OBJ as BootMetadata;

            let idx = -1;
            if (meta.before) {
                idx = isString(meta.before) ? 0 : boots.indexOf(meta.before);
            } else if (meta.after) {
                idx = isString(meta.after) ? -1 : boots.indexOf(meta.after) + 1;
            }
            if (idx >= 0) {
                if (meta.deps) {
                    const news: Type<Service>[] = [];
                    const moved: Type<Service>[] = [];
                    meta.deps.forEach(d => {
                        const depidx = boots.indexOf(d);
                        if (depidx < 0) {
                            news.push(d);
                        } else if (depidx >= idx) {
                            moved.push(d);
                            boots.splice(depidx, 1);
                        }
                    });
                    boots.splice(idx, 0, ...news, ...moved, ctx.type);
                } else {
                    boots.splice(idx, 0, ctx.type);
                }
            } else {
                if (meta.deps) {
                    meta.deps.forEach(d => {
                        if (boots.indexOf(d) < 0) {
                            boots.push(d);
                        }
                    });
                }
                boots.push(ctx.type);
            }
            return next();
        }
    },
    appendProps: (meta) => {
        if (isUndefined(meta.singleton)) {
            meta.singleton = true;
        }
        return meta;
    }
});

/**
 * configure register decorator.
 */
export type ConfigDecorator = <TFunction extends Type<Server>>(target: TFunction) => TFunction | void;



/**
 * Configure decorator, define this class as configure register when bootstrap application.
 *
 * @export
 * @interface Configure
 */
export interface Configure {
    /**
     * Configure decorator, define this class as configure register when bootstrap application.
     *
     * @Configure()
     */
    (): ConfigDecorator;
}

/**
 * Configure decorator, define this class as configure register when bootstrap application.
 * 
 * @exports {@link Configure}
 */
export const Configure: Configure = createDecorator<ClassMetadata>('Configure', {
    actionType: 'annoation',
    design: {
        afterAnnoation: (ctx, next) => {
            const { type, injector } = ctx;
            const root = injector.get(ROOT_INJECTOR);
            if (!root) return next();
            let servs = root.get(SERVERS);
            if (!servs) {
                servs = [type];
                root.setValue(SERVERS, servs);
            } else {
                servs.push(type);
            }
            return next();
        }
    },
    appendProps: (meta) => {
        meta.singleton = true;
        return meta;
    }
})


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
    // /**
    //  * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
    //  *
    //  * @RegisterFor
    //  *
    //  * @param {string} parent the handle reg in the handle queue. default register in root handle queue.
    //  * @param [option] register this handle handle before this handle.
    //  */
    // (route: string, options?: {
    //     /**
    //      * register this handle handle in the parent handle.
    //      */
    //     parent?: Type<Router>;
    //     /**
    //      * register this handle handle before the handle.
    //      */
    //     before?: Type<Middleware>;
    //     /**
    //     * route guards.
    //     */
    //     guards?: Type<CanActive>[],
    // }): HandleDecorator;
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {Type<Middlewares>} parent the handle reg in the handle queue. default register in root handle queue.
     * @param [option] register this handle handle before this handle.
     */
    (parent: Type<Middlewares>, options?: {
        route?: string;
        /**
         * register this handle handle before the handle.
         */
        before?: Type<Middleware>;
        /**
        * route guards.
        */
        guards?: Type<CanActive>[],
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
    actionType: ['annoation', 'autorun'],
    props: (parent?: Type<Middlewares> | string, options?: { guards?: Type<CanActive>[], parent?: Type<Middlewares> | string,  before?: Type<Middleware> }) =>
        (isString(parent) || isRegExp(parent) ? ({ pattern: parent, ...options }) : ({ parent, ...options })) as HandleMetadata & HandleMessagePattern,
    design: {
        afterAnnoation: (ctx, next) => {
            const reflect = ctx.reflect as RouteReflect;
            const metadata = reflect.class.getMetadata<HandleMetadata>(ctx.currDecor);
            if (reflect.class.isExtends(Middlewares)) {
                if (!(metadata as HandlesMetadata).autorun) {
                    (metadata as HandlesMetadata).autorun = 'setup';
                }
            }
            const { route, protocol, parent, before, after, guards } = metadata;
            const injector = ctx.injector;

            if (!isString(route) && !parent) {
                return next();
            }

            const platform = injector.platform();
            let queue: Middlewares = null!;
            if (parent) {
                queue = platform.getInstance(parent);
                if (!queue) {
                    throw new Error(lang.getClassName(parent) + 'has not registered!')
                }
            }

            const type = ctx.type;
            if (isString(route) || reflect.class.isExtends(Route) || reflect.class.isExtends(Router)) {
                if (!queue) {
                    let root = injector.get(RootRouter);
                    if(!root) console.log(type);
                    queue = reflect.class.isExtends(Router) ? root : root.getRoot(protocol);
                } else if (!(queue instanceof Router)) {
                    throw new Error(lang.getClassName(queue) + 'is not message router!');
                }
                const prefix = (queue as Router).getPath();
                const info = RouteInfo.create(route || '', prefix, guards, protocol);
                reflect.route = info;
                let middl: MiddlewareType;
                if (reflect.class.isExtends(Route) || reflect.class.isExtends(Router)) {
                    platform.setTypeProvider(reflect, [{ provide: RouteInfo, useValue: info }]);
                    middl = type;
                } else {
                    middl = new RouteResolver(route || '', prefix, (inj: Injector) => injector.get(type, inj), guards);
                }
                queue.use(middl);
                injector.onDestroy(() => queue.unuse(middl));
            } else {
                if (!queue) {
                    queue = injector.get(ROOT_QUEUE);
                }
                if (before) {
                    queue.useBefore(type, before);
                } else if (after) {
                    queue.useAfter(type, after);
                } else {
                    queue.use(type);
                }
                injector.onDestroy(() => queue.unuse(type));
            }
            next();
        },
        method: (ctx, next) => {
            // todo register message handle
        }
    },
    appendProps: (meta) => {
        if(meta.cmd || meta.pattern) return;
        meta.singleton = true;
    }
});

/**
 * message handle decorator.
 * @deprecated use {@link Handle} instead.
 */
export const Message = Handle;


/**
 * pipe decorator.
 */
export type PipeDecorator = <TFunction extends Type<PipeTransform>>(target: TFunction) => TFunction | void;


/**
 * Pipe decorator.
 *
 * @export
 * @interface Pipe
 */
export interface Pipe {
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     * @param {Type} toType the type transform to.
     * @param {boolean} pure If Pipe is pure (its output depends only on its input.) defaut true.
     */
    (name: string, pure?: boolean): PipeDecorator;
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     *
     * @param {PipeMetadata} [metadata] metadata map.
     */
    (metadata: PipeMetadata): PipeDecorator;
}

/**
 * Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]
 *
 * @Pipe
 * @expors {@link Pipe}
 */
export const Pipe: Pipe = createDecorator<PipeMetadata>('Pipe', {
    actionType: ['annoation', 'typeProviders'],
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as AnnotationReflect).annoType = 'pipe';
            (ctx.reflect as AnnotationReflect).annoDecor = ctx.decor;
            (ctx.reflect as AnnotationReflect).annotation = ctx.metadata;
            return next();
        }
    },
    props: (name: string, pure?: boolean) => ({ name, provide: name, pure }),
    appendProps: meta => {
        if (isUndefined(meta.pure)) {
            meta.pure = true;
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
    (route: string, options: {
        /**
         * protocol type.
         */
        protocol?: string,
        /**
         * parent router.
         */
        parent?: Type<Router>,
        /**
         * route guards.
         */
        guards?: Type<CanActive>[],
        /**
         * middlewares for the route.
         */
        middlewares: MiddlewareType[],
        /**
        * pipes for the route.
        */
        pipes?: Type<PipeTransform>[]
    }): ClassDecorator;
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
    (route: string, options: {
        /**
         * route guards.
         */
        guards?: Type<CanActive>[],
        /**
         * middlewares for the route.
         */
        middlewares: MiddlewareType[],
        /**
         * pipes for the route.
         */
        pipes?: Type<PipeTransform>[],
        /**
         * request contentType
         */
        contentType?: string,
        /**
         * request method.
         */
        method?: string
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
    props: (route: string, arg2?: Type<Router> | MiddlewareType[] | string | { protocol?: string, middlewares: MiddlewareType[], contentType?: string, method?: string }) => {
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
            const { route, protocol, parent, middlewares, guards } = ctx.reflect.class.getMetadata<ProtocolRouteMappingMetadata>(ctx.currDecor);
            const injector = ctx.injector;
            let queue: Middlewares;
            if (parent) {
                queue = injector.platform().getInstance(parent);
            } else {
                queue = injector.get(RootRouter).getRoot(protocol);
            }

            if (!queue) throw new Error(lang.getClassName(parent) + 'has not registered!');
            if (!(queue instanceof Router)) throw new Error(lang.getClassName(queue) + 'is not message router!');

            const info = RouteInfo.create(route, queue.getPath(), guards, protocol);
            const mapping = new MappingRoute(info, ctx.reflect as MappingReflect, injector, middlewares);
            injector.onDestroy(() => queue.unuse(mapping));
            queue.use(mapping);

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
    scope?: 'body' | 'query' | 'restful'
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
    (field: string, option?: { provider?: Type, mutil?: boolean, pipe?: string | Type<PipeTransform>, args?: any[], defaultValue?: any }): ParameterDecorator;
    /**
     * Request Parameter decorator
     * @param meta.
     */
    (meta: { field?: string, provider?: Type, mutil?: boolean, pipe?: string | Type<PipeTransform>, args?: any[], defaultValue?: any }): ParameterDecorator;
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