import { Type } from './types';
import { Token, Factory, tokenId, TokenId } from './tokens';
import { IInjector } from './IInjector';
import { ITypeReflects } from './services/ITypeReflects';
import { IActionInjector } from './actions/Action';


/**
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const IocContainerToken: TokenId<IIocContainer> = tokenId<IIocContainer>('DI_IOCCONTAINER');

/**
 * root container interface.
 *
 * @export
 * @interface IIocContainer
 */
export interface IIocContainer extends IInjector {
    /**
     * get root contianer.
     */
    getContainer(): this;
    /**
     * get injector the type injected.
     * @param type
     */
    getInjector(type: Type): IInjector;
    /**
     * create injector.
     */
    createInjector(): IInjector;
    /**
     * get type reflects manager in current container.
     *
     * @returns {ITypeReflects}
     * @memberof IIocContainer
     */
    getTypeReflects(): ITypeReflects;
    /**
     * get action injector
     */
    getActionInjector(): IActionInjector;
    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register type class.
     * @param {IInjector} injector
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerIn<T>(injector: IInjector, Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register factory to injector.
     * @param injector the injector to register.
     * @param token register token
     * @param fac factory of token.
     * @param singleton singlteon or not.
     */
    registerFactory<T>(injector: IInjector, token: Token<T>, fac?: Factory<T>, singleton?: boolean): this;
}
