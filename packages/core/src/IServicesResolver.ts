import { Token, ProviderTypes, ProviderMap } from '@tsdi/ioc';
import { ResolveServicesContext } from './resolves';
import { TargetRefs } from './TargetService';

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
     * @param {ResolveServicesContext} ctx
     * @param {...ProviderTypes[]} providers
     * @returns {T[]}
     * @memberof IServicesResolver
     */
    getServices<T>(token: Token<T>, ctx: ResolveServicesContext, ...providers: ProviderTypes[]): T[];

    /**
    * get all private services of target extends class `token`.
    * @template T
    * @param {type: Token<T>} token servive token.
    * @param {TargetRefs} [target] service private of target.
    * @param {...ProviderTypes[]} providers
    * @returns {T[]} all service instance type of token type.
    * @memberof IContainer
    */
    getServices<T>(token: Token<T>, target: TargetRefs, ...providers: ProviderTypes[]): T[];

    /**
    * get all servies extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {type: Token<T>} token servive token.
    * @param {TargetRefs} [target] service private of target.
    * @param {ResolveServicesContext} service resolve context.
    * @param {...ProviderTypes[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(token: Token<T>, target: TargetRefs, ctx: ResolveServicesContext, ...providers: ProviderTypes[]): T[];


    /**
     * get all service providers extends type.
     *
     * @template T
     * @param {token: Token<T>} type servive token or express match token.
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServiceProviders<T>(token: Token<T>): ProviderMap;

    /**
     * get service providers
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResolveServicesContext} ctx
     * @returns {T[]}
     * @memberof IServicesResolver
     */
    getServiceProviders<T>(token: Token<T>, ctx: ResolveServicesContext): ProviderMap;

    /**
    * get all private service providers of target extends class `token`.
    *
    * @template T
    * @param {type: Token<T>} token servive token.
    * @param {TargetRefs} [target] service private of target.
    * @returns {T[]} all service instance type of token type.
    * @memberof IContainer
    */
   getServiceProviders<T>(token: Token<T>, target: TargetRefs): ProviderMap;

    /**
    * get all servie providers extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {type: Token<T>} token servive token.
    * @param {TargetRefs} [target] service private of target.
    * @param {ResolveServicesContext} service resolve context.
    * @returns {T}
    * @memberof IContainer
    */
   getServiceProviders<T>(token: Token<T>, target: TargetRefs, ctx: ResolveServicesContext): ProviderMap;
}
