import { Token, InstanceFactory, SymbolType, Factory, Type } from './types';
import { IParameter } from './IParameter';
import { InjectToken } from './InjectToken';
import { ProviderTypes, InjectTypes, ParamProviders } from './providers/types';
import { ContainerFactory, IIocContainer } from './IIocContainer';
import { ResolveActionOption, ResolveActionContext } from './actions/ResolveActionContext';
import { InjectReference } from './InjectReference';

/**
 * injector interface.
 *
 * @export
 * @interface IInjector
 */
export interface IInjector {
    /**
     * resolver size.
     *
     * @type {number}
     * @memberof IInjector
     */
    readonly size: number;
    /**
     * keys.
     */
    keys(): SymbolType[];
    /**
     * values.
     */
    values(): InstanceFactory[];
    /**
     * get root container factory.
     */
    getFactory<T extends IIocContainer>(): ContainerFactory<T>;
    /**
     * get root container.
     */
    getContainer<T extends IIocContainer>(): T;
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
     * has token key.
     *
     * @template T
     * @param {SymbolType<T>} key
     * @returns {boolean}
     * @memberof IInjector
     */
    hasTokenKey<T>(key: SymbolType<T>): boolean;
    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof IInjector
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T>;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} key
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(key: Token<T>): boolean;
    /**
     *  has register.
     *
     * @template T
     * @param {Token<T>} key
     * @param {string} alias
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(key: Token<T>, alias: string): boolean;
    /**
     * get token factory resolve instace in current container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    get<T>(token: Token<T>, ...providers: ProviderTypes[]): T;
    /**
     * get token factory resolve instace in current container.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} alias
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IInjector
     */
    get<T>(token: Token<T>, alias: string, ...providers: ProviderTypes[]): T;
    /**
     * get instance
     *
     * @template T
     * @param {SymbolType<T>} key
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IInjector
     */
    getInstance<T>(key: SymbolType<T>, ...providers: ProviderTypes[]): T;
    /**
     * resolve instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T;
    /**
     * resolve instance with token and param provider.
     *
     * @template T
     * @param {ResolveActionOption<T>} option  resolve option
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    resolve<T>(option: ResolveActionOption<T>, ...providers: ProviderTypes[]): T;
    /**
     * resolve instance with context.
     *
     * @template T
     * @param {ResolveActionContext<T>} context resolve context.
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    resolve<T>(context: ResolveActionContext<T>, ...providers: ProviderTypes[]): T;
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
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof IInjector
     */
    registerValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
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
    bindTagProvider<T>(target: Token, ...providers: ProviderTypes[]): InjectReference<IInjector>;
    /**
     * inject providers.
     *
     * @param {...InjectTypes[]} providers
     * @returns {this}
     * @memberof IInjector
     */
    inject(...providers: InjectTypes[]): this;
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
     * @returns {(void|boolean)}
     * @memberof IInjector
     */
    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean): void | boolean;
    /**
     * copy injector to current injector.
     *
     * @param {IInjector} injector copy from
     * @param {(key: Token) => boolean} filter token key filter
     * @returns {this} current injector.
     * @memberof IInjector
     */
    copy(injector: IInjector, filter?: (key: Token) => boolean): this;
    /**
     * clone this injector to.
     * @param to
     */
    clone(to?: IInjector): IInjector;
    /**
     * clone this injector to.
     * @param {(key: Token) => boolean} filter token key filter
     * @param to
     */
    clone(filter: (key: Token) => boolean, to?: IInjector): IInjector;
    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {(Token<T> | T)} target type class
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {TR}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(target: Token<T> | T, propertyKey: string | ((tag: T) => Function), ...providers: ParamProviders[]): TR;
    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(params: IParameter[], ...providers: ParamProviders[]): any[];
}

/**
 *  injector token.
 */
export const InjectorToken =  new InjectToken<IInjector>('DI_Injector');

/**
 *  injector factory token.
 */
export const InjectorFactory =  new InjectToken<IInjector>('DI_INJECTOR_FACTORY');
