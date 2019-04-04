import { Type, Token, Factory } from './types';
import { InjectToken } from './InjectToken';
import { IResolverContainer } from './IResolver';
import { ParamProviders, ProviderTypes, IProviderParser } from './providers';
import { IParameter } from './IParameter';
import { TypeReflects } from './services';
import { ResolveActionContext } from './actions';

/**
 * IContainer token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const IocContainerToken = new InjectToken<IIocContainer>('DI_IocContainer');

/**
 * container interface.
 *
 * @export
 * @interface IIocContainer
 */
export interface IIocContainer extends IResolverContainer {

    /**
     * get provider parser.
     *
     * @returns {IProviderParser}
     * @memberof IIocContainer
     */
    getProviderParser(): IProviderParser;

    /**
     * get type reflects.
     *
     * @returns {TypeReflects}
     * @memberof IIocContainer
     */
    getTypeReflects(): TypeReflects;

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
     * @memberof IContainer
     */
    get<T>(token: Token<T>, alias: string, ...providers: ProviderTypes[]): T;

    /**
     * resolve type instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveActionContext<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IIocContainer
     */
    resolve<T>(token: Token<T> | ResolveActionContext<T>, ...providers: ProviderTypes[]): T;

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
     * bind providers.
     *
     * @param {...ProviderTypes[]} providers
     * @returns {this}
     * @memberof IContainer
     */
    bindProviders(...providers: ProviderTypes[]): this;

    /**
     * bind providers for only target class.
     *
     * @param {Token<any>} target
     * @param {...ProviderTypes[]} providers
     * @returns {this}
     * @memberof IContainer
     */
    bindProviders<T>(target: Token<T>, ...providers: ProviderTypes[]): this;

    /**
     * bind providers for only target class.
     *
     * @param {Token<any>} target
     * @param {(mapTokenKey: Token<any>) => void} onceBinded
     * @param {...ProviderTypes[]} providers
     * @returns {this}
     * @memberof IContainer
     */
    bindProviders<T>(target: Token<T>, onceBinded: (mapTokenKey: Token<any>) => void, ...providers: ProviderTypes[]): this;

    /**
     * bind provider ref to target.
     *
     * @template T
     * @param {Token<any>} target
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @param {string} [alias]
     * @param {(refToken: Token<T>) => void} [onceBinded]
     * @returns {this}
     * @memberof IContainer
     */
    bindRefProvider<T>(target: Token<any>, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string, onceBinded?: (refToken: Token<T>) => void): this;

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
     * try create instance to invoke property method.
     *
     * @template T
     * @param {*} target type  instance
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T>(target: any, propertyKey: string, ...providers: ParamProviders[]): T;

    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {Token<any>} target type class
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T>(target: Token<any>, propertyKey: string, ...providers: ParamProviders[]): T;

    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {Token<any>} target type class
     * @param {string} propertyKey
     * @param {*} instance instance of target type.
     * @param {...ParamProviders[]} providers
     * @memberof IMethodAccessor
     */
    invoke<T>(target: Token<any>, propertyKey: string, instance: any, ...providers: ParamProviders[])

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
