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
    files?: string | string[];
    value?: any | ((ctx: IContainer) => any);
    type?: Token<any>;
    execution?: string;
    index: number;
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
     * @param {...ParamProvider[]} providers param provider.
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: ParamProvider[]): Promise<T>;
}
