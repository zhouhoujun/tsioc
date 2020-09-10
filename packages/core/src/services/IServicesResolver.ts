import { Token, Provider, IInjector, IProvider } from '@tsdi/ioc';
import { ServicesOption } from '../resolves/ServicesContext';

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
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...Provider[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: Provider[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     * @memberof IServicesResolver
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider;

}
