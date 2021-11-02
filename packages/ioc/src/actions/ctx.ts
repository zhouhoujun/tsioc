import { InjectorScope } from '..';
import { Injector, Registered } from '../injector';
import { ParameterMetadata } from '../metadata/meta';
import { TypeReflect } from '../metadata/type';
import { Token } from '../tokens';
import { Type } from '../types';


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
export interface DesignContext extends RegContext {
    /**
     * type register in.
     */
    providedIn: string| InjectorScope | Type;

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
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RuntimeActionContext
     */
    instance?: any;

    /**
     * raise provider.
     */
    providers?: Injector;

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
