import { ProviderMap } from './ProviderMap';
import { ProviderType, ParamProvider } from './Provider';


/**
 * providers.
 * note: ObjectMap<any> provider can not resolve token.
 */
export type ProviderTypes = ProviderMap | ProviderType;

/**
 * params providers.
 */
export type ParamProviders = ProviderTypes | ParamProvider;
