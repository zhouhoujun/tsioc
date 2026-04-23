import { Token, token } from '@tsdi/ioc';
import { I18nModuleOptions } from './i18n.module';
import { TranslationBundle } from './locale';
import { TranslationLoader } from './loaders';

/**
 * i18n module options token.
 */
export const I18N_OPTIONS = token<I18nModuleOptions>('I18N_OPTIONS');

/**
 * current locale token.
 */
export const I18N_LOCALE = token<string>('I18N_LOCALE');

/**
 * translations bundle token.
 */
export const I18N_TRANSLATIONS = token<Map<string, TranslationBundle>>('I18N_TRANSLATIONS');

/**
 * translation loaders token (multi provider).
 */
export const TRANSLATION_LOADERS = token<TranslationLoader[]>('TRANSLATION_LOADERS');