import { Type } from './Type';


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
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any): Promise<T>;
}
