import { Token, ClassType, tokenId, Modules, TokenId } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { IContainerBuilder } from './IContainerBuilder';

/**
 * root container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const ContainerToken: TokenId<IContainer> = tokenId<IContainer>('DI_IContainer');

/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
export const ContainerBuilderToken: TokenId<IContainerBuilder> = tokenId<IContainerBuilder>('CONTAINER_BUILDER');


export const CTX_CURR_TOKEN: TokenId<Token> = tokenId<Token>('CTX_CURR_TOKEN');
export const CTX_CURR_TYPE = tokenId<ClassType>('CTX_CURR_TYPE');
export const CTX_TARGET_REFS = tokenId<any[]>('CTX_TARGET_REFS');
export const CTX_TOKENS = tokenId<Token[]>('CTX_TOKENS');
export const CTX_ALIAS = tokenId<string>('CTX_ALIAS');
export const CTX_TYPES = tokenId<ClassType[]>('CTX_TOKENS');
export const CTX_INJ_MODULE = tokenId<Modules>('CTX_INJ_MODULE');
