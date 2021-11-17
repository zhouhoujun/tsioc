import {
    isUndefined, ROOT_INJECTOR, EMPTY_OBJ, isArray, isString, lang, Type, isRegExp,
    createDecorator, ClassMethodDecorator, ClassMetadata, createParamDecorator, ParameterMetadata,
    Resolver, ModuleMetadata, DesignContext, ModuleReflect, DecoratorOption,
} from '@tsdi/ioc';
import { Service } from '../services/service';
import { Middleware, Middlewares, MiddlewareType, Route } from '../middlewares/middleware';
import { ROOT_QUEUE } from '../middlewares/root';
import { CanActive } from '../middlewares/guard';
import { AbstractRoute, RouteAdapter } from '../middlewares/route';
import { RootRouter, Router } from '../middlewares/router';
import { MappingReflect, MappingRef, ProtocolRouteMappingMetadata } from '../middlewares/mapping';
import { BootMetadata, HandleMetadata, HandlesMetadata, PipeMetadata, HandleMessagePattern } from './meta';
import { PipeTransform } from '../pipes/pipe';
import { Server } from '../server/server';
import { SERVICES, SERVERS } from './tk';
import { getModuleType } from '../module.ref';




/**
 * Module decorator, use to define class as ioc Module.
 *
 * @export
 * @interface Module
 * @template T
 */
export interface Module<T extends ModuleMetadata> {
    /**
     * Module decorator, use to define class as ioc Module.
     *
     * @Module
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}

/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options]
 * @returns {Module<T>}
 */
export function createModuleDecorator<T extends ModuleMetadata>(name: string, options?: DecoratorOption<T>): Module<T> {
    options = options || EMPTY_OBJ;
    let hd = options.reflect?.class ?? [];
    const append = options.appendProps;
    return createDecorator<ModuleMetadata>(name, {
        ...options,
        reflect: {
            ...options.reflect,
            class: [
                (ctx, next) => {
                    const reflect = ctx.reflect as ModuleReflect;
                    const metadata: ModuleMetadata = reflect.annotation = ctx.metadata;
                    reflect.module = true;
                    reflect.providedIn = metadata.providedIn;
                    reflect.baseURL = metadata.baseURL;
                    reflect.debug = metadata.debug;
                    reflect.providers = metadata.providers;
                    if (metadata.imports) reflect.imports = getModuleType(metadata.imports);
                    if (metadata.exports) reflect.exports = lang.getTypes(metadata.exports);
                    if (metadata.declarations) reflect.declarations = lang.getTypes(metadata.declarations);
                    if (metadata.bootstrap) reflect.bootstrap = lang.getTypes(metadata.bootstrap);
                    return next();
                },
                ...isArray(hd) ? hd : [hd]
            ]
        },
        design: {
            beforeAnnoation: (context: DesignContext, next) => {
                let { type, reflect } = context;
                // use as dependence inject module.
                if (context.injectorType) {
                    context.injectorType(type, reflect);
                }
                next();
            }
        },
        appendProps: (meta) => {
            if (append) {
                append(meta as T);
            }
        }
    }) as Module<T>;
}

/**
 * Module Decorator, definde class as module.
 *
 * @Module
 * @exports {@link Module}
 */
export const Module: Module<ModuleMetadata> = createModuleDecorator<ModuleMetadata>('Module');
/**
 * Module Decorator, definde class as module.
 * @deprecated use {@link Module} instead.
 */
export const DIModule = Module;


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
                ctx.reflect.annotation = ctx.metadata;
                return next();
            }
        ]
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const { type, injector } = ctx;
            const root = injector.get(ROOT_INJECTOR);
            if (!root) return next();
            let boots = root.get(SERVICES);
            if (!boots) {
                boots = [];
                root.setValue(SERVICES, boots);
            }
            const meta = ctx.reflect.annotation as BootMetadata;

            let existIdx = boots.findIndex(b => b.type === type);
            let restIdx = existIdx;
            let resolver = existIdx >= 0 ? boots[existIdx] : undefined;
            const { before, after } = meta;
            if (resolver) {
                resolver.resolve = (ctx: any) => injector.get(type, ctx);
            } else {
                resolver = { type, resolve: (ctx) => injector.get(type, ctx) } as Resolver;
            }

            if (before === 'all') {
                existIdx >= 0 && boots.splice(existIdx, 1);
                boots.unshift(resolver);
                restIdx = 0;
            } else if (before) {
                let idx = boots.findIndex(b => b.type === before);
                if (idx < 0) {
                    boots.splice(existIdx + 1, 0, { type: before, resolve: (context) => injector.resolve({ token: before, regify: true, context }) });
                } else {
                    existIdx >= 0 && boots.splice(existIdx, 1);
                    restIdx = idx - 1;
                    boots.splice(restIdx, 0, resolver);
                }
            } else if (after === 'all') {
                existIdx >= 0 && boots.splice(existIdx, 1);
                boots.push(resolver);
                restIdx = -1;
            } else if (after) {
                let idx = boots.findIndex(b => b.type === after);
                if (idx < 0) {
                    boots.splice(existIdx - 1, 0, { type: after, resolve: (context) => injector.resolve({ token: after, regify: true, context }) });
                } else {
                    existIdx >= 0 && boots.splice(existIdx, 1);
                    restIdx = idx + 1;
                    boots.splice(restIdx, 0, resolver);
                }
            } else {
                boots.push(resolver);
                restIdx = -1;
            }

            if (meta.deps) {
                meta.deps.forEach(d => {
                    let reged = boots.findIndex(b => b.type === d);
                    if (reged < 0) {
                        const depResr = { type: d, resolve: (context) => injector.resolve({ token: d, regify: true, context }) } as Resolver;
                        if (restIdx < 0) {
                            boots.push(depResr);
                        }
                        boots.splice(restIdx - 1, 0, depResr);
                    }
                });
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
            const resolver = { type, resolve: (ctx) => injector.get(type, ctx) } as Resolver;
            if (!servs) {
                servs = [resolver];
                root.setValue(SERVERS, servs);
            } else {
                servs.push(resolver);
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
    props: (parent?: Type<Middlewares> | string, options?: { guards?: Type<CanActive>[], parent?: Type<Middlewares> | string, before?: Type<Middleware> }) =>
        (isString(parent) || isRegExp(parent) ? ({ pattern: parent, ...options }) : ({ parent, ...options })) as HandleMetadata & HandleMessagePattern,
    design: {
        afterAnnoation: (ctx, next) => {
            const reflect = ctx.reflect;
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

            let queue: Middlewares = null!;
            if (parent) {
                queue = injector.get(parent);
                if (!queue) {
                    throw new Error(lang.getClassName(parent) + 'has not registered!')
                }
            }

            const type = ctx.type;
            if (isString(route) || reflect.class.isExtends(AbstractRoute) || reflect.class.isExtends(Router)) {
                if (!queue) {
                    let root = injector.get(RootRouter);
                    queue = reflect.class.isExtends(Router) ? root : root.getRoot(protocol);
                } else if (!(queue instanceof Router)) {
                    throw new Error(lang.getClassName(queue) + 'is not message router!');
                }
                const prefix = (queue as Router).getPath();
                let middl: MiddlewareType;
                if (reflect.class.isExtends(AbstractRoute) || reflect.class.isExtends(Router)) {
                    const rt = Route.create(route || '', prefix, guards, protocol);
                    middl = { type, route: rt, resolve: (ctx) => injector.resolve(type, { values: [[Route, rt]], parent: ctx }) };
                } else {
                    middl = new RouteAdapter(route || '', prefix, (ctx) => injector.get(type, ctx), guards);
                }
                queue.use(middl);
                injector.onDestroy(() => queue.unuse(middl));
            } else {
                if (!queue) {
                    queue = injector.get(ROOT_QUEUE);
                }
                let resolver: Resolver = { type, resolve: () => injector.get(type) };
                if (before) {
                    queue.useBefore(resolver, before);
                } else if (after) {
                    queue.useAfter(resolver, after);
                } else {
                    queue.use(resolver);
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
        if (meta.cmd || meta.pattern) return;
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
            ctx.reflect.annotation = ctx.metadata;
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
    reflect: {
        class: (ctx, next) => {
            ctx.reflect.annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const reflect = ctx.reflect as MappingReflect;
            const { protocol, parent } = reflect.annotation;
            const injector = ctx.injector;
            let queue: Middlewares;
            if (parent) {
                queue = injector.get(parent);
            } else {
                queue = injector.get(RootRouter).getRoot(protocol);
            }

            if (!queue) throw new Error(lang.getClassName(parent) + 'has not registered!');
            if (!(queue instanceof Router)) throw new Error(lang.getClassName(queue) + 'is not message router!');

            const mapping = new MappingRef(reflect, injector, queue.getPath());
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