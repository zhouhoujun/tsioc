import { Modules, Type } from './types';
import { Token } from './tokens';

/**
 * provider for {@link Injector }.
 */
export interface ProvideProvider<T = any> {
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     * @memberof Provider
     */
    provide: Token<T>;
    /**
     * provide multi or not.
     */
    multi?: boolean;
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
export interface ClassProvider<T = any> extends ProvideProvider<T> {
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
export interface ValueProvider<T = any> extends ProvideProvider<T> {
    /**
     * use value for provide.
     *
     * @type {*}
     */
    useValue: any;
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
export interface FactoryProvider<T = any> extends ProvideProvider<T> {
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
export interface ExistingProvider<T = any> extends ProvideProvider<T> {
    /**
     * use existing registered token for provide.
     *
     * @type {Token}
     * @memberof ExistingProvider
     */
    useExisting: Token<T>;
}

/**
 * type provider.
 */
export interface TypeProvider<T = any> extends Type<T> { }

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
 * injector type with providers.
 */
export interface InjectorTypeWithProviders<T = any> {
    module: Type<T>;
    providers: ProviderType[]
}
