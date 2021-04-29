import {
    DecoratorOption, isUndefined, ClassType, TypeMetadata, PatternMetadata, createDecorator, ROOT_INJECTOR,
    lang, Type, isArray, isString, DesignContext, ClassMethodDecorator, ProviderType, IProvider
} from '@tsdi/ioc';
import { IStartupService, STARTUPS } from './services/StartupService';
import { ModuleConfigure } from './modules/configure';
import { ModuleReflect } from './modules/reflect';
import { DefaultModuleRef } from './modules/injector';
import { Middleware, Middlewares, MiddlewareType, RouteReflect, ROUTE_PREFIX, ROUTE_PROTOCOL, ROUTE_URL } from './middlewares/handle';
import { IModuleInjector, ModuleRef, ModuleRegistered } from './modules/ref';
import { ROOT_QUEUE } from './middlewares/root';
import { FactoryRoute, Route } from './middlewares/route';
import { RootRouter, Router } from './middlewares/router';
import { MappingReflect, MappingRoute, RouteMapingMetadata } from './middlewares/mapping';


/**
 * boot decorator.
 */
export type BootDecorator = <TFunction extends ClassType<IStartupService>>(target: TFunction) => TFunction | void;

/**
 * Boot metadata.
 *
 * @export
 * @interface BootMetadata
 * @extends {ClassMetadata}
 */
export interface BootMetadata extends TypeMetadata, PatternMetadata {
    /**
     * the startup service dependencies.
     */
    deps?: ClassType<IStartupService>[];
    /**
     * this service startup before the service, or at first
     */
    before?: ClassType<IStartupService> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: ClassType<IStartupService> | 'all';
}

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
 * create type builder decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {DecoratorOption<T>} [options]
 * @returns {IBootDecorator}
 */
export function createBootDecorator<T extends BootMetadata>(name: string, options?: DecoratorOption<T>): IBootDecorator {
    options = options || {};
    const hd = options.reflect?.class;
    const append = options.appendProps;
    return createDecorator<T>(name, {
        actionType: 'annoation',
        ...options,
        reflect: {
            ...options.reflect,
            class: [
                (ctx, next) => {
                    (ctx.reflect as ModuleReflect).singleton = true;
                    (ctx.reflect as ModuleReflect).annoType = 'boot';
                    (ctx.reflect as ModuleReflect).annoDecor = ctx.decor;
                    (ctx.reflect as ModuleReflect).annotation = ctx.matedata;
                    return next();
                },
                ...hd ? (isArray(hd) ? hd : [hd]) : []
            ]
        },
        design: {
            afterAnnoation: (ctx, next) => {
                const injector = ctx.injector.getValue(ROOT_INJECTOR);
                let startups = injector.get(STARTUPS) || [];
                const meta = ctx.reflect.class.getMetadata<BootMetadata>(ctx.currDecor) || {};
                let idx = -1;
                if (meta.before) {
                    idx = isString(meta.before) ? 0 : startups.indexOf(meta.before);
                } else if (meta.after) {
                    idx = isString(meta.after) ? -1 : startups.indexOf(meta.after) + 1;
                }
                if (idx >= 0) {
                    if (meta.deps) {
                        startups = [...startups.slice(0, idx), ...meta.deps, ctx.type, ...startups.slice(idx).filter(s => meta.deps.indexOf(s) < 0)];
                    } else {
                        startups.splice(idx, 0, ctx.type);
                    }
                } else {
                    if (meta.deps) {
                        meta.deps.forEach(d => {
                            if (startups.indexOf(d) < 0) {
                                startups.push(d);
                            }
                        });
                    }
                    startups.push(ctx.type);
                }
                injector.setValue(STARTUPS, startups);
                return next();
            }
        },
        appendProps: (meta) => {
            if (append) {
                append(meta);
            }
            if (isUndefined(meta.singleton)) {
                meta.singleton = true;
            }
            return meta;
        }
    }) as IBootDecorator;
}

/**
 * Boot decorator, use to define class as statup service when bootstrap application.
 *
 * @Boot()
 */
export const Boot: IBootDecorator = createBootDecorator<BootMetadata>('Boot');

/**
 * DI module metadata.
 *
 * @export
 * @interface DIModuleMetadata
 * @extends {ModuleConfigure}
 * @extends {ClassMetadata}
 */
export interface DIModuleMetadata extends ModuleConfigure { }

/**
 * DIModule decorator, use to define class as DI Module.
 *
 * @export
 * @interface IDIModuleDecorator
 * @template T
 */
export interface IDIModuleDecorator<T extends DIModuleMetadata> {
    /**
     * DIModule decorator, use to define class as DI Module.
     *
     * @DIModule
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


interface ModuleDesignContext extends DesignContext {
    reflect: ModuleReflect;
    moduleRef?: ModuleRef;
}

/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(name: string, options?: DecoratorOption<T>): IDIModuleDecorator<T> {
    options = options || {};
    const hd = options.reflect?.class;
    const append = options.appendProps;
    return createDecorator<DIModuleMetadata>(name, {
        ...options,
        reflect: {
            ...options.reflect,
            class: [
                (ctx, next) => {
                    (ctx.reflect as ModuleReflect).annoType = 'module';
                    (ctx.reflect as ModuleReflect).annoDecor = ctx.decor;
                    (ctx.reflect as ModuleReflect).annotation = ctx.matedata;
                    return next();
                },
                ...hd ? (isArray(hd) ? hd : [hd]) : []
            ]
        },
        design: {
            beforeAnnoation: (ctx: ModuleDesignContext, next) => {
                if (ctx.reflect.annoType === 'module') {
                    ctx.moduleRef = new DefaultModuleRef(ctx.type, ctx.injector as IModuleInjector, ctx.regIn || ctx.reflect.annotation.regIn);
                    (ctx.state as ModuleRegistered).moduleRef = ctx.moduleRef;
                    ctx.injector = ctx.moduleRef.injector;
                }
                next();
            },
            annoation: [
                (ctx: ModuleDesignContext, next) => {
                    if (ctx.moduleRef && ctx.reflect.annoType === 'module' && ctx.reflect.annotation) {
                        next()
                    }
                },
                (ctx: ModuleDesignContext, next) => {
                    if (ctx.reflect.annotation.imports) {
                        const types = ctx.moduleRef.injector.use(ctx.reflect.annotation.imports);
                        (ctx.moduleRef as DefaultModuleRef).imports = types;
                        const state = ctx.injector.state();
                        types.forEach(ty => {
                            const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
                            if (importRef) {
                                ctx.moduleRef.injector.addRef(importRef, true);
                            }
                        });
                    }
                    next();
                },
                (ctx: ModuleDesignContext, next: () => void) => {
                    const mdRef = ctx.moduleRef;
                    const { exports: map, injector } = mdRef;
                    const annotation = ctx.reflect.annotation;
                    let components = annotation.components ? injector.use(annotation.components) : null;

                    if (mdRef.regIn === 'root') {
                        mdRef.imports?.forEach(ty => map.export(ty));
                    }
                    // inject module providers
                    if (annotation.providers?.length) {
                        map.parse(annotation.providers);
                    }

                    if (map.size) {
                        injector.copy(map, k => !injector.has(k));
                    }

                    if (components && components.length) {
                        ctx.reflect.components = components;
                    }

                    lang.getTypes(annotation.exports).forEach(ty => {
                        map.export(ty);
                    });

                    next();
                },
                (ctx: ModuleDesignContext, next: () => void) => {
                    if (ctx.moduleRef.exports.size) {
                        if (ctx.moduleRef.parent?.isRoot()) {
                            ctx.moduleRef.parent.addRef(ctx.moduleRef);
                        }
                    }
                    next();
                }
            ]
        },
        appendProps: (meta) => {
            if (append) {
                append(meta as T);
            }

            if (!meta.name) {
                meta.name = lang.getClassName(meta.token);
            }
        }
    }) as IDIModuleDecorator<T>;
}

/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
export const DIModule: IDIModuleDecorator<DIModuleMetadata> = createDIModuleDecorator<DIModuleMetadata>('DIModule');


export type HandleDecorator = <TFunction extends Type<Middleware>>(target: TFunction) => TFunction | void;

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
     * route protocol
     */
    protocol?: string;

    /**
     * handle parent.
     * default register in root handle queue.
     * @type {boolean}
     */
    parent?: Type<Middlewares>;

    /**
     * register this handle handle before this handle.
     *
     * @type {Type<Middleware>}
     */
    before?: Type<Middleware>;

    /**
     * register this handle handle after this handle.
     *
     * @type {Type<Middleware>}
     */
    after?: Type<Middleware>;
}

export interface HandlesMetadata extends HandleMetadata {

    autorun?: string;
}

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
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {string} parent the handle reg in the handle queue. default register in root handle queue.
     * @param {Type<Router>} [parent] register this handle handle before this handle.
     */
    (route: string, parent?: Type<Router>): HandleDecorator;
    /**
     * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {Type<Middlewares>} [parent] the handle reg in the handle queue. default register in root handle queue.
     * @param {Type<Middleware>} [before] register this handle handle before this handle.
     */
    (parent: Type<Middlewares>, before?: Type<Middleware>): HandleDecorator;

    /**
     * RegisterFor decorator, for class. use to define the class as handle register in global handle queue or parent.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata: HandleMetadata): HandleDecorator;
}

/**
 * Handle decorator, for class. use to define the class as handle register in global handle queue or parent.
 * @Handle
 */
export const Handle: IHandleDecorator = createDecorator<HandleMetadata>('Handle', {
    actionType: ['annoation', 'autorun'],
    props: (parent?: Type<Middlewares> | string, before?: Type<Middleware>) =>
        (isString(parent) ? ({ route: parent, parent: before }) : ({ parent, before })) as HandleMetadata,
    design: {
        afterAnnoation: (ctx, next) => {
            const reflect = ctx.reflect as RouteReflect;
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

            const state = injector.state();
            let queue: Middlewares;
            if (parent) {
                queue = state.getInstance(parent);
                if (!queue) {
                    throw new Error(lang.getClassName(parent) + 'has not registered!')
                }
            }

            const type = ctx.type;
            if (isString(route) || reflect.class.isExtends(Route) || reflect.class.isExtends(Router)) {
                if (!queue) {
                    queue = injector.getInstance(RootRouter);
                } else if (!(queue instanceof Router)) {
                    throw new Error(lang.getClassName(queue) + 'is not message router!');
                }
                const prefix = (queue as Router).getPath();
                reflect.route_url = route;
                reflect.route_prefix = prefix;
                let middl: MiddlewareType;
                if (reflect.class.isExtends(Route) || reflect.class.isExtends(Router)) {
                    let exts: ProviderType[] = [];
                    if (route) {
                        exts.push({ provide: ROUTE_URL, useValue: route });
                    }
                    if (prefix) {
                        exts.push({ provide: ROUTE_PREFIX, useValue: prefix });
                    }
                    if (protocol) {
                        exts.push({ provide: ROUTE_PROTOCOL, useValue: protocol });
                    }
                    if (exts.length) {
                        state.setTypeProvider(reflect, ...exts);
                    }
                    middl = type;
                } else {
                    middl = new FactoryRoute(route, prefix, (pdr: IProvider) => injector.toInstance(type, pdr));
                }
                queue.use(middl);
                injector.onDestroy(() => queue.unuse(middl));
            } else {
                if (!queue) {
                    queue = injector.toInstance(ROOT_QUEUE);
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
    (metadata: RouteMapingMetadata): ClassMethodDecorator;
}

/**
 * RouteMapping decorator
 */
export const RouteMapping: IRouteMappingDecorator = createDecorator<RouteMapingMetadata>('RouteMapping', {
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
            const { route, parent, middlewares } = ctx.reflect.class.getMetadata<RouteMapingMetadata>(ctx.currDecor);
            const injector = ctx.injector;
            let queue: Middlewares;
            if (parent) {
                queue = injector.state().getInstance(parent);
            } else {
                queue = injector.getInstance(RootRouter);
            }

            if (!queue) throw new Error(lang.getClassName(parent) + 'has not registered!');
            if (!(queue instanceof Router)) throw new Error(lang.getClassName(queue) + 'is not message router!');

            const mapping = new MappingRoute(route, queue.getPath(), ctx.reflect as MappingReflect, injector, middlewares);
            injector.onDestroy(() => queue.unuse(mapping));
            queue.use(mapping);

            next();
        }
    }
});
