import { token } from '@tsdi/ioc';
import { GeminiProviderOptions } from './gemini-options';

export const GEMINI_PROVIDER_OPTIONS = token<GeminiProviderOptions>('GEMINI_PROVIDER_OPTIONS');
