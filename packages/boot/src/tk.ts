import { tokenId, Token } from '@tsdi/ioc';
import { IBootContext } from './Context';
import { Configure, IConfigureLoader, IConfigureManager, IConfigureMerger } from './configure/config';
import { IBaseTypeParser } from './services/IBaseTypeParser';
import { MessageContext } from './middlewares/ctx';
import { IBootApplication } from './IBootApplication';
import { IBuilderService } from './services/IBuilderService';


/**
 *  current application boot context token.
 */
export const BOOTCONTEXT: Token<IBootContext> = tokenId<IBootContext>('BOOT_CONTEXT');

/**
 * config token.
 */
export const CONFIGURATION = tokenId<Configure>('CONFIGURATION');

/**
 * configure manager token.
 */
export const CONFIG_MANAGER: Token<IConfigureManager> = tokenId<IConfigureManager>('CONFIG_MANAGER');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: Token<Configure> = tokenId<Configure>('DEFAULT_CONFIG');

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
 *  appliaction boot process root path.
 */
export const PROCESS_EXIT = tokenId<(app: IBootApplication) => void>('PROCESS_ROOT');

/**
 * build service token.
 */
export const BUILDER: Token<IBuilderService> = tokenId<IBuilderService>('BUILDER');

/**
 * build service token.
 *
 * @deprecated use `BUILDER` instead.
 */
export const BuilderServiceToken = BUILDER;

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
 * application statup service
 */
export const MODULE_STARTUPS = tokenId<Token[]>('MODULE_STARTUPS');

/**
 * context options.
 */
export const CTX_OPTIONS = tokenId<any>('CTX_OPTIONS');


/**
 * middleware context.
 */
export const CONTEXT: Token<MessageContext> = tokenId<MessageContext>('MIDDLE_CONTEXT');
