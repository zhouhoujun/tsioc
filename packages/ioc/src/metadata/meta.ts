import { ClassType } from '../types';
import { Token } from '../tokens';
import { ProviderType } from '../injector';

/**
 * metadata
 *
 * @export
 * @interface Metadata
 */
export interface Metadata {
    /**
     * property type
     *
     * @type {SymbolType}
     */
    type?: ClassType;
}

/**
 * type metadata
 *
 * @export
 * @interface TypeMetadata
 */
export interface TypeMetadata extends Metadata {

    /**
     * is abstract or not.
     */
    abstract?: boolean;
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
export interface PropertyMetadata extends ProvideMetadata, Metadata {
    /**
     * property name
     *
     * @type {string}
     */
    propertyKey?: string;
}

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadata {
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
     * parameter index.
     *
     * @type {number}
     */
    index?: number;

    /**
     * parameter name.
     */
    paramName?: string;

    /**
     * default value
     *
     * @type {object}
     */
    defaultValue?: object
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
 * register in metadata.
 */
export interface RegInMetadata {
    /**
     * reg the class type in root or not.
     */
    regIn?: 'root' | string;
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
 * class metadata.
 *
 * @export
 * @interface ClassMetadata
 */
export interface ClassMetadata extends PatternMetadata, ProviderMetadata, TypeMetadata { }

/**
 * Injectable decorator metadata.
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends ClassMetadata, RegInMetadata, ProvidersMetadata { }


/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends MethodParamPropMetadata { }


/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutorunMetadata
 * @extends {TypeMetadata}
 */
export interface AutorunMetadata extends TypeMetadata, PatternMetadata, RegInMetadata {
    autorun?: string;
    order?: number;
}

