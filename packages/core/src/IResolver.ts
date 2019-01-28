import { Token, Type, InstanceFactory } from './types';
import { ParamProviders } from './providers';
import { ResoveWay } from './IContainer';

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
     * @param {(string|ResoveWay)} aliasOrway
     * @returns {boolean}
     * @memberof IResolver
     */
    has<T>(key: Token<T>, aliasOrway: string | ResoveWay): boolean;

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
     * @param {(ResoveWay|ParamProviders)} resway
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, resway: ResoveWay | ParamProviders, ...providers: ParamProviders[]): T;
}

/**
 * resolver chain interface.
 *
 * @export
 * @interface IResolver
 */
export interface IResolverContainer extends IResolver {

    readonly size: number;
    /**
     * get token implement class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResoveWay} [resway]
     * @returns {Type<T>}
     * @memberof IResolver
     */
    getTokenImpl<T>(token: Token<T>, resway?: ResoveWay): Type<T>;

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof IResolver
     */
    unregister<T>(token: Token<T>, resway?: ResoveWay): this;

    /**
     * iterator current resolver.
     *
     * @param {(tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void | boolean} callbackfn if callbackfn return false will break iterator.
     * @memberof IExports
     */
    forEach(callbackfn: (tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void | boolean): void | boolean;

}
