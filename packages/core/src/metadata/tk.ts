import { tokenId, Token } from '@tsdi/ioc';
import { Configuration } from '../configure/config';
import { Context } from '../middlewares/context';



/**
 * config token.
 */
export const CONFIGURATION = tokenId<Configuration>('CONFIGURATION');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: Token<Configuration> = tokenId<Configuration>('DEFAULT_CONFIG');

/**
 *  appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');

/**
 * middleware context.
 */
export const CONTEXT = Context;
