import { ProviderType, ParamProvider } from './Provider';
import { Type } from '../types';
import { IInjector } from '../IInjector';


/**
 * providers.
 * note: ObjectMap provider can not resolve token.
 */
export type ProviderTypes = IInjector | ProviderType;

/**
 * inject types
 */
export type InjectTypes = Type | ProviderTypes;

/**
 * params providers.
 */
export type ParamProviders = ProviderTypes | ParamProvider;
