import { token } from '@tsdi/ioc';
import { AnthropicProviderOptions } from './anthropic-options';

export const ANTHROPIC_PROVIDER_OPTIONS = token<AnthropicProviderOptions>('ANTHROPIC_PROVIDER_OPTIONS');
