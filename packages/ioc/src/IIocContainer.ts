import { Token, Factory, Type } from './types';
import { IInjector } from './IInjector';
import { InjectToken } from './InjectToken';
import { TypeReflects } from './services/TypeReflects';


/**
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const IocContainerToken = new InjectToken<IIocContainer>('DI_IocContainer');
/**
 * root container factory.
 */
export type ContainerFactory<T extends IIocContainer = IIocContainer> = () => T;
/**
 * root container factory token.
 */
export const ContainerFactoryToken = new InjectToken<ContainerFactory>('DI_ContainerFactory');

/**
 * root container interface.
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
     * get injector the type injected.
     * @param type
     */
    getInjector(type: Type): IInjector;
    /**
     * get type reflects manager in current container.
     *
     * @returns {TypeReflects}
     * @memberof IIocContainer
     */
    getTypeReflects(): TypeReflects;
    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register type class.
     * @param injector register in the injector.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(injector: IInjector, type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register factory to injector.
     * @param injector the injector to register.
     * @param token register token
     * @param fac factory of token.
     * @param singleton singlteon or not.
     */
    registerFactory<T>(injector: IInjector, token: Token<T>, fac?: Factory<T>, singleton?: boolean): this;
}
