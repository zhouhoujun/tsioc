import { InjectToken, ProviderMap } from '@tsdi/ioc';
import { RegFor } from './core/modules/RegScope';
import { IModuleResolver } from './core/modules/IModuleResovler';
import { ModuleConfigure } from './core/modules/ModuleConfigure';
import { RunnableConfigure } from './annotations/RunnableConfigure';


export const CTX_MODULE_DECTOR = new InjectToken<string>('CTX_MODULE_DECTOR');
export const CTX_MODULE_REGFOR = new InjectToken<RegFor>('CTX_MODULE_REGFOR');
export const CTX_MODULE_RESOLVER = new InjectToken<IModuleResolver>('CTX_MODULE_RESOLVER');
export const CTX_MODULE_EXPORTS = new InjectToken<ProviderMap>('CTX_MODULE_EXPORTS');
export const CTX_MODULE_ANNOATION = new InjectToken<ModuleConfigure>('CTX_MODULE_ANNOATION');

export const CTX_APP_CONFIGURE = new InjectToken<RunnableConfigure>('CTX_APP_CONFIGURE');
