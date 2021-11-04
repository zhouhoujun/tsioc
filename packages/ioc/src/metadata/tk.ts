import { Container, Injector } from '../injector';
import { Token, tokenId } from '../tokens';

/**
 * injector instance token of self.
 */
export const INJECTOR: Token<Injector> = tokenId<Injector>('DI_INJECTOR');

/**
 * appliction platform injector token.
 */
export const PLATFORM_INJECTOR: Token<Injector> = tokenId<Injector>('PLATFORM_INJECTOR');

/**
 * root container token.
 * @deprecated use {@link PLATFORM_INJECTOR} instead.
 */
export const CONTAINER: Token<Container> = PLATFORM_INJECTOR;

/**
 * appliction root injector token.
 */
export const ROOT_INJECTOR: Token<Injector> = tokenId<Injector>('ROOT_INJECTOR');

/**
 * resolve target token.
 */
export const TARGET = tokenId<any>('TARGET');
