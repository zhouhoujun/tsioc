import { IIocContainer } from './IIocContainer';
import { Type, Token } from './types';
import { ParamProviders } from './providers/types';
import { ProviderMap } from './providers/ProviderMap';
import { IParameter } from './IParameter';
import { InjectToken } from './InjectToken';

/**
 * execution, invoke some type method.
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * get type class constructor parameters.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(container: IIocContainer, type: Type<T>): IParameter[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(container: IIocContainer, type: Type<T>, instance: T, propertyKey: string): IParameter[];

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {(Token<T> | T)} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {TR}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(container: IIocContainer, target: Token<T> | T, propertyKey: string | ((tag: T) => Function), ...providers: ParamProviders[]): TR;

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): any[];

    /**
     * get target invoked provider.
     *
     * @param {*} target
     * @param {string} propertyKey
     * @returns {ProviderMap}
     * @memberof IMethodAccessor
     */
    invokedProvider(target: any, propertyKey: string): ProviderMap;
}

/**
 * method accessor.
 */
export const MethodAccessorToken = new InjectToken<IMethodAccessor>('__ioc__methodAccessor');
