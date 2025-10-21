import { Token, tokenId } from '../tokens';
import { Injector } from '../injector';

/**
 * ROOT injector instance token of self.
 */
export const INJECTOR: Token<Injector> = tokenId<Injector>('DI_INJECTOR');

/**
 * appliction platform injector token.
 */
export const CONTAINER: Token<Injector> = tokenId<Injector>('CONTAINER');


