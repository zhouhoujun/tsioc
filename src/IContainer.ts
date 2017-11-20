import { Token, Factory, SymbolType } from './types';
import { ActionComponent } from './actions';
import { Type } from './Type';


/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer {

    /**
     * has register the token or not.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {boolean}
     * @memberof IContainer
     */
    has<T>(token: Token<T>, alias?: string): boolean;
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
     * get token.
     *
     * @template T
     * @param {SymbolType<T>} target
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof IContainer
     */
    getToken<T>(target: SymbolType<T>, alias?: string): Token<T>;
    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof IContainer
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T>;

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
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T>} provider
     * @memberof IContainer
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T>);

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
    registerDecorator(decirator: Function, actions: ActionComponent);

    /**
     * is vaildate dependence type or not. dependence type must with @Injectable decorator.
     *
     * @template T
     * @param {any} target
     * @returns {boolean}
     * @memberof IContainer
     */
    isVaildDependence<T>(target: any): boolean;

}
