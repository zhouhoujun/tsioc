import { tokenId, Token } from '@tsdi/ioc';
import { ApplicationConfiguration } from '../configure/config';



/**
 * config token.
 */
export const CONFIGURATION = tokenId<ApplicationConfiguration>('CONFIGURATION');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: Token<ApplicationConfiguration> = tokenId<ApplicationConfiguration>('DEFAULT_CONFIG');

/**
 *  appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');

