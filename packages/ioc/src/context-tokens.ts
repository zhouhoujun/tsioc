import { tokenId } from './InjectToken';
import { ActCtxOption } from './actions/Action';
import { IParameter } from './IParameter';
import { Token, Type } from './types';
import { ITypeReflect } from './services/ITypeReflect';
import { IProviders } from './IInjector';

export const CTX_PROVIDERS = tokenId<IProviders>('DI_PROVIDERS');
export const CTX_OPTIONS = tokenId<ActCtxOption>('CTX_OPTIONS');
export const CTX_PARAMS = tokenId<IParameter[]>('CTX_PARAMS');
export const CTX_ARGS = tokenId<any[]>('CTX_ARGS');

export const CTX_CURR_DECOR = tokenId<string>('CTX_CURR_DECOR');
export const CTX_CURR_DECOR_SCOPE = tokenId<any>('CTX_CURR_DECOR_SCOPE');
export const CTX_TYPE_REGIN = tokenId<string>('CTX_TYPE_REGIN');

export const CTX_TARGET_TOKEN = tokenId<Token>('CTX_TARGET_TOKEN');
export const CTX_TARGET_RELF = tokenId<ITypeReflect>('CTX_TARGET_RELF');

export const CTX_TOKEN = tokenId<Token>('CTX_TOKEN');
export const CTX_TYPE = tokenId<Type>('CTX_TYPE');
export const CTX_DEFAULT_TOKEN = tokenId<Token>('CTX_DEFAULT_TOKEN');
export const CTX_PROPERTYKEY = tokenId<string>('CTX_PROPERTYKEY');
export const CTX_SINGLETON = tokenId<boolean>('CTX_SINGLETON');
