import {
    DecoratorOption, isUndefined, ClassType, TypeMetadata, PatternMetadata, createDecorator,
    lang, Type, isFunction, Token, isArray, isString, DesignContext
} from '@tsdi/ioc';
import { IStartupService, STARTUPS } from './services/StartupService';
import { ModuleConfigure } from './modules/configure';
import { ModuleReflect } from './modules/reflect';
import { DefaultModuleRef } from './modules/injector';
import { IMessage, IMessageQueue } from './messages/type';
import { MessageQueue } from './messages/queue';
import { MessageContext } from './messages/ctx';
import { MessageHandle } from './messages/handle';
import { ROOT_INJECTOR, ROOT_MESSAGEQUEUE } from './tk';
import { IModuleInjector, ModuleRef, ModuleRegistered } from './modules/ref';


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
                        const types = ctx.moduleRef.injector.use(...ctx.reflect.annotation.imports);
                        (ctx.moduleRef as DefaultModuleRef).imports = types;
                        const container = ctx.injector.getContainer();
                        types.forEach(ty => {
                            const importRef = container.regedState.getRegistered<ModuleRegistered>(ty)?.moduleRef;
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
                    let components = annotation.components ? injector.use(...annotation.components) : null;

                    if (mdRef.regIn === 'root') {
                        mdRef.imports?.forEach(ty => map.export(ty));
                    }
                    // inject module providers
                    if (annotation.providers?.length) {
                        map.inject(...annotation.providers);
                    }

                    if (map.size) {
                        injector.copy(map, k => !injector.hasTokenKey(k));
                    }

                    if (components && components.length) {
                        ctx.reflect.components = components;
                    }

                    lang.getTypes(...annotation.exports || []).forEach(ty => {
                        map.export(ty);
                    });

                    next();
                },
                (ctx: ModuleDesignContext, next: () => void) => {
                    if (ctx.moduleRef.exports.size) {
                        if ((ctx.moduleRef.parent as IModuleInjector)?.isRoot()) {
                            (ctx.moduleRef.parent as IModuleInjector).addRef(ctx.moduleRef);
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


export type MessageDecorator = <TFunction extends Type<IMessage>>(target: TFunction) => TFunction | void;

/**
 * message metadata. use to define the class as message handle register in global message queue.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface MessageMetadata extends TypeMetadata, PatternMetadata {
    /**
     * message parent.
     * default register in root message queue.
     * @type {boolean}
     */
    parent?: Type<MessageQueue<MessageContext>> | 'root' | 'none';

    /**
     * register this message handle before this handle.
     *
     * @type {Type<MessageHandle>}
     */
    before?: Type<MessageHandle<MessageContext>>;

    /**
     * register this message handle after this handle.
     *
     * @type {Type<MessageHandle>}
     */
    after?: Type<MessageHandle<MessageContext>>;
}

/**
 * Message decorator, for class. use to define the class as message handle register in global message queue.
 *
 * @export
 * @interface IMessageDecorator
 * @extends {ITypeDecorator<ClassMetadata>}
 */
export interface IMessageDecorator {
    /**
     * Message decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {Type<MessageQueue<MessageContext>>} [parent] the message reg in the message queue. default register in root message queue.
     * @param {Type<MessageHandle<MessageContext>>} [before] register this message handle before this handle.
     */
    (parent?: Type<MessageQueue<MessageContext>> | 'root' | 'none', before?: Type<MessageHandle<MessageContext>>): MessageDecorator;

    /**
     * RegisterFor decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata: MessageMetadata): MessageDecorator;
}

/**
 * Message decorator, for class. use to define the class as message handle register in global message queue.
 *
 * @Message
 */
export const Message: IMessageDecorator = createDecorator<MessageMetadata>('Message', {
    actionType: 'annoation',
    props: (parent?: Type<MessageQueue<MessageContext>> | 'root' | 'none', before?: Type<MessageHandle<MessageContext>>) =>
        ({ parent, before }),
    design: {
        afterAnnoation: (ctx, next) => {
            const { parent, before, after } = ctx.reflect.class.getMetadata<MessageMetadata>(ctx.currDecor);
            if (!parent || parent === 'none') {
                return next();
            }

            let msgQueue: IMessageQueue;
            if (!isString(parent)) {
                msgQueue = ctx.injector.getContainer().regedState.getInjector(parent)?.get(parent);
            } else {
                msgQueue = ctx.injector.getInstance(ROOT_MESSAGEQUEUE);
            }

            if (!msgQueue) {
                throw new Error(lang.getClassName(parent) + 'has not registered!')
            }

            if (before) {
                msgQueue.useBefore(ctx.type, before);
            } else if (after) {
                msgQueue.useAfter(ctx.type, after);
            } else {
                msgQueue.use(ctx.type);
            }
            next();
        }
    },
    appendProps: (meta) => {
        meta.singleton = true;
        // default register in root.
        if (!meta.parent) {
            meta.parent = 'root';
        }
    }
});


/**
 * bootstrap metadata.
 *
 * @export
 * @interface BootstrapMetadata
 * @extends {AppConfigure}
 */
export interface BootstrapMetadata extends ModuleConfigure {
    /**
     * module bootstrap token.
     *
     * @type {Token<T>}
     */
    bootstrap?: Token;

}


/**
 * Bootstrap decorator, use to define class is a task element.
 *
 * @export
 * @interface IBootstrapDecorator
 * @template T
 */
export interface IBootstrapDecorator<T extends BootstrapMetadata> {
    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     *
     * @param {T} metadata bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {DecoratorOption<T>} [options]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(name: string, options?: DecoratorOption<T>): IBootstrapDecorator<T> {

    return createDIModuleDecorator<BootstrapMetadata>(name, {
        reflect: {
            class: (ctx, next) => {
                const reflect = ctx.reflect as ModuleReflect;
                reflect.annoType = 'module';
                reflect.annoDecor = ctx.decor;
                reflect.annotation = ctx.matedata;
                // static main.
                if (isFunction(ctx.decorType['main'])) {
                    setTimeout(() => {
                        ctx.decorType['main'](ctx.matedata);
                    }, 500);
                }
                return next();
            }
        },
        ...options
    }) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('Bootstrap');
