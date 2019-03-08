import { ClassType, Token, ProviderTypes } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';

/**
 * services resolver.
 *
 * @export
 * @interface IServicesResolver
 */
export interface IServicesResolver {

    /**
     * get all service extends type.
     *
     * @template T
     * @param {token: Token<T>} type servive token or express match token.
     * @param {...ProviderTypes[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(token: Token<T>, ...providers: ProviderTypes[]): T[];

    /**
     * get services
     *
     * @template T
     * @param {Token<T>} token
     * @param {ServiceResolveContext} ctx
     * @returns {T[]}
     * @memberof IServicesResolver
     */
    getServices<T>(token: Token<T>, ctx: ServiceResolveContext): T[];
    /**
    * get all private services of target extends class `token`.
    * @template T
    * @param {type: Token<T>} token servive token.
    * @param {*} [target] service private of target.
    * @param {...ProviderTypes[]} providers
    * @returns {T[]} all service instance type of token type.
    * @memberof IContainer
    */
    getServices<T>(token: Token<T>, target: any, ...providers: ProviderTypes[]): T[];

    /**
    * get all servies extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {type: Token<T>} token servive token.
    * @param {*} [target] service private of target.
    * @param {ServiceResolveContext} service resolve context.
    * @param {...ProviderTypes[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(token: Token<T>, target: any, ctx: ServiceResolveContext, ...providers: ProviderTypes[]): T[];

}
