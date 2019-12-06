import { Injector } from './ProviderMap';
import { ProviderType, ParamProvider } from './Provider';


/**
 * providers.
 * note: ObjectMap provider can not resolve token.
 */
export type ProviderTypes = Injector | ProviderType;

/**
 * params providers.
 */
export type ParamProviders = ProviderTypes | ParamProvider;
