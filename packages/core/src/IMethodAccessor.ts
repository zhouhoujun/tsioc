import { Token } from './types';
import { IParameter } from './IParameter';
import { InjectToken } from './InjectToken';
import { ParamProviders } from './providers';

/**
 * IMethodAccessor interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const MethodAccessorToken = new InjectToken<IMethodAccessor>('DI_IMethodAccessor');

/**
 * execution, invoke some type method.
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(target: any, propertyKey: string, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(target: Token<any>, propertyKey: string, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {*} instance
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(target: Token<any>, propertyKey: string, instance: any, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(target: any, propertyKey: string, ...providers: ParamProviders[]): T;
    /**
     * try create instance to invoke property method.
     *
     * @template T
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(target: Token<any>, propertyKey: string, ...providers: ParamProviders[]): T;

    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {*} instance
     * @param {...ParamProviders[]} providers
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(target: Token<any>, propertyKey: string, instance: any, ...providers: ParamProviders[])

    /**
     * create params instances with IParameter and provider.
     *
     * @param {IParameter[]} params
     * @param {...ParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createSyncParams(params: IParameter[], ...providers: ParamProviders[]): any[];

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(params: IParameter[], ...providers: ParamProviders[]): Promise<any[]>;
}
