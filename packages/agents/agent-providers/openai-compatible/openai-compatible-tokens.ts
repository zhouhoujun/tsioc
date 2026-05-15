import { token } from '@tsdi/ioc';
import { OpenAICompatibleProviderOptions } from './openai-compatible-options';

export const OPENAI_COMPATIBLE_PROVIDER_OPTIONS = token<OpenAICompatibleProviderOptions>('OPENAI_COMPATIBLE_PROVIDER_OPTIONS');
