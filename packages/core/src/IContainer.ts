import { IIocContainer, tokenId, TokenId } from '@tsdi/ioc';
import { ICoreInjector } from './ICoreInjector';

/**
 * root container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const ContainerToken: TokenId<IContainer> = tokenId<IContainer>('DI_IContainer');


/**
 * root container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IIocContainer, ICoreInjector {
    /**
     * get root container.
     */
    getContainer(): this;
}
