import { Token, ProviderTypes } from './types';

/**
 * resolver interface.
 *
 * @export
 * @interface IResolver
 */
export interface IResolver {

    /**
     * current container has register.
     *
     * @template T
     * @param {Token<T>} key
     * @memberof IResolver
     */
    hasRegister<T>(key: Token<T>): boolean;

    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T;
}
