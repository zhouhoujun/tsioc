import { InjectToken } from './InjectToken';
import { ActionContextOption } from './actions/Action';
import { Injector } from './Injector';
import { IParameter } from './IParameter';
import { Token } from './types';

export const CTX_PROVIDERS = new InjectToken<Injector>('DI_PROVIDERS');
export const CTX_OPTIONS = new InjectToken<ActionContextOption>('CTX_OPTIONS');
export const CTX_PARAMS = new InjectToken<IParameter[]>('CTX_PARAMS');
export const CTX_ARGS = new InjectToken<any[]>('CTX_ARGS');

export const CTX_CURR_DECOR = new InjectToken<string>('CTX_CURR_DECOR');
export const CTX_CURR_DECOR_SCOPE = new InjectToken<any>('CTX_CURR_DECOR_SCOPE');
export const CTX_TYPE_REGIN = new InjectToken<string>('CTX_TYPE_REGIN');

export const CTX_TARGET_TOKEN = new InjectToken<Token>('CTX_TARGET_TOKEN');
