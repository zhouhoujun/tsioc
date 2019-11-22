import { InjectToken } from './InjectToken';
import { ActionContextOption } from './actions/Action';
import { ProviderMap } from './providers/ProviderMap';

export const CTX_OPTIONS = new InjectToken<ActionContextOption>('CTX_OPTIONS');
export const CTX_PROVIDER_MAP = new InjectToken<ProviderMap>('CTX_PROVIDER_MAP');

