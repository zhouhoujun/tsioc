import { InjectToken, Injector, Type } from '@tsdi/ioc';
import { ModuleConfigure } from './modules/ModuleConfigure';
import { RunnableConfigure } from './annotations/RunnableConfigure';
import { Startup } from './runnable/Startup';


export const CTX_MODULE = new InjectToken<Type>('CTX_MODULE');
export const CTX_MODULE_DECTOR = new InjectToken<string>('CTX_MODULE_DECTOR');
export const CTX_MODULE_EXPORTS = new InjectToken<Injector>('CTX_MODULE_EXPORTS');
export const CTX_MODULE_ANNOATION = new InjectToken<ModuleConfigure>('CTX_MODULE_ANNOATION');
/**
 * module target instance.
 */
export const CTX_MODULE_INST = new InjectToken<Type>('CTX_MODULE_INST');
/**
 * module boot token.
 */
export const CTX_MODULE_BOOT_TOKEN = new InjectToken<any>('CTX_MODULE_BOOT_TOKEN');
/**
 * module boot instance.
 */
export const CTX_MODULE_BOOT = new InjectToken<any>('CTX_MODULE_BOOT');
/**
 * module boot startup instance.
 */
export const CTX_MODULE_STARTUP = new InjectToken<Startup>('CTX_MODULE_STARTUP');

export const CTX_APP_ENVARGS = new InjectToken<string[]>('CTX_APP_ENVARGS');
export const CTX_APP_CONFIGURE = new InjectToken<RunnableConfigure>('CTX_APP_CONFIGURE');
export const CTX_DATA = new InjectToken<any>('CTX_DATA');
export const CTX_TEMPLATE = new InjectToken<any>('CTX_TEMPLATE');
