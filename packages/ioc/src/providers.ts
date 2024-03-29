import { Type, ClassType, Modules, TypeOf, EMPTY_OBJ } from './types';
import { InjectFlags, Token } from './tokens';
import { Injector, OptionFlags } from './injector';
import { isPlainObject } from './utils/obj';
import { isArray, isBoolean, isDefined, isType } from './utils/chk';
import { ArgumentExecption } from './execption';
import { getClassName } from './utils/lang';

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
     * @type {ClassType}
     * @memberof ClassProvider
     */
    useClass: ClassType<T>;
    /**
     * A list of `token`s which need to be resolved by the injector.
     * 
     * [[token1, InjectFlags.SkipSelf], token2]
     */
    deps?: (Token | [Token, ...InjectFlags[]] | { token: Token, options: OptionFlags })[];
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
    deps?: (Token | [Token, ...InjectFlags[]] | { token: Token, options: OptionFlags })[];
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
     * An injection token. Typically an instance of `CtorType` or `InjectionToken`, but can be `any`.
     */
    provide: ClassType<T>;
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
export type TypeProvider<T = any> = ClassType<T>;

/**
 * dynamic provider.
 */
export interface DynamicProvider {
    provider(injector: Injector): StaticProvider | StaticProvider[];
}

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
export type ProviderType = ClassType | Modules[] | StaticProvider | DynamicProvider;

/**
 * type module with providers.
 */
export interface ModuleWithProviders<T = any> {
    /**
     * module type
     */
    module: ClassType<T>;
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
export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean): StaticProvider<T>;
export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, options?: {
    multi?: boolean,
    static?: boolean,
    multiOrder?: number,
    isClass?: (type: Function) => boolean,
    onRegistered?: (injector: Injector) => void
}): StaticProvider<T>;

export function toProvider<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean | {
    multi?: boolean
    multiOrder?: number,
    isClass?: (type: Function) => boolean,
    onRegistered?: (injector: Injector) => void
}): StaticProvider<T> {
    const { isClass, ...options } = (isBoolean(multi) ? { multi } : (multi ?? EMPTY_OBJ)) as {
        multi?: boolean
        multiOrder?: number,
        isClass?: (type: Function) => boolean,
        onRegistered?: (injector: Injector) => void
    };

    if (isType(useOf) && (isClass ? isClass(useOf) : true)) {
        if (provide == useOf) throw new ArgumentExecption(getClassName(provide) + ': provide is equals to provider')
        return { ...options, provide, useClass: useOf as ClassType };
    } else if (isPlainObject(useOf) && (isDefined((useOf as UseClass<T>).useClass)
        || isDefined((useOf as UseValue<T>).useValue)
        || isDefined((useOf as UseFactory<T>).useFactory)
        || isDefined((useOf as UseExisting<T>).useExisting))) {
        return { ...options, ...useOf, provide } as StaticProvider;
    }

    return { ...options, provide, useValue: useOf as T }
}



/**
 * convert to factory provider
 * @param provide provide token
 * @param useOf Provider
 * @param multi 
 * @returns 
 */
export function toFactory<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean): FactoryProvider<T>;
/**
 * convert to factory provider
 * @param provide provide token
 * @param useOf Provider
 * @param options 
 * @returns 
 */
export function toFactory<T>(provide: Token, useOf: ProvdierOf<T>, options?: {
    multi?: boolean,
    static?: boolean,
    /**
     * init factory result.
     * @param val 
     * @param injector 
     * @returns 
     */
    init?: (val: T, injector: Injector) => T,
    onRegistered?: (injector: Injector) => void,
    multiOrder?: number,
    isClass?: (type: Function) => boolean
}): FactoryProvider<T>;

export function toFactory<T>(provide: Token, useOf: ProvdierOf<T>, multi?: boolean | {
    multi?: boolean,
    /**
     * init factory result.
     * @param val 
     * @param injector 
     * @returns 
     */
    init?: (val: T, injector: Injector) => T,
    onRegistered?: (injector: Injector) => void,
    multiOrder?: number,
    isClass?: (type: Function) => boolean
}): FactoryProvider<T> {

    const { init, isClass, ...opts } = (isBoolean(multi) ? { multi } : (multi ?? EMPTY_OBJ)) as {
        multi?: boolean,
        init?: (val: T, injector: Injector) => T,
        onRegistered?: (injector: Injector) => void,
        multiOrder?: number,
        isClass?: (type: Function) => boolean
    }

    const deps: any[] = [];
    let useFactory: (...args: any[]) => T;

    const isPlainObj = isPlainObject(useOf);
    if (isPlainObj && isDefined((useOf as UseClass<T>).useClass)) {
        const { deps: cdeps, useClass } = useOf as UseClass<T>;
        if (cdeps && cdeps.length) {
            deps.push(...cdeps, Injector);
            useFactory = (...args: any[]) => {
                const injector = args.pop() as Injector;
                const val = new useClass(...args);
                return init ? init(val, injector) : val;
            }
        } else {
            deps.push(Injector);
            useFactory = (injector: Injector) => {
                const val = injector.get(useClass);
                return init ? init(val, injector) : val;
            }
        }
    } else if (isPlainObj && isDefined((useOf as UseValue<T>).useValue)) {
        const { useValue } = useOf as UseValue<T>;
        deps.push(Injector);
        useFactory = (injector: Injector) => {
            return init ? init(useValue, injector) : useValue;
        }
    } else if (isPlainObj && isDefined((useOf as UseFactory<T>).useFactory)) {
        const { deps: cdeps, useFactory: factory } = useOf as UseFactory<T>;
        cdeps && deps.push(...cdeps);
        deps.push(Injector);
        useFactory = (...args: any[]) => {
            const injector = args.pop() as Injector;
            const val = factory(...args);
            return init ? init(val, injector) : val;
        }
    } else if (isPlainObj && isDefined((useOf as UseExisting<T>).useExisting)) {
        const { useExisting } = useOf as UseExisting<T>;
        deps.push(Injector);
        useFactory = (injector: Injector) => {
            const val = injector.get(useExisting);
            return init ? init(val, injector) : val;
        }
    } else if (isType(useOf) && (isClass ? isClass(useOf) : true)) {
        deps.push(Injector);
        useFactory = (injector: Injector) => {
            const val = injector.get(useOf);
            return init ? init(val, injector) : val;
        }
    } else {
        deps.push(Injector);
        useFactory = (injector: Injector) => {
            return init ? init(useOf as T, injector) : useOf as T;
        }
    }

    return { ...opts, provide, useFactory, deps }
}