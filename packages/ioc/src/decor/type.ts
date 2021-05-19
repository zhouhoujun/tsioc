import { DesignContext, RuntimeContext } from '../actions/ctx';
import { IInjector, IProvider, ProviderType } from '../IInjector';
import { Token } from '../tokens';
import { ClassType } from '../types';
import { Handler } from '../utils/hdl';
import {
    ParameterMetadata, PatternMetadata, PropertyMetadata,
    ProviderMetadata, ProvidersMetadata, RefProvider, RegInMetadata, TypeMetadata
} from './metadatas';
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
 * registered.
 */
export interface Registered {
    /**
     * provides.
     */
    readonly provides: Token[];
    /**
     * injector.
     */
    injector: IInjector;
    /**
     * type private providers.
     */
    providers?: IProvider;
}

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
    propertyKey?: string;
    /**
     * paramter index.
     */
    parameterIndex?: number;
    /**
     * decorator metadata.
     */
    metadata?: T;
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
export interface TypeReflect<T = any> extends TypeMetadata, PatternMetadata, RegInMetadata {
    /**
     * ioc ext or not.
     */
    iocExt?: boolean;
    /**
     * class type.
     */
    readonly type: ClassType<T>;
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
    extProviders: ProviderType[];
    /**
     * props.
     *
     * @type {Map<string, PropertyMetadata[]>}
     */
    propProviders: Map<string, PropertyMetadata[]>;
    /**
     * method params.
     *
     * @type {ObjectMap<IParameter[]>}
     */
    methodParams: Map<string, ParameterMetadata[]>;
    /**
     * method providers.
     *
     * @type {ObjectMap<ProviderType[]>}
     */
    methodExtProviders: Map<string, ProviderType[]>;
    /**
     * auto run defines.
     */
    autoruns: AutorunDefine[];
}
