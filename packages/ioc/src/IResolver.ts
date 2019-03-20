import { ProviderTypes } from './providers';
import { Token, Type, InstanceFactory, SymbolType } from './types';
import { ResovleActionContext, IocActionContext } from './actions';

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
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IResolver
     */
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T;

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
 * resolver execute.
 *
 * @export
 * @interface IResolverExecute
 */
export interface IContextResolver {

    /**
     * resolve in context.
     *
     * @template T
     * @param {T} ctx
     * @returns {T}
     * @memberof IResolverExecute
     */
    resolveContext<T extends ResovleActionContext>(ctx: T): T;
}

/**
 * bind action context.
 *
 * @export
 * @interface IBindActionContext
 */
export interface IBindActionContext {

    /**
     * bind action context.
     *
     * @template T
     * @param {T} ctx
     * @returns {T}
     * @memberof IBindResolveContext
     */
    bindActionContext<T extends IocActionContext>(ctx: T): T;
}

/**
 * resolver container.
 *
 * @export
 * @interface IResolverContainer
 * @extends {IResolver}
 */
export interface IResolverContainer extends IResolver {
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
    getTokenProvider<T>(token: Token<T>): Type<T>;

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
     * iterator current resolver.
     *
     * @param {((fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => void|boolean)} callbackfn
     * @returns {(void|boolean)}
     * @memberof IResolverContainer
     */
    iterator(callbackfn: (fac: InstanceFactory<any>, tk: Token<any>, resolvor?: IResolver) => void | boolean): void | boolean;

}
