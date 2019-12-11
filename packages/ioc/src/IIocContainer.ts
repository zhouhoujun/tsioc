import { Type, Token, Factory, SymbolType } from './types';
import { IInjector } from './IInjector';
import { InjectToken } from './InjectToken';
import { ParamProviders, ProviderTypes } from './providers/types';
import { IParameter } from './IParameter';
import { TypeReflects } from './services/TypeReflects';
import { ResolveActionOption, ResolveActionContext } from './actions/ResolveActionContext';


/**
 * IContainer token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const IocContainerToken = new InjectToken<IIocContainer>('DI_IocContainer');
/**
 *  container factory.
 */
export type ContainerFactory<T extends IIocContainer = IIocContainer> = () => T;
/**
 * container factory token.
 */
export const ContainerFactoryToken = new InjectToken<ContainerFactory>('DI_ContainerFactory');

/**
 * container interface.
 *
 * @export
 * @interface IIocContainer
 */
export interface IIocContainer extends IInjector {

    /**
     * get container factory.
     *
     * @template T
     * @returns {ContainerFactory<T>}
     * @memberof IIocContainer
     */
    getFactory<T extends IIocContainer>(): ContainerFactory<T>;

    /**
     * get type reflects manager in current container.
     *
     * @returns {TypeReflects}
     * @memberof IIocContainer
     */
    getTypeReflects(): TypeReflects;

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: Factory<T>, singleton?: boolean): this;


    // /**
    //  * bind providers.
    //  *
    //  * @param {...ProviderTypes[]} providers
    //  * @returns {this}
    //  * @memberof IContainer
    //  */
    // bindProviders(...providers: ProviderTypes[]): this;

    // /**
    //  * bind providers for only target class.
    //  *
    //  * @param {Token} target
    //  * @param {...ProviderTypes[]} providers
    //  * @returns {this}
    //  * @memberof IContainer
    //  */
    // bindProviders<T>(target: Token<T>, ...providers: ProviderTypes[]): this;

    // /**
    //  * bind providers for only target class.
    //  *
    //  * @param {Token} target
    //  * @param {(mapTokenKey: Token) => void} onceBinded
    //  * @param {...ProviderTypes[]} providers
    //  * @returns {this}
    //  * @memberof IContainer
    //  */
    // bindProviders<T>(target: Token<T>, onceBinded: (mapTokenKey: Token) => void, ...providers: ProviderTypes[]): this;

    // /**
    //  * bind provider ref to target.
    //  *
    //  * @template T
    //  * @param {Token} target
    //  * @param {Token<T>} provide
    //  * @param {(Token<T> | Factory<T>)} provider
    //  * @param {string} [alias]
    //  * @param {(refToken: Token<T>) => void} [onceBinded]
    //  * @returns {this}
    //  * @memberof IContainer
    //  */
    // bindRefProvider<T>(target: Token, provide: Token<T>, provider: Token<T> | Factory<T>, alias?: string, onceBinded?: (refToken: Token<T>) => void): this;

}
