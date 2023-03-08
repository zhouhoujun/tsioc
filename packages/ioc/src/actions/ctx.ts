import { Token } from '../tokens';
import { Type } from '../types';
import { ParameterMetadata, ProvidedInMetadata } from '../metadata/meta';
import { Class } from '../metadata/type';
import { FactoryRecord, Injector } from '../injector';
import { InvocationContext } from '../context';
import { Platform } from '../platform';



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
    class: Class;
    /**
     * current decoractor.
     */
    currDecor: string;
    /**
     * custom set singleton or not.
     */
    singleton: boolean;
}

/**
 * design action context.
 */
export interface DesignContext extends RegContext, ProvidedInMetadata {
    platform: Platform;
    injectorType?: (type: Type, typeReflect: Class) => void;
    regProvides?: boolean;
    getRecords: () => Map<Token, FactoryRecord>;
}

/**
 * Ioc Register action context.
 *
 * @extends {RegContext}
 */
export interface RuntimeContext extends RegContext {
    /**
     * platform.
     */
    platform: Platform;
    /**
     * invocation context.
     */
    context?: InvocationContext;
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
