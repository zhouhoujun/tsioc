import { tokenId, TokenId } from '@tsdi/ioc';
import { IContainerBuilder } from './IBuilder';


/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
export const CONTAINER_BUILDER: TokenId<IContainerBuilder> = tokenId<IContainerBuilder>('CONTAINER_BUILDER');

