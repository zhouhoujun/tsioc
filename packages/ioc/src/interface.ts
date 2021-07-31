import { Type, Modules } from './types';
import { Token } from './tokens';
import { TypeReflect } from './metadata/type';
import { ClassProvider, ExistingProvider, FactoryProvider, StaticProvider, ValueProvider } from './providers';


/**
 * providers.
 */
export type ProviderType = Modules[] | StaticProvider;

/**
 * providers types
 * @deprecated use `ProviderType` instead.
 */
export type ProviderTypes = ProviderType;
/**
 * providers types
 * @deprecated use `ProviderType` instead.
 */
export type ParamProviders = ProviderType;

/**
 * instance factory.
 */
export type Factory<T = any> = (...args) => T;


/**
 * Factory of Token
 */
export type FactoryLike<T> = Type<T> | Factory<T>;


/**
 * type register option.
 */
export interface TypeOption<T = any> {
    provide?: Token<T>;
    type: Type<T>;
    singleton?: boolean;
    regIn?: 'root';
}

export type ProviderOption<T = any> = ClassProvider | ValueProvider | ExistingProvider | FactoryProvider;

/**
 * register option.
 */
export type RegisterOption<T = any> = TypeOption<T> | ProviderOption<T>;


export type FnType = 'cotr' | 'inj' | 'fac';

/**
 * instance provider.
 */
export interface FacRecord<T = any> {
    /**
     * use value for provide.
     *
     * @type {*}
     */
    value?: any;

    /**
     * factory.
     */
    fn?: Function;

    fnType?: FnType;

    deps?: any[];

    /**
     * token provider type.
     */
    type?: Type<T>;

    /**
     * cache value.
     */
    cache?: T;
    /**
     * last timer use the cache.
     */
    ltop?: number;
    /**
     * cache expires.
     */
    expires?: number;

    /**
     * unregister callback.
     */
    unreg?: () => void;
}



/**
 * resovle action option.
 */
export interface ResolveOption<T = any> {
    /**
     * token.
     */
    token?: Token<T>;
    /**
     * resolve token in target context.
     */
    target?: Token | TypeReflect | Object | (Token | Object)[];
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token<T>;
    /**
     * register token if has not register.
     */
    regify?: boolean;

    /**
     * resolve providers.
     */
    providers?: ProviderType[];
}


/**
 * services context options
 *
 * @export
 * @interface ServicesOption
 * @extends {ServiceOption}
 */
export interface ServicesOption<T> extends ResolveOption<T> {
    /**
     * token provider service type.
     *
     * @type {Type}
     */
    tokens?: Token<T>[];
    /**
     * get extend servie or not.
     *
     * @type {boolean}
     */
    extend?: boolean;
    /**
     * get services both in container and target private refrence service.
     *
     * @type {boolean}
     */
    both?: boolean;
}

/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => Function);

