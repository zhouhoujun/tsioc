import { tokenId, TokenId } from '@tsdi/ioc';
import { IContainer, IContainerBuilder, IModuleLoader } from './link';

/**
 * root container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const CONTAINER: TokenId<IContainer> = tokenId<IContainer>('DI_CONTAINER');
/**
 * root container token.
 *
 * @deprecated use `CONTAINER` instead.
 */
export const ContainerToken = CONTAINER;

/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
export const CONTAINER_BUILDER: TokenId<IContainerBuilder> = tokenId<IContainerBuilder>('CONTAINER_BUILDER');

/**
 * module loader.
 */
export const MODULE_LOADER = tokenId<IModuleLoader>('MODULE_LOADER');

