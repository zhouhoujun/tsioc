import { token } from '@tsdi/ioc';
import { OpenAIProviderOptions } from './openai-options';

export const OPENAI_PROVIDER_OPTIONS = token<OpenAIProviderOptions>('OPENAI_PROVIDER_OPTIONS');
