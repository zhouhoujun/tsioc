import { Token, Factory, Type } from './types';
import { IInjector } from './IInjector';
import { InjectToken } from './InjectToken';
import { ITypeReflects } from './services/ITypeReflects';


/**
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const IocContainerToken = new InjectToken<IIocContainer>('DI_IOCCONTAINER');
/**
 * root container proxy.
 */
export type ContainerProxy<T extends IIocContainer = IIocContainer> = () => T;
/**
 * root container factory token.
 */
export const ContainerProxyToken = new InjectToken<ContainerProxy>('DI_CONTAINER_PROXY');

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
     * get container proxy.
     *
     * @template T
     * @returns {ContainerProxy<T>}
     * @memberof IIocContainer
     */
    getContainerProxy<T extends IIocContainer>(): ContainerProxy<T>;
    /**
     * get injector the type injected.
     * @param type
     */
    getInjector(type: Type): IInjector;

    createInjector(): IInjector;
    /**
     * get type reflects manager in current container.
     *
     * @returns {ITypeReflects}
     * @memberof IIocContainer
     */
    getTypeReflects(): ITypeReflects;
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
