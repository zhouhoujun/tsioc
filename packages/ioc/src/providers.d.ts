import { Type, Modules, AbstractType } from './types';
import { Token } from './tokens';
import { Injector, InjectorRecord } from './injector';
import { ParameterLike } from './resolver';
/**
 * provide for {@link Injector }.
 */
export interface Provide<T> {
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     * @memberof Provider
     */
    provide: Token<T>;
}
export type DependLike = InjectorRecord | ParameterLike;
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
    deps?: DependLike[];
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
export interface ClassProvider<T> extends Provide<T>, UseClass<T> {
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
 * const provider: ValueProvider = {provide: MyService, useValue: service };
 * ```
 * @description
 * Configures the `Injector` to return an instance of `useValue` for a token.
 *
 * @export
 * @interface ValueProvider
 * @extends {ProvideProvider}
 */
export interface ValueProvider<T> extends Provide<T>, UseValue<T> {
}
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
    deps?: DependLike[];
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
export interface FactoryProvider<T> extends Provide<T>, UseFactory<T> {
}
/**
 * constructor provider.
 */
export interface ConstructorProvider<T> extends MutilProvider {
    /**
     * An injection token. Typically an instance of `Type` or `InjectionToken`, but can be `any`.
     */
    provide: Type<T>;
    /**
     * A list of `token`s which need to be resolved by the injector. The list of values is then
     * used as arguments to the `useFactory` function.
     */
    deps?: DependLike[];
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
export interface ExistingProvider<T> extends Provide<T>, UseExisting<T> {
}
/**
 * type provider.
 */
export type TypeProvider<T> = Type<T>;
/**
 * dynamic provider.
 */
export interface DynamicProvider {
    provider(injector: Injector): void | StaticProvider[] | Promise<void | StaticProvider[]>;
}
/**
 * use static provider of.
 */
export type ProvdierOf<T> = UseClass<T> | UseValue<T> | UseFactory<T> | UseExisting<T> | TypeProvider<T> | T;
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
export type Provider<T = any> = StaticProvider<T> | DynamicProvider | Modules[] | Array<Provider<T>>;
export declare function asProvider<T>(provider: Provider<T>): Provider<T>;
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
export type ModuleType<T extends AbstractType = AbstractType> = Modules<T> | ModuleWithProviders | Array<ModuleType>;
/**
 * is module providers or not.
 * @param target
 * @returns
 */
export declare function isModuleProviders(target: any): target is ModuleWithProviders;
export declare function isValueProvider<T = any>(target: StaticProvider<T>): target is ValueProvider<T>;
export declare function isTypeProvider<T = any>(target: StaticProvider<T>): target is TypeProvider<T>;
export declare function isClassProvider<T = any>(target: StaticProvider<T>): target is ClassProvider<T>;
export declare function isExistingProvider<T = any>(target: StaticProvider<T>): target is ExistingProvider<T>;
export declare function isFactoryProvider<T = any>(target: StaticProvider<T>): target is FactoryProvider<T>;
/**
 * parse to provider
 * @param provide
 * @param useOf
 * @param multi
 * @param multiOrder
 * @returns
 */
export declare function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean): StaticProvider<T>;
export declare function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, options?: {
    multi?: boolean;
    static?: boolean;
    multiOrder?: number;
    onRegistered?: (injector: Injector) => void;
}): StaticProvider<T>;
export declare function toMutilProvdierOf<T>(useOf: ProvdierOf<T>, multiOrder?: number): ProvdierOf<T>;
/**
 * parse to provider
 * @param provide
 * @param useOf
 * @param multi
 * @param multiOrder
 * @returns
 */
export declare function toProviders<T>(provide: Token, useOf: ProvdierOf<T>[], multi?: boolean): StaticProvider<T>[];
export declare function toProviders<T>(provide: Token, useOf: ProvdierOf<T>[], options?: {
    multi?: boolean;
    static?: boolean;
    multiOrder?: number;
    onRegistered?: (injector: Injector) => void;
}): StaticProvider<T>[];
