import { ParameterMetadata } from '../decor/metadatas';
import { TypeReflect } from '../decor/type';
import { IInjector, IProvider } from '../IInjector';
import { Token } from '../tokens';
import { Type } from '../types';


/**
 * context interface.
 */
export interface IocContext {
    /**
     * current injector.
     */
    injector: IInjector;

    /**
     *  providers.
     */
    providers?: IProvider;
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
    token?: Token;

    /**
     * target type.
     *
     */
    type: Type;

    /**
     * current decoractor.
     */
    currDecor?: string;

    /**
     * custom set singleton or not.
     *
     */
    singleton?: boolean;

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
    regIn?: string;
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
