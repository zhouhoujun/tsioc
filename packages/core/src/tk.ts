import { Token, ClassType, tokenId, Modules, TokenId } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { IContainerBuilder } from './IContainerBuilder';

/**
 * root container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const ContainerToken: TokenId<IContainer> = tokenId<IContainer>('DI_IContainer');

/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
export const ContainerBuilderToken: TokenId<IContainerBuilder> = tokenId<IContainerBuilder>('CONTAINER_BUILDER');

