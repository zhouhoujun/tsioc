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
export const BOOTCONTEXT: TokenId<IBootContext> = tokenId<IBootContext>('BOOT__CONTEXT');

/**
 * current application boot context token.
 * @deprecated use BOOTCONTEXT instead.
 */
export const ApplicationContextToken = BOOTCONTEXT;

export const CONFIGURATION = tokenId<Configure>('CONFIGURATION');
/**
 * configure manager token.
 */
export const ConfigureMgrToken: TokenId<IConfigureManager> = tokenId<IConfigureManager>('CONFIG-MGR');

/**
 * default configuration token.
 */
export const DefaultConfigureToken: TokenId<Configure> = tokenId<Configure>('BOOT_DEFAULT_CONFIG');

/**
 * configure loader token.
 */
export const ConfigureLoaderToken: TokenId<IConfigureLoader> = tokenId<IConfigureLoader>('BOOT_Configure_Loader');

/**
 * configure merger token.
 */
export const ConfigureMergerToken = tokenId<IConfigureMerger>('BOOT_Configure_Loader');

/**
 *  process run root.
 */
export const ProcessRunRootToken: TokenId<string> = tokenId<string>('BOOT_PROCESS_ROOT');


/**
 * build service token.
 */
export const BuilderServiceToken: TokenId<IBuilderService> = tokenId<IBuilderService>('BOOT_BuilderService');

/**
 * root message queue token.
 */
export const RootMessageQueueToken: TokenId<IMessageQueue> = tokenId<IMessageQueue>('BOOT_ROOT_MessageQueue');


/**
 * parent injector token.
 */
export const ParentInjectorToken: TokenId<IInjector> = tokenId<IInjector>('IOC_PARENT_INJECTOR');

/**
 * base type parser token.
 */
export const BaseTypeParserToken: TokenId<IBaseTypeParser> = tokenId<IBaseTypeParser>('BaseTypeParser');

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
