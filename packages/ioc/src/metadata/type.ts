import { ClassType, Type } from '../types';
import { Handler } from '../handler';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { InjectorTypeWithProviders, ProviderType } from '../providers';
import { PatternMetadata, ProvidersMetadata, ProvidedInMetadata, ModuleMetadata } from './meta';
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

export const ctorName = 'constructor';
export namespace Decors {
    export const CLASS = 'class';
    export const property = 'property';
    export const method = 'method';
    export const parameter = 'parameter';
    export const beforeAnnoation = 'beforeAnnoation';
    export const beforeConstructor = 'beforeConstructor';
    export const afterConstructor = 'afterConstructor';
    export const annoation = 'annoation';
    export const afterAnnoation = 'afterAnnoation';
}

export namespace ActionTypes {
    export const propInject = 'propInject';
    export const paramInject = 'paramInject';
    export const annoation = 'annoation';
    export const autorun = 'autorun';
    export const typeProviders = 'typeProviders';
    export const methodProviders = 'methodProviders';
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
export interface TypeReflect<T = any> extends ProvidedInMetadata, PatternMetadata {
    /**
     * class type.
     */
    readonly type: ClassType<T>;
    /**
     * class define.
     */
    class: TypeDefine;
    /**
     * annotation metadata.
     */
    annotation?: any;
}


/**
 * module reflect.
 */
export interface ModuleReflect<T = any> extends TypeReflect<T> {
    /**
     * is module or not.
     */
    module: boolean;
    baseURL?: string,
    debug?: boolean,
    /**
     * imports types.
     */
    imports?: (Type | InjectorTypeWithProviders)[];
    /**
     * exports.
     */
    exports?: Type[];
    /**
     *  components, directives, pipes ... of current module.
     */
    declarations?: Type[];
    /**
     * the module bootstraps.
     */
    bootstrap?: Type[];
    /**
    * module extends providers.
    */
    providers?: ProviderType[];
    /**
     * module annoation metadata.
     */
    annotation?: ModuleMetadata
}
