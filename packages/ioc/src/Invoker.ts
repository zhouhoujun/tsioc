import { Token, ProviderType } from './tokens';
import { IInjector } from './IInjector';
import { ParameterMetadata } from './decor/metadatas';
import { Type } from './types';


/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => Function);

/**
 * execution, invoke some type method.
 */
export interface Invoker {
    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | T)} target
     * @param {MethodType} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {TR}
     */
    invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * create params instances with IParameter and provider of target type.
     *
     * @param { IInjector } injector
     * @param {Type} target target type.
     * @param {ParameterMetadata[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {any[]}
     */
    createParams(injector: IInjector, target: Type, params: ParameterMetadata[],  ...providers: ProviderType[]): any[];
}

/**
 * @deprecated use `Invoker` instead.
 */
export type IMethodAccessor = Invoker;