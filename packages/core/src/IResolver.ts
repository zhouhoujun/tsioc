import { Token } from './types';
import { ParamProviders } from './providers';
import { ResoveWay } from './IContainer';

/**
 * resolver interface.
 *
 * @export
 * @interface IResolver
 */
export interface IResolver {

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} key
     * @returns {boolean}
     * @memberof IResolver
     */
    has<T>(key: Token<T>): boolean;
    /**
     *  has register.
     *
     * @template T
     * @param {Token<T>} key
     * @param {ResoveWay} [resway]
     * @returns {boolean}
     * @memberof IResolver
     */
    has<T>(key: Token<T>, resway: ResoveWay): boolean;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} key
     * @param {string} alias
     * @returns {boolean}
     * @memberof IResolver
     */
    has<T>(key: Token<T>, alias: string): boolean;

    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T;

    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResoveWay} resway
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, resway?: ResoveWay, ...providers: ParamProviders[]): T;
}
