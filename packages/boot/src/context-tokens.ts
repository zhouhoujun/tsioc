import { InjectToken, Injector } from '@tsdi/ioc';
import { IModuleResolver } from './core/modules/IModuleResovler';
import { ModuleConfigure } from './core/modules/ModuleConfigure';
import { RunnableConfigure } from './annotations/RunnableConfigure';


export const CTX_TYPE_REGFOR = new InjectToken<string>('CTX_TYPE_REGFOR');

export const CTX_MODULE_DECTOR = new InjectToken<string>('CTX_MODULE_DECTOR');
export const CTX_MODULE_RESOLVER = new InjectToken<IModuleResolver>('CTX_MODULE_RESOLVER');
export const CTX_MODULE_EXPORTS = new InjectToken<Injector>('CTX_MODULE_EXPORTS');
export const CTX_MODULE_ANNOATION = new InjectToken<ModuleConfigure>('CTX_MODULE_ANNOATION');
export const CTX_MODULE_BOOTSTRAP = new InjectToken<any>('CTX_MODULE_BOOTSTRAP');

export const CTX_APP_ENVARGS = new InjectToken<string[]>('CTX_APP_ENVARGS');
export const CTX_APP_CONFIGURE = new InjectToken<RunnableConfigure>('CTX_APP_CONFIGURE');
export const CTX_DATA = new InjectToken<any>('CTX_DATA');

