import { Type, tokenId, IProviders, Token, TokenId } from '@tsdi/ioc';
import { ModuleConfigure } from './modules/ModuleConfigure';
import { RunnableConfigure } from './annotations/RunnableConfigure';
import { IStartup } from './runnable/Startup';


export const CTX_MODULE: TokenId<Type> = tokenId<Type>('CTX_MODULE');
export const CTX_MODULE_DECTOR: TokenId<string> = tokenId<string>('CTX_MODULE_DECTOR');
export const CTX_MODULE_EXPORTS: TokenId<IProviders> = tokenId<IProviders>('CTX_MODULE_EXPORTS');
export const CTX_MODULE_ANNOATION: TokenId<ModuleConfigure> = tokenId<ModuleConfigure>('CTX_MODULE_ANNOATION');
/**
 * module target instance.
 */
export const CTX_MODULE_INST: TokenId<Type> = tokenId<Type>('CTX_MODULE_INST');
/**
 * module boot token.
 */
export const CTX_MODULE_BOOT_TOKEN: TokenId = tokenId<any>('CTX_MODULE_BOOT_TOKEN');
/**
 * module boot instance.
 */
export const CTX_MODULE_BOOT: TokenId = tokenId<any>('CTX_MODULE_BOOT');
/**
 * module boot startup instance.
 */
export const CTX_MODULE_STARTUP: TokenId<IStartup> = tokenId<IStartup>('CTX_MODULE_STARTUP');

export const CTX_APP_ENVARGS: TokenId<string[]> = tokenId<string[]>('CTX_APP_ENVARGS');
export const CTX_APP_CONFIGURE: TokenId<RunnableConfigure> = tokenId<RunnableConfigure>('CTX_APP_CONFIGURE');

/**
 * application statup service
 */
export const CTX_APP_STARTUPS: TokenId<Token[]> = tokenId<Token[]>('CTX_APP_STARTUPS');
/**
 * application boot
 */
export const CTX_APP_BOOT: TokenId<Token> = tokenId<Token>('CTX_APP_BOOT');

export const CTX_DATA: TokenId = tokenId<any>('CTX_DATA');
export const CTX_TEMPLATE: TokenId = tokenId<any>('CTX_TEMPLATE');

export const CTX_ELEMENT_NAME: TokenId = tokenId<any>('CTX_ELEMENT_NAME');

// message.
export const CTX_MSG_TARGET: TokenId = tokenId<any>('CTX_MSG_TARGET');
export const CTX_MSG_TYPE: TokenId<string> = tokenId<string>('CTX_MSG_TYPE');
export const CTX_MSG_EVENT: TokenId<string> = tokenId<string>('CTX_MSG_EVENT');
