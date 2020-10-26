import { tokenId, IProvider, Token, TokenId, IInjector } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { Configure } from './configure/Configure';
import { IStartup } from './runnable/Startup';
import { IBootContext } from './Context';
import { IConfigureLoader, IConfigureManager, IConfigureMerger } from './configure/IConfigureManager';
import { IBuilderService } from './services/IBuilderService';
import { IMessageQueue } from './messages/IMessageQueue';
import { IBaseTypeParser } from './services/IBaseTypeParser';
import { ModuleInjector } from './modules/injector';


/**
 *  current application boot context token.
 */
export const BOOTCONTEXT: TokenId<IBootContext> = tokenId<IBootContext>('BOOT_CONTEXT');

/**
 * config token.
 */
export const CONFIGURATION = tokenId<Configure>('CONFIGURATION');

/**
 * configure manager token.
 */
export const CONFIG_MANAGER: TokenId<IConfigureManager> = tokenId<IConfigureManager>('CONFIG_MANAGER');

/**
 * default configuration token.
 */
export const DEFAULT_CONFIG: TokenId<Configure> = tokenId<Configure>('DEFAULT_CONFIG');

/**
 * configure loader token.
 */
export const CONFIG_LOADER: TokenId<IConfigureLoader> = tokenId<IConfigureLoader>('CONFIG_LOADER');

/**
 * configure merger token.
 */
export const CONFIG_MERGER = tokenId<IConfigureMerger>('CONFIG_MERGER');

/**
 *  appliaction boot process root path.
 */
export const PROCESS_ROOT: TokenId<string> = tokenId<string>('PROCESS_ROOT');
/**
 * appliaction boot process root path.
 *
 * @deprecated use `PROCESS_ROOT` instead.
 */
export const ProcessRunRootToken = PROCESS_ROOT;


/**
 * build service token.
 */
export const BUILDER: TokenId<IBuilderService> = tokenId<IBuilderService>('BUILDER');
/**
 * build service token.
 *
 * @deprecated use `BUILDER` instead.
 */
export const BuilderServiceToken = BUILDER;

/**
 * root message queue token.
 */
export const ROOT_MESSAGEQUEUE: TokenId<IMessageQueue> = tokenId<IMessageQueue>('ROOT_MESSAGEQUEUE');
/**
 * root message queue token.
 *
 * @deprecated use `ROOT_MESSAGEQUEUE` instead.
 */
export const RootMessageQueueToken = ROOT_MESSAGEQUEUE;

/**
 * parent injector token.
 */
export const PARENT_INJECTOR: TokenId<IInjector> = tokenId<IInjector>('PARENT_INJECTOR');

/**
 * type parser token.
 */
export const TYPE_PARSER: TokenId<IBaseTypeParser> = tokenId<IBaseTypeParser>('TYPE_PARSER');
/**
 * type parser token.
 *
 * @deprecated use `TYPE_PARSER` instead.
 */
export const BaseTypeParserToken = TYPE_PARSER;


/**
 * appliction root module injector token.
 */
export const ROOT_INJECTOR: TokenId<ModuleInjector> = tokenId<ModuleInjector>('ROOT_INJECTOR');

/**
 * module boot startup instance.
 */
export const MODULE_STARTUP = tokenId<IStartup>('MODULE_STARTUP');

/**
 * application statup service
 */
export const MODULE_STARTUPS = tokenId<Token[]>('MODULE_STARTUPS');

export const CTX_PROVIDERS: TokenId<IProvider> = tokenId<IProvider>('CTX_PROVIDERS');

export const CTX_OPTIONS = tokenId<any>('CTX_OPTIONS');

export const CTX_CURR_INJECTOR = tokenId<ICoreInjector>('CTX_CURR_INJECTOR');
