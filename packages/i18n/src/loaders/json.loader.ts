import { Injectable } from '@tsdi/ioc';
import { TranslationLoader } from './loader';
import { TranslationBundle } from '../locale';
import * as path from 'path';
import * as fs from 'fs';

/**
 * JSON translation file loader.
 *
 * JSON翻译文件加载器，从JSON文件加载翻译。
 */
@Injectable()
export class JsonTranslationLoader extends TranslationLoader {
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
        const filePath = path.join(basePath, `${locale}.json`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Translation file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const messages = JSON.parse(content);

        return {
            locale,
            messages
        };
    }
}