import { Token, ProviderTypes, IInjector } from '@tsdi/ioc';
import { ServicesOption, ResolveServicesContext } from './resolves/ResolveServicesContext';

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
     * @param {(Token<T> | ServicesOption<T> | ResolveServicesContext<T>)} target servive token or express match token.
     * @param {...ProviderTypes[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(target: Token<T> | ServicesOption<T> | ResolveServicesContext<T>, ...providers: ProviderTypes[]): T[];

    /**
     * get all provider service.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T> | ResolveServicesContext<T>)} target
     * @param {ResolveServicesContext<T>} [ctx]
     * @returns {IInjector}
     * @memberof IServicesResolver
     */
    getServiceProviders<T>(target: Token<T> | ServicesOption<T> | ResolveServicesContext<T>, ctx?: ResolveServicesContext<T>): IInjector;
}
