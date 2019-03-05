import { ClassType, Token, ParamProviders, InstanceFactory, IResolver } from '@ts-ioc/ioc';

export interface IServicesResolver {

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getServices<T>(type: ClassType<T> | ((token: ClassType<T>) => boolean), ...providers: ParamProviders[]): T[];

    /**
    * get all private services of target extends class `type`.
    * @template T
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(type: Token<T> | ((token: ClassType<T>) => boolean), target: Token<any> | Token<any>[], ...providers: ParamProviders[]): T[];

    /**
    * get all servies extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {boolean} both if true, will get all server and target private service of class extends `type` .
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(type: Token<T> | ((token: ClassType<T>) => boolean), target: Token<any> | Token<any>[], both: boolean, ...providers: ParamProviders[]): T[];

}
