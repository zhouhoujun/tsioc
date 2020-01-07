import { ProviderType, ParamProvider } from './Provider';
import { Type } from '../types';
import { IProviders } from '../IInjector';


/**
 * providers.
 * note: ObjectMap provider can not resolve token.
 */
export type ProviderTypes = IProviders | ProviderType;

/**
 * inject types
 */
export type InjectTypes = Type | ProviderTypes;

/**
 * params providers.
 */
export type ParamProviders = ProviderTypes | ParamProvider;
