import { Type, Modules } from './types';
import { SymbolType, Token, FactoryLike, InjectReference, ProviderType, Factory, InstFac } from './tokens';
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
     */
    readonly size: number;
    /**
     * get root container.
     */
    getContainer(): IIocContainer;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @returns {boolean}
     */
    has<T>(token: Token<T>): boolean;
    /**
     * has token in current injector.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias
     * @returns {boolean}
     */
    has<T>(token: Token<T>, alias: string): boolean;
    /**
     * has token key.
     *
     * @template T
     * @param {SymbolType<T>} key the token key.
     * @returns {boolean}
     */
    hasTokenKey<T>(key: SymbolType<T>): boolean;
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
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    get<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * get token instace in current injector or root container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} alias
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    get<T>(token: Token<T>, alias: string, ...providers: ProviderType[]): T;
    /**
     * get token instance in current injector or root container.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getInstance<T>(key: SymbolType<T>, ...providers: ProviderType[]): T;
    /**
     * get value.
     * @param token token key.
     */
    getValue<T>(token: Token<T>): T;
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
    */
    getTokenProvider<T>(token: Token<T>): Type<T>
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {InstFac<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: InstFac<T>): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Factory<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: Factory<T>, providerType?: Type<T>): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this;
    /**
     * register type class.
     * @param type the class type.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     */
    unregister<T>(token: Token<T>): this;
    /**
     * iterator current resolver.
     *
     * @param {((pdr: InstFac, key: SymbolType, resolvor?: IProvider) => void|boolean)} callbackfn
     * @param {boolean} [deep] deep iterator all register.
     * @returns {(void|boolean)}
     */
    iterator(callbackfn: (pdr: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean;
    /**
     * copy injector to current injector.
     *
     * @param {IProvider} target copy from
     * @param {(key: SymbolType) => boolean} filter token key filter
     * @returns {this} current injector.
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
     */
    use(...modules: Modules[]): Type[];

    /**
     * register type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {FactoryLike<T>} [fac]
     * @returns {this}
     */
    register<T>(token: Token<T>, fac?: FactoryLike<T>): this;
    /**
     * register stingleton type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {FactoryLike<T>} fac
     * @returns {this}
     */
    registerSingleton<T>(token: Token<T>, fac?: FactoryLike<T>): this;
    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Type<T>} provider
     * @returns {this}
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
    bindTagProvider(target: Token, ...providers: ProviderType[]): InjectReference<IProvider>;

    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {ResolveOption<T>} option  resolve option
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(option: ResolveOption<T>, ...providers: ProviderType[]): T;
    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {(Token<T> | T)} target type class
     * @param {MethodType<T>} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {TR}
     */
    invoke<T, TR = any>(target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
}
