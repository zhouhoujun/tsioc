import { ClassType, Modules, Type } from '../types';
import { InjectFlags, Token } from '../tokens';
import { ModuleWithProviders, ProviderType } from '../providers';
import { ArgumentResolver } from '../resolver';

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
     * is mutil provider or not
     */
    mutil?: boolean;
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
    target: ClassType;

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
    target: ClassType;

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
    type?: ClassType;
    /**
     * property name
     *
     * @type {string}
     */
    propertyKey?: string;

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
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata {
    /**
     * method returnning type.
     */
    type?: ClassType;
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
    propertyKey?: string;
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
export interface ParameterMetadata extends PropertyMetadata {
    /**
     * parameter name.
     */
    paramName?: string;
}


/**
 * parameter property metadata.
 *
 * @export
 * @interface ParamPropMetadata
 * @extends {ParameterMetadata}
 */
export interface ParamPropMetadata extends ParameterMetadata { }

/**
 * method param property metadata.
 */
export interface MethodParamPropMetadata extends ParamPropMetadata, MethodMetadata { }

/**
 * Inject metadata.
 *
 * @export
 * @interface InjectMetadata
 * @extends {ParamPropMetadata}
 */
export interface InjectMetadata extends ParamPropMetadata { }

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
    type?: ClassType;
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
     * @type {Type<T>}
     */
    bootstrap?: Modules;
    /**
     * imports dependens modules
     *
     * @type {Modules[]}
     */
    imports?: (Modules | ModuleWithProviders)[];
    /**
     * exports modules
     *
     * @type {Modules[]}
     */
    exports?: Modules[];
    /**
     * declaration the set of components, directives, pipes ... of this module.
     */
    declarations?: Modules[];
}

/**
 * Autowired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends MethodParamPropMetadata { }


/**
 * Autowired metadata.
 *
 * @export
 * @interface AutorunMetadata
 * @extends {TypeMetadata}
 */
export interface AutorunMetadata extends TypeMetadata, PatternMetadata, ProvidedInMetadata {
    autorun?: string;
    order?: number;
}

