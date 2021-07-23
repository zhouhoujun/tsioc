import { tokenId, Token, Type } from '@tsdi/ioc';
import { Configuration, IConfigureLoader, IConfigureManager, IConfigureMerger } from '../configure/config';
import { IBaseTypeParser, IStartupService } from '../services/intf';
import { MessageContext } from '../middlewares/ctx';
import { IBootApplication } from '../IBootApplication';
import { IConfigureRegister } from '../configure/register';


/**
 *  current application token.
 */
export const APPLICATION: Token<IBootApplication> = tokenId<IBootApplication>('APPLICATION');

/**
 * boot types.
 */
export const BOOT_TYPES = tokenId<Type<IStartupService>[]>('BOOT_TYPES');

/**
 * configure registers.
 */
export const CONFIGURES = tokenId<Type<IConfigureRegister>[]>('CONFIGURES');


/**
* context options.
*/
export const CTX_ARGS = tokenId<string[]>('CTX_ARGS');


/**
 * config token.
 */
export const CONFIGURATION = tokenId<Configuration>('CONFIGURATION');

/**
 * configure manager token.
 */
export const CONFIG_MANAGER: Token<IConfigureManager> = tokenId<IConfigureManager>('CONFIG_MANAGER');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: Token<Configuration> = tokenId<Configuration>('DEFAULT_CONFIG');

/**
 * configure loader token.
 */
export const CONFIG_LOADER: Token<IConfigureLoader> = tokenId<IConfigureLoader>('CONFIG_LOADER');

/**
 * configure merger token.
 */
export const CONFIG_MERGER = tokenId<IConfigureMerger>('CONFIG_MERGER');

/**
 *  appliaction boot process root path.
 */
export const PROCESS_ROOT: Token<string> = tokenId<string>('PROCESS_ROOT');

/**
 * appliaction boot process root path.
 *
 * @deprecated use `PROCESS_ROOT` instead.
 */
export const ProcessRunRootToken = PROCESS_ROOT;

/**
 * type parser token.
 */
export const TYPE_PARSER: Token<IBaseTypeParser> = tokenId<IBaseTypeParser>('TYPE_PARSER');

/**
 * type parser token.
 *
 * @deprecated use `TYPE_PARSER` instead.
 */
export const BaseTypeParserToken = TYPE_PARSER;

/**
 * context options.
 */
export const CTX_OPTIONS = tokenId<any>('CTX_OPTIONS');


/**
 * middleware context.
 */
export const CONTEXT: Token<MessageContext> = tokenId<MessageContext>('MIDDLE_CONTEXT');
