import { Type, ClassType, EMPTY, EMPTY_OBJ } from '../types';
import { isArray, isString } from '../utils/chk';
import { Token, getToken, InjectFlags } from '../tokens';
import {
    ClassMetadata, RunnableMetadata, AutoWiredMetadata, InjectMetadata, PatternMetadata,
    InjectableMetadata, ParameterMetadata, ProvidersMetadata, ProviderInMetadata, ModuleMetadata, ProvidedInMetadata
} from './meta';
import { ClassMethodDecorator, createDecorator, createParamDecorator, PropParamDecorator } from './fac';
import { ProviderType, StaticProvider } from '../providers';
import { OperationArgumentResolver } from '../resolver';
import { InvokeArguments, InvokeOptions } from '../context';
import { getModuleType } from '../module.ref';
import { getTypes } from '../utils/lang';
import { DesignContext } from '../actions/ctx';
import { DecoratorOption } from './refl';
import { ModuleDef } from './type';



/**
 * `Module` decorator, use to define class as ioc Module.
 *
 * @export
 * @interface Module
 * @template T
 */
export interface Module<T extends ModuleMetadata> {
    /**
     * `Module` decorator, use to define class as ioc Module.
     *
     * 模块修饰器，用于声明该类为IoC模块
     * @Module
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}

/**
 * create module decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {DecoratorOption<T>} [options]
 * @returns {Module<T>}
 */
export function createModuleDecorator<T extends ModuleMetadata>(name: string, options?: DecoratorOption<T>): Module<T> {
    options = options || EMPTY_OBJ;
    const hd = options.def?.class ?? EMPTY;
    const append = options.appendProps;
    return createDecorator<T>(name, {
        ...options,
        def: {
            ...options.def,
            class: [
                (ctx, next) => {
                    const def = ctx.class.getAnnotation<ModuleDef>();
                    const metadata = def.annotation = ctx.define.metadata;
                    def.module = true;
                    def.providedIn = metadata.providedIn;
                    def.baseURL = metadata.baseURL;
                    def.debug = metadata.debug;
                    def.providers = metadata.providers;
                    if (metadata.imports) def.imports = getModuleType(metadata.imports);
                    if (metadata.exports) def.exports = getTypes<ClassType>(metadata.exports);
                    if (metadata.declarations) def.declarations = getTypes<ClassType>(metadata.declarations);
                    if (metadata.bootstrap) def.bootstrap = getTypes(metadata.bootstrap);
                    return next()
                },
                ...isArray(hd) ? hd : [hd]
            ]
        },
        design: {
            beforeAnnoation: (context: DesignContext, next) => {
                const { type, class: typeRef } = context;
                // use as dependence inject module.
                if (context.injectorType) {
                    const result = context.injectorType(type, typeRef);
                    if (result) {
                        result.then(() => next());
                        return;
                    }
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
 * `Module` Decorator, definde class as module.
 * 
 * @Module
 * @exports {@link Module}
 */
export const Module: Module<ModuleMetadata> = createModuleDecorator<ModuleMetadata>('Module');
/**
 * `DIModule` Decorator, definde class as module.
 * alias of @Module
 * @alias
 */
export const DIModule = Module;

/**
 * `Autowired` decoator.
 */
export interface Autowired {
    /**
     * `Autowired` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * 
     * 类方法参数或属性的注入修饰器， 用于自动注入实例值给该类声明的类方法参数或类属性。 
     * @param {Token<T>} [provider] define provider to resolve value to the parameter or property.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider?: Token, alias?: string): PropParamDecorator;
    /**
     * `Autowired` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * 类方法参数或属性的注入修饰器， 用于自动注入实例值给该类声明的类方法参数或类属性。 
     * @param {Token} provider define provider to resolve value to the parameter or property.
     * @param option autowired option.
     */
    (provider: Token, option?: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is multi provider or not
         */
        multi?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;
    /**
     * `Autowired` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * 类方法参数或属性的注入修饰器， 用于自动注入实例值给该类声明的类方法参数或类属性。 
     * @param option autowired option.
     */
    (option: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is multi provider or not
         */
        multi?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;

    /**
     * `Autowired` decorator with providers for method.
     * @param {InvokeOptions} [options] the invoke options for the method.
     */
    (options?: InvokeOptions): MethodDecorator;
}


/**
 * `Autowired` decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * 类方法的注入修饰器， 用于声明的类方法的扩展调用配置。 
 * @Autowired()
 */
export const Autowired: Autowired = createDecorator<AutoWiredMetadata>('Autowired', {
    props: (provider: Token, alias?: string | Record<string, any>) => {
        if (alias) {
            return isString(alias) ? { provider: getToken(provider, alias) } : { provider: getToken(provider, alias.alias), ...alias, alias: undefined }
        } else {
            return { provider: provider }
        }
    }
});

/**
 * `Autowired` decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * alias of @Autowired()
 * 
 * @alias
 */
export const AutoWired = Autowired;

/**
 * inject decoator.
 */
export interface Inject {
    /**
     * `Inject` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * 
     * 类方法参数或属性的注入修饰器， 用于自动注入实例值给该类声明的类方法参数或类属性。 
     * @param {Token<T>} [provider] define provider to resolve value to the parameter or property.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider?: Token, alias?: string): PropParamDecorator;
    /**
     * `Inject` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * 类方法参数或属性的注入修饰器， 用于自动注入实例值给该类声明的类方法参数或类属性。 
     * @param {Token} provider define provider to resolve value to the parameter or property.
     * @param option inject option.
     */
    (provider: Token, option?: {
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is multi provider or not
         */
        multi?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;
    /**
     * `Inject` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * 类方法参数或属性的注入修饰器， 用于自动注入实例值给该类声明的类方法参数或类属性。 
     * @param option inject option.
     */
    (option: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is multi provider or not
         */
        multi?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;

    /**
     * `Inject` decorator with providers for method.
     * 
     * 类方法的注入修饰器， 用于声明的类方法的扩展调用配置。 
     * @param {InvokeOptions} [options] the invoke options for the method.
     */
    (options?: InvokeOptions): MethodDecorator;
}

/**
 * `Inject` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject()
 */
export const Inject: Inject = createDecorator<InjectMetadata>('Inject', {
    props: (provider: Token, alias?: string | Record<string, any>) => {
        if (alias) {
            return isString(alias) ? { provider: getToken(provider, alias) } : { provider: getToken(provider, alias.alias), ...alias, alias: undefined }
        } else {
            return { provider }
        }
    }
});

/**
 * @Nullable decoator. define param can enable null.
 */
export interface Nullable {
    /**
     * @Nullable decoator. define param can enable null.
     * 
     * 可空修饰器，用于定义该参数可空。
     */
    (): ParameterDecorator;

}
/**
 * @Nullable decoator. define param can enable null.
 */
export const Nullable: Nullable = createDecorator<InjectMetadata>('Nullable', {
    appendProps: (meta) => {
        meta.nullable = true;
        return meta
    }
});


/**
 * Parameter decorator.
 *
 * @export
 * @interface Param
 */
export interface Param {
    /**
     * `Param` decorator, define parameter decorator with param.
     * 
     * 类方法参数的注入修饰器， 用于自动注入实例值给该类声明的类方法参数。 
     * @param {Token} provider define provider to resolve value to the parameter.
     */
    (provider?: Token, alias?: string): ParameterDecorator;
    /**
     * `Param` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * 
     * 类方法参数的注入修饰器， 用于自动注入实例值给该类声明的类方法参数。 
     * @param {Token} provider define provider to resolve value to the parameter or property.
     * @param option inject option.
     */
    (provider: Token, option?: {
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is multi provider or not
         */
        multi?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): ParameterDecorator;
    /**
     * `Param` decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * 类方法参数的注入修饰器， 用于自动注入实例值给该类声明的类方法参数。 
     * @param option inject option.
     */
    (option: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is multi provider or not
         */
        multi?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): ParameterDecorator;
}

/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param()
 */
export const Param: Param = createParamDecorator<ParameterMetadata>('Param');

/**
 * Type of the Optional metadata.
 *
 * @publicApi
 */
export interface Optional {
    /**
     * Parameter decorator to be used on constructor parameters,
     * which marks the parameter as being an optional dependency.
     * The DI framework provides `null` if the dependency is not found.
     *
     * Can be used together with other parameter decorators
     * that modify how dependency injection operates.
     *
     * @usageNotes
     *
     * The following code allows the possibility of a `null` result
     */
    (): ParameterDecorator;
}

export const Optional: Optional = createParamDecorator('Optional', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.Optional
        } else {
            meta.flags = InjectFlags.Optional
        }
        return meta
    }
});

/**
 * Type of the Self metadata.
 *
 * @publicApi
 */
export interface Self {
    /**
     * Parameter decorator to be used on constructor parameters,
     * which tells the DI framework to start dependency resolution from the local injector.
     *
     * Resolution works upward through the injector hierarchy, so the children
     * of this class must configure their own providers or be prepared for a `null` result.
     *
     * @usageNotes
     *
     * In the following example, the dependency can be resolved
     * by the local injector when instantiating the class itself, but not
     * when instantiating a child.
     */
    (): ParameterDecorator;
}

export const Self: Self = createParamDecorator('Self', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.Self
        } else {
            meta.flags = InjectFlags.Self
        }
        return meta
    }
});


/**
 * Type of the SkipSelf metadata.
 *
 * @publicApi
 */
export interface SkipSelf {
    /**
     * Parameter decorator to be used on constructor parameters,
     * which tells the DI framework to start dependency resolution from the parent injector.
     * Resolution works upward through the injector hierarchy, so the local injector
     * is not checked for a provider.
     *
     * @usageNotes
     *
     * In the following example, the dependency can be resolved when
     * instantiating a child, but not when instantiating the class itself.
     *
     * @see `Self`
     * @see `Optional`
     *
     */
    (): ParameterDecorator;
}

/**
 * `SkipSelf` decorator and metadata.
 * 
 * @Annotation
 * @publicApi
 */
export const SkipSelf: SkipSelf = createParamDecorator('SkipSelf', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.SkipSelf
        } else {
            meta.flags = InjectFlags.SkipSelf
        }
        return meta
    }
});

/**
 * Type of the Host metadata.
 *
 * @publicApi
 */
export interface Host {
    /**
     * Parameter decorator on a compose element provider parameter of a class constructor
     * that tells the DI framework to resolve the view by checking injectors of child
     * elements, and stop when reaching the host element of the current component.
     *
     * @usageNotes
     *
     * The following shows use with the `@Optional` decorator, and allows for a `null` result.
     */
    (): ParameterDecorator;
}

/**
 * Host decorator and metadata.
 * @Annotation
 * @publicApi
 */
export const Host: Host = createParamDecorator('Host', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.Host
        } else {
            meta.flags = InjectFlags.Host
        }
        return meta
    }
});


/**
 * Injectable decorator
 *
 * @export
 * @interface Injectable
 */
export interface Injectable {

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} [provide] define this class provider for provide.
     * @param {PatternMetadata & ProvidedInMetadata} [pattern] define this class pattern.
     */
    (provide?: Token, pattern?: PatternMetadata & ProvidedInMetadata): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     * @param {PatternMetadata & ProvidedInMetadata} [pattern] define this class pattern.
     */
    (provide: Token, alias: string, pattern?: PatternMetadata & ProvidedInMetadata): ClassDecorator;

    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable()
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata: InjectableMetadata): ClassDecorator;
}


/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable()
 */
export const Injectable: Injectable = createDecorator<InjectableMetadata>('Injectable', {
    props: (provide: Token, arg2: any, arg3?: any) => {
        if (isString(arg2)) {
            return { provide: getToken(provide, arg2), ...arg3 }
        } else {
            return { provide, ...arg2 }
        }
    }
});


/**
 * @Providers decorator, for class. use to define the class as service of target.
 *
 * @Providers
 *
 * @export
 * @interface Providers
 */
export interface Providers {
    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {(Registration | symbol | string)} providers provider reference service to target.
     */
    (providers: ProviderType[]): ClassDecorator;

    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {ProvidersMetadata} [metadata] metadata map.
     */
    (metadata: ProvidersMetadata): ClassDecorator;
}

/**
 * Providers decorator, for class. use to add ref service to the class.
 *
 * @Providers
 */
export const Providers: Providers = createDecorator<ProvidersMetadata>('Providers', {
    props: (providers: StaticProvider[]) => ({ providers }),
});



/**
 * ProviderIn decorator, for class. use to define the class as service of target.
 *
 * @Refs
 *
 * @export
 * @interface ProviderIn
 */
export interface ProviderIn {
    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {Type} target reference to target token.
     */
    (target: Type): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {Type} target reference to target token.
     * @param {Token} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: Type, provide: Token, alias?: string): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ProviderInMetadata} [metadata] metadata map.
     */
    (metadata: ProviderInMetadata): ClassDecorator;
}

/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 */
export const ProviderIn: ProviderIn = createDecorator<ProviderInMetadata>('ProviderIn', {
    props: (target: Type, provide?: Token, alias?: string) => ({ target, provide: getToken(provide!, alias) }),
    design: {
        afterAnnoation: (ctx, next) => {
            const meta = ctx.class.getMetadata<ProviderInMetadata>(ctx.currDecor!);
            const type = ctx.type;
            ctx.injector.platform().setTypeProvider(meta.target, [{ provide: meta.provide || type, useClass: type }])
            return next()
        }
    }
});


export const Refs = ProviderIn;

/**
 * Static decorator, for class. use to define the class is static in injector.
 */
export interface Static {
    /**
     * Static decorator, for class. use to define the class is static in injector.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     */
    (provide?: Token): ClassDecorator;
    /**
     * Static decorator, for class. use to define the class is static in injector.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;
}

/**
 * Static decorator, for class. use to define the class is static in injector.
 *
 * @Static()
 */
export const Static: Static = createDecorator<ClassMetadata>('Static', {
    props: (provide: Token, alias?: string) => ({ provide: getToken(provide, alias) }),
    appendProps: (meta) => {
        meta.static = true
    }
});



/**
 * Singleton decorator, for class. use to define the class is singleton in global.
 *
 * @Singleton()
 *
 * @export
 * @interface Singleton
 */
export interface Singleton {
    /**
     * Singleton decorator, for class. use to define the class is singleton in global.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     */
    (provide?: Token): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton in global.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;

}

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 */
export const Singleton: Singleton = createDecorator<ClassMetadata>('Singleton', {
    props: (provide: Token, alias?: string) => ({ provide: getToken(provide, alias) }),
    appendProps: (meta) => {
        meta.singleton = true
    }
});


/**
 * autorun decorator inteface
 *
 * @export
 * @interface Autorun
 */
export interface Autorun {
    /**
     * Autorun decorator, for class. to auto create singleton instance and call this method.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     * @param {InvokeArguments} [args] invoke arguments {@link InvokeArguments}.
     */
    <T>(autorun: string, args?: InvokeArguments<T>): ClassDecorator;
    /**
     * Autorun decorator, for class or method. use to define the class auto run (via a method or not) after registered.
     * for class, to auto create singleton instance and call this method.
     * for method,  to auto this method after create new instance.
     * @Autorun
     *
     * @param {RunnableMetadata} [metadata] metadata map.
     */
    <T>(metadata: RunnableMetadata<T>): ClassMethodDecorator;

    /**
     * Autorun decorator, for method.  to auto this method after create new instance.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     * @param {InvokeArguments} [args] invoke arguments {@link InvokeArguments}.
     */
    <T>(order?: number, args?: InvokeArguments<T>): MethodDecorator;
}

/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
export const Autorun: Autorun = createDecorator<RunnableMetadata<any>>('Autorun', {
    props: (arg: string | number, args?: InvokeArguments<any>) => {
        if (isString(arg)) {
            return { method: arg, args }
        }
        return { order: arg, args }
    },
    afterInit: (ctx) => {
        ctx.define.metadata.auto = true;
        if (ctx.define.decorType === 'class') {
            ctx.define.metadata.singleton = true
        }
    }
});
