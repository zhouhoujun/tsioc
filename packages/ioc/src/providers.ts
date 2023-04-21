import { Modules, Type, TypeOf } from './types';
import { Token } from './tokens';
import { Injector } from './injector';
import { isPlainObject } from './utils/obj';
import { isArray, isDefined, isType } from './utils/chk';

/**
 * provide for {@link Injector }.
 */
export interface Provide<T = any> {
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     * @memberof Provider
     */
    provide: Token<T>;
}

export interface UseAsStatic {
    /**
     * is static value for provide.
     */
    static?: boolean;
}

/**
 * provider exts options.
 */
export interface ProviderExts {
    /**
     * provide multi or not.
     */
    multi?: boolean;
    /**
     * multi order.
     */
    multiOrder?: number;
    /**
     * provide as default. if has exist the provide will not inject.
     */
    asDefault?: boolean;
}

/**
 * Use class as provider.
 */
export interface UseClass<T> extends ProviderExts, UseAsStatic {
    /**
     * use class for provide.
     *
     * @type {Type}
     * @memberof ClassProvider
     */
    useClass: Type<T>;
    /**
     * A list of `token`s which need to be resolved by the injector.
     * 
     * [[token1, InjectFlags.SkipSelf], token2]
     */
    deps?: any[];
    /**
     * singleton or not.
     */
    singleton?: boolean;
}

/**
 * class provider for {@link Injector }.
 * 
 * example:
 * ```typescript
 * @Injectable()
 * class MyService {}
 *
 * const provider: ClassProvider = {provide: 'someToken', useClass: MyService};
 * ```
 *
 * @description
 * Configures the `Injector` to return an instance of `useClass` for a token.
 *
 */
export interface ClassProvider<T = any> extends Provide<T>, UseClass<T> {
}

/**
 * Use value as provider
 */
export interface UseValue<T> extends ProviderExts {

    /**
     * use value for provide.
     *
     * @type {*}
     */
    useValue: T;
}

/**
 * value provider.
 *
 * @usageNotes
 * ```
 * const provider: ClassProvider = {provide: 'someToken', useClass: MyService};
 * ```
 * @description
 * Configures the `Injector` to return an instance of `useValue` for a token.
 *
 * @export
 * @interface ValueProvider
 * @extends {ProvideProvider}
 */
export interface ValueProvider<T = any> extends Provide<T>, UseValue<T> { }

/**
 * Use factory  as provider.
 */
export interface UseFactory<T> extends ProviderExts, UseAsStatic {
    /**
    * A function to invoke to create a value for this `token`. The function is invoked with
    * resolved values of `token`s in the `deps` field.
    */
    useFactory: (...args: any[]) => T;
    /**
     * A list of `token`s which need to be resolved by the injector. The list of values is then
     * used as arguments to the `useFactory` function.
     */
    deps?: any[];
}

/**
 * @usageNotes
 * ```
 * function serviceFactory() { ... }
 *
 * const provider: FactoryProvider = {provide: 'someToken', useFactory: serviceFactory, deps: []};
 * ```
 *
 * @description
 * Configures the `Injector` to return a value by invoking a `useFactory` function.
 *
 */
export interface FactoryProvider<T = any> extends Provide<T>, UseFactory<T> { }

/**
 * constructor provider.
 */
export interface ConstructorProvider<T = any> {
    /**
     * An injection token. Typically an instance of `Type` or `InjectionToken`, but can be `any`.
     */
    provide: Type<T>;
    /**
     * A list of `token`s which need to be resolved by the injector.
     */
    deps?: any[];
}


/**
 * Use existing as provider.
 */
export interface UseExisting<T> extends ProviderExts, UseAsStatic {
    /**
     * use existing registered token for provide.
     *
     * @type {Token}
     * @memberof ExistingProvider
     */
    useExisting: Token<T>;
}

/**
 * existing provider.
 *
 * @usageNotes
 * ```
 * const provider: ClassProvider = {provide: 'someToken', useExisting: 'registeredToken'};
 * ```
 * @export
 * @interface ExistingProvider
 * @extends {ProvideProvider}
 */
export interface ExistingProvider<T = any> extends Provide<T>, UseExisting<T> { }

/**
 * type provider.
 */
export type TypeProvider<T = any> = Type<T>;

/**
 * use static provider of.
 */
export type ProvdierOf<T> = UseClass<T> | UseValue<T> | UseFactory<T> | UseExisting<T> | TypeProvider<T> | TypeOf<T>;

/**
 * static providers.
 */
export type StaticProviders = ClassProvider & ValueProvider & ConstructorProvider & ExistingProvider & FactoryProvider;

/**
 * static provider type.
 * 
 * include type {@link TypeProvider}, {@link ClassProvider}, {@link ValueProvider}, {@link ConstructorProvider}, {@link ExistingProvider}, {@link FactoryProvider}, {@link KeyValueProvider}.
 */
export type StaticProvider<T = any> = TypeProvider<T> | ClassProvider<T> | ValueProvider<T> | ConstructorProvider<T> | ExistingProvider<T> | FactoryProvider<T>;

/**
 * providers for {@link Injector}.
 * 
 */
export type ProviderType = Type | Modules[] | StaticProvider;

/**
 * type module with providers.
 */
export interface ModuleWithProviders<T = any> {
    /**
     * module type
     */
    module: Type<T>;
    /**
     * providers for the module
     */
    providers: ProviderType[];
}

/**
 * is module providers or not.
 * @param target 
 * @returns 
 */
export function isModuleProviders(target: any): target is ModuleWithProviders {
    return target && isType(target.module) && isArray(target.providers)
}

/**
 * parse to provider
 * @param provide 
 * @param useOf 
 * @param multi 
 * @param multiOrder 
 * @returns 
 */
export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean, multiOrder?: number, isClass?: (type: Function) => boolean): StaticProvider<T> {
    if (isType(useOf) && (isClass ? isClass(useOf) : true)) {
        return { provide, useClass: useOf, multi, multiOrder };
    } else if (isPlainObject(useOf) && (isDefined((useOf as UseClass<T>).useClass)
        || isDefined((useOf as UseValue<T>).useValue)
        || isDefined((useOf as UseFactory<T>).useFactory)
        || isDefined((useOf as UseExisting<T>).useExisting))) {
        return { multiOrder, multi, ...useOf, provide } as StaticProvider;
    }

    return { provide, useValue: useOf as T, multi, multiOrder }
}
