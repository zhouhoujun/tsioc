import { Injectable, Inject, Optional } from '@tsdi/ioc';
import { I18N_OPTIONS } from './tokens';
import { I18nModuleOptions } from './i18n.module';

/**
 * Translation bundle interface.
 */
export interface TranslationBundle {
    /**
     * locale code (e.g., 'en', 'zh-CN').
     */
    locale: string;

    /**
     * translation messages.
     * Supports nested structure for hierarchical keys.
     */
    messages: Record<string, string | NestedMessages>;

    /**
     * plural rules configuration (optional).
     */
    plurals?: PluralRuleConfig;
}

/**
 * Nested messages type.
 */
export interface NestedMessages {
    [key: string]: string | NestedMessages;
}

/**
 * Plural rule configuration.
 */
export interface PluralRuleConfig {
    /**
     * plural categories (e.g., 'one', 'other').
     */
    categories: string[];

    /**
     * plural rule function.
     */
    rule?: (n: number) => string;
}

/**
 * Locale configuration.
 */
export interface LocaleConfig {
    /**
     * locale code.
     */
    locale: string;

    /**
     * locale display name.
     */
    name?: string;

    /**
     * locale direction (ltr or rtl).
     */
    direction?: 'ltr' | 'rtl';

    /**
     * translation bundle.
     */
    bundle?: TranslationBundle;
}

/**
 * Locale service for managing locale state and bundles.
 *
 * 语言环境服务，管理语言状态和翻译包。
 */
@Injectable()
export class LocaleService {
    private _currentLocale: string;
    private _locales: Map<string, LocaleConfig>;
    private _bundles: Map<string, TranslationBundle>;

    constructor(
        @Inject(I18N_OPTIONS) @Optional() private options: I18nModuleOptions
    ) {
        this._currentLocale = options?.defaultLocale || 'en';
        this._locales = new Map();
        this._bundles = new Map();
    }

    /**
     * get available locales.
     */
    get availableLocales(): string[] {
        return Array.from(this._locales.keys());
    }

    /**
     * get current locale.
     */
    get currentLocale(): string {
        return this._currentLocale;
    }

    /**
     * set current locale.
     * @param locale locale code.
     */
    setLocale(locale: string): void {
        if (this._locales.has(locale)) {
            this._currentLocale = locale;
        }
    }

    /**
     * register locale configuration.
     * @param config locale configuration.
     */
    registerLocale(config: LocaleConfig): void {
        this._locales.set(config.locale, config);
        if (config.bundle) {
            this._bundles.set(config.locale, config.bundle);
        }
    }

    /**
     * register translation bundle.
     * @param locale locale code.
     * @param bundle translation bundle.
     */
    registerBundle(locale: string, bundle: TranslationBundle): void {
        this._bundles.set(locale, bundle);
        if (!this._locales.has(locale)) {
            this._locales.set(locale, { locale });
        }
    }

    /**
     * get translation bundle.
     * @param locale locale code.
     */
    getBundle(locale?: string): TranslationBundle | undefined {
        return this._bundles.get(locale || this._currentLocale);
    }

    /**
     * get locale configuration.
     * @param locale locale code.
     */
    getLocaleConfig(locale?: string): LocaleConfig | undefined {
        return this._locales.get(locale || this._currentLocale);
    }

    /**
     * check if locale is available.
     * @param locale locale code.
     */
    hasLocale(locale: string): boolean {
        return this._locales.has(locale);
    }

    /**
     * get locale direction.
     * @param locale locale code.
     */
    getDirection(locale?: string): 'ltr' | 'rtl' {
        const config = this.getLocaleConfig(locale);
        return config?.direction || 'ltr';
    }

    /**
     * check if current locale is RTL.
     */
    isRTL(): boolean {
        return this.getDirection() === 'rtl';
    }
}