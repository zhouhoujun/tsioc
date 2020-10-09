import { ClassType, DecoratorTypes } from '../types';
import { Token, Provider } from '../tokens';
import { TypeDefine } from './typedef';

/**
 * metadata
 *
 * @export
 * @interface Metadate
 */
export interface Metadate {
    /**
     * decorator name.
     *
     * @type {string}
     * @memberof Metadate
     */
    decorator?: string;
}

/**
 * type metadata
 *
 * @export
 * @interface TypeMetadata
 */
export interface TypeMetadata extends Metadate {
    /**
     * property type
     *
     * @type {SymbolType}
     * @memberof TypeMetadata
     */
    type?: ClassType;
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
     * alias name. use to create Registration with provider.
     *
     * @type {string}
     * @memberof ProvideMetadata
     */
    alias?: string;
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
     * @memberof IProviderMetadata
     */
    provide?: Token;
    /**
     * provide alias.
     *
     * @type {string}
     * @memberof IProviderMetadata
     */
    alias?: string;
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
     * @memberof RefProvider
     */
    target: Token;

    /**
     * ref provide
     *
     * @type {Token}
     * @memberof RefProvider
     */
    provide?: Token;

    /**
     * provide alias.
     *
     * @type {string}
     * @memberof RefProvider
     */
    alias?: string;
}

/**
 * reference metadata.
 *
 * @export
 * @interface RefMetadata
 * @extends {TypeMetadata}
 */
export interface RefMetadata {
    /**
     * define the class as service reference to target.
     *
     * @type {RefProvider}
     * @memberof RefMetadata
     */
    refs?: RefProvider
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
     * @memberof ProvidersMetadata
     */
    providers?: Provider[];
}


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata extends ProvideMetadata, TypeMetadata {
    /**
     * property name
     *
     * @type {string}
     * @memberof PropertyMetadata
     */
    propertyKey?: string;
}

/**
 * method metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface MethodMetadata extends Metadate {
    /**
     * param providers
     *
     * @type {Provider[]}
     * @memberof MethodMetadata
     */
    providers?: Provider[];
    /**
     * method property key
     *
     * @type {string}
     * @memberof MethodMetadata
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
export interface MethodPropMetadata extends PropertyMetadata, MethodMetadata {

}


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
     * @memberof ParameterMetadata
     */
    index?: number;

    paramName?: string;

    /**
     * default value
     *
     * @type {object}
     * @memberof ParameterMetadata
     */
    defaultValue?: object
}


/**
 * parameter property metadata.
 *
 * @export
 * @interface ParamPropMetadata
 * @extends {PropertyMetadata}
 * @extends {ParameterMetadata}
 */
export interface ParamPropMetadata extends PropertyMetadata, ParameterMetadata {

}

export interface MethodParamPropMetadata extends ParamPropMetadata, MethodMetadata {

}


/**
 * Inject metadata.
 *
 * @export
 * @interface InjectMetadata
 * @extends {ParamPropMetadata}
 */
export interface InjectMetadata extends ParamPropMetadata {
}


export interface RegInMetadata {
    /**
     * reg the class type in root or not.
     */
    regIn?: 'root';
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
export interface ClassMetadata extends PatternMetadata, ProviderMetadata, ProvidersMetadata, RefMetadata, TypeMetadata {
    /**
     * is abstract or not.
     */
    abstract?: boolean;
}

/**
 * Injectable. default a
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends ClassMetadata, RegInMetadata {

}


/**
 * AutoWired metadata.
 *
 * @export
 * @interface AutoWiredMetadata
 * @extends {PropertyMetadata}
 */
export interface AutoWiredMetadata extends MethodParamPropMetadata {

}


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


export interface AutorunDefine {
    autorun: string;
    order?: number;
}

export interface DecorDefine {
    /**
     * decorator name.
     */
    name: string;
    /**
     * decorator name with '@'
     */
    decor: string;
    type: DecoratorTypes;
    propertyKey?: string;
    parameterIndex?: number;
    matedata?: any;
}

/**
 * type reflect metadata.
 */
export interface TypeReflect extends PatternMetadata, RegInMetadata {
    type: ClassType;
    /**
     * is abstract or not.
     */
    abstract?: boolean;
    /**
     * decorator defines of the class type.
     */
    decors: DecorDefine[];
    /**
     * class define.
     */
    class: TypeDefine;
    /**
     * class providers.
     */
    providers: ProviderMetadata[];
    /**
     * refs
     */
    refs: RefProvider[];
    /**
     * class extends providers.
     */
    extProviders: Provider[];
    /**
     * props.
     *
     * @type {Map<string, PropertyMetadata[]>}
     * @memberof ITypeReflect
     */
    propProviders: Map<string, PropertyMetadata[]>;

    /**
     * method params.
     *
     * @type {ObjectMap<IParameter[]>}
     * @memberof ITypeReflect
     */
    methodParams: Map<string, ParameterMetadata[]>;

    /**
     * method providers.
     *
     * @type {ObjectMap<Provider[]>}
     * @memberof ITypeReflect
     */
    methodExtProviders: Map<string, Provider[]>;

    /**
     * auto run defines.
     */
    autoruns: AutorunDefine[];
}
