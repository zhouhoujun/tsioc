import { DesignContext, RuntimeContext } from '../actions/ctx';
import { IInjector, IProvider } from '../IInjector';
import { ProviderType, Token } from '../tokens';
import { ClassType } from '../types';
import { Handler } from '../utils/hdl';
import {
    ParameterMetadata, PatternMetadata, PropertyMetadata,
    ProviderMetadata, RefProvider, RegInMetadata, TypeMetadata
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
 * decorator provdider.
 */
export interface DecorPdr {
    /**
     * get provider decorator.
     * @param injector
     */
    getProvider(injector: IInjector): IProvider;
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
}

/**
 * decorator define.
 */
export interface DecorDefine<T = any> {
    /**
     * decorator name.
     */
    name: string;
    /**
     * decorator name with '@'
     */
    decor: string;
    /**
     * decoractor providers.
     */
    decorPdr: DecorPdr;
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
     * matedata.
     */
    matedata?: T;
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
export interface TypeReflect extends TypeMetadata, PatternMetadata, RegInMetadata {
    /**
     * ioc ext or not.
     */
    iocExt?: boolean;
    /**
     * class type.
     */
    readonly type: ClassType;
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
