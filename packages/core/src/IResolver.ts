import { Token, Providers } from './types';

/**
 * resolver interface.
 *
 * @export
 * @interface IResolver
 */
export interface IResolver {
    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, ...providers: Providers[]): T;
}
