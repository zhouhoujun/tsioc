import {
    DecoratorOption, isUndefined, createDecorator, ROOT_INJECTOR,
    lang, Type, isArray, isString, DesignContext, ClassMethodDecorator, ProviderType, TypeMetadata
} from '@tsdi/ioc';
import { IStartupService } from '../services/intf';
import { ModuleReflect, ModuleConfigure } from './ref';
import { Middleware, Middlewares, MiddlewareType, RouteReflect, ROUTE_PREFIX, ROUTE_PROTOCOL, ROUTE_URL } from '../middlewares/handle';
import { ROOT_QUEUE } from '../middlewares/root';
import { FactoryRoute, Route } from '../middlewares/route';
import { RootRouter, Router } from '../middlewares/router';
import { MappingReflect, MappingRoute, RouteMapingMetadata } from '../middlewares/mapping';
import { ModuleFactory, ModuleInjector, ModuleRegistered } from '../Context';
import { BOOT_TYPES, CONFIGURES } from './tk';
import { BootMetadata, DIModuleMetadata, HandleMetadata, HandlesMetadata } from './meta';
import { IConfigureRegister } from '../configure/register';


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
            let boots = root.get(BOOT_TYPES);
            if (!boots) {
                boots = [];
                root.setValue(BOOT_TYPES, boots);
            }
            const meta = ctx.reflect.class.getMetadata<BootMetadata>(ctx.currDecor) || {};

            let idx = -1;
            if (meta.before) {
                idx = isString(meta.before) ? 0 : boots.indexOf(meta.before);
            } else if (meta.after) {
                idx = isString(meta.after) ? -1 : boots.indexOf(meta.after) + 1;
            }
            if (idx >= 0) {
                if (meta.deps) {
                    const news = [];
                    const moved = [];
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
export type ConfigDecorator = <TFunction extends Type<IConfigureRegister>>(target: TFunction) => TFunction | void;



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

export const Configure: IConfigureDecorator = createDecorator<TypeMetadata>('Configure', {
    design: {
        afterAnnoation: (ctx, next) => {
            const { type, injector } = ctx;
            const root = injector.get(ROOT_INJECTOR);
            if (!root) return next();
            let configs = root.get(CONFIGURES);
            if (!configs) {
                configs = [type];
                root.setValue(CONFIGURES, configs);
            } else {
                configs.push(type);
            }
            return next();
        }
    },
})

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
    let hd = options.reflect?.class ?? [];
    const append = options.appendProps;
    return createDecorator<DIModuleMetadata>(name, {
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
            beforeAnnoation: (ctx: ModuleDesignContext, next) => {
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
                    queue = injector.get(RootRouter);
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
                        state.setTypeProvider(reflect, exts);
                    }
                    middl = type;
                } else {
                    middl = new FactoryRoute(route, prefix, () => injector.get(type));
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
                queue = injector.get(RootRouter);
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
