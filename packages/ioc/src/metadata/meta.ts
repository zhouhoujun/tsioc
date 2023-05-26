import { Type, DesignParam, Modules, CtorType } from '../types';
import { InjectFlags, Token } from '../tokens';
import { ModuleWithProviders, ProviderType } from '../providers';
import { ArgumentResolver } from '../resolver';
import { InvokeArguments } from '../context';

/**
 * type metadata
 *
 * @export
 * @interface TypeMetadata
 */
export interface TypeMetadata {
    /**
     * class type.
     */
    type?: Type;
}


/**
 * provide type from.
 *
 * @export
 * @interface Provide
 * @extends {MetaType}
 */
export interface ProvideMetadata {
    /**
     * this type provide from.
     *
     * @type {Token}
     * @memberof Provide
     */
    provider?: Token;

    /**
     * is multi provider or not
     */
    multi?: boolean;


    /**
     * inject flags.
     */
    flags?: InjectFlags
    /**
     * custom resolver to resolve property or parameter.
     */
    resolver?: ArgumentResolver;
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
}


/**
 * provider type to.
 *
 * @export
 * @interface Provider
 * @extends {MetaType}
 */
export interface ProviderMetadata {
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     */
    provide?: Token;
}

/**
 * ref provider.
 *
 * @export
 * @interface RefProvider
 */
export interface RefProvider {
    /**
     * ref to tagert.
     *
     * @type {Token}
     */
    target: Type;

    /**
     * ref provide
     *
     * @type {Token}
     */
    provide?: Token;
}

/**
 * provider in metadata.
 *
 * @export
 * @interface ProviderInMetadata
 */
export interface ProviderInMetadata {
    /**
     * int tagert.
     *
     * @type {Token}
     */
    target: Type;

    /**
     * ref provide
     *
     * @type {Token}
     */
    provide?: Token;
}

/**
 * add reference metadata. add ref service to the class.
 *
 * @export
 * @interface ProvidersMetadata
 * @extends {TypeMetadata}
 */
export interface ProvidersMetadata {
    /**
     * provider services of the class.
     *
     * @type {KeyValue<Token, Token>}
     */
    providers?: ProviderType[];
}


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends ProvideMetadata {
    /**
     * property type
     *
     * @type {SymbolType}
     */
    type?: Type;
    /**
     * property name
     *
     * @type {string}
     */
    name?: string;

}

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Record<string, any> {
    /**
     * method returnning type.
     */
    type?: Type;
    /**
     * param providers
     *
     * @type {ProviderType[]}
     */
    providers?: ProviderType[];
    /**
     * method property key
     *
     * @type {string}
     */
    name?: string;
}


/**
 * method prorerty metadata.
 *
 * @export
 * @interface MethodPropMetadata
 * @extends {PropertyMetadata}
 * @extends {MethodMetadata}
 */
export interface MethodPropMetadata extends PropertyMetadata, MethodMetadata { }


/**
 * parameter metadata.
 *
 * @export
 * @interface ParameterMetadata
 * @extends {PropertyMetadata}
 */
export interface ParameterMetadata extends ProvideMetadata, DesignParam {
    /**
     * method property key
     *
     * @type {string}
     */
    propertyKey?: string;
}


/**
 * Inject metadata.
 *
 */
export type InjectMetadata = ParameterMetadata;

/**
 * parameter property metadata.
 *
 */
export type ParamPropMetadata = ParameterMetadata;

/**
 * method param property metadata.
 */
export interface MethodParamPropMetadata extends ParamPropMetadata, MethodMetadata { }


/**
 * provided in metadata.
 */
export interface ProvidedInMetadata {
    /**
     * the token provided in.
     */
    providedIn?: Type | 'root' | 'platform' | 'configuration';
}


/**
 * class pattern metadata.
 */
export interface PatternMetadata {
    /**
     * static provider or not.
     */
    static?: boolean;
    /**
     * is singleton or not.
     *
     * @type {boolean}
     */
    singleton?: boolean;
    /**
     * class cache timeout when not used.
     *
     * @type {number}
     */
    expires?: number;
}

/**
 * abstract metadata.
 */
export interface AbstractMetadata {
    /**
     * class type.
     */
    type?: Type;
    /**
     * is abstract or not.
     */
    abstract?: boolean;
}

/**
 * class metadata.
 *
 * @export
 * @interface ClassMetadata
 */
export interface ClassMetadata extends AbstractMetadata, PatternMetadata, ProviderMetadata { }

/**
 * Injectable decorator metadata.
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends TypeMetadata, PatternMetadata, ProviderMetadata, ProvidedInMetadata, ProvidersMetadata { }

/**
 * module metadata.
 */
export interface ModuleMetadata extends ProvidedInMetadata, ProvidersMetadata {
    /**
     * base url.
     */
    baseURL?: string;
    /**
     * debug or not.
     */
    debug?: boolean;
    /**
     * bootstrap.
     *
     * @type {Modules}
     */
    bootstrap?: Modules;
    /**
     * imports dependens modules
     *
     * @type {Modules[]}
     */
    imports?: (Modules<CtorType> | ModuleWithProviders)[];
    /**
     * exports modules
     *
     * @type {Modules[]}
     */
    exports?: Modules<CtorType>[];
    /**
     * declaration the set of components, directives, pipes ... of this module.
     */
    declarations?: Modules<CtorType>[];
}

/**
 * Autowired metadata.
 *
 */
export type AutoWiredMetadata = MethodParamPropMetadata;


/**
 * Runnable metadata.
 *
 * @export
 * @interface RunnableMetadata
 * @extends {TypeMetadata}
 */
export interface RunnableMetadata<TArg> extends TypeMetadata, PatternMetadata, ProvidedInMetadata {
    /**
     * the method as runnable.
     */
    method?: string;
    /**
     * run order.
     */
    order?: number;
    /**
     * runnable invoke args.
     */
    args?: InvokeArguments<TArg>;
    /**
     * is auto run when created instance.
     */
    auto?: boolean;
}
