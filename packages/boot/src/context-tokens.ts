import { Type, tokenId, IProviders } from '@tsdi/ioc';
import { ModuleConfigure } from './modules/ModuleConfigure';
import { RunnableConfigure } from './annotations/RunnableConfigure';
import { IStartup } from './runnable/Startup';


export const CTX_MODULE = tokenId<Type>('CTX_MODULE');
export const CTX_MODULE_DECTOR = tokenId<string>('CTX_MODULE_DECTOR');
export const CTX_MODULE_EXPORTS = tokenId<IProviders>('CTX_MODULE_EXPORTS');
export const CTX_MODULE_ANNOATION = tokenId<ModuleConfigure>('CTX_MODULE_ANNOATION');
/**
 * module target instance.
 */
export const CTX_MODULE_INST = tokenId<Type>('CTX_MODULE_INST');
/**
 * module boot token.
 */
export const CTX_MODULE_BOOT_TOKEN = tokenId<any>('CTX_MODULE_BOOT_TOKEN');
/**
 * module boot instance.
 */
export const CTX_MODULE_BOOT = tokenId<any>('CTX_MODULE_BOOT');
/**
 * module boot startup instance.
 */
export const CTX_MODULE_STARTUP = tokenId<IStartup>('CTX_MODULE_STARTUP');

export const CTX_APP_ENVARGS = tokenId<string[]>('CTX_APP_ENVARGS');
export const CTX_APP_CONFIGURE = tokenId<RunnableConfigure>('CTX_APP_CONFIGURE');
export const CTX_DATA = tokenId<any>('CTX_DATA');
export const CTX_TEMPLATE = tokenId<any>('CTX_TEMPLATE');

export const CTX_ELEMENT_NAME = tokenId<any>('CTX_ELEMENT_NAME');

// message.
export const CTX_MSG_TARGET = tokenId<any>('CTX_MSG_TARGET');
export const CTX_MSG_TYPE = tokenId<string>('CTX_MSG_TYPE');
export const CTX_MSG_EVENT = tokenId<string>('CTX_MSG_EVENT');
