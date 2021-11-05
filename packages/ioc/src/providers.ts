import { Modules, Type } from './types';
import { Token } from './tokens';

/**
 * provider for {@link Injector }.
 */
export interface ProvideProvider {
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     * @memberof Provider
     */
    provide: Token;
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
export interface ClassProvider extends ProvideProvider {
    /**
     * use class for provide.
     *
     * @type {Type}
     * @memberof ClassProvider
     */
    useClass: Type;
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
export interface ValueProvider extends ProvideProvider {
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
export interface FactoryProvider extends ProvideProvider {
    /**
    * A function to invoke to create a value for this `token`. The function is invoked with
    * resolved values of `token`s in the `deps` field.
    */
    useFactory: Function;
    /**
     * A list of `token`s which need to be resolved by the injector. The list of values is then
     * used as arguments to the `useFactory` function.
     */
    deps?: any[];
}

/**
 * constructor provider.
 */
export interface ConstructorProvider {
    /**
     * An injection token. Typically an instance of `Type` or `InjectionToken`, but can be `any`.
     */
    provide: Type;
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
export interface ExistingProvider extends ProvideProvider {
    /**
     * use existing registered token for provide.
     *
     * @type {Token}
     * @memberof ExistingProvider
     */
    useExisting: Token;
}


/**
 * keyvalues map provider.
 * use provider value for param by param name.
 *
 */
export class KeyValueProvider {
    protected maps: Record<string, any>;
    constructor() {
        this.maps = {};
    }

    set(options: Record<string, any>): this {
        if (options) {
            this.maps = { ... this.maps, ...options };
        }
        return this;
    }

    each(callback: (key: string, value: any) => boolean | void) {
        for (let n in this.maps) {
            if (callback(n, this.maps[n]) === false) {
                break;
            }
        }
    }

    /**
     * parse  provider.
     *
     * @static
     * @param {Record<string, any>} options
     * @returns
     */
    static parse(options: Record<string, any>) {
        let pdr = new KeyValueProvider();
        pdr.set(options);
        return pdr;
    }
}

/**
 * type provider.
 */
export interface TypeProvider extends Type { }

/**
 * static providers.
 */
export type StaticProviders = ClassProvider & ValueProvider & ConstructorProvider & ExistingProvider & FactoryProvider;

/**
 * static provider type.
 * 
 * include type {@link TypeProvider}, {@link ClassProvider}, {@link ValueProvider}, {@link ConstructorProvider}, {@link ExistingProvider}, {@link FactoryProvider}, {@link KeyValueProvider}.
 */
export type StaticProvider = TypeProvider | ClassProvider | ValueProvider | ConstructorProvider | ExistingProvider | FactoryProvider | KeyValueProvider;

/**
 * injector type with providers.
 */
export interface InjectorTypeWithProviders<T = any> {
    module: Type<T>;
    providers: (Modules[]|StaticProvider)[]
}


