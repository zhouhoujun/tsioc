import { Token } from './types';


export interface IContainer {
    /**
     * Retrieves an instance from the injector based on the provided token.
     *
     * @abstract
     * @template T
     * @param {Token<T>} [token]
     * @param {T} [notFoundValue]
     * @returns {T}
     *
     * @memberOf Injector
     */
    get<T>(token?: Token<T>, notFoundValue?: T): T;

    /**
     * register type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} [notFoundValue]
     * @memberOf Injector
     */
    register<T>(token: Token<T>, notFoundValue?: T);

    /**
     * register stingleton type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     *
     * @memberOf Injector
     */
    registerSingleton<T>(token: Token<T>, value: T);
}
