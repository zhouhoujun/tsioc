import { Abstract } from '@tsdi/ioc';

/**
 * Translator abstract class.
 *
 * 翻译器抽象类，提供翻译功能的核心接口。
 */
@Abstract()
export abstract class Translator {
    /**
     * get current locale.
     */
    abstract get currentLocale(): string;

    /**
     * set locale.
     * @param locale locale code (e.g., 'en', 'zh-CN').
     */
    abstract setLocale(locale: string): void;

    /**
     * translate message by key.
     * @param key translation key.
     * @param params interpolation parameters.
     */
    abstract translate(key: string, params?: Record<string, any>): string;

    /**
     * translate message by key with specific locale.
     * @param key translation key.
     * @param locale locale code.
     * @param params interpolation parameters.
     */
    abstract translate(key: string, locale: string, params?: Record<string, any>): string;

    /**
     * check if translation exists.
     * @param key translation key.
     */
    abstract has(key: string, locale?: string): boolean;

    /**
     * get available locales.
     */
    abstract get availableLocales(): string[];
}