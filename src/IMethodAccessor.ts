import { Type } from './Type';
import { Token } from './types';
import { IContainer } from './IContainer';
import { ParamProvider, AsyncParamProvider } from './ParamProvider';
import { IParameter } from './IParameter';


/**
 * execution, invoke some type method
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * try to async invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} targetType  type of object
     * @param {(string | symbol)} propertyKey method name
     * @param {*} [target] instance of type.
     * @param {...AsyncParamProvider[]} providers param provider.
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(targetType: Type<any>, propertyKey: string | symbol, target?: any, ...providers: AsyncParamProvider[]): Promise<T>;

    /**
     * try to invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} targetType
     * @param {(string | symbol)} propertyKey
     * @param {*} [target]
     * @param {...ParamProvider[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(targetType: Type<any>, propertyKey: string | symbol, target?: any, ...providers: ParamProvider[]): T;


    /**
     * create params instances with IParameter and provider.
     *
     * @param {IParameter[]} params
     * @param {...ParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createSyncParams(params: IParameter[], ...providers: ParamProvider[]): any[];

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(params: IParameter[], ...providers: AsyncParamProvider[]): Promise<any[]>;

}
