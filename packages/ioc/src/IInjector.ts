import { Type, Modules } from './types';
import { lang } from './utils/lang';
import { SymbolType, Token, InstanceFactory, Factory, InjectReference, Provider } from './tokens';
import { ResolveOption } from './actions/res';
import { IIocContainer } from './IIocContainer';
import { IDestoryable } from './Destoryable';
import { MethodType, IParameter } from './IMethodAccessor';


/**
 * injector interface.
 *
 * @export
 * @interface IInjector
 */
export interface IInjector extends IDestoryable {
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
     *  get injector proxy
     */
    getProxy(): InjectorProxy<this>;
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
     * has singleton or not in root.
     * @param key
     */
    hasSingleton<T>(key: SymbolType<T>): boolean;
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
     * get singleton instance.
     * @param key token key.
     */
    getSingleton<T>(key: SymbolType<T>): T;
    /**
     * set singleton.
     * @param key provide key
     * @param value vaule
     */
    setSingleton<T>(key: SymbolType<T>, value: T, provider?: Type<T>): this;
    /**
     * delete singleton instance.
     * @param key key
     */
    delSingleton<T>(key: SymbolType<T>): void;
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
    * get token implement class type.
    *
    * @template T
    * @param {Token<T>} token
    * @param {ResoveWay} [resway]
    * @returns {Type<T>}
    * @memberof IInjector
    */
    getTokenProvider<T>(token: Token<T>): Type<T>;
    /**
     * get token factory.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @returns {InstanceFactory<T>}
     * @memberof IInjector
     */
    getTokenFactory<T>(key: SymbolType<T>): InstanceFactory<T>;
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
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @returns {this}
     * @memberof IInjector
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this;
    /**
     * bind provider ref to target.
     * @param target the target, provide ref to.
     * @param provide provide token.
     * @param provider provider factory or token.
     * @param alias alias.
     */
    bindRefProvider<T>(target: Token, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string): InjectReference<T>;
    /**
     * bind target providers.
     * @param target
     * @param providers
     */
    bindTagProvider(target: Token, ...providers: Provider[]): InjectReference<IInjector>;
    /**
     * inject providers.
     *
     * @param {...Provider[]} providers
     * @returns {this}
     * @memberof IInjector
     */
    inject(...providers: Provider[]): this;
    /**
     * inject modules
     *
     * @param {...Modules[]} modules
     * @returns {Type[]} the class types in modules.
     * @memberof IInjector
     */
    injectModule(...modules: Modules[]): Type[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IInjector
     */
    use(...modules: Modules[]): this;
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
     * @param {((fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void|boolean)} callbackfn
     * @param {boolean} [deep] deep iterator all register.
     * @returns {(void|boolean)}
     * @memberof IInjector
     */
    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean;
    /**
     * copy injector to current injector.
     *
     * @param {IInjector} injector copy from
     * @param {(key: SymbolType) => boolean} filter token key filter
     * @returns {this} current injector.
     * @memberof IInjector
     */
    copy(injector: IInjector, filter?: (key: SymbolType) => boolean): this;
    /**
     * clone this injector to.
     * @param to
     */
    clone(to?: IInjector): IInjector;
    /**
     * clone this injector to.
     * @param {(key: SymbolType) => boolean} filter token key filter
     * @param to
     */
    clone(filter: (key: SymbolType) => boolean, to?: IInjector): IInjector;
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
    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(params: IParameter[], ...providers: Provider[]): any[];
}

const injectorKey = 'injector';
/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is IInjector {
    return lang.getClass(target)?.ρCT === injectorKey;
}

/**
 * injector proxy of current injector.
 */
export type InjectorProxy<T extends IInjector = IInjector> = () => T;

/**
 * provider interface.
 */
export interface IProvider extends IInjector {

}
