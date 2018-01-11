import { Token, Factory, SymbolType, Providers } from './types';
import { ActionComponent, DecoratorType } from './core/index';
import { Type } from './Type';
import { IMethodAccessor } from './IMethodAccessor';
import { LifeScope } from './LifeScope';


/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IMethodAccessor {

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
     * @returns {T}
     * @memberof IContainer
     */
    get<T>(token: Token<T>, alias?: string): T;

    /**
     * resolve type instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...Providers[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    resolve<T>(token: Token<T>, ...providers: Providers[]): T;

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
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof IContainer
     */
    getTokenImpl<T>(token: Token<T>): Type<T>;

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
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @memberof IContainer
     */
    unregister<T>(token: Token<T>);

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @memberof IContainer
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>);

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
     * get life scope of container.
     *
     * @returns {LifeScope}
     * @memberof IContainer
     */
    getLifeScope(): LifeScope;

}
