import { AbstractType } from '../types';
import { Token, InjectFlags } from '../tokens';
import { RunnableMetadata, InjectableMetadata, ModuleMetadata, PatternMetadata, ProvidersMetadata, ProvidedInTargetMetadata, ProvidedInMetadata } from './meta';
import { ClassMethodDecorator, PropParamDecorator } from './fac';
import { Provider } from '../providers';
import { ResolveInterceptorLike } from '../resolver';
import { InvokeOptions } from '../context';
import { DecoratorOption } from './define';
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
export declare function createModuleDecorator<T extends ModuleMetadata>(name: string, options?: DecoratorOption<T>): Module<T>;
/**
 * `Module` Decorator, definde class as module.
 *
 * @Module
 * @exports {@link Module}
 */
export declare const Module: Module<ModuleMetadata>;
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
        resolver?: ResolveInterceptorLike;
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
        defaultValue?: any;
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
        resolver?: ResolveInterceptorLike;
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
        defaultValue?: any;
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
export declare const Autowired: Autowired;
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
        resolver?: ResolveInterceptorLike;
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
        defaultValue?: any;
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
        resolver?: ResolveInterceptorLike;
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
        defaultValue?: any;
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
export declare const Inject: Inject;
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
export declare const Nullable: Nullable;
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
        resolver?: ResolveInterceptorLike;
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
        defaultValue?: any;
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
        resolver?: ResolveInterceptorLike;
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
        defaultValue?: any;
    }): ParameterDecorator;
}
/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param()
 */
export declare const Param: Param;
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
export declare const Optional: Optional;
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
export declare const Self: Self;
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
export declare const SkipSelf: SkipSelf;
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
export declare const Host: Host;
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
export declare const Injectable: Injectable;
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
    (providers: Provider[]): ClassDecorator;
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
export declare const Providers: Providers;
/**
 * ProvidedIn decorator, for class. use to define the class as service provider for target type.
 *
 * @Refs
 *
 * @export
 * @interface ProvidedIn
 */
export interface ProvidedIn {
    /**
     * ProvidedIn decorator, for class. use to define the class as service provider for target type.
     *
     * @Refs
     *
     * @param {AbstractType} target reference to target token.
     */
    (target: AbstractType): ClassDecorator;
    /**
     * ProvidedIn decorator, for class. use to define the class as service provider for target type.
     *
     * @Refs
     *
     * @param {AbstractType} target reference to target token.
     * @param {Token} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: AbstractType, provide: Token, alias?: string): ClassDecorator;
    /**
     * ProvidedIn decorator, for class. use to define the class as service provider for target type.
     *
     * @Refs
     *
     * @param {ProvidedInTargetMetadata} [metadata] metadata map.
     */
    (metadata: ProvidedInTargetMetadata): ClassDecorator;
}
/**
 * ProvidedIn decorator, for class. use to define the class as service provider for target type.
 *
 * @ProvidedIn
 */
export declare const ProvidedIn: ProvidedIn;
/**
 * @deprecated use `providedIn` instead.
 */
export declare const Refs: ProvidedIn;
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
export declare const Static: Static;
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
export declare const Singleton: Singleton;
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
     * @param {InvokeOptions} [args] invoke arguments {@link InvokeOptions}.
     */
    (autorun: string, args?: InvokeOptions): ClassDecorator;
    /**
     * Autorun decorator, for class or method. use to define the class auto run (via a method or not) after registered.
     * for class, to auto create singleton instance and call this method.
     * for method,  to auto this method after create new instance.
     * @Autorun
     *
     * @param {RunnableMetadata} [metadata] metadata map.
     */
    (metadata: RunnableMetadata): ClassMethodDecorator;
    /**
     * Autorun decorator, for method.  to auto this method after create new instance.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     * @param {InvokeOptions} [args] invoke arguments {@link InvokeOptions}.
     */
    (order?: number, args?: InvokeOptions): MethodDecorator;
}
/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
export declare const Autorun: Autorun;
export declare function nonEnumerable(target: any, propertyKey: string, descriptor?: PropertyDescriptor): any;
