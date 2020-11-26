import { DesignContext, RuntimeContext } from '../actions/ctx';
import { IInjector, IProvider } from '../IInjector';
import { ProviderType, Token } from '../tokens';
import { ClassType, DecoratorScope } from '../types';
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
 * registered.
 */
export interface Registered {
    provides: Token[];
    getInjector(): IInjector;
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

    iocExt?: boolean;

    /**
     * class type.
     */
    readonly type: ClassType;

    /**
     * decorator defines of the class type.
     */
    decors: DecorDefine[];

    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | Function): boolean;
    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | Function, type: DecorMemberType, propertyKey?: string): boolean;
    /**
     * get all class decorator defines.
     * @param decor
     */
    getDecorDefines(decor: string | Function): DecorDefine[];
    /**
     * get all decorator defines.
     * @param decor decorator.
     * @param type  decorator type.
     */
    getDecorDefines<T = any>(decor: string | Function, type: DecorMemberType): DecorDefine<T>[];
    /**
     * get all metadata of class decorator.
     * @param decor the class decorator.
     */
    getMetadatas<T = any>(decor: string | Function): T[];
    /**
     * get all metadata of the decorator.
     * @param decor the decorator.
     * @param type decorator type.
     */
    getMetadatas<T = any>(decor: string | Function, type: DecorMemberType): T[];
    getDecorDefine<T = any>(decor: string | Function): DecorDefine<T>;
    getDecorDefine<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): DecorDefine<T>;
    getMetadata<T = any>(decor: string | Function): T;
    getMetadata<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): T;
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
