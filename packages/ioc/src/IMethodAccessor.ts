import { Type } from './types';
import { Token, Provider } from './tokens';
import { IInjector } from './IInjector';
import { ParameterMetadata } from './decor/metadatas';


/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => Function);

/**
 * execution, invoke some type method.
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    // /**
    //  * get type class constructor parameters.
    //  *
    //  * @template T
    //  * @param { IInjector } injector
    //  * @param {Type<T>} type
    //  * @returns {IParameter[]}
    //  * @memberof MethodAccessor
    //  */
    // getParameters<T>(injector: IInjector, type: Type<T>): ParameterMetadata[];
    // /**
    //  * get method parameters of type.
    //  *
    //  * @template T
    //  * @param { IInjector } injector
    //  * @param {Type<T>} type
    //  * @param {T} instance
    //  * @param {string} propertyKey
    //  * @returns {IParameter[]}
    //  * @memberof MethodAccessor
    //  */
    // getParameters<T>(injector: IInjector, type: Type<T>, instance: T, propertyKey: string): ParameterMetadata[];

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | T)} target
     * @param {MethodType} propertyKey
     * @param {...Provider[]} providers
     * @returns {TR}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: Provider[]): TR;

    /**
     * create params instances with IParameter and provider
     *
     * @param { IInjector } injector
     * @param {ParameterMetadata[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createParams(injector: IInjector, params: ParameterMetadata[], ...providers: Provider[]): any[];
}
