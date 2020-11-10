import { Type, Modules } from './types';
import { SymbolType, Token, Factory, InjectReference, Provider, InstanceFactory, InstancePdr } from './tokens';
import { ResolveOption } from './actions/res';
import { IIocContainer } from './IIocContainer';
import { IDestoryable } from './Destoryable';
import { MethodType } from './IMethodAccessor';



/**
 * provider interface.
 */
export interface IProvider extends IDestoryable {
    /**
     * parent provider.
     */
    readonly parent?: IProvider;
    /**
     * resolver size.
     *
     * @type {number}
     * @memberof IInjector
     */
    readonly size: number;
    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} target
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof IInjector
     */
    getToken<T>(target: Token<T>, alias?: string): Token<T>;
    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} [alias] addtion alias
     * @returns {SymbolType<T>}
     * @memberof IInjector
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T>;
    /**
     * get root container.
     */
    getContainer(): IIocContainer;
    /**
     * has token key.
     *
     * @template T
     * @param {SymbolType<T>} key the token key.
     * @returns {boolean}
     * @memberof IInjector
     */
    hasTokenKey<T>(key: SymbolType<T>): boolean;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>): boolean;
    /**
     * has token in current injector.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>, alias: string): boolean;
    /**
     * has value or not.
     * @param key
     */
    hasValue<T>(key: Token<T>): boolean;
    /**
     * has register in the injector or root container.
     * @param token the token.
     */
    hasRegister<T>(token: Token<T>): boolean;
    /**
     * has register in the injector or root container.
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias.
     */
    hasRegister<T>(token: Token<T>, alias: string): boolean;
    /**
     * get token instace in current injector or root container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    get<T>(token: Token<T>, ...providers: Provider[]): T;
    /**
     * get token instace in current injector or root container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} alias
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IInjector
     */
    get<T>(token: Token<T>, alias: string, ...providers: Provider[]): T;
    /**
     * get token instance in current injector or root container.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IInjector
     */
    getInstance<T>(key: SymbolType<T>, ...providers: Provider[]): T;
    /**
     * get value.
     * @param token token key.
     */
    getValue<T>(token: Token<T>): T;
    /**
     * get the first value via tokens.
     * @param tokens
     */
    getFirstValue<T>(...tokens: Token<T>[]): T;
    /**
     * set value.
     * @param token provide key
     * @param value vaule
     */
    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    /**
     * delete value.
     * @param token key
     */
    delValue<T>(token: Token<T>): void;
    /**
    * get token implement class type.
    *
    * @template T
    * @param {Token<T>} token
    * @param {ResoveWay} [resway]
    * @returns {Type<T>}
    * @memberof IInjector
    */
    getTokenProvider<T>(token: Token<T>): Type<T>
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {InstanceFactory<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     * @memberof IInjector
     */
    set<T>(provide: Token<T>, fac: InstanceFactory<T>, providerType?: Type<T>): this;
    /**
     * inject providers.
     *
     * @param {...Provider[]} providers
     * @returns {this}
     * @memberof IInjector
     */
    inject(...providers: Provider[]): this;
    /**
     * register type class.
     * @param type the class type.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof IInjector
     */
    unregister<T>(token: Token<T>): this;
    /**
     * clear cache.
     *
     * @param {Type} targetType
     * @memberof IContainer
     */
    clearCache(targetType: Type): this;
    /**
     * iterator current resolver.
     *
     * @param {((pdr: InstancePdr, key: SymbolType, resolvor?: IProvider) => void|boolean)} callbackfn
     * @param {boolean} [deep] deep iterator all register.
     * @returns {(void|boolean)}
     * @memberof IInjector
     */
    iterator(callbackfn: (pdr: InstancePdr, key: SymbolType, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean;
    /**
     * copy injector to current injector.
     *
     * @param {IProvider} target copy from
     * @param {(key: SymbolType) => boolean} filter token key filter
     * @returns {this} current injector.
     * @memberof IProvider
     */
    copy(from: IProvider, filter?: (key: SymbolType) => boolean): this;
    /**
     * clone this injector to.
     * @param to
     */
    clone(to?: IProvider): IProvider;
    /**
     * clone this injector to.
     * @param {(key: SymbolType) => boolean} filter token key filter
     * @param to
     */
    clone(filter: (key: SymbolType) => boolean, to?: IProvider): IProvider;
}


/**
 * injector interface.
 *
 * @export
 * @interface IInjector
 */
export interface IInjector extends IProvider {

    readonly parent?: IInjector;
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {Type[]}
     * @memberof IInjector
     */
    use(...modules: Modules[]): Type[];

    /**
     * register type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [fac]
     * @returns {this}
     * @memberof IInjector
     */
    register<T>(token: Token<T>, fac?: Factory<T>): this;
    /**
     * register stingleton type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} fac
     * @returns {this}
     * @memberOf IInjector
     */
    registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this;
    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Type<T>} provider
     * @returns {this}
     * @memberof IInjector
     */
    bindProvider<T>(provide: Token<T>, provider: Type<T>): this;
    /**
     * bind provider ref to target.
     * @param target the target, provide ref to.
     * @param provide provide token.
     * @param provider provider factory or token.
     * @param alias alias.
     */
    bindRefProvider<T>(target: Token, provide: Token<T>, provider: Type<T>, alias?: string): InjectReference<T>;
    /**
     * bind target providers.
     * @param target
     * @param providers
     */
    bindTagProvider(target: Token, ...providers: Provider[]): InjectReference<IProvider>;

    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    resolve<T>(option: ResolveOption<T>, ...providers: Provider[]): T;
    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {(Token<T> | T)} target type class
     * @param {MethodType<T>} propertyKey
     * @param {...Provider[]} providers
     * @returns {TR}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(target: Token<T> | T, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
}
