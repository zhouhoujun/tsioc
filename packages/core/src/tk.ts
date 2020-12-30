import { tokenId, TokenId } from '@tsdi/ioc';
import { IContainerBuilder } from './IContainerBuilder';


/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
export const ContainerBuilderToken: TokenId<IContainerBuilder> = tokenId<IContainerBuilder>('CONTAINER_BUILDER');

