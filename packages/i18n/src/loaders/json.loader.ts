import { Injectable, Inject } from '@tsdi/ioc';
import { FileAdapter } from '@tsdi/common';
import { TranslationLoader } from './loader';
import { TranslationBundle } from '../locale';

/**
 * JSON translation file loader.
 *
 * JSON翻译文件加载器，从JSON文件加载翻译。
 */
@Injectable()
export class JsonTranslationLoader extends TranslationLoader {
    constructor(@Inject() private fileAdapter: FileAdapter) {
        super();
    }

    /**
     * load translations from path.
     * @param basePath base path for translation files.
     * @param locales locales to load.
     * @returns loaded translation bundles.
     */
    async load(basePath: string, locales: string[]): Promise<TranslationBundle[]> {
        const bundles: TranslationBundle[] = [];

        for (const locale of locales) {
            try {
                const bundle = await this.loadLocale(basePath, locale);
                bundles.push(bundle);
            } catch (err) {
                console.warn(`Failed to load locale ${locale}:`, err);
            }
        }

        return bundles;
    }

    /**
     * load single locale translations.
     * @param basePath base path.
     * @param locale locale code.
     * @returns translation bundle.
     */
    async loadLocale(basePath: string, locale: string): Promise<TranslationBundle> {
        const filePath = this.fileAdapter.join(basePath, `${locale}.json`);

        const fileStats = await this.fileAdapter.find(filePath);
        if (!fileStats) {
            throw new Error(`Translation file not found: ${filePath}`);
        }

        // Use readJSON method
        const messages = await this.fileAdapter.readJSON(filePath);

        return {
            locale,
            messages
        };
    }
}