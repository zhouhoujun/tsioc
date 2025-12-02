import { Token, token } from '../tokens';
import { Injector } from '../injector';

/**
 * ROOT injector instance token of self.
 */
export const INJECTOR: Token<Injector> = token<Injector>('DI_INJECTOR');

/**
 * appliction platform injector token.
 */
export const CONTAINER: Token<Injector> = token<Injector>('CONTAINER');


