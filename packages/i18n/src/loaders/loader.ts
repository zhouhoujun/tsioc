import { Abstract, Token } from '@tsdi/ioc';
import { TranslationBundle } from '../locale';

/**
 * Translation loader abstract class.
 *
 * 翻译文件加载器抽象类。
 */
@Abstract()
export abstract class TranslationLoader {
    /**
     * load translations from path.
     * @param basePath base path for translation files.
     * @param locales locales to load.
     * @returns loaded translation bundles.
     */
    abstract load(basePath: string, locales: string[]): Promise<TranslationBundle[]>;

    /**
     * load single locale translations.
     * @param basePath base path.
     * @param locale locale code.
     * @returns translation bundle.
     */
    abstract loadLocale(basePath: string, locale: string): Promise<TranslationBundle>;
}