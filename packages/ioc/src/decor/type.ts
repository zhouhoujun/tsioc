import { DesignContext, RuntimeContext } from '../actions/ctx';
import { IInjector, IProvider } from '../IInjector';
import { Provider, Token } from '../tokens';
import { ClassType, DecoratorScope } from '../types';
import { Handler } from '../utils/lang';
import { ParameterMetadata, PatternMetadata, PropertyMetadata, ProviderMetadata, RefProvider, RegInMetadata, TypeMetadata } from './metadatas';
import { TypeDefine } from './typedef';

export interface AutorunDefine {
    autorun: string;
    order?: number;
    decorType?: DecoratorType;
}

export type DecorMemberType = 'property' | 'method' | 'parameter';
export type DecoratorType = 'class' | DecorMemberType;


export interface DecorPdr {
    getProvider(injector: IInjector): IProvider;
    getHandle(type: DecoratorType): Handler<DecorContext>[];
    getRuntimeHandle(type: DecoratorScope): Handler<RuntimeContext>[];
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

export interface DecorContext extends DecorDefine {
    target: any;
    reflect: TypeReflect;
}

/**
 * type reflect metadata.
 */
export interface TypeReflect extends TypeMetadata, PatternMetadata, RegInMetadata {

    iocExt?: boolean;

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
