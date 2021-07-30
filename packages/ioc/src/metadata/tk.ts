import { Container, Injector } from '../injector';
import { Token, tokenId } from '../tokens';

/**
 * injector instance token of self.
 */
export const INJECTOR: Token<Injector> = tokenId<Injector>('DI_INJECTOR');

/**
 * appliction root module injector token.
 */
export const ROOT_INJECTOR: Token<Injector> = tokenId<Injector>('ROOT_INJECTOR');

/**
 * root container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const CONTAINER: Token<Container> = tokenId<Container>('IOC_CONTAINER');

/**
 * resolve target token.
 */
export const TARGET = tokenId<any>('TARGET');