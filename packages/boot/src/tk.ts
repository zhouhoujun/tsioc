import { Type, tokenId, IProvider, Token, TokenId, IInjector, TypeReflect } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ModuleConfigure } from './modules/configure';
import { Configure } from './configure/Configure';
import { IStartup } from './runnable/Startup';
import { AnnoationOption, AnnoationContext, BootContext, BuildOption, BootOption, BuildContext } from './Context';
import { IConfigureLoader, IConfigureManager, IConfigureMerger } from './configure/IConfigureManager';
import { IBuilderService } from './services/IBuilderService';
import { IMessageQueue } from './messages/IMessageQueue';
import { IBaseTypeParser } from './services/IBaseTypeParser';
import { ModuleInjector } from './modules/injector';
import { ContextFactory } from './ContextFactory';




/**
 *  current application boot context token.
 */
export const BOOTCONTEXT: TokenId<BootContext> = tokenId<BootContext>('BOOT__CONTEXT');

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
export const ROOT_INJECTOR: TokenId<ModuleInjector> = tokenId<ModuleInjector>('ROOT_MODULE');

/**
 * module boot startup instance.
 */
export const MODULE_STARTUP = tokenId<IStartup>('MODULE_STARTUP');

/**
 * application statup service
 */
export const MODULE_STARTUPS = tokenId<Token[]>('MODULE_STARTUPS');

export const CTX_PROVIDERS: TokenId<IProvider> = tokenId<IProvider>('CTX_PROVIDERS');

export const BUILD_CONTEX_FACTORY = tokenId<ContextFactory<BuildOption, BuildContext>>('BUILD_CONTEX_FACTORY');

export const BOOT_CONTEX_FACTORY = tokenId<ContextFactory<BootOption, BootContext>>('BOOT_CONTEX_FACTORY');

// export const CTX_PARENT_CONTEXT: TokenId<AnnoationContext> = tokenId<AnnoationContext>('CTX_PARENT_CONTEXT');
// export const CTX_SUB_CONTEXT = tokenId<AnnoationContext[]>('CTX_SUB_CONTEXT');

// export const CTX_TARGET_RELF = tokenId<TypeReflect>('CTX_TARGET_RELF');

// export const CTX_MODULE  = tokenId<Type>('CTX_MODULE');
// export const CTX_MODULE_DECTOR = tokenId<string>('CTX_MODULE_DECTOR');
// export const CTX_MODULE_EXPORTS = tokenId<IProvider>('CTX_MODULE_EXPORTS');
// export const CTX_MODULE_ANNOATION = tokenId<ModuleConfigure>('CTX_MODULE_ANNOATION');
// /**
//  * module target instance.
//  */
// export const CTX_MODULE_INST = tokenId<Type>('CTX_MODULE_INST');
// /**
//  * module boot token.
//  */
// export const CTX_MODULE_BOOT_TOKEN = tokenId<any>('CTX_MODULE_BOOT_TOKEN');
// /**
//  * module boot instance.
//  */
// export const CTX_MODULE_BOOT = tokenId<any>('CTX_MODULE_BOOT');
// /**
//  * module boot startup instance.
//  */
// export const CTX_MODULE_STARTUP = tokenId<IStartup>('CTX_MODULE_STARTUP');

// export const CTX_APP_ENVARGS = tokenId<string[]>('CTX_APP_ENVARGS');
// export const CTX_APP_CONFIGURE = tokenId<Configure>('CTX_APP_CONFIGURE');

// /**
//  * application statup service
//  */
// export const CTX_APP_STARTUPS = tokenId<Token[]>('CTX_APP_STARTUPS');
// /**
//  * application boot
//  */
// export const CTX_APP_BOOT = tokenId<Token>('CTX_APP_BOOT');

// export const CTX_DATA = tokenId<any>('CTX_DATA');
// export const CTX_TEMPLATE = tokenId<any>('CTX_TEMPLATE');

// export const CTX_ELEMENT_NAME = tokenId<any>('CTX_ELEMENT_NAME');

// // message.
// export const CTX_MSG_TARGET = tokenId<any>('CTX_MSG_TARGET');
// export const CTX_MSG_TYPE = tokenId<string>('CTX_MSG_TYPE');
// export const CTX_CURR_INJECTOR = tokenId<ICoreInjector>('CTX_CURR_INJECTOR');
// export const CTX_MSG_EVENT = tokenId<string>('CTX_MSG_EVENT');
