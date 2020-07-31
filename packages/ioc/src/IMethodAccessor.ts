import { Type } from './types';
import { tokenId, Token, TokenId } from './tokens';
import { ParamProviders } from './providers/types';
import { IInjector, IProviders } from './IInjector';


export type MethodType<T> = string | ((tag: T) => Function);


/**
 * Parameter
 *
 * @export
 * @interface IParameter
 */
export interface IParameter {
    /**
     * parameter name
     *
     * @type {string}
     * @memberof IParameter
     */
    name: string;
    /**
     * parameter type.
     *
     * @type {Token}
     * @memberof IParameter
     */
    type: Token;
    /**
     * provider for the parameter.
     *
     * @type {Token}
     * @memberof IParameter
     */
    provider: Token;
}

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
     * @param { IInjector } injector
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(injector: IInjector, type: Type<T>): IParameter[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param { IInjector } injector
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(injector: IInjector, type: Type<T>, instance: T, propertyKey: string): IParameter[];

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | T)} target
     * @param {MethodType} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {TR}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ParamProviders[]): TR;

    /**
     * create params instances with IParameter and provider
     *
     * @param { IInjector } injector
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createParams(injector: IInjector, params: IParameter[], ...providers: ParamProviders[]): any[];
}

/**
 * method accessor.
 */
export const MethodAccessorToken: TokenId<IMethodAccessor> = tokenId<IMethodAccessor>('DI_METHOD_ACCESSOR');

export const INVOKED_PROVIDERS = tokenId<IProviders>('INVOKED_PROVIDERS');
