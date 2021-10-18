import {
    DecoratorOption, isUndefined, createDecorator, ROOT_INJECTOR, isArray, isString,
    lang, Type, DesignContext, ClassMethodDecorator, EMPTY_OBJ, Injector, ClassMetadata, isBoolean, DataType, createParamDecorator
} from '@tsdi/ioc';
import { IStartupService } from '../services/interface';
import { ModuleReflect, ModuleConfigure, AnnotationReflect } from './ref';
import { IMiddleware, Middlewares, MiddlewareType, RouteInfo, RouteReflect } from '../middlewares/middleware';
import { ROOT_QUEUE } from '../middlewares/root';
import { CanActive } from '../middlewares/guard';
import { RouteResolver, Route } from '../middlewares/route';
import { RootRouter, Router } from '../middlewares/router';
import { MappingReflect, MappingRoute, ProtocolRouteMapingMetadata } from '../middlewares/mapping';
import { ModuleFactory, ModuleInjector, ModuleRegistered } from '../Context';
import { SERVICES, SERVERS } from './tk';
import { BootMetadata, ModuleMetadata, HandleMetadata, HandlesMetadata, PipeMetadata } from './meta';
import { PipeTransform } from '../pipes/pipe';
import { Server } from '../server/server';


/**
 * boot decorator.
 */
export type BootDecorator = <TFunction extends Type<IStartupService>>(target: TFunction) => TFunction | void;

/**
 * Boot decorator, use to define class as statup service when bootstrap application.
 *
 * @export
 * @interface IBootDecorator
 * @template T
 */
export interface IBootDecorator {
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
 */
export const Boot: IBootDecorator = createDecorator<BootMetadata>('Boot', {
    actionType: 'annoation',
    reflect: {
        class: [
            (ctx, next) => {
                (ctx.reflect as ModuleReflect).singleton = true;
                (ctx.reflect as ModuleReflect).annoType = 'boot';
                (ctx.reflect as ModuleReflect).annoDecor = ctx.decor;
                (ctx.reflect as ModuleReflect).annotation = ctx.metadata;
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
                    const news: Type<IStartupService>[] = [];
                    const moved: Type<IStartupService>[] = [];
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
 * @interface IConfigureDecorator
 * @template T
 */
export interface IConfigureDecorator {
    /**
     * Configure decorator, define this class as configure register when bootstrap application.
     *
     * @Configure()
     */
    (): ConfigDecorator;
}

export const Configure: IConfigureDecorator = createDecorator<ClassMetadata>('Configure', {
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

/**
 * Module decorator, use to define class as ioc Module.
 *
 * @export
 * @interface IModuleDecorator
 * @template T
 */
export interface IModuleDecorator<T extends ModuleMetadata> {
    /**
     * Module decorator, use to define class as ioc Module.
     *
     * @Module
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


interface ModuleDesignContext extends DesignContext {
    reflect: ModuleReflect;
}

/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options]
 * @returns {IModuleDecorator<T>}
 */
export function createModuleDecorator<T extends ModuleMetadata>(name: string, options?: DecoratorOption<T>): IModuleDecorator<T> {
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
                    reflect.annoType = 'module';
                    reflect.annoDecor = ctx.decor;
                    const annotation: ModuleConfigure = reflect.annotation = ctx.metadata;
                    if (annotation.imports) reflect.imports = lang.getTypes(annotation.imports);
                    if (annotation.exports) reflect.exports = lang.getTypes(annotation.exports);
                    if (annotation.declarations) reflect.declarations = lang.getTypes(annotation.declarations);
                    if (annotation.bootstrap) reflect.bootstrap = lang.getTypes(annotation.bootstrap);
                    return next();
                },
                ...isArray(hd) ? hd : [hd]
            ]
        },
        design: {
            beforeAnnoation: (context: DesignContext, next) => {
                const ctx = context as ModuleDesignContext;
                if (ctx.reflect.annoType === 'module') {
                    const { injector, type, regIn } = ctx;
                    let mdinj: ModuleInjector;
                    if ((injector as ModuleInjector).type === type) {
                        mdinj = injector as ModuleInjector;
                    } else {
                        mdinj = injector.resolve({ token: ModuleFactory, target: ctx.reflect }).create(injector, { regIn });
                        ctx.injector = mdinj;
                        ctx.state.injector = ctx.injector;
                    }
                    (ctx.state as ModuleRegistered).moduleRef = mdinj;
                }
                next();
            }
        },
        appendProps: (meta) => {
            if (append) {
                append(meta as T);
            }

            if (!meta.name) {
                meta.name = lang.getClassName(meta.token);
            }
        }
    }) as IModuleDecorator<T>;
}

/**
 * Module Decorator, definde class as module.
 *
 * @Module
 */
export const Module: IModuleDecorator<ModuleMetadata> = createModuleDecorator<ModuleMetadata>('DIModule');
/**
 * Module Decorator, definde class as module.
 * @deprecated use `Module` instead.
 */
export const DIModule = Module;


export type HandleDecorator = <TFunction extends Type<IMiddleware>>(target: TFunction) => TFunction | void;

/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 *
 * @export
 * @interface IHandleDecorator
 */
export interface IHandleDecorator {
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     */
    (): HandleDecorator;
    /**
     * RegisterFor decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata: HandleMetadata): HandleDecorator;
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {string} parent the handle reg in the handle queue. default register in root handle queue.
     * @param {Type<Router>} [parent] register this handle handle before this handle.
     */
    (route: string, parent?: Type<Router>, options?: {
        /**
        * route guards.
        */
        guards?: Type<CanActive>[],
    }): HandleDecorator;
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {Type<Middlewares>} [parent] the handle reg in the handle queue. default register in root handle queue.
     * @param {Type<Middleware>} [before] register this handle handle before this handle.
     */
    (parent: Type<Middlewares>, before?: Type<IMiddleware>): HandleDecorator;
}

/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 * @Handle
 */
export const Handle: IHandleDecorator = createDecorator<HandleMetadata>('Handle', {
    actionType: ['annoation', 'autorun'],
    props: (parent?: Type<Middlewares> | string, before?: Type<IMiddleware>, options?: { guards?: Type<CanActive>[] }) =>
        (isString(parent) ? ({ route: parent, parent: before, ...options }) : ({ parent, before })) as HandleMetadata,
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

            const state = injector.state();
            let queue: Middlewares = null!;
            if (parent) {
                queue = state.getInstance(parent);
                if (!queue) {
                    throw new Error(lang.getClassName(parent) + 'has not registered!')
                }
            }

            const type = ctx.type;
            if (isString(route) || reflect.class.isExtends(Route) || reflect.class.isExtends(Router)) {
                if (!queue) {
                    let root = injector.get(RootRouter);
                    queue = reflect.class.isExtends(Router) ? root : root.getRoot(protocol);
                } else if (!(queue instanceof Router)) {
                    throw new Error(lang.getClassName(queue) + 'is not message router!');
                }
                const prefix = (queue as Router).getPath();
                const info = RouteInfo.create(route || '', prefix, guards, protocol);
                reflect.route = info;
                let middl: MiddlewareType;
                if (reflect.class.isExtends(Route) || reflect.class.isExtends(Router)) {
                    state.setTypeProvider(reflect, [{ provide: RouteInfo, useValue: info }]);
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
        }
    },
    appendProps: (meta) => {
        meta.singleton = true;
        // default register in root.
    }
});

/**
 * message handle decorator.
 * @deprecated use `Handle` instead.
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
 * @interface IInjectableDecorator
 */
export interface IPipeDecorator {
    /**
     * Pipe decorator, define the class as pipe.
     *
     * @Pipe
     * @param {Type} toType the type transform to.
     * @param {string} name  pipe name.
     * @param {boolean} pure If Pipe is pure (its output depends only on its input.) defaut true.
     */
    (name: string, toType?: Type | DataType, pure?: boolean): PipeDecorator;

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
 */
export const Pipe: IPipeDecorator = createDecorator<PipeMetadata>('Pipe', {
    actionType: ['annoation', 'typeProviders'],
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as AnnotationReflect).annoType = 'pipe';
            (ctx.reflect as AnnotationReflect).annoDecor = ctx.decor;
            (ctx.reflect as AnnotationReflect).annotation = ctx.metadata;
            return next();
        }
    },
    props: (name: string, toType?: Type | DataType | boolean, pure?: boolean) => isBoolean(toType) ? ({ name, pure: toType }) : ({ name, toType, pure }),
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
 * @interface IRouteMappingDecorator
 */
export interface IRouteMappingDecorator {
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
    (metadata: ProtocolRouteMapingMetadata): ClassMethodDecorator;
}

/**
 * RouteMapping decorator
 */
export const RouteMapping: IRouteMappingDecorator = createDecorator<ProtocolRouteMapingMetadata>('RouteMapping', {
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
            const { route, protocol, parent, middlewares, guards } = ctx.reflect.class.getMetadata<ProtocolRouteMapingMetadata>(ctx.currDecor);
            const injector = ctx.injector;
            let queue: Middlewares;
            if (parent) {
                queue = injector.state().getInstance(parent);
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

export const RequestParam = createParamDecorator('RequestParam');

export const RequestBody = createParamDecorator('RequestBody');