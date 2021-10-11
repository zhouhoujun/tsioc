import { tokenId, Token, Type } from '@tsdi/ioc';
import { Configuration } from '../configure/config';
import { IStartupService, Server } from '../services/intf';
import { Context } from '../middlewares/ctx';


/**
 * boot types.
 */
 export const SERVERS = tokenId<Type<Server>[]>('SERVERS');

/**
 * boot types.
 */
export const BOOT_TYPES = tokenId<Type<IStartupService>[]>('BOOT_TYPES');

/**
* context options.
*/
export const CTX_ARGS = tokenId<string[]>('CTX_ARGS');

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
 * context options.
 */
export const CTX_OPTIONS = tokenId<Record<string, any>>('CTX_OPTIONS');

/**
 * middleware context.
 */
export const CONTEXT = Context;