import { Token, Factory } from './types';
import { IInjector } from './IInjector';
import { InjectToken } from './InjectToken';
import { TypeReflects } from './services/TypeReflects';


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

}
