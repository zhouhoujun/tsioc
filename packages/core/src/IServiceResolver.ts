import { Token, ProviderTypes } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './actions';

/**
 * service resolver.
 *
 * @export
 * @interface IServiceResolver
 */
export interface IServiceResolver {
    /**
     * get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token servive token.
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T>, ...providers: ProviderTypes[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token servive token.
     * @param {*} [target] service refrence target.
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T>, target: any, ...providers: ProviderTypes[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token
     * @param {ServiceResolveContext} ctx
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IServiceResolver
     */
    getService<T>(token: Token<T>, ctx: ServiceResolveContext, ...providers: ProviderTypes[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token
     * @param {*} target
     * @param {ServiceResolveContext} ctx
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IServiceResolver
     */
    getService<T>(token: Token<T>, target: any, ctx: ServiceResolveContext, ...providers: ProviderTypes[]): T;

}
