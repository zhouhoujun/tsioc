import { Token, Factory } from './types';
import { ActionComponent } from './actions';


/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer {
    /**
     * Retrieves an instance from the container based on the provided token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @param {T} [notFoundValue]
     * @returns {T}
     * @memberof IContainer
     */
    get<T>(token: Token<T>, alias?: string, notFoundValue?: T): T;

    /**
     * register type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [value]
     * @memberOf IContainer
     */
    register<T>(token: Token<T>, value?: Factory<T>);

    /**
     * register stingleton type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} value
     *
     * @memberOf IContainer
     */
    registerSingleton<T>(token: Token<T>, value?: Factory<T>);

    /**
     * register decorator
     *
     * @param {Function} decirator
     * @param {ActionComponent} actions
     * @memberof IContainer
     */
    registerDecorator(decirator: Function, actions: ActionComponent)
}
