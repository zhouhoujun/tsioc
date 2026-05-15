import { token } from '@tsdi/ioc';
import { DeepSeekProviderOptions } from './deepseek-options';

export const DEEPSEEK_PROVIDER_OPTIONS = token<DeepSeekProviderOptions>('DEEPSEEK_PROVIDER_OPTIONS');
