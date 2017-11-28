import { Type } from './Type';


export interface IExecution {

    /**
     * try to exec the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} type
     * @param {(string | symbol)} propertyKey
     * @param {*} [instance]
     * @returns {T}
     * @memberof IExecute
     */
    exec<T>(type: Type<any>, propertyKey: string | symbol, instance?: any): T;
}
