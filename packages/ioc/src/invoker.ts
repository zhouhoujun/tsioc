import { Injector, MethodType, ProviderType } from './injector';
import { Abstract } from './metadata/fac';
import { Token } from './tokens';
import { Type } from './types';


/**
 * execution, invoke some type method.
 */
@Abstract()
export abstract class Invoker {
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
    abstract invoke<T, TR = any>(injector: Injector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * create params instances with IParameter and provider of target type.
     *
     * @param { Injector } injector
     * @param {Type} target target type.
     * @param {string} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {any[]}
     */
    abstract createParams(injector: Injector, target: Type, propertyKey: string, ...providers: ProviderType[]): any[];
}