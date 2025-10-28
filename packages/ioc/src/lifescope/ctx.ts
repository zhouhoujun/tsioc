import { Token } from '../tokens';
import { AbstractType, Type } from '../types';
import { ParameterMetadata, ProvidedInMetadata } from '../metadata/meta';
import { ClassRef, DecoratorFn } from '../metadata/class';
import { InjectorRecord, Injector } from '../injector';
import { InvocationContext } from '../context';
import { Runtime } from '../runtime';



/**
 * context interface.
 */
export interface IocContext {
    /**
     * current injector.
     */
    injector: Injector;
}

/**
 * Ioc Register action context.
 *
 * @export
 * @class RegContext
 * @extends {IocActionContext}
 */
export interface RegContext extends IocContext {
    /**
     * resolve token.
     */
    provide?: Token;
    /**
     * reg provides or not.
     */
    regProvides?: boolean;
    /**
     * target type.
     */
    type: Type;
    /**
     * type Class reflective.
     */
    classRef: ClassRef;
    /**
     * current decoractor.
     */
    currDecor: DecoratorFn;
    /**
     * custom set singleton or not.
     */
    singleton?: boolean;
    /**
     * static or not.
     */
    static?: boolean;
}

/**
 * design action context.
 */
export interface DesignContext extends RegContext, ProvidedInMetadata {
    runtime: Runtime;
    injectorType?: (type: AbstractType, typeReflect: ClassRef) => void | Promise<void>;
    regProvides?: boolean;
    getRecords: () => Map<Token, InjectorRecord>;
}


/**
 *  Initialization object action context.
 *
 * @extends {RegContext}
 */
export interface InitializeContext extends RegContext {
    /**
     * runtime.
     */
    runtime: Runtime;
    /**
     * invocation context.
     */
    context?: InvocationContext;
    isNewContext?: boolean;
    hasPointcut?: boolean;
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RuntimeActionContext
     */
    instance?: any;
    /**
     * property key
     */
    propertyKey?: string;
    /**
     * args of the propertyKey method.
     */
    args?: any[];
    /**
     * params of the propertyKey method.
     */
    params?: ParameterMetadata[];
}

