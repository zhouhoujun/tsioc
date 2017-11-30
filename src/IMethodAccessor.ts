import { Type } from './Type';
import { Token } from './index';
import { IContainer } from './IContainer';

/**
 * param provider.
 *
 * @export
 * @interface ParamProvider
 */
export interface ParamProvider {
    /**
     * param value provider is value or value factory.
     *
     * @memberof ParamProvider
     */
    value?: any | ((container?: IContainer) => any)
    /**
     * param value is instance of type.
     *
     * @type {Token<any>}
     * @memberof ParamProvider
     */
    type?: Token<any>;
    /**
     * param value is the result of type instance invoke the method return value.
     *
     * @type {string}
     * @memberof ParamProvider
     */
    method?: string;
    /**
     * param index.
     *
     * @type {number}
     * @memberof ParamProvider
     */
    index: number;
}

export interface AsyncParamProvider extends ParamProvider {
    files?: string | string[];
    execution?: string;
}

/**
 * execution, invoke some type method
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * try to invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} type  type of object
     * @param {(string | symbol)} propertyKey method name
     * @param {*} [instance] instance of type.
     * @param {...AsyncParamProvider[]} providers param provider.
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: AsyncParamProvider[]): Promise<T>;

    /**
     * try to invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} type
     * @param {(string | symbol)} propertyKey
     * @param {*} [instance]
     * @param {...ParamProvider[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: ParamProvider[]): T

}
