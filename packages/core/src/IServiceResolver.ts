import { Token, ProviderTypes } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './actions';
import { TargetRefs } from './TargetService';

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
     * @param {TargetRefs} [target] service refrence target.
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T>, target: TargetRefs, ...providers: ProviderTypes[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResolveServiceContext} ctx
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IServiceResolver
     */
    getService<T>(token: Token<T>, ctx: ResolveServiceContext, ...providers: ProviderTypes[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {Token<T>} token
     * @param {TargetRefs} target
     * @param {ResolveServiceContext} ctx
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IServiceResolver
     */
    getService<T>(token: Token<T>, target: TargetRefs, ctx: ResolveServiceContext, ...providers: ProviderTypes[]): T;

}
