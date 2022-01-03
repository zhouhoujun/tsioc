import {
    isUndefined, EMPTY_OBJ, isArray, lang, Type, createDecorator, ProviderType,
    ModuleMetadata, DesignContext, ModuleReflect, DecoratorOption, ActionTypes,
    OperationFactoryResolver, PatternMetadata, MethodPropDecorator, Token, PropertyMetadata, ArgumentError, object2string, ClassMetadata, InjectableMetadata
} from '@tsdi/ioc';
import { StartupService, ServiceSet } from '../service';
import { PipeMetadata, ComponentScanMetadata, ScanReflect, BeanMetadata } from './meta';
import { PipeTransform } from '../pipes/pipe';
import { Server, ServerSet } from '../server';
import { getModuleType } from '../module.ref';
import { Client, ClientSet } from '../client';
import { Runnable, RunnableSet } from '../runnable';
import { ScanSet } from '../scan.set';



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
 * alias of @Module
 * @alias
 */
export const DIModule = Module;


/**
 * ComponentScan decorator.
 */
export type ComponentScanDecorator = <TFunction extends Type<Server | Client | StartupService | Runnable>>(target: TFunction) => TFunction | void;

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
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as ScanReflect).order = (ctx.metadata as ComponentScanMetadata).order;
            next();
        }
    },
    design: {
        afterAnnoation: (ctx, next) => {
            const { type, injector } = ctx;
            const reflect = ctx.reflect as ScanReflect;
            let sets: ScanSet | undefined;
            if (reflect.class.hasMethod('connect', 'send', 'emit')) {
                sets = injector.get(ClientSet)
            } else if (reflect.class.hasMethod('startup')) {
                sets = injector.get(ServerSet);
            } else if (reflect.class.hasMethod('configureService')) {
                sets = injector.get(ServiceSet);
            } else if (reflect.class.hasMetadata('run')) {
                sets = injector.get(RunnableSet);
            }
            if (sets && !sets.has(type)) {
                const typeRef = injector.get(OperationFactoryResolver).resolve(type, injector);
                sets.add(typeRef, reflect.order);
            }
            return next();
        }
    },
    appendProps: (meta) => {
        meta.singleton = true;
        return meta;
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
 * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
 */
export interface Bean {
    /**
     * Bean decorator. bean provider, provider the value of the method or property for Confgiuration.
     * @param {Token} provide the value of the method or property for the provide token.
     */
    (provide?: Token): MethodPropDecorator;
}

export const Bean: Bean = createDecorator<BeanMetadata>('Bean', {
    props: (provide: Token) => ({ provide }),
    afterInit: (ctx) => {
        let metadata = ctx.metadata as BeanMetadata & PropertyMetadata;
        if (!metadata.provide) {
            if (metadata.type !== Object) {
                metadata.provide = metadata.type as any;
            } else {
                throw new ArgumentError(`the property has no design Type, named ${ctx.propertyKey} with @Bean decorator in type ${object2string(ctx.reflect.type)}`)
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
            const { reflect, type, injector } = ctx;

            const pdrs = reflect.class.decors.filter(d => d.decor === '@Bean')
                .map(d => {
                    const key = d.propertyKey;
                    const { provide } = d.metadata as BeanMetadata;
                    if (d.decorType === 'method') {
                        return {
                            provide,
                            useFactory: () => injector.invoke(type, key)
                        } as ProviderType
                    } else {
                        return {
                            provide,
                            useFactory: () => injector.get(type)[key]
                        } as ProviderType
                    }
                })
            injector.inject(pdrs);
            next();
        }
    },
    appendProps: (meta) => {
        // meta.providedIn = 'configuration';
        meta.singleton = true;
    }
});

