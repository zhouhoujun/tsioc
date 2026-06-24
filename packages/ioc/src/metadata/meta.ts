import { AbstractType, Type, Modules } from '../types';
import { Token } from '../tokens';
import { ModuleType, Provider } from '../providers';
import { Parameter } from '../resolver';
import { InvokeOptions } from '../context';

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
    type?: AbstractType;
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
    target: AbstractType;

    /**
     * ref provide
     *
     * @type {Token}
     */
    provide?: Token;
}

/**
 * provided in target metadata.
 *
 * @export
 * @interface ProvidedInTargetMetadata
 */
export interface ProvidedInTargetMetadata {
    /**
     * int tagert.
     *
     * @type {Token}
     */
    target: AbstractType;

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
 */
export interface ProvidersMetadata {
    /**
     * provider services of the class.
     *
     * @type {KeyValue<Token, Token>}
     */
    providers?: Provider[];
}


/**
 * property metadata
 *
 * @export
 * @interface PropMetadata
 */
export interface PropertyMetadata<T = any> extends Omit<Parameter<T>, 'name'> {
    /**
     * property type
     *
     * @type {SymbolType}
     */
    type?: AbstractType<T>;
    /**
     * property name
     *
     * @type {string}
     */
    propertyKey: string;

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
    type?: AbstractType;
    /**
     * param providers
     *
     * @type {Provider[]}
     */
    providers?: Provider[];
    /**
     * method property key
     *
     * @type {string}
     */
    propertyKey: string;
}


/**
 * method prorerty metadata.
 */
export type MethodPropMetadata<T = any> = PropertyMetadata<T> | MethodMetadata;


/**
 * parameter metadata.
 *
 * @export
 * @interface ParameterMetadata
 * @extends {PropertyMetadata}
 */
export interface ParameterMetadata<T = any> extends Parameter<T> {
}


/**
 * Inject metadata.
 *
 */
export type InjectMetadata<T = any> = PropertyMetadata<T> | ParameterMetadata<T>;

/**
 * parameter property metadata.
 *
 */
export type ParamPropMetadata<T = any> = PropertyMetadata<T> | ParameterMetadata<T>;

/**
 * method param property metadata.
 */
export type MethodParamPropMetadata = PropertyMetadata | MethodMetadata | ParamPropMetadata;


/**
 * provided in metadata.
 */
export interface ProvidedInMetadata {
    /**
     * the token provided in.
     */
    providedIn?: AbstractType | 'root' | 'platform';
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


/***
 * Annotation metadata.
 */
export interface AnnotationMetadata extends ProvidedInMetadata, ProvidersMetadata, PatternMetadata {
    /**
     * is abstract or not.
     */
    abstract?: boolean;
    /**
     * this type provider to.
     *
     * @type {SymbolType}
     */
    provide?: Token;
}

/**
 * Singleton decorator metadata.
 *
 * @export
 * @interface SingletonMetadata
 */
export interface SingletonMetadata extends Omit<AnnotationMetadata, 'abstract' | 'declaration' | 'static' | 'expires'> { }

/**
 * Injectable decorator metadata.
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends Omit<AnnotationMetadata, 'abstract' | 'declaration'> { }

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
    imports?: ModuleType<Type>[];
    /**
     * exports modules
     *
     * @type {Modules[]}
     */
    exports?: Modules<AbstractType>[];
    /**
     * declaration the set of components, directives, pipes ... of this module.
     */
    declarations?: Modules<Type>[];
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
 */
export interface RunnableMetadata extends Omit<AnnotationMetadata, 'abstract' | 'declaration'> {
    /**
     * the method as runnable.
     */
    propertyKey: string;
    /**
     * run order.
     */
    order?: number;
    /**
     * runnable invoke args.
     */
    args?: InvokeOptions;
    /**
     * is auto run when created instance.
     */
    auto?: boolean;
}

