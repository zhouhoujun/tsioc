import { Token } from '../tokens';
import { Type } from '../types';
import { ParameterMetadata, ProvidedInMetadata } from '../metadata/meta';
import { TypeReflect } from '../metadata/type';
import { Injector, Platform, Registered } from '../injector';
import { InvocationContext } from '../invoker';


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
     *
     */
    provide?: Token;
    regProvides?: boolean;
    /**
     * target type.
     *
     */
    type: Type;
    /**
     * current decoractor.
     */
    currDecor: string;
    /**
     * custom set singleton or not.
     *
     */
    singleton: boolean;
    /**
     * target reflect.
     */
    reflect: TypeReflect;
}

/**
 * design action context.
 */
export interface DesignContext extends RegContext, ProvidedInMetadata {
    platform: Platform;
    /**
     * registered state.
     */
    state: Registered;
}

/**
 * Ioc Register action context.
 *
 * @extends {RegContext}
 */
export interface RuntimeContext extends RegContext {
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
