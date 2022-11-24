import {
    isUndefined, EMPTY_OBJ, isArray, lang, Type, createDecorator, ProviderType, InjectableMetadata,
    PropertyMetadata, ModuleMetadata, DesignContext, ModuleDef, DecoratorOption, ActionTypes,
    ReflectiveFactory, MethodPropDecorator, Token, ArgumentExecption, object2string, InvokeArguments,
    isString, Parameter, TypeDef, ProviderMetadata, TypeMetadata, ProvidersMetadata, PatternMetadata
} from '@tsdi/ioc';
import { ConfigureService } from './service';
import { PipeTransform } from './pipes/pipe';
import { Startup } from './startup';
import { getModuleType } from './module.ref';
import { Runnable, RunnableFactory } from './runnable';
import { ApplicationRunners } from './runners';


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
    const hd = options.def?.class ?? [];
    const append = options.appendProps;
    return createDecorator<ModuleMetadata>(name, {
        ...options,
        def: {
            ...options.def,
            class: [
                (ctx, next) => {
                    const def = ctx.def as ModuleDef;
                    const metadata: ModuleMetadata = def.annotation = ctx.metadata;
                    def.module = true;
                    def.providedIn = metadata.providedIn;
                    def.baseURL = metadata.baseURL;
                    def.debug = metadata.debug;
                    def.providers = metadata.providers;
                    if (metadata.imports) def.imports = getModuleType(metadata.imports);
                    if (metadata.exports) def.exports = lang.getTypes(metadata.exports);
                    if (metadata.declarations) def.declarations = lang.getTypes(metadata.declarations);
                    if (metadata.bootstrap) def.bootstrap = lang.getTypes(metadata.bootstrap);
                    return next()
                },
                ...isArray(hd) ? hd : [hd]
            ]
        },
        design: {
            beforeAnnoation: (context: DesignContext, next) => {
                const { type, def } = context;
                // use as dependence inject module.
                if (context.injectorType) {
                    context.injectorType(type, def)
                }
                next()
            }
        },
        appendProps: (meta) => {
            if (append) {
                append(meta as T)
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
 * alias of @Module
 * @alias
 */
export const DIModule = Module;

export interface RunnerOption extends InvokeArguments {
    /**
     * custom provider parmeters as default. if not has design parameters.
     */
    parameters?: Parameter[];
}
/**
 * Runner decorator, use to define the method of class as application Runner.
 */
export interface Runner {
    /**
     * Runner decorator, use to define the method of class as application Runner.
     *
     * @Module
     *
     * @param {string} runable the method of the class to run.
     * @param {RunnerOption} [args] the method invoke arguments {@link RunnerOption}.
     */
    (runable: string, args?: RunnerOption): ClassDecorator;

    /**
     * Runner decorator, use to define the method of class as application Runner.
     * 
     * @param {InvokeArguments} [args] the method invoke arguments {@link InvokeArguments}.
     */
    (args?: InvokeArguments): MethodDecorator;
}

export const Runner: Runner = createDecorator('Runner', {
    actionType: 'runnable',
    props: (method: string | RunnerOption, args?: RunnerOption) =>
        (isString(method) ? { method, args } : { args: method }),

    afterInit: (ctx) => {
        const meta = ctx.metadata as { method: string, args: RunnerOption };
        if (meta.args?.parameters) {
            ctx.def.class.setParameters(meta.method, meta.args.parameters)
        }
    }
});


/**
 * ComponentScan decorator.
 */
export type ComponentScanDecorator = <TFunction extends Type<Startup | ConfigureService | Runnable>>(target: TFunction) => TFunction | void;

/**
 * ComponentScan decorator, use to auto scan server or client for application.
 *
 * @export
 * @interface Configure
 */
export interface ComponentScan {
    /**
     * Configure decorator, use to auto scan server or client for application.
     *
     * @Configure()
     */
    (option?: {
        /**
         * order in set.
         */
        order?: number;
        /**
         * provider services of the class.
         *
         * @type {KeyValue<Token, Token>}
         */
        providers?: ProviderType[];
    }): ComponentScanDecorator;
}

/**
 * Configure decorator, use to auto scan server or client for application.
 * 
 * @exports {@link ComponentScan}
 */
export const ComponentScan: ComponentScan = createDecorator<ComponentScanMetadata>('ComponentScan', {
    actionType: ActionTypes.annoation,
    def: {
        class: (ctx, next) => {
            (ctx.def as ScanDef).order = (ctx.metadata as ComponentScanMetadata).order;
            next()
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const { type, injector } = ctx;
            const def = ctx.def as ScanDef;
            const runners = injector.get(ApplicationRunners);
            const typeRef = injector.get(ReflectiveFactory).create(type, injector);
            if (def.class.runnables.length || def.class.hasMetadata('run')) {
                const runner = typeRef.resolve(RunnableFactory).create(type, injector);
                runners.addRunnable(runner, def.order)
            } else if (def.class.hasMethod('startup')) {
                const runner = typeRef.resolve(RunnableFactory).create(type, injector, { defaultInvoke: 'startup' });
                runners.addStartup(runner, def.order)
            } else if (def.class.hasMethod('configureService')) {
                const runner = typeRef.resolve(RunnableFactory).create(type, injector, { defaultInvoke: 'configureService' });
                runners.addConfigureService(runner, def.order)
            }
            return next()
        }
    },
    appendProps: (meta) => {
        meta.singleton = true;
        return meta
    }
});


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
    actionType: [ActionTypes.annoation, ActionTypes.typeProviders],
    def: {
        class: (ctx, next) => {
            ctx.def.annotation = ctx.metadata;
            return next()
        }
    },
    props: (name: string, pure?: boolean) => ({ name, provide: name, pure }),
    appendProps: meta => {
        if (isUndefined(meta.pure)) {
            meta.pure = true
        }
    }
});

/**
 * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
 */
export interface Bean {
    /**
     * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
     * @param {Token} provide the value of the method or property for the provide token.
     */
    (provide?: Token): MethodPropDecorator;
}

/**
 * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
 */
export const Bean: Bean = createDecorator<BeanMetadata>('Bean', {
    props: (provide: Token) => ({ provide }),
    afterInit: (ctx) => {
        const metadata = ctx.metadata as BeanMetadata & PropertyMetadata;
        if (!metadata.provide) {
            if (metadata.type !== Object) {
                metadata.provide = metadata.type as any
            } else {
                throw new ArgumentExecption(`the property has no design Type, named ${ctx.propertyKey} with @Bean decorator in type ${object2string(ctx.def.type)}`)
            }
        }
    }
});

/**
 * Configuartion decorator, define the class as auto Configuration provider.
 */
export interface Configuration {
    /**
     * Configuartion decorator, define the class as auto Configuration provider.
     * @Configuartion
     */
    (): ClassDecorator;
}

/**
 * Configuartion decorator, define the class as auto Configuration provider.
 * @Configuartion
 */
export const Configuration: Configuration = createDecorator<InjectableMetadata>('Configuration', {
    actionType: [ActionTypes.annoation],
    design: {
        afterAnnoation: (ctx, next) => {
            const { def, injector } = ctx;

            const factory = injector.get(ReflectiveFactory).create(def, injector);
            const pdrs = def.class.decors.filter(d => d.decor === '@Bean')
                .map(d => {
                    const key = d.propertyKey;
                    const { provide } = d.metadata as BeanMetadata;
                    if (d.decorType === 'method') {
                        return {
                            provide,
                            useFactory: () => factory.invoke(key)
                        } as ProviderType
                    } else {
                        return {
                            provide,
                            useFactory: () => factory.resolve()[key]
                        } as ProviderType
                    }
                });
            injector.inject(pdrs);
            next()
        }
    },
    appendProps: (meta) => {
        // meta.providedIn = 'configuration';
        meta.singleton = true
    }
});


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
    deps?: Type<ConfigureService>[];
    /**
     * this service startup before the service, or at first
     */
    before?: Type<ConfigureService> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: Type<ConfigureService> | 'all';
}

/**
 * component scan metadata.
 */
export interface ComponentScanMetadata extends TypeMetadata, ProvidersMetadata {
    /**
     * order in set.
     */
    order?: number;
    /**
     * is singleton or not.
     *
     * @type {boolean}
     */
    singleton?: boolean;
}

/**
 * scan def.
 */
export interface ScanDef extends TypeDef {
    order?: number;
}

/**
 * pipe metadata.
 *
 * @export
 * @interface PipeMetadata
 * @extends {TypeMetadata}
 */
export interface PipeMetadata extends ProviderMetadata {
    /**
     * pipe class type.
     */
    type?: Type;
    /**
     * name of pipe.
     */
    name: string;
    /**
     * If Pipe is pure (its output depends only on its input.)
     */
    pure?: boolean;
}

/**
 * bean provider metadata.
 */
export interface BeanMetadata {
    /**
     * the token bean provider to.
     */
    provide: Token;
}
