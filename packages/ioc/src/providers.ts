import { Type, Modules, AbstractType } from './types';
import { InjectFlags, Token } from './tokens';
import { Injector } from './injector';
import { isPlainObject } from './utils/obj';
import { isArray, isBoolean, isDefined, isFunction, isNil } from './utils/chk';
import { ArgumentException } from './exception';
import { Parameter } from './resolver';
import { isType, getTypeName } from './metadata/type';

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

export interface MutilProvider {
    /**
     * provide multi or not.
     */
    multi?: boolean;
    /**
     * multi order.
     */
    multiOrder?: number;
}

/**
 * provider exts options.
 */
export interface ProviderExts extends MutilProvider {
    /**
     * provide as default. if has exist the provide will not inject.
     */
    asDefault?: boolean;

    /**
     * the hooks raise after registered.
     * @param injector 
     */
    onRegistered?(injector: Injector): void;
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
    deps?: Array<Token | [Token, ...InjectFlags[]]>;
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
    deps?: Array<Token | [Token, ...InjectFlags[]]>;
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
export interface ConstructorProvider<T = any> extends MutilProvider {
    /**
     * An injection token. Typically an instance of `Type` or `InjectionToken`, but can be `any`.
     */
    provide: Type<T>;
    /**
     * A list of `token`s which need to be resolved by the injector. The list of values is then
     * used as arguments to the `useFactory` function.
     */
    deps?: Array<Token | [Token, ...InjectFlags[]] | Parameter>;
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
 * dynamic provider.
 */
export interface DynamicProvider {
    provider(injector: Injector): void | StaticProvider[] | Promise<void | StaticProvider[]>;
}

/**
 * use static provider of.
 */
export type ProvdierOf<T> = UseClass<T> | UseValue<T> | UseFactory<T> | UseExisting<T> | TypeProvider<T> | T; //Exclude<T, Function>;


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
export type Provider = StaticProvider | DynamicProvider | Modules[] | Array<Provider>;

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
    providers: Provider[];
}

export type ModuleType<T extends AbstractType = AbstractType> = Modules<T> | ModuleWithProviders | Array<ModuleType|Provider>;

/**
 * is module providers or not.
 * @param target 
 * @returns 
 */
export function isModuleProviders(target: any): target is ModuleWithProviders {
    return target && isFunction(target.module) && isArray(target.providers)
}

export function isValueProvider(target: StaticProvider): target is ValueProvider {
    return isPlainObject(target) && ('useValue' in target);
}

export function isTypeProvider(target: StaticProvider): target is TypeProvider {
    return isFunction(target);
}

export function isClassProvider(target: StaticProvider): target is ClassProvider {
    return target && isFunction((target as ClassProvider).useClass);
}

export function isExistingProvider(target: StaticProvider): target is ExistingProvider {
    return target && isFunction((target as ExistingProvider).useExisting);
}

export function isFactoryProvider(target: StaticProvider): target is FactoryProvider {
    return target && isFunction((target as FactoryProvider).useFactory);
}
/**
 * parse to provider
 * @param provide 
 * @param useOf 
 * @param multi 
 * @param multiOrder 
 * @returns 
 */
export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean): StaticProvider<T>;
export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, options?: {
    multi?: boolean,
    static?: boolean,
    multiOrder?: number,
    onRegistered?: (injector: Injector) => void
}): StaticProvider<T>;

export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean | {
    multi?: boolean
    multiOrder?: number,
    onRegistered?: (injector: Injector) => void
}): StaticProvider<T> {
    const options = (isBoolean(multi) ? { multi } : (multi ?? {})) as {
        multi?: boolean
        multiOrder?: number,
        onRegistered?: (injector: Injector) => void
    };

    if (isType(useOf)) {
        if (provide == useOf) throw new ArgumentException(getTypeName(provide) + ': provide is equals to provider')
        return { ...options, provide, useClass: useOf };
    } else if (isPlainObject(useOf) && (isDefined((useOf as UseClass<T>).useClass)
        || isDefined((useOf as UseValue<T>).useValue)
        || isDefined((useOf as UseFactory<T>).useFactory)
        || isDefined((useOf as UseExisting<T>).useExisting))) {
        return { ...options, ...useOf, provide } as StaticProvider;
    }

    return { ...options, provide, useValue: useOf as T };
    // throw new ArgumentException('the argument is not ProviderOf type');
}

export function toMutilProvdierOf<T>(useOf: ProvdierOf<T>, multiOrder?: number): ProvdierOf<T> {
    if (isNil(multiOrder)) return useOf;
    if (isType(useOf)) {
        return { useClass: useOf, multi: true, multiOrder };
    } else if (isPlainObject(useOf) && (isDefined((useOf as UseClass<T>).useClass)
        || isDefined((useOf as UseValue<T>).useValue)
        || isDefined((useOf as UseFactory<T>).useFactory)
        || isDefined((useOf as UseExisting<T>).useExisting))) {
        return { ...useOf, multi: true, multiOrder }
    }

    return { useValue: useOf as T, multi: true, multiOrder }
    // throw new ArgumentException('the argument is not ProviderOf type');
}

/**
 * parse to provider
 * @param provide 
 * @param useOf 
 * @param multi 
 * @param multiOrder 
 * @returns 
 */
export function toProviders<T>(provide: Token, useOf: ProvdierOf<T>[], multi?: boolean): StaticProvider<T>[];
export function toProviders<T>(provide: Token, useOf: ProvdierOf<T>[], options?: {
    multi?: boolean,
    static?: boolean,
    multiOrder?: number,
    onRegistered?: (injector: Injector) => void
}): StaticProvider<T>[];

export function toProviders<T>(provide: Token, useOf: ProvdierOf<T>[], multi?: boolean | {
    multi?: boolean
    multiOrder?: number,
    onRegistered?: (injector: Injector) => void
}): StaticProvider<T>[] {
    return useOf.map(r => toProvider(provide, r, multi as any));
}

