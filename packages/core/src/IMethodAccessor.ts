import { Token, ProviderTypes } from './types';
import { IParameter } from './IParameter';
import { InjectToken } from './InjectToken';

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
     * @param {Token<any>} token  type of object
     * @param {string} propertyKey method name
     * @param {*} [target] instance of type.
     * @param {...ProviderTypes[]} providers param provider.
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(token: Token<any>, propertyKey: string, target?: any, ...providers: ProviderTypes[]): Promise<T>;

    /**
     * try to invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Token<any>} token
     * @param {string} propertyKey
     * @param {*} [target]
     * @param {...ParamProvider[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(token: Token<any>, propertyKey: string, target?: any, ...providers: ProviderTypes[]): T;

    /**
     * create params instances with IParameter and provider.
     *
     * @param {IParameter[]} params
     * @param {...ParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createSyncParams(params: IParameter[], ...providers: ProviderTypes[]): any[];

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(params: IParameter[], ...providers: ProviderTypes[]): Promise<any[]>;
}
