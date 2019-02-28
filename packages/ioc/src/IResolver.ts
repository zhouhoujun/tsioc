import { Token, Type } from './types';
import { ParamProviders } from './providers';

/**
 * resolver.
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
     * @param {string} aliasOrway
     * @returns {boolean}
     * @memberof IResolver
     */
    has<T>(key: Token<T>, aliasOrway: string): boolean;

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
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, ...providers: ParamProviders[]): T;

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof IResolver
     */
    unregister<T>(token: Token<T>): this;
}

/**
 * resolver container.
 *
 * @export
 * @interface IResolverContainer
 * @extends {IResolver}
 */
export interface IResolverContainer  extends  IResolver {
    /**
     * container size.
     *
     * @type {number}
     * @memberof IResolverContainer
     */
    readonly size?: number;
    
    /**
     * get token implement class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResoveWay} [resway]
     * @returns {Type<T>}
     * @memberof IResolver
     */
    getTokenImpl<T>(token: Token<T>): Type<T>;

}