import { Type, Token, Factory, SymbolType, Providers, ModuleType, LoadType } from './types';
import { ActionComponent, DecoratorType } from './core/index';
import { IMethodAccessor } from './IMethodAccessor';
import { LifeScope } from './LifeScope';
import { InjectToken } from './InjectToken';
import { AsyncResource } from 'async_hooks';

/**
 * IContainer token.
 * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
 */
export const ContainerToken = new InjectToken<IContainer>('__IOC_IContainer');

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
     * clear cache.
     *
     * @param {Type<any>} targetType
     * @memberof IContainer
     */
    clearCache(targetType: Type<any>);

    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} target
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof IContainer
     */
    getToken<T>(target: Token<T>, alias?: string): Token<T>;
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
     * @returns {this}
     * @memberof IContainer
     */
    register<T>(token: Token<T>, value?: Factory<T>): this;

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof IContainer
     */
    unregister<T>(token: Token<T>): this;

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @returns {this}
     * @memberof IContainer
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this;

    /**
     * register stingleton type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} value
     * @returns {this}
     * @memberOf IContainer
     */
    registerSingleton<T>(token: Token<T>, value?: Factory<T>): this;

    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof IContainer
     */
    registerValue<T>(token: Token<T>, value: T): this;

    /**
     * get life scope of container.
     *
     * @returns {LifeScope}
     * @memberof IContainer
     */
    getLifeScope(): LifeScope;

    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(...modules: ModuleType[]): this;

    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    loadModule(...modules: LoadType[]): Promise<Type<any>[]>;
}
