import { DesignContext, RuntimeContext } from '../actions/ctx';
import { ProviderType } from '../injector';
import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { Handler } from '../utils/hdl';
import { ParameterMetadata, PatternMetadata, PropertyMetadata, ProvidersMetadata, ProvidedInMetadata, TypeMetadata, ModuleMetadata } from './meta';
import { TypeDefine } from './typedef';

/**
 * auto run define.
 */
export interface AutorunDefine {
    autorun: string;
    order?: number;
    decorType?: DecoratorType;
}

export type DecorMemberType = 'property' | 'method' | 'parameter';
export type DecoratorType = 'class' | DecorMemberType;

/**
 * decorator scopes.
 *
 * Annoation: annoation actions for design time.
 * AfterAnnoation: after annoation actions for design time.
 */
export type DecoratorScope = 'beforeAnnoation' | DecoratorType
    | 'beforeConstructor' | 'afterConstructor' | 'annoation' | 'afterAnnoation';


/**
 * decorator define.
 */
export interface DecorDefine<T = any> extends ProvidersMetadata {
    /**
     * decorator name.
     */
    name: string;
    /**
     * decorator name with '@'
     */
    decor: string;
    /**
     * get decorator handle.
     * @param type decorator type.
     */
    getHandle(type: DecoratorType): Handler<DecorContext>[];
    /**
     * get decorator runtime handle.
     * @param type decorator type.
     */
    getRuntimeHandle(type: DecoratorScope): Handler<RuntimeContext>[];
    /**
     * get decorator design handle.
     * @param type decorator type.
     */
    getDesignHandle(type: DecoratorScope): Handler<DesignContext>[];
    /**
     * decorator type.
     */
    decorType: DecoratorType;
    /**
     * property key.
     */
    propertyKey: string;
    /**
     * paramter index.
     */
    parameterIndex?: number;
    /**
     * decorator metadata.
     */
    metadata: T;
}

/**
 * decorator context.
 */
export interface DecorContext extends DecorDefine {
    target: any;
    reflect: TypeReflect;
}

/**
 * type reflect metadata.
 */
export interface TypeReflect<T = any> extends PatternMetadata, ProvidedInMetadata {
    /**
     * ioc ext or not.
     */
    iocExt?: boolean;
    /**
     * class type.
     */
    readonly type: ClassType<T>;
    /**
     * is abstract or not.
     */
    abstract?: boolean;
    /**
     * class define.
     */
    class: TypeDefine;
    /**
     * class provides.
     */
    provides: Token[];
    /**
     * class extends providers.
     */
    providers: ProviderType[];
    /**
     * props.
     *
     * @type {Map<string, PropertyMetadata[]>}
     */
    propProviders: Map<string, PropertyMetadata[]>;
    /**
     * method params.
     *
     * @type {Map<IParameter[]>}
     */
    methodParams: Map<string, ParameterMetadata[]>;
    /**
     * method providers.
     *
     * @type {Map<ProviderType[]>}
     */
    methodProviders: Map<string, ProviderType[]>;
    /**
     * auto run defines.
     */
    autoruns: AutorunDefine[];
}

/**
 * module reflect.
 */
export interface ModuleReflect<T = any> extends TypeReflect<T> {
    /**
     * is module or not.
     */
    module: boolean;
    /**
     * imports types.
     */
     imports: Type[];
     /**
      * exports.
      */
     exports: Type[];
     /**
      *  components, directives, pipes ... of current module.
      */
     declarations?: Type[];
     /**
      * the module bootstraps.
      */
     bootstrap?: Type[];

     annotation?: ModuleMetadata
}
