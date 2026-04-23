import { Injectable, Inject, Injector, Optional } from '@tsdi/ioc';
import { Translator } from './translator';
import { I18N_OPTIONS, I18N_TRANSLATIONS, TRANSLATION_LOADERS } from './tokens';
import { I18nModuleOptions } from './i18n.module';
import { TranslationBundle, LocaleService } from './locale';
import { MessageFormatter } from './message';
import { TranslationLoader } from './loaders';

/**
 * Translator service implementation.
 *
 * 翻译服务实现，提供翻译、语言切换等功能。
 */
@Injectable()
export class TranslatorService extends Translator {
    private _currentLocale: string;
    private _translations: Map<string, TranslationBundle>;
    private _formatter: MessageFormatter;

    constructor(
        @Inject() private injector: Injector,
        @Inject(I18N_OPTIONS) @Optional() private options: I18nModuleOptions,
        @Inject() private localeService: LocaleService
    ) {
        super();
        this._currentLocale = options?.defaultLocale || 'en';
        this._translations = new Map();
        this._formatter = new MessageFormatter();
        this.init();
    }

    private async init() {
        // Load translations from options
        if (this.options?.bundles) {
            for (const [locale, bundle] of Object.entries(this.options.bundles)) {
                this._translations.set(locale, bundle);
                this.localeService.registerBundle(locale, bundle);
            }
        }

        // Load from loaders if basePath specified
        if (this.options?.basePath) {
            const loaders = this.injector.get(TRANSLATION_LOADERS, []);
            for (const loader of loaders) {
                const bundles = await loader.load(this.options.basePath, this.options.locales || []);
                for (const bundle of bundles) {
                    this._translations.set(bundle.locale, bundle);
                    this.localeService.registerBundle(bundle.locale, bundle);
                }
            }
        }
    }

    get currentLocale(): string {
        return this._currentLocale;
    }

    setLocale(locale: string): void {
        if (this._translations.has(locale) || this.localeService.availableLocales.includes(locale)) {
            this._currentLocale = locale;
        }
    }

    translate(key: string, params?: Record<string, any>): string;
    translate(key: string, locale: string, params?: Record<string, any>): string;
    translate(key: string, localeOrParams?: string | Record<string, any>, params?: Record<string, any>): string {
        const locale = typeof localeOrParams === 'string' ? localeOrParams : this._currentLocale;
        const actualParams = typeof localeOrParams === 'string' ? params : localeOrParams;

        const bundle = this._translations.get(locale);
        if (!bundle) {
            return key;
        }

        const message = this.getMessage(bundle, key);
        if (!message) {
            return key;
        }

        return this._formatter.format(message, actualParams || {}, locale);
    }

    private getMessage(bundle: TranslationBundle, key: string): string | undefined {
        const parts = key.split('.');
        let current: any = bundle.messages;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }

        return typeof current === 'string' ? current : undefined;
    }

    has(key: string, locale?: string): boolean {
        const targetLocale = locale || this._currentLocale;
        const bundle = this._translations.get(targetLocale);
        if (!bundle) return false;

        return this.getMessage(bundle, key) !== undefined;
    }

    get availableLocales(): string[] {
        return Array.from(this._translations.keys());
    }
}